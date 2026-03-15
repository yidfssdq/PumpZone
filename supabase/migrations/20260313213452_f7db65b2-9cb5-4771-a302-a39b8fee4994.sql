-- 1. Fix profiles SELECT: only own row
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2. Fix profiles UPDATE: add trigger to protect server-managed columns
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own profile safely" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.casino_balance := OLD.casino_balance;
  NEW.level := OLD.level;
  NEW.xp := OLD.xp;
  NEW.total_wagered := OLD.total_wagered;
  NEW.total_wins := OLD.total_wins;
  NEW.total_losses := OLD.total_losses;
  NEW.last_bet_at := OLD.last_bet_at;
  NEW.encrypted_private_key := OLD.encrypted_private_key;
  NEW.sol_address := OLD.sol_address;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- 3. Fix casino_sessions SELECT: only own sessions
DROP POLICY IF EXISTS "Casino sessions are viewable by everyone" ON public.casino_sessions;
CREATE POLICY "Users can view own sessions" ON public.casino_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Fix casino_sessions INSERT: require auth
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.casino_sessions;
CREATE POLICY "Authenticated users can insert own sessions" ON public.casino_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Fix casino_sessions UPDATE: require auth
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.casino_sessions;
CREATE POLICY "Authenticated users can update own sessions" ON public.casino_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 6. Fix waitlist SELECT: remove authenticated access
DROP POLICY IF EXISTS "Waitlist viewable by authenticated" ON public.waitlist;

-- 7. Create secure RPCs for public data
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(username text, total_pnl numeric, games bigint, biggest_win numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.username,
    COALESCE(SUM(cs.pnl), 0) as total_pnl,
    COUNT(cs.id) as games,
    COALESCE(MAX(CASE WHEN cs.pnl > 0 THEN cs.pnl ELSE 0 END), 0) as biggest_win
  FROM profiles p
  LEFT JOIN casino_sessions cs ON cs.user_id = p.id
  GROUP BY p.id, p.username
  ORDER BY total_pnl DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_top_wins(p_limit integer DEFAULT 5)
RETURNS TABLE(pnl numeric, game text, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cs.pnl, cs.game, 'Player***'::text as username
  FROM casino_sessions cs
  WHERE cs.result = 'win'
  ORDER BY cs.pnl DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*) FROM waitlist;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_activity(p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, game text, result text, pnl numeric, bet_amount numeric, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cs.id, cs.game, cs.result, cs.pnl, cs.bet_amount, cs.created_at
  FROM casino_sessions cs
  ORDER BY cs.created_at DESC
  LIMIT p_limit;
$$