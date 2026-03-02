/**
 * Excel 模板生成工具
 */
const XLSX = require('xlsx');

// 创建示例数据
const template = [
    { '姓名': '张三', '学号': '2024001', '性别': '男', '身高': 175, '成绩': 85.5, '备注': '活泼好动' },
    { '姓名': '李四', '学号': '2024002', '性别': '女', '身高': 162, '成绩': 92, '备注': '视力较弱，建议前排' },
    { '姓名': '王五', '学号': '2024003', '性别': '男', '身高': 168, '成绩': 78.5, '备注': '' },
    { '姓名': '赵六', '学号': '2024004', '性别': '女', '身高': 158, '成绩': 88, '备注': '听力稍弱' },
    { '姓名': '陈七', '学号': '2024005', '性别': '男', '身高': 172, '成绩': 91, '备注': '班干部' }
];

// 创建工作簿
const worksheet = XLSX.utils.json_to_sheet(template);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, '学生模板');

// 设置列宽
worksheet['!cols'] = [
    { wch: 12 },  // 姓名
    { wch: 15 },  // 学号
    { wch: 8 },   // 性别
    { wch: 8 },   // 身高
    { wch: 10 },  // 成绩
    { wch: 30 }   // 备注
];

// 保存文件
const outputPath = process.argv[2] || './uploads/学生导入模板.xlsx';
XLSX.writeFile(workbook, outputPath);

console.log(`✅ 模板已生成：${outputPath}`);
console.log('\n模板字段说明：');
console.log('  - 姓名：必填');
console.log('  - 学号：可选');
console.log('  - 性别：男/女');
console.log('  - 身高：数字，单位 cm');
console.log('  - 成绩：数字，0-100');
console.log('  - 备注：可选文本');
