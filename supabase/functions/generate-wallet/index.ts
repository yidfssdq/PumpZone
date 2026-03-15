// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let output = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    output += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    output += BASE58_ALPHABET[digits[i]];
  }
  return output;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!encryptionKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('sol_address')
      .eq('id', user.id)
      .single();

    if (profile?.sol_address) {
      return new Response(JSON.stringify({ address: profile.sol_address }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate Ed25519 keypair
    const keypair = nacl.sign.keyPair();
    const publicKeyBase58 = base58Encode(keypair.publicKey);
    const secretKeyBase58 = base58Encode(keypair.secretKey);

    // Encrypt private key with AES-GCM using dedicated WALLET_ENCRYPTION_KEY
    const rawKey = new TextEncoder().encode(encryptionKey.slice(0, 32));
    const encKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encKey,
      new TextEncoder().encode(secretKeyBase58)
    );

    const ivB64 = btoa(String.fromCharCode(...iv));
    const encB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const encryptedStr = `${ivB64}:${encB64}`;

    // Store in profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ sol_address: publicKeyBase58, encrypted_private_key: encryptedStr })
      .eq('id', user.id);

    if (updateError) throw new Error(`Failed to store wallet: ${updateError.message}`);

    // Log wallet creation in wallet_transactions
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount_sol: 0,
      to_address: publicKeyBase58,
      status: 'confirmed',
      note: 'wallet_created',
    });

    return new Response(JSON.stringify({ address: publicKeyBase58 }), {
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
