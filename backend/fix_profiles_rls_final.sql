-- ============================================================
-- 最终修复: profiles 表 RLS 无限递归问题
-- ============================================================
-- 
-- 问题根源:
-- profiles_select 策略使用 is_admin() 函数
-- is_admin() 函数查询 profiles 表
-- 这导致无限递归: profiles_select -> is_admin() -> profiles_select -> ...
--
-- 解决方案:
-- 使用 auth.jwt() 从 JWT token 中获取角色信息
-- 避免在 RLS 策略中查询 profiles 表
-- ============================================================

-- 1. 删除有问题的策略
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS profiles_update_admin ON profiles;

-- 2. 创建基于 JWT 的管理员检查函数
-- 这个函数从 JWT token 中读取角色，不查询 profiles 表
CREATE OR REPLACE FUNCTION is_admin_jwt()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE;

-- 3. 创建新的 SELECT 策略
-- 自己可见，或者是 admin（通过 JWT 判断）
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    auth.uid() = id OR is_admin_jwt()
  );

-- 4. 创建新的 UPDATE 策略
-- 普通用户只能更新自己的资料
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 管理员可以更新任何人的资料
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (is_admin_jwt())
  WITH CHECK (is_admin_jwt());

-- ============================================================
-- 重要说明:
-- 
-- 这个方案依赖于 JWT token 中包含 role 信息。
-- 如果 JWT 中没有 role 信息，需要:
-- 1. 修改 Supabase auth hooks 或 triggers
-- 2. 在用户登录时将 role 添加到 JWT claims
--
-- 临时替代方案:
-- 如果 JWT 中没有 role，使用以下策略（仅允许查看自己）:
-- 
-- CREATE POLICY profiles_select ON profiles
--   FOR SELECT USING (auth.uid() = id);
-- ============================================================

-- 5. 验证修复
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'profiles' AND policyname LIKE 'profiles_%';
  
  RAISE NOTICE 'profiles 表当前有 % 个策略', policy_count;
END $$;
