-- ============================================================
-- Migration: 存储桶创建与 RLS 策略
-- 莲花书院 — avatars 和 books 存储桶
-- ============================================================

-- ============================================================
-- 1. avatars bucket — 用户头像
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 允许已登录用户上传头像到自己的目录
CREATE POLICY avatars_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 公开读取（头像需要公开访问）
CREATE POLICY avatars_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

-- 允许用户更新自己的头像
CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许用户删除自己的头像
CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 2. books bucket — 书籍 PDF 及封面
-- ============================================================

-- books bucket 设为 public，允许通过 /object/public/ 路径直接访问文件
-- （封面图、PDF 等需要在 <img> 和 PDF 阅读器中直接引用）
-- 写入权限仍由 RLS 策略控制
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 允许已登录用户上传
CREATE POLICY books_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许已登录用户读取，或匿名用户读取 public/ 和 covers/ 目录下的文件
CREATE POLICY books_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'books'
    AND (
      auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] = 'public'
      OR (storage.foldername(name))[1] = 'covers'
    )
  );

-- 允许已登录用户更新自己的文件
CREATE POLICY books_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );

-- 允许已登录用户删除自己的文件
CREATE POLICY books_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'books' AND auth.uid() IS NOT NULL
  );
