#!/bin/bash
# 学生智能排座系统 - 部署脚本
# 用于部署到 chenxing.live 域名服务器

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  🪑 学生智能排座系统 - 部署脚本"
echo "  目标域名: https://chenxing.live"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 请使用 sudo 运行此脚本${NC}"
    exit 1
fi

echo "📋 部署步骤:"
echo ""

# 1. 安装依赖
echo -e "${YELLOW}1/6 检查系统依赖...${NC}"
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update
    apt-get install -y nginx
fi

if ! command -v mysql &> /dev/null; then
    echo "安装 MySQL..."
    apt-get install -y mysql-server
fi

echo -e "${GREEN}✓ 依赖检查完成${NC}"
echo ""

# 2. 配置 MySQL
echo -e "${YELLOW}2/6 配置 MySQL 数据库...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS seat_arrangement DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -e "CREATE USER IF NOT EXISTS 'seat_user'@'localhost' IDENTIFIED BY 'seat_pass_2024';" 2>/dev/null || true
mysql -e "GRANT ALL PRIVILEGES ON seat_arrangement.* TO 'seat_user'@'localhost';" 2>/dev/null || true
mysql -e "FLUSH PRIVILEGES;"
echo -e "${GREEN}✓ 数据库配置完成${NC}"
echo ""

# 3. 初始化数据库
echo -e "${YELLOW}3/6 初始化数据库表结构...${NC}"
cd /root/.openclaw/workspace/seat-system
node scripts/init-db.js
echo -e "${GREEN}✓ 数据库初始化完成${NC}"
echo ""

# 4. 配置 Nginx
echo -e "${YELLOW}4/6 配置 Nginx 反向代理...${NC}"
cp deploy/nginx.conf /etc/nginx/sites-available/chenxing.live
ln -sf /etc/nginx/sites-available/chenxing.live /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 检查 Nginx 配置
nginx -t
echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# 5. 安装应用依赖
echo -e "${YELLOW}5/6 安装应用依赖...${NC}"
cd /root/.openclaw/workspace/seat-system
npm install --production
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 6. 创建 Systemd 服务
echo -e "${YELLOW}6/6 创建系统服务...${NC}"
cat > /etc/systemd/system/seat-system.service << 'EOF'
[Unit]
Description=Student Seat Arrangement System
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/seat-system
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable seat-system.service
echo -e "${GREEN}✓ 系统服务创建完成${NC}"
echo ""

# 启动服务
echo "🚀 启动服务..."
systemctl restart seat-system.service
systemctl restart nginx.service

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ 部署完成！${NC}"
echo ""
echo "  🌐 访问地址: https://chenxing.live"
echo "  📡 API 地址: https://chenxing.live/api/students"
echo "  💚 健康检查: https://chenxing.live/health"
echo ""
echo "  📋 常用命令:"
echo "    查看状态: sudo systemctl status seat-system"
echo "    查看日志: sudo journalctl -u seat-system -f"
echo "    重启服务: sudo systemctl restart seat-system"
echo "    重启 Nginx: sudo systemctl restart nginx"
echo ""
echo "═══════════════════════════════════════════════════════════"
