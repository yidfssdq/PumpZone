// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Provably Fair helpers ──────────────────────────────────

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToFloat(hex: string): number {
  const int = parseInt(hex.substring(0, 8), 16);
  return int / 0xFFFFFFFF;
}

// ─── Game data generators ───────────────────────────────────

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function randomCard() {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const value = rank === "A" ? 11 : ["J", "Q", "K"].includes(rank) ? 10 : parseInt(rank);
  return { rank, suit, value };
}

function handValue(hand: { value: number; rank: string }[]) {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function generateBlackjackData(win: boolean) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const playerHand = [randomCard(), randomCard()];
    const dealerHand = [randomCard(), randomCard()];
    while (handValue(dealerHand) < 17) dealerHand.push(randomCard());
    const pv = handValue(playerHand);
    const dv = handValue(dealerHand);
    const playerWins = pv <= 21 && (dv > 21 || pv > dv);
    if (playerWins === win) {
      return { player_hand: playerHand, dealer_hand: dealerHand, player_value: pv, dealer_value: dv };
    }
  }
  if (win) {
    return {
      player_hand: [{ rank: "K", suit: "♠", value: 10 }, { rank: "9", suit: "♥", value: 9 }],
      dealer_hand: [{ rank: "7", suit: "♦", value: 7 }, { rank: "J", suit: "♣", value: 10 }],
      player_value: 19, dealer_value: 17,
    };
  }
  return {
    player_hand: [{ rank: "6", suit: "♠", value: 6 }, { rank: "9", suit: "♥", value: 9 }],
    dealer_hand: [{ rank: "K", suit: "♦", value: 10 }, { rank: "Q", suit: "♣", value: 10 }],
    player_value: 15, dealer_value: 20,
  };
}

const SLOT_SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣", "🃏"];

function generateSlotsData(win: boolean) {
  if (win) {
    const symbol = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
    return { reels: [symbol, symbol, symbol] };
  }
  let reels: string[];
  do {
    reels = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
  } while (reels[0] === reels[1] && reels[1] === reels[2]);
  return { reels };
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function generateRouletteData(win: boolean, betType: string) {
  if (win) {
    switch (betType) {
      case "rouge": return { number: RED_NUMBERS[Math.floor(Math.random() * RED_NUMBERS.length)] };
      case "noir": {
        const blacks = Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMBERS.includes(n));
        return { number: blacks[Math.floor(Math.random() * blacks.length)] };
      }
      case "zero": return { number: 0 };
      case "pair": {
        const evens = Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
        return { number: evens[Math.floor(Math.random() * evens.length)] };
      }
      case "impair": {
        const odds = Array.from({ length: 18 }, (_, i) => i * 2 + 1);
        return { number: odds[Math.floor(Math.random() * odds.length)] };
      }
      case "low": return { number: Math.floor(Math.random() * 18) + 1 };
      case "high": return { number: Math.floor(Math.random() * 18) + 19 };
      default: return { number: Math.floor(Math.random() * 37) };
    }
  }
  const allNumbers = Array.from({ length: 37 }, (_, i) => i);
  let losers: number[];
  switch (betType) {
    case "rouge": losers = allNumbers.filter(n => n === 0 || !RED_NUMBERS.includes(n)); break;
    case "noir": losers = allNumbers.filter(n => n === 0 || RED_NUMBERS.includes(n)); break;
    case "zero": losers = allNumbers.filter(n => n !== 0); break;
    case "pair": losers = allNumbers.filter(n => n === 0 || n % 2 !== 0); break;
    case "impair": losers = allNumbers.filter(n => n === 0 || n % 2 === 0); break;
    case "low": losers = allNumbers.filter(n => n === 0 || n > 18); break;
    case "high": losers = allNumbers.filter(n => n <= 18); break;
    default: losers = allNumbers;
  }
  return { number: losers[Math.floor(Math.random() * losers.length)] };
}

// ─── Main handler ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { game, bet_amount, bet_type, client_seed, nonce } = await req.json();

    if (!game || !bet_amount || bet_amount <= 0) {
      throw new Error('Invalid game or bet amount');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Rate limiting: check last_bet_at
    const { data: profileCheck } = await supabaseAdmin
      .from('profiles')
      .select('last_bet_at')
      .eq('id', user.id)
      .single();

    if (profileCheck?.last_bet_at) {
      const lastBet = new Date(profileCheck.last_bet_at).getTime();
      if (Date.now() - lastBet < 500) {
        throw new Error('Too fast! Wait a moment between bets.');
      }
    }

    // ─── MINES START: use atomic RPC with 0 pnl to deduct ───
    if (game === 'mines_start') {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_casino_bet', {
        p_user_id: user.id,
        p_bet_amount: bet_amount,
        p_pnl: -bet_amount,
        p_game: 'mines_start',
        p_result: 'loss',
        p_multiplier: 0,
        p_details: {},
        p_client_seed: client_seed || null,
        p_server_seed_hash: null,
        p_nonce: null,
      });
      if (rpcError) throw new Error(rpcError.message);
      const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
      if (!row?.success) throw new Error(row?.error_msg || 'Insufficient balance');
      return new Response(JSON.stringify({ success: true, new_balance: row.new_balance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── MINES END: credit winnings if win ───
    if (game === 'mines_end') {
      const isWin = bet_type?.startsWith('win_');
      let mult = 0;
      let pnl: number;

      if (isWin) {
        const multMatch = bet_type?.match(/^win_([\d.]+)/);
        mult = multMatch ? parseFloat(multMatch[1]) : 1;
        const payout = bet_amount * mult;
        pnl = payout; // Credit back the full payout (bet was already deducted in mines_start)
      } else {
        pnl = 0; // Already lost in mines_start
      }

      if (pnl > 0) {
        // Credit winnings back
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_casino_bet', {
          p_user_id: user.id,
          p_bet_amount: 0,
          p_pnl: pnl,
          p_game: 'mines',
          p_result: 'win',
          p_multiplier: mult,
          p_details: { bet_type },
          p_client_seed: client_seed || null,
          p_server_seed_hash: null,
          p_nonce: null,
        });
        if (rpcError) throw new Error(rpcError.message);
        const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        return new Response(JSON.stringify({ success: true, win: true, pnl: pnl - bet_amount, multiplier: mult, new_balance: row?.new_balance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, win: false, pnl: -bet_amount, multiplier: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── PROVABLY FAIR: Generate server seed ───
    const serverSeedBytes = new Uint8Array(32);
    crypto.getRandomValues(serverSeedBytes);
    const serverSeed = Array.from(serverSeedBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const serverSeedHash = await sha256(serverSeed);

    const playerClientSeed = client_seed || crypto.randomUUID();
    const playerNonce = typeof nonce === 'number' ? nonce : 0;

    const hmacResult = await hmacSha256(serverSeed, `${playerClientSeed}:${playerNonce}`);
    const roll = hexToFloat(hmacResult);

    // Player wins 65% of the time (house edge: -30% EV for house)
    const win = roll < 0.65;
    const multiplier = 2.0;
    const pnl = win ? bet_amount : -bet_amount;

    let game_data: Record<string, unknown> = { roll: parseFloat(roll.toFixed(6)) };
    switch (game) {
      case 'blackjack':
        game_data = { ...game_data, ...generateBlackjackData(win) };
        break;
      case 'slots':
        game_data = { ...game_data, ...generateSlotsData(win) };
        break;
      case 'roulette':
        game_data = { ...game_data, ...generateRouletteData(win, bet_type || 'rouge') };
        break;
      case 'crash': {
        const crash_point = win ? 2.0 + Math.random() * 8.0 : 1.0 + Math.random() * 0.5;
        game_data = { ...game_data, crash_point: parseFloat(crash_point.toFixed(2)) };
        break;
      }
      case 'plinko':
      case 'dice':
        game_data = { ...game_data, bet_type };
        break;
      default:
        break;
    }

    // Use atomic process_casino_bet RPC
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_casino_bet', {
      p_user_id: user.id,
      p_bet_amount: bet_amount,
      p_pnl: pnl,
      p_game: game,
      p_result: win ? 'win' : 'loss',
      p_multiplier: win ? multiplier : 0,
      p_details: game_data,
      p_client_seed: playerClientSeed,
      p_server_seed_hash: serverSeedHash,
      p_nonce: playerNonce,
    });

    if (rpcError) throw new Error(rpcError.message);

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!row?.success) {
      throw new Error(row?.error_msg || 'Bet processing failed');
    }

    return new Response(JSON.stringify({
      win,
      pnl,
      multiplier: win ? multiplier : 0,
      new_balance: row.new_balance,
      game_data,
      session_id: row.session_id,
      server_seed_hash: serverSeedHash,
      fairness: {
        server_seed_hash: serverSeedHash,
        client_seed: playerClientSeed,
        nonce: playerNonce,
        server_seed: serverSeed,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
