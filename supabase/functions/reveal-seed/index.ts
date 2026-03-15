// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { session_id } = await req.json();
    if (!session_id) throw new Error('Missing session_id');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: session, error } = await supabaseAdmin
      .from('casino_sessions')
      .select('server_seed_revealed, server_seed_hash, client_seed, nonce')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (error || !session) throw new Error('Session not found');

    return new Response(JSON.stringify({
      server_seed: session.server_seed_revealed,
      server_seed_hash: session.server_seed_hash,
      client_seed: session.client_seed,
      nonce: session.nonce,
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
