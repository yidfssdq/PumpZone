// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminSecret = Deno.env.get('ADMIN_SECRET');
    if (!adminSecret) throw new Error('ADMIN_SECRET not configured');

    // Authenticate admin via Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      throw new Error('Unauthorized: invalid admin secret');
    }

    const liquidityPrivateKey = Deno.env.get('LIQUIDITY_WALLET_PRIVATE_KEY');
    const liquidityAddress = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');
    const revenueAddress = Deno.env.get('REVENUE_WALLET_ADDRESS');

    if (!liquidityPrivateKey) throw new Error('LIQUIDITY_WALLET_PRIVATE_KEY not configured');
    if (!liquidityAddress) throw new Error('LIQUIDITY_WALLET_ADDRESS not configured');
    if (!revenueAddress) throw new Error('REVENUE_WALLET_ADDRESS not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Calculate profits: total_deposits - total_withdrawals - current_casino_balance_sum
    const { data: depositSum } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount_sol')
      .eq('type', 'deposit')
      .neq('note', 'wallet_created');

    const totalDeposits = (depositSum || []).reduce((s: number, r: any) => s + parseFloat(r.amount_sol || 0), 0);

    const { data: withdrawalSum } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount_sol')
      .eq('type', 'withdrawal');

    const totalWithdrawals = (withdrawalSum || []).reduce((s: number, r: any) => s + parseFloat(r.amount_sol || 0), 0);

    const { data: balanceSum } = await supabaseAdmin
      .from('profiles')
      .select('casino_balance');

    const totalCasinoBalance = (balanceSum || []).reduce((s: number, r: any) => s + parseFloat(r.casino_balance || 0), 0);

    const calculatedProfits = totalDeposits - totalWithdrawals - totalCasinoBalance;

    // Get on-chain balance of liquidity wallet
    const liquidityBalance = await getOnChainBalance(liquidityAddress);
    const feeReserve = 0.01; // Keep some SOL for fees

    // Sweep amount = min(calculated profits, available on-chain balance - reserve)
    const sweepAmount = Math.min(
      Math.max(0, calculatedProfits),
      Math.max(0, liquidityBalance - feeReserve)
    );

    if (sweepAmount < 0.001) {
      return new Response(JSON.stringify({
        message: "No profits to sweep",
        calculated_profits: calculatedProfits,
        liquidity_balance: liquidityBalance,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_casino_balance: totalCasinoBalance,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transfer from LIQUIDITY → REVENUE
    const liquiditySecretKey = base58Decode(liquidityPrivateKey);
    const liquidityKeypair = nacl.sign.keyPair.fromSecretKey(liquiditySecretKey);
    const computedAddress = base58Encode(liquidityKeypair.publicKey);
    if (computedAddress !== liquidityAddress) {
      throw new Error('Liquidity wallet key mismatch');
    }

    const revenuePubkey = base58Decode(revenueAddress);
    const blockhash = await getRecentBlockhash();
    const lamports = Math.floor(sweepAmount * LAMPORTS_PER_SOL);
    const message = buildTransferTransaction(liquidityKeypair.publicKey, revenuePubkey, lamports, blockhash);
    const signature = nacl.sign.detached(message, liquidityKeypair.secretKey);
    const signedTx = new Uint8Array([1, ...signature, ...message]);
    const signedTxBase64 = btoa(String.fromCharCode(...signedTx));
    const txSignature = await sendTransaction(signedTxBase64);

    // Log sweep transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: null,
      type: 'sweep',
      amount_sol: sweepAmount,
      from_address: liquidityAddress,
      to_address: revenueAddress,
      solana_tx_signature: txSignature,
      status: 'confirmed',
      note: `Profit sweep: ${sweepAmount.toFixed(9)} SOL`,
    });

    return new Response(JSON.stringify({
      success: true,
      swept: sweepAmount,
      tx_signature: txSignature,
      calculated_profits: calculatedProfits,
      liquidity_balance_before: liquidityBalance,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Sweep-profits error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
