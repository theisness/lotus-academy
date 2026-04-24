-- ============================================================
-- Migration: 数据库函数与触发器
-- 莲花书院 — 自动化逻辑
-- ============================================================

-- ============================================================
-- 1. handle_new_user() — 新用户注册时自动创建 profiles 记录
--    首位用户自动设为 admin
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  INSERT INTO public.profiles (id, role, created_at, updated_at)
  VALUES (
    NEW.id,
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'user' END,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 触发器：auth.users 插入时自动创建 profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. is_book_visible() — 判断书籍对指定用户是否可见
--    - 私有书籍：仅上传者可见
--    - 公共书籍：管理员始终可见
--    - 公共书籍无分组标签：所有人可见（含未登录访客）
--    - 公共书籍有分组标签：仅匹配标签的已登录用户可见
-- ============================================================

CREATE OR REPLACE FUNCTION is_book_visible(book_row books, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  tag_count INT;
  match_count INT;
  viewer_tags TEXT[];
  viewer_role TEXT;
BEGIN
  -- 私有书籍：仅所有者可见
  IF book_row.type = 'private' THEN
    RETURN book_row.uploader_id = viewer_id;
  END IF;

  -- 公共书籍：管理员始终可见
  IF viewer_id IS NOT NULL THEN
    SELECT role INTO viewer_role
    FROM profiles
    WHERE id = viewer_id;
    
    IF viewer_role = 'admin' THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- 公共书籍：检查分组标签
  SELECT COUNT(*) INTO tag_count
  FROM book_group_tags
  WHERE book_id = book_row.id;

  -- 无分组标签限制 → 所有人可见
  IF tag_count = 0 THEN
    RETURN TRUE;
  END IF;

  -- 有分组标签但用户未登录 → 不可见
  IF viewer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 检查用户分组标签是否与书籍分组标签有交集
  SELECT group_tags INTO viewer_tags
  FROM profiles
  WHERE id = viewer_id;

  SELECT COUNT(*) INTO match_count
  FROM book_group_tags
  WHERE book_id = book_row.id
    AND group_tag = ANY(viewer_tags);

  RETURN match_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. updated_at 自动更新触发器
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. 消息生成辅助函数
--    为有权查看指定公共书籍的用户分发消息
-- ============================================================

CREATE OR REPLACE FUNCTION distribute_message_to_visible_users(
  p_message_id UUID,
  p_book_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_messages (user_id, message_id)
  SELECT p.id, p_message_id
  FROM profiles p
  WHERE p.id != auth.uid()  -- 排除操作者自己
    AND (
      -- 书籍无分组标签 → 所有用户
      NOT EXISTS (
        SELECT 1 FROM book_group_tags WHERE book_id = p_book_id
      )
      OR
      -- 书籍有分组标签 → 匹配用户标签
      EXISTS (
        SELECT 1 FROM book_group_tags bgt
        WHERE bgt.book_id = p_book_id
          AND bgt.group_tag = ANY(p.group_tags)
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. 公共书籍上传消息触发器
--    管理员上传公共书籍时自动生成通知
-- ============================================================

CREATE OR REPLACE FUNCTION notify_public_book_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_message_id UUID;
  v_uploader_role TEXT;
  v_nickname TEXT;
BEGIN
  IF NEW.type != 'public' THEN RETURN NEW; END IF;
  SELECT role, nickname INTO v_uploader_role, v_nickname FROM profiles WHERE id = NEW.uploader_id;
  IF v_uploader_role != 'admin' THEN RETURN NEW; END IF;
  v_nickname := COALESCE(v_nickname, '管理员');
  INSERT INTO messages (type, title, content, related_book_id)
  VALUES ('book_upload', '新书上架', v_nickname || ' 上传了新书《' || NEW.title || '》', NEW.id)
  RETURNING id INTO v_message_id;
  PERFORM distribute_message_to_visible_users(v_message_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_public_book_upload
  AFTER INSERT ON books
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_book_upload();

-- ============================================================
-- 6. 公共书籍编辑消息触发器
--    管理员编辑公共书籍信息时自动生成通知
-- ============================================================

CREATE OR REPLACE FUNCTION notify_public_book_update()
RETURNS TRIGGER AS $$
DECLARE
  v_message_id UUID;
  v_updater_role TEXT;
  v_nickname TEXT;
BEGIN
  IF NEW.type != 'public' THEN RETURN NEW; END IF;
  SELECT role, nickname INTO v_updater_role, v_nickname FROM profiles WHERE id = auth.uid();
  IF v_updater_role != 'admin' THEN RETURN NEW; END IF;
  IF OLD.title = NEW.title AND OLD.author IS NOT DISTINCT FROM NEW.author AND OLD.description IS NOT DISTINCT FROM NEW.description AND OLD.cover_url IS NOT DISTINCT FROM NEW.cover_url AND OLD.published_date IS NOT DISTINCT FROM NEW.published_date THEN RETURN NEW; END IF;
  v_nickname := COALESCE(v_nickname, '管理员');
  INSERT INTO messages (type, title, content, related_book_id)
  VALUES ('book_update', '书籍信息更新', v_nickname || ' 更新了《' || NEW.title || '》的信息', NEW.id)
  RETURNING id INTO v_message_id;
  PERFORM distribute_message_to_visible_users(v_message_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_public_book_update
  AFTER UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_book_update();

-- ============================================================
-- 7. 公共书籍批注消息触发器
--    管理员对公共书籍添加批注时自动生成通知
-- ============================================================

CREATE OR REPLACE FUNCTION notify_public_book_annotation()
RETURNS TRIGGER AS $$
DECLARE
  v_message_id UUID;
  v_book_type TEXT;
  v_book_title TEXT;
  v_nickname TEXT;
BEGIN
  SELECT type, title INTO v_book_type, v_book_title FROM books WHERE id = NEW.book_id;
  IF v_book_type != 'public' THEN RETURN NEW; END IF;
  SELECT nickname INTO v_nickname FROM profiles WHERE id = NEW.user_id;
  v_nickname := COALESCE(v_nickname, '用户');
  INSERT INTO messages (type, title, content, related_book_id, related_annotation_id, related_page_number)
  VALUES (
    'annotation', '新批注',
    v_nickname || '在《' || v_book_title || '》第 ' || NEW.page_number || ' 页添加了' ||
      CASE WHEN NEW.type = 'highlight' THEN '高亮' ELSE '笔记' END,
    NEW.book_id, NEW.id, NEW.page_number
  )
  RETURNING id INTO v_message_id;
  PERFORM distribute_message_to_visible_users(v_message_id, NEW.book_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_public_book_annotation
  AFTER INSERT ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_book_annotation();

-- ============================================================
-- 复制公共书籍到个人书架
-- ============================================================
CREATE OR REPLACE FUNCTION copy_book_to_personal(p_book_id UUID)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '未登录';
  END IF;

  INSERT INTO books (title, author, description, cover_url, file_path, type, uploader_id, published_date)
  SELECT title, author, description, cover_url, file_path, 'private', v_uid, published_date
  FROM books
  WHERE id = p_book_id AND type = 'public'
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION '书籍不存在或非公共书籍';
  END IF;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
