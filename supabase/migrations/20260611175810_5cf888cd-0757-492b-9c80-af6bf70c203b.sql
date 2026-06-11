
-- AVATARS
CREATE POLICY "Avatars are viewable by signed in users" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- PRODUCTS
CREATE POLICY "Product images viewable by signed in" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'products');
CREATE POLICY "Admins manage product images" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'products' AND public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    bucket_id = 'products' AND public.has_role(auth.uid(), 'admin')
  );

-- PAYMENTS
CREATE POLICY "Users upload payment screenshots in own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'payments' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users view own payment screenshots" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'payments' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')
    )
  );
