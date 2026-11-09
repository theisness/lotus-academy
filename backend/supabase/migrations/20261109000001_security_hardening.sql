-- 2026-11-09 安全加固：起因是 207.56.138.27 注册一次性账号扫站，
-- 读走了全部用户邮箱、全部站内消息，经 public 地址下载了别人的私有书。
-- 详见 ~/ssbx/docs/SESSION-2026-11-09-academy-attack-hardening.md
BEGIN;

-- ── 1. 只给触发器用的 SECURITY DEFINER 函数，不许前端直接 RPC 调 ──
-- distribute_message_to_visible_users 能被任何登录用户拿任意 message_id 调，给全站群发
REVOKE EXECUTE ON FUNCTION public.distribute_message_to_visible_users(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- SECURITY DEFINER 函数统一钉 search_path
ALTER FUNCTION public.distribute_message_to_visible_users(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_book_visible(public.books, uuid) SET search_path = public;
ALTER FUNCTION public.sync_user_email() SET search_path = public;
ALTER FUNCTION public.notify_public_book_update() SET search_path = public;
ALTER FUNCTION public.notify_public_book_annotation() SET search_path = public;
ALTER FUNCTION public.notify_public_book_upload() SET search_path = public;

-- ── 2. 复制公共书到个人书房：原来不查分组可见性，带分组标签的书也能被任何人复制 ──
CREATE OR REPLACE FUNCTION public.copy_book_to_personal(p_book_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_new_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '未登录';
  END IF;

  INSERT INTO books (title, author, description, cover_url, file_path, type, uploader_id, published_date)
  SELECT b.title, b.author, b.description, b.cover_url, b.file_path, 'private', v_uid, b.published_date
  FROM books b
  WHERE b.id = p_book_id AND b.type = 'public' AND is_book_visible(b, v_uid)
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION '书籍不存在或非公共书籍';
  END IF;

  RETURN v_new_id;
END;
$function$;

-- ── 3. schema_migrations 没开 RLS，登录用户能改能清空 ──
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;

-- ── 4. 站内消息：原来任何登录用户能读全部消息（含分组书的书名）──
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.user_messages um
             WHERE um.message_id = messages.id AND um.user_id = auth.uid())
);

-- ── 5. 批注：给自己看不到的分组书写笔记 ──
DROP POLICY IF EXISTS annotations_insert ON public.annotations;
CREATE POLICY annotations_insert ON public.annotations FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.id = annotations.book_id AND (
      (b.type = 'private' AND b.uploader_id = auth.uid())
      OR (b.type = 'public' AND (
            public.is_admin()
            OR (annotations.type = 'note' AND public.is_book_visible(b, auth.uid()))
      ))
    )
  )
);

-- ── 6. profiles.email：原来任何登录用户能读全站邮箱 ──
-- 列级授权去掉 email；本人邮箱前端从 auth 会话取，管理员走 admin_list_profiles()
REVOKE SELECT, INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, nickname, avatar_url, bio, role, group_tags, page_preference, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT UPDATE (nickname, avatar_url, bio, role, group_tags, page_preference, updated_at)
  ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
 RETURNS SETOF public.profiles
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM profiles;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- ── 7. 存储桶 books：原来任何登录用户能读 / 覆盖 / 删除桶里任何文件 ──
-- 读：封面公开；其余按书的可见性（含个人书房复制的引用）、文件主人、管理员
DROP POLICY IF EXISTS books_read ON storage.objects;
CREATE POLICY books_read ON storage.objects FOR SELECT USING (
  bucket_id = 'books' AND (
    (storage.foldername(name))[1] = 'covers'
    OR owner = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.books b
               WHERE b.file_path = objects.name AND public.is_book_visible(b, auth.uid()))
  )
);
-- 传：私有书和封面谁都能传；public/ 只有管理员
DROP POLICY IF EXISTS books_upload ON storage.objects;
CREATE POLICY books_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'books' AND auth.uid() IS NOT NULL AND (
    (storage.foldername(name))[1] IN ('private', 'covers')
    OR ((storage.foldername(name))[1] = 'public' AND public.is_admin())
  )
);
-- 改 / 删：只能动自己的文件，管理员例外
DROP POLICY IF EXISTS books_update ON storage.objects;
CREATE POLICY books_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'books' AND (owner = auth.uid() OR public.is_admin()))
  WITH CHECK (bucket_id = 'books' AND (owner = auth.uid() OR public.is_admin()));
DROP POLICY IF EXISTS books_delete ON storage.objects;
CREATE POLICY books_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'books' AND (owner = auth.uid() OR public.is_admin()));

-- ── 8. books 桶改私有：storage-api 遇到 public 桶会用超级用户读文件（getObject 里的
--    asSuperUser()），上面的读策略对它完全无效。封面的旧 public 地址由 nginx
--    转到 /object/books/covers/ 并带 anon key（见 script/nginx-lotus.conf）
UPDATE storage.buckets SET public = false WHERE id = 'books';

COMMIT;
