-- 学生智能排座系统数据库结构
-- MySQL Database Schema for Student Seat Arrangement System

CREATE DATABASE IF NOT EXISTS seat_arrangement DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE seat_arrangement;

-- 学生表
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    student_no VARCHAR(20) UNIQUE COMMENT '学号',
    gender ENUM('男', '女') COMMENT '性别',
    height INT COMMENT '身高(cm)',
    score DECIMAL(5,2) COMMENT '成绩',
    tags JSON COMMENT '标签数组 ["naughty", "vision", "hearing", "special"]',
    note TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_gender (gender)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生信息表';

-- 教室布局表
CREATE TABLE classroom_layouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '布局名称',
    rows_count INT NOT NULL DEFAULT 7 COMMENT '行数',
    cols_count INT NOT NULL DEFAULT 8 COMMENT '列数',
    total_seats INT NOT NULL DEFAULT 56 COMMENT '总座位数',
    aisle_positions JSON COMMENT '过道位置 [2, 5] 表示第2和第5列后有过道',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否为默认布局',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教室布局表';

-- 座位方案表
CREATE TABLE seat_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '方案名称',
    layout_id INT COMMENT '关联的布局ID',
    arrangement_type ENUM('manual', 'random', 'score', 'gender', 'height') DEFAULT 'manual' COMMENT '排座方式',
    created_by VARCHAR(50) COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (layout_id) REFERENCES classroom_layouts(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='座位方案表';

-- 座位分配表
CREATE TABLE seat_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL COMMENT '方案ID',
    student_id INT NOT NULL COMMENT '学生ID',
    row_num INT NOT NULL COMMENT '行号（从1开始，1是前排）',
    col_num INT NOT NULL COMMENT '列号（从1开始）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plan_seat (plan_id, row_num, col_num),
    UNIQUE KEY uk_plan_student (plan_id, student_id),
    FOREIGN KEY (plan_id) REFERENCES seat_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='座位分配表';

-- 系统配置表
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL COMMENT '配置键',
    setting_value TEXT COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置说明',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入默认教室布局（7行8列，适合56人，过道在第3列和第6列后）
INSERT INTO classroom_layouts (name, rows_count, cols_count, total_seats, aisle_positions, is_default) VALUES
('标准教室布局', 7, 8, 56, '[3, 6]', TRUE),
('小型教室布局', 6, 7, 42, '[3]', FALSE);

-- 插入示例学生数据
INSERT INTO students (name, student_no, gender, height, score, tags, note) VALUES
('张三', '2024001', '男', 175, 85.5, '["naughty"]', '活泼好动'),
('李四', '2024002', '女', 162, 92.0, '["vision"]', '视力较弱，坐前排'),
('王五', '2024003', '男', 168, 78.5, NULL, NULL),
('赵六', '2024004', '女', 158, 88.0, NULL, NULL),
('陈七', '2024005', '男', 172, 91.0, '["tall"]', '身高较高'),
('刘八', '2024006', '女', 165, 87.5, NULL, NULL),
('周九', '2024007', '男', 170, 82.0, NULL, NULL),
('吴十', '2024008', '女', 160, 95.0, '["special"]', '学习优秀，需关注'),
('郑一', '2024009', '男', 166, 79.0, NULL, NULL),
('孙二', '2024010', '女', 163, 84.0, NULL, NULL);

-- 插入系统配置
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_layout_id', '1', '默认教室布局ID'),
('max_students_per_class', '50', '每班最大学生数'),
('school_name', '某某中学', '学校名称'),
('current_semester', '2024-2025学年第一学期', '当前学期');
