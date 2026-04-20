-- Storage RLS policies for books bucket

-- 允许已登录用户上传到自己对应的路径
CREATE POLICY "books_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许已登录用户读取，或匿名用户读取 public/ 目录下的文件
CREATE POLICY "books_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'books'
    AND (
      auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] = 'public'
    )
  );

-- 允许上传者删除自己的文件
CREATE POLICY "books_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许上传者更新自己的文件
CREATE POLICY "books_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );
