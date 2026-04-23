#!/bin/bash
# ============================================
# 莲花书院 — 数据库迁移脚本
# 上传 migrations 到服务器并在 DB 容器中执行
# 用法: bash script/run_migrations.sh [file.sql]
#   无参数: 运行所有迁移文件
#   指定文件: 只运行该文件
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/deploy.env"
MIGRATIONS_DIR="$PROJECT_ROOT/backend/supabase/migrations"
DB_CONTAINER="lotus-academy-db-1"
REMOTE_MIGRATIONS_DIR="/opt/lotus-academy/backend/supabase/migrations"

if [ ! -f "$ENV_FILE" ]; then echo -e "\033[31mERROR: deploy.env not found!\033[0m"; exit 1; fi
set -a; source <(sed 's/\r//; s/^\xEF\xBB\xBF//' "$ENV_FILE"); set +a

# Determine which files to run
if [ -n "$1" ]; then
  if [ -f "$1" ]; then
    FILES=("$1")
  elif [ -f "$MIGRATIONS_DIR/$1" ]; then
    FILES=("$MIGRATIONS_DIR/$1")
  else
    echo -e "\033[31mERROR: Migration file not found: $1\033[0m"; exit 1
  fi
else
  FILES=("$MIGRATIONS_DIR"/*.sql)
fi

echo -e "\033[32m=== Database Migration ===\033[0m"
echo -e "\033[90m  Server: $SSH_HOST:$SSH_PORT\033[0m"
echo -e "\033[90m  Files: ${#FILES[@]}\033[0m"

# 1. Upload
echo -e "\033[36m1/3 Uploading migrations...\033[0m"
scp -P "$SSH_PORT" "${FILES[@]}" "$SSH_HOST:$REMOTE_MIGRATIONS_DIR/"

# 2. Check DB connection
echo -e "\033[36m2/3 Checking database...\033[0m"
ssh -p "$SSH_PORT" "$SSH_HOST" "docker exec -e PGPASSWORD=\$(docker exec $DB_CONTAINER printenv POSTGRES_PASSWORD) $DB_CONTAINER pg_isready -U supabase_admin -h localhost"

# 3. Run migrations
echo -e "\033[36m3/3 Running migrations...\033[0m"
FAILED=0
for f in "${FILES[@]}"; do
  NAME=$(basename "$f")
  echo -n "  -> $NAME ... "
  RESULT=$(ssh -p "$SSH_PORT" "$SSH_HOST" "docker exec -e PGPASSWORD=\$(docker exec $DB_CONTAINER printenv POSTGRES_PASSWORD) -i $DB_CONTAINER psql -U supabase_admin -d postgres < $REMOTE_MIGRATIONS_DIR/$NAME" 2>&1)
  if [ $? -eq 0 ]; then
    echo -e "\033[32mOK\033[0m"
  else
    echo -e "\033[31mFAILED\033[0m"
    echo -e "\033[90m    $RESULT\033[0m"
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo -e "\033[31m=== $FAILED migration(s) failed ===\033[0m"
  exit 1
fi

# Reload PostgREST schema cache
echo -e "\033[36m==> Reloading PostgREST schema cache...\033[0m"
ssh -p "$SSH_PORT" "$SSH_HOST" "docker kill --signal=SIGUSR1 lotus-academy-rest-1" >/dev/null 2>&1
echo -e "\033[32m=== All migrations completed ===\033[0m"
