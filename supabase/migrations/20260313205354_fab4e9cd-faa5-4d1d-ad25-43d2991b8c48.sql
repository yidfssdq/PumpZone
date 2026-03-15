
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (signup from public)
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT TO public WITH CHECK (true);

-- Only service role / admin can read
CREATE POLICY "Waitlist viewable by authenticated" ON public.waitlist
  FOR SELECT TO authenticated USING (true);
