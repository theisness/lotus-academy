#!/bin/bash
# 莲花书院数据库导出脚本
# 用法: bash export_db.sh
# 每次修改数据库结构后运行，更新 init_roles.sql 和 init_schema.sql

set -e
COMPOSE_DIR="/opt/lotus-academy/docker"
MIGRATIONS_DIR="/opt/lotus-academy/backend/supabase"
DB_CONTAINER="lotus-academy-db-1"

source "$COMPOSE_DIR/.env"

echo "==> 导出角色..."
docker exec $DB_CONTAINER bash -c \
  "PGPASSWORD=$POSTGRES_PASSWORD pg_dumpall -h localhost -U supabase_admin --roles-only" \
  > "$MIGRATIONS_DIR/init_roles.sql"

echo "==> 导出 schema..."
docker exec $DB_CONTAINER bash -c \
  "PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h localhost -U supabase_admin -d postgres --schema-only" \
  > "$MIGRATIONS_DIR/init_schema.sql"

echo "==> 导出 auth.schema_migrations..."
docker exec $DB_CONTAINER bash -c \
  "PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U supabase_admin -d postgres -t -c 'SELECT version FROM auth.schema_migrations ORDER BY version;'" \
  | tr -d ' ' | grep -v '^$' > "$MIGRATIONS_DIR/auth_migrations_seed.txt"

echo ""
echo "导出完成："
wc -l "$MIGRATIONS_DIR/init_roles.sql" "$MIGRATIONS_DIR/init_schema.sql" "$MIGRATIONS_DIR/auth_migrations_seed.txt"
echo ""
echo "记得 git commit 这三个文件！"
