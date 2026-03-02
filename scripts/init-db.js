/**
 * 数据库初始化脚本
 * 运行此脚本将创建数据库和表结构
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
    console.log('🚀 开始初始化数据库...\n');
    
    // 首先连接到 MySQL（不指定数据库）
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });
    
    try {
        // 读取 SQL 文件
        const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');
        let sql = fs.readFileSync(sqlPath, 'utf8');
        
        // 移除 USE 语句，直接操作数据库
        sql = sql.replace('USE seat_arrangement;', '');
        
        // 执行 SQL
        console.log('📄 执行数据库结构脚本...');
        await connection.query('CREATE DATABASE IF NOT EXISTS seat_arrangement DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        await connection.query('USE seat_arrangement;');
        await connection.query(sql);
        
        console.log('✅ 数据库初始化成功！\n');
        console.log('数据库名称：seat_arrangement');
        console.log('已创建的表：');
        console.log('  - students (学生信息表)');
        console.log('  - classroom_layouts (教室布局表)');
        console.log('  - seat_plans (座位方案表)');
        console.log('  - seat_assignments (座位分配表)');
        console.log('  - system_settings (系统配置表)');
        console.log('\n示例数据已插入，可以直接使用。');
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        console.log('\n请检查：');
        console.log('1. MySQL 服务是否已启动');
        console.log('2. .env 文件中的数据库配置是否正确');
        console.log('3. 当前用户是否有创建数据库的权限');
        process.exit(1);
    } finally {
        await connection.end();
    }
}

initDatabase();
