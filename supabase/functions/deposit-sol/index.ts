// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;
const FEE_RESERVE = 0.0015;
const MIN_DEPOSIT = 0.0001;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(str: string): Uint8Array {
  const bytes: number[] = [0];
  for (let i = 0; i < str.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(str[i]);
    if (charIndex < 0) throw new Error('Invalid base58 character');
    let carry = charIndex;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

async function decryptPrivateKey(encryptedStr: string, encryptionKey: string): Promise<Uint8Array> {
  const [ivB64, encB64] = encryptedStr.split(':');
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(encB64), c => c.charCodeAt(0));
  const rawKey = new TextEncoder().encode(encryptionKey.slice(0, 32));
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  const secretKeyBase58 = new TextDecoder().decode(decrypted);
  return base58Decode(secretKeyBase58);
}

async function getOnChainBalance(address: string): Promise<number> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result.value / LAMPORTS_PER_SOL;
}

async function getRecentBlockhash(): Promise<string> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestBlockhash", params: [{ commitment: "finalized" }] }),
  });
  const data = await res.json();
  return data.result.value.blockhash;
}

function buildTransferTransaction(fromPubkey: Uint8Array, toPubkey: Uint8Array, lamports: number, recentBlockhash: string): Uint8Array {
  const blockhashBytes = base58Decode(recentBlockhash);
  const systemProgram = new Uint8Array(32);
  const instructionData = new Uint8Array(12);
  instructionData[0] = 2;
  const view = new DataView(instructionData.buffer);
  view.setUint32(4, lamports & 0xffffffff, true);
  view.setUint32(8, Math.floor(lamports / 0x100000000), true);
  const header = new Uint8Array([1, 0, 1]);
  const compactNumKeys = new Uint8Array([3]);
  const compactNumInstructions = new Uint8Array([1]);
  const instruction = new Uint8Array([2, 2, 0, 1, 12, ...instructionData]);
  return new Uint8Array([
    ...header, ...compactNumKeys, ...fromPubkey, ...toPubkey, ...systemProgram,
    ...blockhashBytes, ...compactNumInstructions, ...instruction,
  ]);
}

async function sendTransaction(signedTx: string): Promise<string> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "sendTransaction",
      params: [signedTx, { encoding: "base64", preflightCommitment: "confirmed" }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Transaction failed: ${data.error.message}`);
  return data.result;
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
    const liquidityAddress = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');

    if (!encryptionKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');
    if (!liquidityAddress) throw new Error('LIQUIDITY_WALLET_ADDRESS not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('sol_address, encrypted_private_key, casino_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.sol_address || !profile?.encrypted_private_key) {
      throw new Error('No wallet found');
    }

    const onChainBalance = await getOnChainBalance(profile.sol_address);
    const currentCasinoBalance = parseFloat(profile.casino_balance as any) || 0;
    const depositable = Math.max(0, parseFloat((onChainBalance - FEE_RESERVE).toFixed(9)));

    if (depositable < MIN_DEPOSIT) {
      return new Response(JSON.stringify({
        on_chain_balance: onChainBalance,
        casino_balance: currentCasinoBalance,
        deposited: 0,
        message: "No SOL available to deposit",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transfer from custodial wallet → LIQUIDITY wallet
    const userSecretKey = await decryptPrivateKey(profile.encrypted_private_key, encryptionKey);
    const userKeypair = nacl.sign.keyPair.fromSecretKey(userSecretKey);
    const liquidityPubkey = base58Decode(liquidityAddress);
    const blockhash = await getRecentBlockhash();
    const lamports = Math.floor(depositable * LAMPORTS_PER_SOL);
    const message = buildTransferTransaction(userKeypair.publicKey, liquidityPubkey, lamports, blockhash);
    const signature = nacl.sign.detached(message, userKeypair.secretKey);
    const signedTx = new Uint8Array([1, ...signature, ...message]);
    const signedTxBase64 = btoa(String.fromCharCode(...signedTx));
    const txSignature = await sendTransaction(signedTxBase64);

    // Credit casino balance
    const newBalance = currentCasinoBalance + depositable;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ casino_balance: newBalance })
      .eq('id', user.id);

    if (updateError) throw new Error(`Balance update failed: ${updateError.message}`);

    // Log deposit transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount_sol: depositable,
      from_address: profile.sol_address,
      to_address: liquidityAddress,
      solana_tx_signature: txSignature,
      status: 'confirmed',
    });

    return new Response(JSON.stringify({
      on_chain_balance: onChainBalance,
      casino_balance: newBalance,
      deposited: depositable,
      tx_signature: txSignature,
      message: `${depositable.toFixed(6)} SOL deposited to liquidity pool`,
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
