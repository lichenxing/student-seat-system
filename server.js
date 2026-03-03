/**
 * 学生智能排座系统 - 后端服务器
 * Student Smart Seat Arrangement System - Backend Server
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Puppeteer for PDF generation
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (e) {
    console.warn('⚠️ Puppeteer 未安装，PDF功能将不可用');
}

// CORS 配置 - 支持域名访问
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'https://chenxing.live', 'http://chenxing.live'];

app.use(cors({
    origin: function (origin, callback) {
        // 允许无来源的请求（如移动应用或 curl）
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS 拒绝访问: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        domain: process.env.DOMAIN || 'localhost'
    });
});

// MySQL 连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seat_arrangement',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL 数据库连接成功');
        connection.release();
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        console.log('请检查 .env 配置文件和 MySQL 服务状态');
    }
}

// ==================== 学生管理 API ====================

// 获取所有学生
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM students ORDER BY created_at DESC'
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取单个学生
app.get('/api/students/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM students WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '学生不存在' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加学生
app.post('/api/students', async (req, res) => {
    try {
        const { name, student_no, gender, height, rank, tags, note } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO students (name, student_no, gender, height, \`rank\`, tags, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, student_no, gender, height, rank, JSON.stringify(tags || []), note]
        );
        
        res.json({ success: true, data: { id: result.insertId }, message: '学生添加成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 更新学生
app.put('/api/students/:id', async (req, res) => {
    try {
        const { name, student_no, gender, height, rank, tags, note } = req.body;
        
        await pool.query(
            `UPDATE students SET name = ?, student_no = ?, gender = ?, height = ?, 
             \`rank\` = ?, tags = ?, note = ? WHERE id = ?`,
            [name, student_no, gender, height, rank, JSON.stringify(tags || []), note, req.params.id]
        );
        
        res.json({ success: true, message: '学生信息更新成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除学生
app.delete('/api/students/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: '学生删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 批量添加学生
app.post('/api/students/batch', async (req, res) => {
    try {
        const { students } = req.body;
        const values = students.map(s => [
            s.name, s.student_no, s.gender, s.height, s.rank, 
            JSON.stringify(s.tags || []), s.note
        ]);
        
        const [result] = await pool.query(
            `INSERT INTO students (name, student_no, gender, height, \`rank\`, tags, note) 
             VALUES ?`,
            [values]
        );
        
        res.json({ success: true, data: { inserted: result.affectedRows }, message: '批量添加成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== 座位方案 API ====================

// 获取所有方案
app.get('/api/plans', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, l.rows_count, l.cols_count, l.aisle_positions 
             FROM seat_plans p 
             LEFT JOIN classroom_layouts l ON p.layout_id = l.id 
             ORDER BY p.created_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 获取单个方案详情（包含座位分配）
app.get('/api/plans/:id', async (req, res) => {
    try {
        // 获取方案信息
        const [plans] = await pool.query(
            `SELECT p.*, l.rows_count, l.cols_count, l.aisle_positions, l.total_seats
             FROM seat_plans p 
             LEFT JOIN classroom_layouts l ON p.layout_id = l.id 
             WHERE p.id = ?`,
            [req.params.id]
        );
        
        if (plans.length === 0) {
            return res.status(404).json({ success: false, message: '方案不存在' });
        }
        
        // 获取座位分配
        const [assignments] = await pool.query(
            `SELECT sa.*, s.name, s.student_no, s.gender, s.height, s.\`rank\`, s.tags, s.note
             FROM seat_assignments sa 
             JOIN students s ON sa.student_id = s.id 
             WHERE sa.plan_id = ?
             ORDER BY sa.row_num, sa.col_num`,
            [req.params.id]
        );
        
        res.json({ 
            success: true, 
            data: {
                ...plans[0],
                assignments
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 创建新方案
app.post('/api/plans', async (req, res) => {
    try {
        const { name, layout_id, arrangement_type } = req.body;
        
        const [result] = await pool.query(
            `INSERT INTO seat_plans (name, layout_id, arrangement_type) VALUES (?, ?, ?)`,
            [name, layout_id || 1, arrangement_type || 'manual']
        );
        
        res.json({ success: true, data: { id: result.insertId }, message: '方案创建成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 保存座位分配
app.post('/api/plans/:id/assignments', async (req, res) => {
    try {
        const { assignments } = req.body;
        const planId = req.params.id;
        
        // 开启事务
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // 删除旧的分配
            await connection.query('DELETE FROM seat_assignments WHERE plan_id = ?', [planId]);
            
            // 插入新的分配
            if (assignments && assignments.length > 0) {
                const values = assignments.map(a => [
                    planId, a.student_id, a.row_num, a.col_num
                ]);
                
                await connection.query(
                    `INSERT INTO seat_assignments (plan_id, student_id, row_num, col_num) VALUES ?`,
                    [values]
                );
            }
            
            // 更新方案时间
            await connection.query(
                'UPDATE seat_plans SET updated_at = NOW() WHERE id = ?',
                [planId]
            );
            
            await connection.commit();
            res.json({ success: true, message: '座位分配保存成功' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 删除方案
app.delete('/api/plans/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM seat_plans WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: '方案删除成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== 智能排座 API ====================

// 智能排座算法
app.post('/api/arrange', async (req, res) => {
    try {
        const { type, layout_id, exclude_ids = [] } = req.body;
        
        // 获取布局信息
        const [layouts] = await pool.query(
            'SELECT * FROM classroom_layouts WHERE id = ?',
            [layout_id || 1]
        );
        
        if (layouts.length === 0) {
            return res.status(404).json({ success: false, message: '布局不存在' });
        }
        
        const layout = layouts[0];
        
        // 获取所有学生（排除已删除的）
        let query = 'SELECT * FROM students WHERE 1=1';
        if (exclude_ids.length > 0) {
            query += ` AND id NOT IN (${exclude_ids.join(',')})`;
        }
        
        const [students] = await pool.query(query);
        
        if (students.length === 0) {
            return res.status(400).json({ success: false, message: '没有可用学生' });
        }
        
        if (students.length > layout.total_seats) {
            return res.status(400).json({ 
                success: false, 
                message: `学生人数(${students.length})超过座位数(${layout.total_seats})` 
            });
        }
        
        // 执行排座算法
        let arranged = [];
        
        switch (type) {
            case 'random':
                arranged = arrangeRandom(students, layout);
                break;
            case 'rank':
                arranged = arrangeByRank(students, layout);
                break;
            case 'gender':
                arranged = arrangeByGender(students, layout);
                break;
            case 'height':
                arranged = arrangeByHeight(students, layout);
                break;
            default:
                arranged = arrangeRandom(students, layout);
        }
        
        res.json({ success: true, data: arranged });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 随机排座
function arrangeRandom(students, layout) {
    // 随机打乱
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    return assignSeats(shuffled, layout);
}

// 按排名排座（排名靠前的优先前排中间）
function arrangeByRank(students, layout) {
    // 按排名升序（排名数字小的在前）
    const sorted = [...students].sort((a, b) => (a.rank || 999) - (b.rank || 999));
    return assignSeats(sorted, layout);
}

// 男女交替排座
function arrangeByGender(students, layout) {
    const males = students.filter(s => s.gender === '男');
    const females = students.filter(s => s.gender === '女');
    
    const mixed = [];
    let mIdx = 0, fIdx = 0;
    
    // 交替排列
    while (mIdx < males.length || fIdx < females.length) {
        if (mIdx < males.length) mixed.push(males[mIdx++]);
        if (fIdx < females.length) mixed.push(females[fIdx++]);
    }
    
    return assignSeats(mixed, layout);
}

// 按身高排座（矮的在前，高的在后）
function arrangeByHeight(students, layout) {
    // 按身高升序（矮的在前）
    const sorted = [...students].sort((a, b) => (a.height || 170) - (b.height || 170));
    return assignSeats(sorted, layout);
}

// 分配座位到网格（从前排到后排，每行从左到右）
function assignSeats(students, layout) {
    const assignments = [];
    let studentIdx = 0;
    
    for (let row = 1; row <= layout.rows_count && studentIdx < students.length; row++) {
        for (let col = 1; col <= layout.cols_count && studentIdx < students.length; col++) {
            // 不预留过道，所有列都用于排座
            assignments.push({
                student_id: students[studentIdx].id,
                row_num: row,
                col_num: col,
                student: students[studentIdx]
            });
            studentIdx++;
        }
    }
    
    return assignments;
}

// ==================== 数据导入导出 API ====================

// 文件上传配置
const upload = multer({ dest: 'uploads/' });

// 导入 Excel
app.post('/api/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '请选择文件' });
        }
        
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        // 解析并插入数据
        const students = [];
        for (const row of data) {
            const name = row['姓名'] || row['name'] || row['Name'];
            if (name) {
                students.push({
                    name: String(name).trim(),
                    student_no: String(row['学号'] || row['number'] || row['Number'] || ''),
                    gender: row['性别'] || row['gender'] || row['Gender'] || null,
                    height: parseInt(row['身高'] || row['height'] || row['Height']) || null,
                    rank: parseInt(row['排名'] || row['rank'] || row['Rank']) || null,
                    tags: [],
                    note: String(row['备注'] || row['note'] || row['Note'] || '')
                });
            }
        }
        
        // 清理临时文件
        fs.unlinkSync(req.file.path);
        
        // 批量插入
        if (students.length > 0) {
            const values = students.map(s => [
                s.name, s.student_no, s.gender, s.height, s.rank,
                JSON.stringify(s.tags), s.note
            ]);
            
            const [result] = await pool.query(
                `INSERT INTO students (name, student_no, gender, height, \`rank\`, tags, note) VALUES ?`,
                [values]
            );
            
            res.json({ 
                success: true, 
                data: { imported: result.affectedRows },
                message: `成功导入 ${result.affectedRows} 名学生`
            });
        } else {
            res.status(400).json({ success: false, message: '未找到有效数据' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 导出 Excel
app.get('/api/export', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students ORDER BY id');
        
        // 转换数据 - tags 从 MySQL JSON 字段读取时已经是数组
        const data = students.map(s => {
            let tags = s.tags || [];
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    tags = [];
                }
            }
            return {
                '姓名': s.name,
                '学号': s.student_no,
                '性别': s.gender,
                '身高': s.height,
                '排名': s.rank,
                '标签': Array.isArray(tags) ? tags.join(', ') : '',
                '备注': s.note
            };
        });
        
        // 创建工作簿
        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, '学生名单');
        
        // 设置列宽
        worksheet['!cols'] = [
            { wch: 10 }, { wch: 15 }, { wch: 8 },
            { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 30 }
        ];
        
        // 生成文件
        const exportPath = path.join(__dirname, 'uploads', 'students_export.xlsx');
        xlsx.writeFile(workbook, exportPath);
        
        res.download(exportPath, `学生名单_${new Date().toISOString().split('T')[0]}.xlsx`, (err) => {
            if (err) {
                console.error('下载失败:', err);
            }
            // 清理文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== 教室布局 API ====================

app.get('/api/layouts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM classroom_layouts ORDER BY id');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== PDF打印 API ====================

app.post('/api/print', async (req, res) => {
    if (!puppeteer) {
        return res.status(500).json({ success: false, message: 'PDF生成功能未启用，请安装puppeteer' });
    }
    
    try {
        const { assignments, layout, planName = '座位表', className = '' } = req.body;
        
        if (!assignments || !layout) {
            return res.status(400).json({ success: false, message: '缺少排座数据' });
        }
        
        // 生成座位表HTML
        const html = generateSeatPDFHTML(assignments, layout, planName, className);
        
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // 生成PDF
        const pdf = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        });
        
        await browser.close();
        
        // 发送PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(planName)}_${new Date().toISOString().split('T')[0]}.pdf"`);
        res.setHeader('Content-Length', pdf.length);
        res.end(pdf);
        
    } catch (error) {
        console.error('PDF生成失败:', error);
        res.status(500).json({ success: false, message: 'PDF生成失败: ' + error.message });
    }
});

// 生成座位表PDF的HTML模板
function generateSeatPDFHTML(assignments, layout, planName, className) {
    const rows = layout.rows_count || 7;
    const cols = layout.cols_count || 7;
    
    // 构建座位网格
    let seatGridHTML = '';
    for (let row = 1; row <= rows; row++) {
        seatGridHTML += '<div class="seat-row">';
        for (let col = 1; col <= cols; col++) {
            const assignment = assignments.find(a => a.row_num === row && a.col_num === col);
            const student = assignment?.student;
            
            if (student) {
                const genderColor = student.gender === '女' ? '#ff6b9d' : '#4ecdc4';
                seatGridHTML += `
                    <div class="seat-cell occupied" style="border-color: ${genderColor}">
                        <div class="seat-name">${student.name}</div>
                        <div class="seat-no">${student.student_no || ''}</div>
                        <div class="seat-info">${student.gender || ''} ${student.rank ? '排名' + student.rank : ''}</div>
                    </div>
                `;
            } else {
                seatGridHTML += `
                    <div class="seat-cell empty">
                        <div class="seat-empty">空</div>
                    </div>
                `;
            }
        }
        seatGridHTML += '</div>';
    }
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${planName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Microsoft YaHei", "SimHei", sans-serif;
            padding: 20px;
            background: #fff;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4a90d9;
        }
        .title {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            color: #666;
        }
        .info {
            margin-top: 15px;
            font-size: 14px;
            color: #999;
        }
        .classroom {
            margin: 30px 0;
        }
        .podium {
            text-align: center;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 24px;
            font-weight: bold;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .seat-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .seat-row {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .seat-cell {
            width: 100px;
            height: 80px;
            border: 2px solid #ddd;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .seat-cell.occupied {
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            border-width: 3px;
        }
        .seat-cell.empty {
            background: #f8f9fa;
            border-style: dashed;
        }
        .seat-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
        }
        .seat-no {
            font-size: 12px;
            color: #666;
            margin-bottom: 2px;
        }
        .seat-info {
            font-size: 11px;
            color: #999;
        }
        .seat-empty {
            font-size: 16px;
            color: #ccc;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
        .legend {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 30px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
        }
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 2px solid;
        }
        .legend-male { background: #e6f7f5; border-color: #4ecdc4; }
        .legend-female { background: #ffe6f0; border-color: #ff6b9d; }
        .legend-empty { background: #f8f9fa; border-color: #ddd; border-style: dashed; }
        @media print {
            body { padding: 10px; }
            .seat-cell { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${planName}</div>
        ${className ? `<div class="subtitle">${className}</div>` : ''}
        <div class="info">生成时间：${new Date().toLocaleString('zh-CN')} | 座位布局：${rows}行 × ${cols}列</div>
    </div>
    
    <div class="classroom">
        <div class="podium">📋 讲 台</div>
        <div class="seat-grid">
            ${seatGridHTML}
        </div>
    </div>
    
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color legend-male"></div>
            <span>男生</span>
        </div>
        <div class="legend-item">
            <div class="legend-color legend-female"></div>
            <span>女生</span>
        </div>
        <div class="legend-item">
            <div class="legend-color legend-empty"></div>
            <span>空座位</span>
        </div>
    </div>
    
    <div class="footer">
        学生智能排座系统生成 | https://chenxing.live
    </div>
</body>
</html>
    `;
}

// ==================== 启动服务 ====================

app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🪑 学生智能排座系统 - 后端服务已启动               ║
║                                                          ║
║   服务地址: http://localhost:${PORT}                      ║
║   API文档: http://localhost:${PORT}/api/students          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    await testConnection();
});

module.exports = app;
