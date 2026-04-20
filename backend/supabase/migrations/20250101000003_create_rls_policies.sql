-- ============================================================
-- Migration: RLS 行级安全策略
-- 莲花书院 — 权限控制
-- ============================================================

-- ============================================================
-- 启用 RLS
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_group_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles 表策略
-- ============================================================

-- SELECT: 用 security definer 函数避免递归
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- SELECT: 自己可见，或者是 admin
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    auth.uid() = id OR is_admin()
  );

-- UPDATE: 普通用户仅修改自己的昵称、头像、简介、页面偏好（不可修改 role 和 group_tags）
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND group_tags = (SELECT p.group_tags FROM profiles p WHERE p.id = auth.uid())
  );

-- 管理员可更新任何用户的 profile（包括 role 和 group_tags）
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- books 表策略
-- ============================================================

-- SELECT: 私有书籍仅所有者可见，公共书籍根据分组标签可见性判断
CREATE POLICY books_select ON books
  FOR SELECT USING (
    is_book_visible(books, auth.uid())
  );

-- INSERT: 私有书籍 → 已登录用户可上传；公共书籍 → 仅管理员
CREATE POLICY books_insert ON books
  FOR INSERT WITH CHECK (
    auth.uid() = uploader_id
    AND (
      type = 'private'
      OR (
        type = 'public'
        AND EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- UPDATE: 私有书籍 → 仅所有者；公共书籍 → 仅管理员
CREATE POLICY books_update ON books
  FOR UPDATE USING (
    (type = 'private' AND uploader_id = auth.uid())
    OR (
      type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  ) WITH CHECK (
    (type = 'private' AND uploader_id = auth.uid())
    OR (
      type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- DELETE: 私有书籍 → 仅所有者；公共书籍 → 仅管理员
CREATE POLICY books_delete ON books
  FOR DELETE USING (
    (type = 'private' AND uploader_id = auth.uid())
    OR (
      type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================================
-- annotations 表策略
-- ============================================================

-- SELECT: 私有书籍批注 → 仅书籍所有者；公共书籍批注 → 有权查看该书籍的用户
CREATE POLICY annotations_select ON annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = annotations.book_id
        AND is_book_visible(b, auth.uid())
    )
  );

-- INSERT: 私有书籍 → 仅书籍所有者；公共书籍 → 仅管理员
CREATE POLICY annotations_insert ON annotations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = book_id
        AND (
          (b.type = 'private' AND b.uploader_id = auth.uid())
          OR (
            b.type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  );

-- UPDATE: 私有书籍 → 仅批注所有者（且为书籍所有者）；公共书籍 → 仅管理员
CREATE POLICY annotations_update ON annotations
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = annotations.book_id
        AND (
          (b.type = 'private' AND b.uploader_id = auth.uid())
          OR (
            b.type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  ) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = book_id
        AND (
          (b.type = 'private' AND b.uploader_id = auth.uid())
          OR (
            b.type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  );

-- DELETE: 私有书籍 → 仅批注所有者（且为书籍所有者）；公共书籍 → 仅管理员
CREATE POLICY annotations_delete ON annotations
  FOR DELETE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM books b
      WHERE b.id = annotations.book_id
        AND (
          (b.type = 'private' AND b.uploader_id = auth.uid())
          OR (
            b.type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  );

-- ============================================================
-- categories 表策略
-- ============================================================

-- SELECT: 公共栏目 → 所有人可见（含未登录）；个人栏目 → 仅所有者
CREATE POLICY categories_select ON categories
  FOR SELECT USING (
    shelf_type = 'public'
    OR (shelf_type = 'private' AND owner_id = auth.uid())
  );

-- INSERT: 公共栏目 → 仅管理员；个人栏目 → 仅所有者
CREATE POLICY categories_insert ON categories
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND (
      shelf_type = 'private'
      OR (
        shelf_type = 'public'
        AND EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- UPDATE: 公共栏目 → 仅管理员；个人栏目 → 仅所有者
CREATE POLICY categories_update ON categories
  FOR UPDATE USING (
    (shelf_type = 'private' AND owner_id = auth.uid())
    OR (
      shelf_type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  ) WITH CHECK (
    (shelf_type = 'private' AND owner_id = auth.uid())
    OR (
      shelf_type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- DELETE: 公共栏目 → 仅管理员；个人栏目 → 仅所有者
CREATE POLICY categories_delete ON categories
  FOR DELETE USING (
    (shelf_type = 'private' AND owner_id = auth.uid())
    OR (
      shelf_type = 'public'
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================================
-- book_categories 表策略
-- ============================================================

-- SELECT: 可以看到栏目的用户可以看到关联
CREATE POLICY book_categories_select ON book_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = book_categories.category_id
        AND (
          c.shelf_type = 'public'
          OR (c.shelf_type = 'private' AND c.owner_id = auth.uid())
        )
    )
  );

-- INSERT: 栏目管理者可添加关联
CREATE POLICY book_categories_insert ON book_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = category_id
        AND (
          (c.shelf_type = 'private' AND c.owner_id = auth.uid())
          OR (
            c.shelf_type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  );

-- DELETE: 栏目管理者可移除关联
CREATE POLICY book_categories_delete ON book_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = book_categories.category_id
        AND (
          (c.shelf_type = 'private' AND c.owner_id = auth.uid())
          OR (
            c.shelf_type = 'public'
            AND EXISTS (
              SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            )
          )
        )
    )
  );

-- ============================================================
-- book_group_tags 表策略
-- ============================================================

-- SELECT: 所有已登录用户可查看（用于可见性判断）
CREATE POLICY book_group_tags_select ON book_group_tags
  FOR SELECT USING (true);

-- INSERT: 仅管理员可设置书籍分组标签
CREATE POLICY book_group_tags_insert ON book_group_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: 仅管理员可移除书籍分组标签
CREATE POLICY book_group_tags_delete ON book_group_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- messages 表策略
-- ============================================================

-- SELECT: 已登录用户可查看消息（通过 user_messages 关联过滤）
CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- INSERT: 仅通过触发器（SECURITY DEFINER）插入，不允许直接插入
-- 触发器函数使用 SECURITY DEFINER 绕过 RLS

-- ============================================================
-- user_messages 表策略
-- ============================================================

-- SELECT: 用户仅可查看自己的消息
CREATE POLICY user_messages_select ON user_messages
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- UPDATE: 用户仅可更新自己的消息（标记已读）
CREATE POLICY user_messages_update ON user_messages
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );
