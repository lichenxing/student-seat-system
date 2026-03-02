# 🪑 学生智能排座系统

> 专为班主任设计的智能座位排布管理系统

## ✨ 功能特性

### 核心功能
- **四种智能排座规则**
  - 🎲 随机排座 - 完全随机分配
  - 📊 按成绩排座 - 成绩好的优先前排
  - ⚥ 男女交替 - 男女生穿插排列
  - 📏 按身高排座 - 矮的在前，高的在后

- **灵活的手动调整**
  - 拖拽方式调整座位
  - 点击学生查看详情
  - 一键清空座位

- **学生信息管理**
  - 添加/编辑/删除学生
  - 支持学号、性别、身高、成绩等字段
  - 标签系统（调皮、近视、听力差、特殊照顾）

- **数据导入导出**
  - Excel 批量导入学生
  - 导出学生名单
  - 下载导入模板

- **方案管理**
  - 保存多个座位方案
  - 快速切换历史方案
  - 方案命名和分类

### 技术特点
- 🖥️ 直观易用的 Web 界面
- 📱 响应式设计，支持各种屏幕
- 💾 MySQL 数据库持久化存储
- 🔌 RESTful API 接口
- 🎨 现代化 UI 设计

## 📋 系统要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- 现代浏览器（Chrome、Firefox、Edge、Safari）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd seat-system
npm install
```

### 2. 配置数据库

复制配置文件并修改数据库连接信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=seat_arrangement
DB_PORT=3306
PORT=3000
```

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动服务

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

### 5. 访问系统

打开浏览器访问：http://localhost:3000

## 📁 项目结构

```
seat-system/
├── database/
│   └── schema.sql          # 数据库表结构
├── public/
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       └── app.js          # 前端逻辑
├── scripts/
│   └── init-db.js          # 数据库初始化脚本
├── uploads/                # 上传文件临时目录
├── .env.example            # 环境变量示例
├── package.json            # 项目配置
└── server.js               # 后端服务器
```

## 🗄️ 数据库表结构

### students - 学生信息表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(50) | 姓名 |
| student_no | VARCHAR(20) | 学号 |
| gender | ENUM | 性别 |
| height | INT | 身高 (cm) |
| score | DECIMAL | 成绩 |
| tags | JSON | 标签数组 |
| note | TEXT | 备注 |

### classroom_layouts - 教室布局表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(100) | 布局名称 |
| rows_count | INT | 行数 |
| cols_count | INT | 列数 |
| aisle_positions | JSON | 过道位置 |

### seat_plans - 座位方案表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(100) | 方案名称 |
| layout_id | INT | 布局 ID |
| arrangement_type | ENUM | 排座方式 |
| created_at | TIMESTAMP | 创建时间 |

### seat_assignments - 座位分配表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| plan_id | INT | 方案 ID |
| student_id | INT | 学生 ID |
| row_num | INT | 行号 |
| col_num | INT | 列号 |

## 🔌 API 接口

### 学生管理
- `GET /api/students` - 获取所有学生
- `GET /api/students/:id` - 获取单个学生
- `POST /api/students` - 添加学生
- `PUT /api/students/:id` - 更新学生
- `DELETE /api/students/:id` - 删除学生
- `POST /api/students/batch` - 批量添加学生

### 座位方案
- `GET /api/plans` - 获取所有方案
- `GET /api/plans/:id` - 获取方案详情
- `POST /api/plans` - 创建方案
- `POST /api/plans/:id/assignments` - 保存座位分配
- `DELETE /api/plans/:id` - 删除方案

### 智能排座
- `POST /api/arrange` - 执行智能排座
  - 参数：type (random|score|gender|height)

### 数据导入导出
- `POST /api/import` - 导入 Excel
- `GET /api/export` - 导出 Excel

### 教室布局
- `GET /api/layouts` - 获取所有布局

## 📝 Excel 导入格式

| 姓名 | 学号 | 性别 | 身高 | 成绩 | 备注 |
|------|------|------|------|------|------|
| 张三 | 2024001 | 男 | 175 | 85.5 | 活泼好动 |
| 李四 | 2024002 | 女 | 162 | 92 | 视力较弱 |

## 🎨 使用说明

### 智能排座流程

1. **添加学生**
   - 点击"学生管理"标签
   - 手动添加或 Excel 导入学生信息

2. **选择排座规则**
   - 返回"座位排布"标签
   - 选择排座方式（随机/成绩/男女/身高）
   - 点击"一键智能排座"

3. **手动调整**
   - 拖拽学生卡片到座位
   - 拖拽座位上的学生进行交换
   - 点击学生移出座位

4. **保存方案**
   - 点击"保存方案"按钮
   - 输入方案名称
   - 选择排座方式
   - 确认保存

5. **切换方案**
   - 点击"历史方案"标签
   - 点击方案卡片加载

## 🔧 配置选项

### 教室布局
- 默认：7 行 × 8 列 = 56 座位
- 可调整范围：4-10 行，4-10 列
- 适合 50 人班级

### 学生标签
- 😈 调皮 - 需要特别关注
- 👓 近视 - 优先安排前排
- 👂 听力差 - 优先安排前排
- ⭐ 特殊照顾 - 特殊需求

## 🛠️ 开发说明

### 添加新功能

1. 后端 API：在 `server.js` 中添加路由
2. 前端逻辑：在 `public/js/app.js` 中添加方法
3. 数据库：修改 `database/schema.sql`

### 调试模式

```bash
# 查看详细日志
DEBUG=true npm start

# 使用 nodemon 自动重启
npm run dev
```

## 📄 许可证

MIT License

## 👨‍🏫 适用场景

- 中小学班级座位管理
- 培训机构教室安排
- 会议室座位分配
- 考场座位编排

## 💡 最佳实践

1. **定期备份** - 重要方案及时保存
2. **合理标签** - 为学生添加合适的标签便于管理
3. **灵活调整** - 智能排座后根据实际微调
4. **多方案对比** - 保存多个方案供选择

## 🐛 常见问题

**Q: 数据库连接失败？**
A: 检查 MySQL 服务状态和 `.env` 配置

**Q: 导入 Excel 失败？**
A: 确保文件格式正确，第一行为表头

**Q: 拖拽不生效？**
A: 使用现代浏览器，确保 JavaScript 已启用

---

**开发维护**: Teacher Assistant  
**最后更新**: 2024
