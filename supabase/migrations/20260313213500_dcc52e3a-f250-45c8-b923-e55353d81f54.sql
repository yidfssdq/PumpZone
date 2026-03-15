-- Fix waitlist INSERT policy: keep it open but use anon role explicitly
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true)