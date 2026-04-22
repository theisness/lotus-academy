-- 添加 email 字段到 profiles 表，并同步 auth.users 的邮箱

-- 1. 添加 email 列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN profiles.email IS '用户邮箱，从 auth.users 同步';

-- 2. 创建同步邮箱的函数
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email, updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建触发器（在 email 变化时同步）
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- 4. 同步现有用户的邮箱
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS DISTINCT FROM u.email;
