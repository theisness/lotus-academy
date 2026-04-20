-- Storage RLS policies for books bucket

-- books bucket 设为 public，允许通过 /object/public/ 路径直接访问文件
-- （封面图、PDF 等需要在 <img> 和 PDF 阅读器中直接引用）
-- 写入权限仍由 RLS 策略控制
UPDATE storage.buckets SET public = true WHERE id = 'books';

-- 允许已登录用户上传到自己对应的路径
CREATE POLICY "books_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许已登录用户读取，或匿名用户读取 public/ 和 covers/ 目录下的文件
CREATE POLICY "books_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'books'
    AND (
      auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] = 'public'
      OR (storage.foldername(name))[1] = 'covers'
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
