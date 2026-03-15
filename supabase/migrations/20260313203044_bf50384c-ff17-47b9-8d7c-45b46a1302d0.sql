
CREATE TABLE public.crash_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crash_point NUMERIC NOT NULL,
  phase TEXT NOT NULL DEFAULT 'betting',
  betting_ends_at TIMESTAMP WITH TIME ZONE,
  curve_started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crash rounds viewable by everyone" ON public.crash_rounds FOR SELECT TO public USING (true);

CREATE TABLE public.crash_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.crash_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  bet_amount NUMERIC NOT NULL,
  cashout_multiplier NUMERIC,
  pnl NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crash bets viewable by everyone" ON public.crash_bets FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own crash bets" ON public.crash_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crash bets" ON public.crash_bets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
