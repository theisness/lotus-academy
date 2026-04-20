#!/bin/bash
# 莲花书院数据库一键重建脚本
# 用法: bash rebuild_db.sh
# 前提: 在服务器上运行，docker compose 在 /opt/lotus-academy/docker/

set -e
COMPOSE_DIR="/opt/lotus-academy/docker"
MIGRATIONS_DIR="/opt/lotus-academy/backend/supabase"
DB_CONTAINER="lotus-academy-db-1"

source "$COMPOSE_DIR/.env"
PG="PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U supabase_admin -d postgres"

echo "==> 停止依赖 DB 的服务..."
cd "$COMPOSE_DIR"
docker compose stop rest auth storage realtime

echo "==> 删除旧数据卷..."
docker compose down -v --remove-orphans 2>/dev/null || true
docker volume rm lotus-academy_db_data 2>/dev/null || true

echo "==> 启动 DB..."
docker compose up -d db
echo "等待 DB 就绪..."
until docker exec $DB_CONTAINER pg_isready -U supabase_admin -h localhost -q 2>/dev/null; do sleep 2; done
sleep 3

echo "==> 创建角色..."
docker cp "$MIGRATIONS_DIR/init_roles.sql" $DB_CONTAINER:/tmp/init_roles.sql
docker exec $DB_CONTAINER bash -c "$PG -f /tmp/init_roles.sql" 2>/dev/null || true

echo "==> 初始化 schema..."
docker cp "$MIGRATIONS_DIR/init_schema.sql" $DB_CONTAINER:/tmp/init_schema.sql
docker exec $DB_CONTAINER bash -c "$PG -f /tmp/init_schema.sql"

echo "==> 填充 auth.schema_migrations（跳过 GoTrue 重跑）..."
docker exec $DB_CONTAINER bash -c "$PG -c \"
INSERT INTO auth.schema_migrations (version)
SELECT unnest(ARRAY[
'20171026211738','20171026211808','20171026211834','20180103212743',
'20180108183307','20180119214651','20180125194653','20210710035447',
'20210722035447','20210730183235','20210909172000','20210927181326',
'20211122151130','20211124214934','20211202183645','20220114185221',
'20220114185340','20220224000811','20220323170000','20220429102000',
'20220531120530','20220614074223','20220811173540','20221003041349',
'20221003041400','20221011041400','20221020193600','20221021073300',
'20221021082433','20221027105023','20221114143122','20221114143410',
'20221125140132','20221208132122','20221215195500','20221215195800',
'20221215195900','20230116124310','20230116124412','20230131181311',
'20230322519590','20230402418590','20230411005111','20230508135423',
'20230523124323','20230818113222','20230914180801','20231027141322',
'20231114161723','20231117164230','20240115144230','20240115144932',
'20240214120130','20240306115329','20240314092811','20240427152123',
'20240612123726','20240729123726','20240802193726','20240806073726',
'20241009103726'
]) ON CONFLICT DO NOTHING;\""

echo "==> 启动所有服务..."
docker compose up -d

echo "==> 等待服务就绪..."
sleep 15
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep lotus-academy

echo ""
echo "==> 验证 REST API..."
ANON_KEY=$(grep ANON_KEY "$COMPOSE_DIR/.env" | cut -d= -f2)
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8003/rest/v1/books?select=*" -H "apikey: $ANON_KEY")
echo "REST /books => HTTP $HTTP"
echo ""
echo "完成！如需创建管理员账号，注册后运行："
echo "  docker exec $DB_CONTAINER bash -c \"PGPASSWORD=\$POSTGRES_PASSWORD psql -h localhost -U supabase_admin -d postgres -c \\\"UPDATE profiles SET role='admin' WHERE id='<user_id>';\\\"\""
