-- 修复 profiles 无限递归 RLS 策略
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;
DROP POLICY IF EXISTS profiles_update_admin ON profiles;

-- SELECT: 用 security definer 函数避免递归
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- SELECT: 自己可见，或者是 admin（通过 security definer 函数）
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    auth.uid() = id OR is_admin()
  );

-- UPDATE self
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE admin
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());
