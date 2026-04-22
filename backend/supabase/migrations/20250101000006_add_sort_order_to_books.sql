-- 添加 sort_order 字段到 books 表，支持书籍排序

-- 1. 添加 sort_order 列
ALTER TABLE books ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN books.sort_order IS '书籍排序顺序，数字越小越靠前';

-- 2. 创建索引加速排序查询
CREATE INDEX IF NOT EXISTS idx_books_sort_order ON books(type, sort_order);
