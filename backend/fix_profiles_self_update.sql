-- ============================================================
-- 修复: 防止普通用户通过 profiles_update_self 策略提权
-- 问题: 原策略允许用户修改自己 profile 的所有字段，包括 role 和 group_tags
-- 方案: 添加 WITH CHECK 约束，确保非管理员不能修改 role 和 group_tags
-- ============================================================

-- 删除原有的自我更新策略
DROP POLICY IF EXISTS profiles_update_self ON profiles;

-- 重新创建：普通用户只能更新自己的 profile，且不能修改 role 和 group_tags
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND group_tags = (SELECT p.group_tags FROM profiles p WHERE p.id = auth.uid())
  );
