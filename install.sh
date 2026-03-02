#!/bin/bash
# 学生智能排座系统 - 快速启动脚本

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║       🪑 学生智能排座系统 - 安装向导                     ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js (>= 16.0.0)"
    exit 1
fi
echo "✅ Node.js 版本：$(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到 npm"
    exit 1
fi
echo "✅ npm 版本：$(npm -v)"

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  未检测到 MySQL 命令行工具，请确保 MySQL 服务已运行"
fi

echo ""
echo "📦 步骤 1/4: 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "⚙️  步骤 2/4: 检查配置文件..."
if [ ! -f .env ]; then
    echo "📝 创建 .env 配置文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，配置正确的数据库连接信息"
    echo ""
    read -p "按回车键继续..."
fi

echo ""
echo "🗄️  步骤 3/4: 初始化数据库..."
node scripts/init-db.js

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

echo ""
echo "🚀 步骤 4/4: 启动服务..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "✅ 安装完成！服务即将启动..."
echo ""
echo "📍 访问地址：http://localhost:3000"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# 启动服务
npm start
