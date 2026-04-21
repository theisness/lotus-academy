-- ============================================================
-- 修复 is_book_visible 函数
-- 确保管理员始终能看到所有公共书籍
-- 执行时间: 2026-04-21
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

-- 验证函数已更新
SELECT 'is_book_visible function updated successfully' AS status;
