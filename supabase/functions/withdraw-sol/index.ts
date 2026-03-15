// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

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
    const liquidityPrivateKey = Deno.env.get('LIQUIDITY_WALLET_PRIVATE_KEY');
    const liquidityAddress = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');

    if (!liquidityPrivateKey) throw new Error('Liquidity wallet not configured');
    if (!liquidityAddress) throw new Error('Liquidity wallet address not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { destination, amount } = await req.json();

    if (!destination || typeof destination !== 'string' || destination.length < 32 || destination.length > 44) {
      throw new Error('Invalid destination address');
    }
    if (!amount || typeof amount !== 'number' || amount < 0.001 || amount > 100) {
      throw new Error('Invalid amount (min 0.001, max 100 SOL)');
    }

    // Verify liquidity wallet
    const liquiditySecretKey = base58Decode(liquidityPrivateKey);
    const liquidityKeypair = nacl.sign.keyPair.fromSecretKey(liquiditySecretKey);
    const computedAddress = base58Encode(liquidityKeypair.publicKey);
    if (computedAddress !== liquidityAddress) {
      throw new Error('Liquidity wallet key mismatch');
    }

    // Build and send transaction from LIQUIDITY → destination
    const blockhash = await getRecentBlockhash();
    const toPubkey = base58Decode(destination);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const message = buildTransferTransaction(liquidityKeypair.publicKey, toPubkey, lamports, blockhash);
    const signature = nacl.sign.detached(message, liquidityKeypair.secretKey);
    const signedTx = new Uint8Array([1, ...signature, ...message]);
    const signedTxBase64 = btoa(String.fromCharCode(...signedTx));
    const txSignature = await sendTransaction(signedTxBase64);

    // Atomically deduct balance via process_withdrawal RPC
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_withdrawal', {
      p_user_id: user.id,
      p_amount: amount,
      p_destination: destination,
      p_tx_signature: txSignature,
    });

    if (rpcError) throw new Error(rpcError.message);

    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    if (!row?.success) {
      throw new Error(row?.error_msg || 'Withdrawal processing failed');
    }

    return new Response(JSON.stringify({
      success: true,
      tx_signature: txSignature,
      new_balance: row.new_balance,
      amount_withdrawn: amount,
      destination,
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
