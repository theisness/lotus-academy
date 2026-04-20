-- ============================================================
-- 修复: 创建 avatars 存储桶及 RLS 策略
-- 问题: avatars bucket 不存在，导致头像上传 400
-- ============================================================

-- 创建 avatars bucket（公开读取）
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 允许已登录用户上传头像到自己的目录
CREATE POLICY IF NOT EXISTS avatars_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 公开读取（头像需要公开访问）
CREATE POLICY IF NOT EXISTS avatars_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
  );

-- 允许用户更新自己的头像
CREATE POLICY IF NOT EXISTS avatars_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许用户删除自己的头像
CREATE POLICY IF NOT EXISTS avatars_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
