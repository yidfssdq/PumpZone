// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BETTING_DURATION = 10;
const CURVE_SPEED = 0.08;

function computeMultiplier(elapsedSeconds: number): number {
  return Math.pow(Math.E, CURVE_SPEED * elapsedSeconds);
}

function generateCrashPoint(): number {
  const r = Math.random();
  const crashPoint = 1 / (1 - r * 0.96);
  return Math.max(1.05, parseFloat(crashPoint.toFixed(2)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { action, ...params } = await req.json();
    const now = new Date();

    // ─── GET OR CREATE ROUND ───
    if (action === 'get_or_create_round') {
      // Find active rounds (not crashed)
      let { data: rounds } = await admin
        .from('crash_rounds')
        .select('*')
        .neq('phase', 'crashed')
        .order('created_at', { ascending: true });

      let round = rounds && rounds.length > 0 ? rounds[0] : null;

      // Clean up duplicate active rounds
      if (rounds && rounds.length > 1) {
        const extraIds = rounds.slice(1).map((r: any) => r.id);
        await admin.from('crash_bets').delete().in('round_id', extraIds);
        await admin.from('crash_rounds').delete().in('id', extraIds);
      }

      // Phase transitions
      if (round) {
        if (round.phase === 'betting' && new Date(round.betting_ends_at) <= now) {
          const { data: updated } = await admin
            .from('crash_rounds')
            .update({ phase: 'rising', curve_started_at: now.toISOString() })
            .eq('id', round.id)
            .eq('phase', 'betting')
            .select()
            .single();
          if (updated) round = updated;
        }

        if (round.phase === 'rising' && round.curve_started_at) {
          const elapsed = (now.getTime() - new Date(round.curve_started_at).getTime()) / 1000;
          const currentMult = computeMultiplier(elapsed);

          if (currentMult >= round.crash_point) {
            const { data: updated } = await admin
              .from('crash_rounds')
              .update({ phase: 'crashed', crashed_at: now.toISOString() })
              .eq('id', round.id)
              .eq('phase', 'rising')
              .select()
              .single();

            if (updated) {
              round = updated;
              // Settle uncashed bets
              const { data: unsettledBets } = await admin
                .from('crash_bets')
                .select('*')
                .eq('round_id', round.id)
                .is('cashout_multiplier', null);

              if (unsettledBets) {
                for (const bet of unsettledBets) {
                  await admin.from('crash_bets')
                    .update({ pnl: -bet.bet_amount })
                    .eq('id', bet.id);
                  await admin.from('casino_sessions').insert({
                    user_id: bet.user_id,
                    game: 'crash',
                    bet_amount: bet.bet_amount,
                    result: 'lose',
                    pnl: -bet.bet_amount,
                    multiplier: 0,
                    details: { crash_point: round.crash_point, round_id: round.id },
                  });
                }
              }
            }
          }
        }
      }

      // Create new round if needed
      if (!round || round.phase === 'crashed') {
        const bettingEndsAt = new Date(now.getTime() + BETTING_DURATION * 1000);
        const { data: newRound } = await admin
          .from('crash_rounds')
          .insert({
            crash_point: generateCrashPoint(),
            phase: 'betting',
            betting_ends_at: bettingEndsAt.toISOString(),
          })
          .select()
          .single();
        round = newRound;
      }

      // Get player count and user's bet
      const { count } = await admin
        .from('crash_bets')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', round.id);

      const { data: userBet } = await admin
        .from('crash_bets')
        .select('*')
        .eq('round_id', round.id)
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        id: round.id,
        phase: round.phase,
        betting_ends_at: round.betting_ends_at,
        curve_started_at: round.curve_started_at,
        crashed_at: round.crashed_at,
        crash_point: round.phase === 'crashed' ? round.crash_point : undefined,
        player_count: count || 0,
        user_bet: userBet,
        server_time: now.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── PLACE BET ───
    if (action === 'place_bet') {
      const { round_id, bet_amount } = params;
      if (!round_id || !bet_amount || bet_amount <= 0) throw new Error('Invalid bet');

      const { data: round } = await admin
        .from('crash_rounds')
        .select('*')
        .eq('id', round_id)
        .eq('phase', 'betting')
        .single();
      if (!round) throw new Error('Round not in betting phase');
      if (new Date(round.betting_ends_at) <= now) throw new Error('Betting closed');

      const { data: profile } = await admin
        .from('profiles')
        .select('casino_balance')
        .eq('id', user.id)
        .single();
      if (!profile || profile.casino_balance < bet_amount) throw new Error('Insufficient balance');

      const { data: existingBet } = await admin
        .from('crash_bets')
        .select('id')
        .eq('round_id', round_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existingBet) throw new Error('Already bet on this round');

      await admin.from('profiles')
        .update({ casino_balance: profile.casino_balance - bet_amount })
        .eq('id', user.id);

      const { data: bet } = await admin
        .from('crash_bets')
        .insert({ round_id, user_id: user.id, bet_amount })
        .select()
        .single();

      return new Response(JSON.stringify({ success: true, bet }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CASHOUT ───
    if (action === 'cashout') {
      const { round_id } = params;

      const { data: round } = await admin
        .from('crash_rounds')
        .select('*')
        .eq('id', round_id)
        .eq('phase', 'rising')
        .single();
      if (!round || !round.curve_started_at) throw new Error('Round not in rising phase');

      const elapsed = (now.getTime() - new Date(round.curve_started_at).getTime()) / 1000;
      const currentMult = computeMultiplier(elapsed);
      if (currentMult >= round.crash_point) throw new Error('Already crashed');

      const { data: bet } = await admin
        .from('crash_bets')
        .select('*')
        .eq('round_id', round_id)
        .eq('user_id', user.id)
        .is('cashout_multiplier', null)
        .single();
      if (!bet) throw new Error('No active bet');

      const mult = parseFloat(currentMult.toFixed(2));
      const pnl = bet.bet_amount * (mult - 1);
      const winnings = bet.bet_amount * mult;

      await admin.from('crash_bets')
        .update({ cashout_multiplier: mult, pnl })
        .eq('id', bet.id);

      const { data: profile } = await admin
        .from('profiles')
        .select('casino_balance')
        .eq('id', user.id)
        .single();

      await admin.from('profiles')
        .update({ casino_balance: (profile?.casino_balance || 0) + winnings })
        .eq('id', user.id);

      await admin.from('casino_sessions').insert({
        user_id: user.id,
        game: 'crash',
        bet_amount: bet.bet_amount,
        result: 'win',
        pnl,
        multiplier: mult,
        details: { crash_point: round.crash_point, round_id: round.id, cashout_at: mult },
      });

      return new Response(JSON.stringify({ success: true, multiplier: mult, pnl, winnings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
