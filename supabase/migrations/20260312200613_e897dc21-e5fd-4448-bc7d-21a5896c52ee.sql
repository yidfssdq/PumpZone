
-- Add missing columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT,
  ADD COLUMN IF NOT EXISTS last_bet_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_wagered DECIMAL(18,9) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_wins INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_losses INT DEFAULT 0;

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'win_credit', 'loss_debit', 'sweep')),
  amount_sol DECIMAL(18,9) NOT NULL,
  from_address TEXT,
  to_address TEXT,
  solana_tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON public.wallet_transactions(type, created_at DESC);

-- Create profiles_public view (strips encrypted_private_key)
CREATE OR REPLACE VIEW public.profiles_public 
WITH (security_invoker=on) AS
  SELECT 
    id, username, email, sol_address, casino_balance,
    level, xp, last_bet_at, total_wagered, total_wins, total_losses,
    created_at, updated_at
  FROM public.profiles;

-- Grant service_role full access
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Atomic casino bet function
CREATE OR REPLACE FUNCTION public.process_casino_bet(
  p_user_id UUID,
  p_bet_amount DECIMAL,
  p_pnl DECIMAL,
  p_game TEXT,
  p_result TEXT,
  p_multiplier DECIMAL,
  p_details JSONB DEFAULT NULL,
  p_client_seed TEXT DEFAULT NULL,
  p_server_seed_hash TEXT DEFAULT NULL,
  p_nonce INT DEFAULT NULL
)
RETURNS TABLE(new_balance DECIMAL, session_id UUID, success BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance DECIMAL;
  v_session_id UUID;
BEGIN
  SELECT casino_balance INTO v_balance 
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, NULL::UUID, FALSE, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_balance < p_bet_amount THEN
    RETURN QUERY SELECT v_balance, NULL::UUID, FALSE, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  UPDATE profiles SET 
    casino_balance = casino_balance + p_pnl,
    last_bet_at = NOW(),
    total_wagered = total_wagered + p_bet_amount,
    total_wins = total_wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    total_losses = total_losses + CASE WHEN p_result = 'loss' THEN 1 ELSE 0 END,
    xp = xp + GREATEST(1, FLOOR(p_bet_amount * 100)::INT),
    level = GREATEST(1, FLOOR((xp + GREATEST(1, FLOOR(p_bet_amount * 100)::INT)) / 500) + 1)
  WHERE id = p_user_id;
  
  INSERT INTO casino_sessions (
    user_id, game, bet_amount, result, pnl, multiplier,
    client_seed, server_seed_hash, nonce
  ) VALUES (
    p_user_id, p_game, p_bet_amount, p_result, p_pnl, p_multiplier,
    p_client_seed, p_server_seed_hash, p_nonce
  ) RETURNING id INTO v_session_id;
  
  SELECT casino_balance INTO v_balance FROM profiles WHERE id = p_user_id;
  RETURN QUERY SELECT v_balance, v_session_id, TRUE, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_casino_bet TO service_role;

-- Atomic withdrawal function
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_destination TEXT,
  p_tx_signature TEXT
)
RETURNS TABLE(new_balance DECIMAL, success BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT casino_balance INTO v_balance 
  FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, FALSE, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN QUERY SELECT v_balance, FALSE, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  UPDATE profiles SET casino_balance = casino_balance - p_amount WHERE id = p_user_id;
  
  INSERT INTO wallet_transactions (user_id, type, amount_sol, to_address, solana_tx_signature, status)
  VALUES (p_user_id, 'withdrawal', p_amount, p_destination, p_tx_signature, 'confirmed');
  
  SELECT casino_balance INTO v_balance FROM profiles WHERE id = p_user_id;
  RETURN QUERY SELECT v_balance, TRUE, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_withdrawal TO service_role;

-- Update get_platform_stats
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(total_games BIGINT, total_players BIGINT, total_volume DECIMAL)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM casino_sessions)::BIGINT as total_games,
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_players,
    COALESCE((SELECT SUM(bet_amount) FROM casino_sessions), 0)::DECIMAL as total_volume;
$$;
