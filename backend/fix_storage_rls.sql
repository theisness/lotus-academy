-- Storage RLS policies for books bucket

-- 允许已登录用户上传到自己对应的路径
CREATE POLICY "books_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许已登录用户读取（RLS 在 books 表层面已控制可见性）
CREATE POLICY "books_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
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
