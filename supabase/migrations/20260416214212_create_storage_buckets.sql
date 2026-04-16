DO $DO$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('contracheques', 'contracheques', true) 
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('atestados', 'atestados', true) 
  ON CONFLICT (id) DO NOTHING;

  -- Add policies for buckets
  DROP POLICY IF EXISTS "Public Access contracheques" ON storage.objects;
  CREATE POLICY "Public Access contracheques" ON storage.objects FOR SELECT USING (bucket_id = 'contracheques');

  DROP POLICY IF EXISTS "Auth Insert contracheques" ON storage.objects;
  CREATE POLICY "Auth Insert contracheques" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracheques' AND auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Public Access atestados" ON storage.objects;
  CREATE POLICY "Public Access atestados" ON storage.objects FOR SELECT USING (bucket_id = 'atestados');

  DROP POLICY IF EXISTS "Auth Insert atestados" ON storage.objects;
  CREATE POLICY "Auth Insert atestados" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'atestados' AND auth.role() = 'authenticated');
END $DO$;
