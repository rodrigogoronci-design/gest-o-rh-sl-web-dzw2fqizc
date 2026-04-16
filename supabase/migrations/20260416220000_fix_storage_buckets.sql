DO $DO$
BEGIN
  -- Ensure buckets exist and are public to avoid 404 Bucket Not Found errors
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('contracheques', 'contracheques', true) 
  ON CONFLICT (id) DO UPDATE SET public = true;
  
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('atestados', 'atestados', true) 
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- Drop existing policies to cleanly recreate them
  DROP POLICY IF EXISTS "Public Access contracheques" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Insert contracheques" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Update contracheques" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Delete contracheques" ON storage.objects;

  DROP POLICY IF EXISTS "Public Access atestados" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Insert atestados" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Update atestados" ON storage.objects;
  DROP POLICY IF EXISTS "Auth Delete atestados" ON storage.objects;

  -- Recreate policies for contracheques bucket
  CREATE POLICY "Public Access contracheques" ON storage.objects 
    FOR SELECT USING (bucket_id = 'contracheques');

  CREATE POLICY "Auth Insert contracheques" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'contracheques' AND auth.role() = 'authenticated');
  
  CREATE POLICY "Auth Update contracheques" ON storage.objects 
    FOR UPDATE WITH CHECK (bucket_id = 'contracheques' AND auth.role() = 'authenticated');
  
  CREATE POLICY "Auth Delete contracheques" ON storage.objects 
    FOR DELETE USING (bucket_id = 'contracheques' AND auth.role() = 'authenticated');

  -- Recreate policies for atestados bucket
  CREATE POLICY "Public Access atestados" ON storage.objects 
    FOR SELECT USING (bucket_id = 'atestados');

  CREATE POLICY "Auth Insert atestados" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'atestados' AND auth.role() = 'authenticated');
  
  CREATE POLICY "Auth Update atestados" ON storage.objects 
    FOR UPDATE WITH CHECK (bucket_id = 'atestados' AND auth.role() = 'authenticated');
  
  CREATE POLICY "Auth Delete atestados" ON storage.objects 
    FOR DELETE USING (bucket_id = 'atestados' AND auth.role() = 'authenticated');
END $DO$;
