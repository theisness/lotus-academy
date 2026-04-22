# 莲花书院数据库迁移同步脚本 (Windows)
# 用法: .\run_migrations.ps1

param(
    [string]$MigrationsDir = "D:\project\lotus-book-new\backend\supabase\migrations",
    [string]$DbContainer = "backend-db-1"
)

$ErrorActionPreference = "Stop"
$pgPassword = $env:POSTGRES_PASSWORD

Write-Host "==> 检查数据库连接..." -ForegroundColor Cyan

docker exec $DbContainer pg_isready -U supabase_admin -h localhost 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "数据库连接失败！" -ForegroundColor Red
    exit 1
}

Write-Host "==> 运行迁移文件..." -ForegroundColor Cyan

$migrations = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name

foreach ($migration in $migrations) {
    Write-Host "  -> $($migration.Name)" -ForegroundColor Gray
    Get-Content $migration.FullName | docker exec -i $DbContainer bash -c "PGPASSWORD=$pgPassword psql -h localhost -U supabase_admin -d postgres" 2>&1
}

Write-Host "==> 完成！" -ForegroundColor Green
