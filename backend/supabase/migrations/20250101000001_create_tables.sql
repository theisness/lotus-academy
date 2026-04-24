-- ============================================================
-- Migration: 创建所有数据表
-- 莲花书院 — 表结构定义
-- ============================================================

-- 1. profiles — 用户资料表
-- 扩展 Supabase Auth 的 auth.users 表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  group_tags TEXT[] NOT NULL DEFAULT '{}',
  page_preference TEXT CHECK (page_preference IN ('public', 'private')),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS '用户资料表，扩展 auth.users';
COMMENT ON COLUMN profiles.role IS '用户角色: admin | user';
COMMENT ON COLUMN profiles.group_tags IS '分组标签数组，用于控制公共书籍可见性';
COMMENT ON COLUMN profiles.page_preference IS '页面偏好: public | private';

-- 2. books — 书籍表
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  cover_url TEXT,
  file_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public', 'private')),
  uploader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER DEFAULT 0
);

COMMENT ON TABLE books IS '书籍表';
COMMENT ON COLUMN books.type IS '书籍类型: public（公共）| private（私有）';
COMMENT ON COLUMN books.file_path IS 'Supabase Storage 中的 PDF 文件路径';

-- 3. annotations — 批注表
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('highlight', 'note')),
  position JSONB NOT NULL,
  color TEXT,
  content TEXT,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE annotations IS '批注表（高亮、笔记）';
COMMENT ON COLUMN annotations.position IS 'react-pdf-highlighter-extended 格式的位置数据';

-- 4. categories — 栏目表
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shelf_type TEXT NOT NULL CHECK (shelf_type IN ('public', 'private')),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE categories IS '栏目表，用于书架分组';
COMMENT ON COLUMN categories.shelf_type IS '书架类型: public（公共）| private（个人）';

-- 5. book_categories — 书籍-栏目关联表
CREATE TABLE book_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE (book_id, category_id)
);

COMMENT ON TABLE book_categories IS '书籍与栏目的多对多关联表';

-- 6. book_group_tags — 书籍分组标签表
CREATE TABLE book_group_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  group_tag TEXT NOT NULL,
  UNIQUE (book_id, group_tag)
);

COMMENT ON TABLE book_group_tags IS '公共书籍的可见性分组标签';

-- 7. messages — 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('book_upload', 'annotation', 'book_update')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  related_annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL,
  related_page_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS '系统消息表';
COMMENT ON COLUMN messages.type IS '消息类型: book_upload | annotation | book_update';

-- 8. user_messages — 用户消息表
CREATE TABLE user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  UNIQUE (user_id, message_id)
);

COMMENT ON TABLE user_messages IS '用户消息接收与已读状态';

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX idx_books_type ON books(type);
CREATE INDEX idx_books_uploader_id ON books(uploader_id);
CREATE INDEX idx_annotations_book_id ON annotations(book_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_annotations_page_number ON annotations(book_id, page_number);
CREATE INDEX idx_categories_shelf_type ON categories(shelf_type);
CREATE INDEX idx_categories_owner_id ON categories(owner_id);
CREATE INDEX idx_book_categories_book_id ON book_categories(book_id);
CREATE INDEX idx_book_categories_category_id ON book_categories(category_id);
CREATE INDEX idx_book_group_tags_book_id ON book_group_tags(book_id);
CREATE INDEX idx_book_group_tags_group_tag ON book_group_tags(group_tag);
CREATE INDEX idx_messages_related_book_id ON messages(related_book_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_user_messages_user_id ON user_messages(user_id);
CREATE INDEX idx_user_messages_message_id ON user_messages(message_id);
CREATE INDEX idx_user_messages_is_read ON user_messages(user_id, is_read);
