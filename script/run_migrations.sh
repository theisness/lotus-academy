#!/bin/bash
# 莲花书院数据库迁移同步脚本
# 用法: bash run_migrations.sh

set -e
MIGRATIONS_DIR="/opt/lotus-academy/backend/supabase/migrations"
DB_CONTAINER="lotus-academy-db-1"
PG_PASSWORD="${POSTGRES_PASSWORD}"

echo "==> 检查数据库连接..."
docker exec $DB_CONTAINER pg_isready -U supabase_admin -h localhost

echo "==> 运行迁移文件..."
for migration in "$MIGRATIONS_DIR"/*.sql; do
    echo "  -> $(basename $migration)"
    cat "$migration" | docker exec -i $DB_CONTAINER bash -c "PGPASSWORD=$PG_PASSWORD psql -h localhost -U supabase_admin -d postgres"
done

echo "==> 完成！"
