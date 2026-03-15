// deno-lint-ignore-file

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SOL_MINT = "So11111111111111111111111111111111111111112";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jupiterApiKey = Deno.env.get('JUPITER_API_KEY');
    const url = new URL(req.url);
    const ids = url.searchParams.get('ids') || SOL_MINT;

    let data: any = null;

    // Try Jupiter with API key
    if (jupiterApiKey) {
      try {
        const response = await fetch(`https://api.jup.ag/price/v3?ids=${ids}`, {
          headers: { 'x-api-key': jupiterApiKey },
        });
        if (response.ok) {
          data = await response.json();
        } else {
          await response.text();
        }
      } catch {}
    }

    // Fallback to CoinGecko for SOL price
    if (!data && (ids === SOL_MINT || ids.includes(SOL_MINT))) {
      try {
        const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'PumpZone/1.0' },
        });
        if (cgResponse.ok) {
          const cgData = await cgResponse.json();
          if (cgData?.solana?.usd) {
            data = {
              data: {
                [SOL_MINT]: { price: String(cgData.solana.usd) }
              }
            };
          }
        } else {
          await cgResponse.text();
        }
      } catch {}
    }

    // Fallback to alternative API
    if (!data && (ids === SOL_MINT || ids.includes(SOL_MINT))) {
      try {
        const altResponse = await fetch('https://min-api.cryptocompare.com/data/price?fsym=SOL&tsyms=USD');
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData?.USD) {
            data = {
              data: {
                [SOL_MINT]: { price: String(altData.USD) }
              }
            };
          }
        } else {
          await altResponse.text();
        }
      } catch {}
    }

    if (!data) {
      throw new Error('Could not fetch price data');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
