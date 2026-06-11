
-- Tighten WITH CHECK on messages update
DROP POLICY IF EXISTS "Mark read" ON public.messages;
CREATE POLICY "Mark read" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- Revoke EXECUTE on internal SECURITY DEFINER trigger funcs (only triggers call them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_cc_code() FROM PUBLIC, anon, authenticated;

-- has_role is meant to be callable inside policies — keep it
