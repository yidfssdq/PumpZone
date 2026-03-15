
DROP FUNCTION IF EXISTS public.get_platform_stats();

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE(total_games BIGINT, total_players BIGINT, total_volume DECIMAL)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM casino_sessions)::BIGINT as total_games,
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_players,
    COALESCE((SELECT SUM(bet_amount) FROM casino_sessions), 0)::DECIMAL as total_volume;
$$;

-- Drop old atomic_casino_play if it exists
DROP FUNCTION IF EXISTS public.atomic_casino_play(UUID, DECIMAL, DECIMAL, TEXT, TEXT, DECIMAL, JSONB, TEXT, TEXT, INT, TEXT);
