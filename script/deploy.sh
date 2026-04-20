#!/usr/bin/env bash
# ============================================
# 莲花书院 — 一键部署脚本
# 用法: bash script/deploy.sh [up|down|restart|logs|build]
# ============================================

set -euo pipefail

# 项目根目录（脚本所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_DIR="$PROJECT_ROOT/docker"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# 检查 Docker 和 Docker Compose
check_deps() {
    command -v docker >/dev/null 2>&1 || error "未找到 docker，请先安装 Docker"
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        error "未找到 docker compose 或 docker-compose，请先安装"
    fi
}

# 检查 .env 文件
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        warn ".env 文件不存在，正在从 .env.example 复制..."
        if [ -f "$COMPOSE_DIR/.env.example" ]; then
            cp "$COMPOSE_DIR/.env.example" "$ENV_FILE"
            warn "已创建 $ENV_FILE，请根据实际环境修改配置后重新运行"
            exit 1
        else
            error "未找到 .env.example 文件"
        fi
    fi
}

# 构建镜像
cmd_build() {
    info "构建前端镜像..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache frontend
    info "构建完成"
}

# 启动服务
cmd_up() {
    info "启动莲花书院服务..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    info "所有服务已启动"
    echo ""
    info "访问地址:"
    echo "  前端:     http://localhost"
    echo "  API:      http://localhost/api"
    echo "  Studio:   http://localhost:3002"
    echo ""
    info "查看日志: bash script/deploy.sh logs"
}

# 停止服务
cmd_down() {
    info "停止莲花书院服务..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    info "所有服务已停止"
}

# 重启服务
cmd_restart() {
    info "重启莲花书院服务..."
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
    info "所有服务已重启"
}

# 查看日志
cmd_logs() {
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=100
}

# 查看状态
cmd_status() {
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

# 主入口
main() {
    check_deps
    check_env

    local action="${1:-up}"

    case "$action" in
        build)   cmd_build ;;
        up)      cmd_build; cmd_up ;;
        down)    cmd_down ;;
        restart) cmd_restart ;;
        logs)    cmd_logs ;;
        status)  cmd_status ;;
        *)
            echo "用法: bash script/deploy.sh [build|up|down|restart|logs|status]"
            echo ""
            echo "  build    仅构建前端镜像"
            echo "  up       构建并启动所有服务（默认）"
            echo "  down     停止并移除所有服务"
            echo "  restart  重启所有服务"
            echo "  logs     查看实时日志"
            echo "  status   查看服务状态"
            exit 1
            ;;
    esac
}

main "$@"
