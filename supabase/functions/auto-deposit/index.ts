// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;
const FEE_RESERVE = 0.001;
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    const liquidityAddress = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');

    if (!encryptionKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');
    if (!liquidityAddress) throw new Error('LIQUIDITY_WALLET_ADDRESS not configured');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, sol_address, encrypted_private_key, casino_balance')
      .not('sol_address', 'is', null)
      .not('encrypted_private_key', 'is', null);

    if (profilesError) throw new Error(`Profiles fetch error: ${profilesError.message}`);
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No wallets to check", processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    const liquidityPubkey = base58Decode(liquidityAddress);

    for (const profile of profiles) {
      try {
        const balance = await getOnChainBalance(profile.sol_address!);
        const depositable = Math.max(0, parseFloat((balance - FEE_RESERVE).toFixed(9)));

        if (depositable < MIN_DEPOSIT) continue;

        const userSecretKey = await decryptPrivateKey(profile.encrypted_private_key!, encryptionKey);
        const userKeypair = nacl.sign.keyPair.fromSecretKey(userSecretKey);
        const blockhash = await getRecentBlockhash();
        const lamports = Math.floor(depositable * LAMPORTS_PER_SOL);
        const message = buildTransferTransaction(userKeypair.publicKey, liquidityPubkey, lamports, blockhash);
        const signature = nacl.sign.detached(message, userKeypair.secretKey);
        const signedTx = new Uint8Array([1, ...signature, ...message]);
        const signedTxBase64 = btoa(String.fromCharCode(...signedTx));
        const txSignature = await sendTransaction(signedTxBase64);

        const currentBalance = parseFloat(profile.casino_balance as any) || 0;
        const newBalance = currentBalance + depositable;
        await supabaseAdmin.from('profiles').update({ casino_balance: newBalance }).eq('id', profile.id);

        // Log deposit transaction
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: profile.id,
          type: 'deposit',
          amount_sol: depositable,
          from_address: profile.sol_address,
          to_address: liquidityAddress,
          solana_tx_signature: txSignature,
          status: 'confirmed',
        });

        results.push({ user_id: profile.id, deposited: depositable, tx: txSignature });
        console.log(`Auto-deposited ${depositable} SOL for user ${profile.id}`);
      } catch (err) {
        console.error(`Error processing wallet ${profile.sol_address}: ${err}`);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, deposits: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Auto-deposit error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
