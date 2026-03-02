/**
 * 学生智能排座系统 - 前端应用逻辑
 * Student Smart Seat Arrangement System - Frontend Application
 */

class SeatApp {
    constructor() {
        this.apiBase = '/api';
        this.students = [];
        this.currentPlan = null;
        this.assignments = []; // {student_id, row_num, col_num, student}
        this.layout = { rows: 7, cols: 8 };
        this.draggedStudent = null;
        
        this.init();
    }
    
    async init() {
        await this.loadStudents();
        this.initTabs();
        this.initDragAndDrop();
        this.renderSeatGrid();
        this.renderStudentPool();
        this.updateStats();
        this.setupEventListeners();
    }
    
    // ==================== 数据加载 ====================
    
    async loadStudents() {
        try {
            const res = await axios.get(`${this.apiBase}/students`);
            if (res.data.success) {
                this.students = res.data.data;
            }
        } catch (error) {
            this.showToast('加载学生数据失败', 'error');
            console.error(error);
        }
    }
    
    async loadPlans() {
        try {
            const res = await axios.get(`${this.apiBase}/plans`);
            if (res.data.success) {
                this.renderPlans(res.data.data);
            }
        } catch (error) {
            console.error('加载方案失败:', error);
        }
    }
    
    // ==================== 标签页切换 ====================
    
    initTabs() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-panel`).classList.add('active');
                
                if (tab.dataset.tab === 'plans') {
                    this.loadPlans();
                } else if (tab.dataset.tab === 'students') {
                    this.renderStudentTable();
                }
            });
        });
    }
    
    // ==================== 座位网格渲染 ====================
    
    renderSeatGrid() {
        const grid = document.getElementById('seatGrid');
        grid.style.gridTemplateColumns = `repeat(${this.layout.cols}, 1fr)`;
        
        let html = '';
        let seatNum = 1;
        
        for (let row = 1; row <= this.layout.rows; row++) {
            for (let col = 1; col <= this.layout.cols; col++) {
                const assignment = this.assignments.find(a => a.row_num === row && a.col_num === col);
                const student = assignment?.student;
                
                if (student) {
                    const genderClass = student.gender === '女' ? 'female' : 'male';
                    const tags = JSON.parse(student.tags || '[]');
                    const tagIcon = tags.includes('naughty') ? '😈' : tags.includes('vision') ? '👓' : '';
                    
                    html += `
                        <div class="seat occupied ${genderClass}" 
                             data-row="${row}" 
                             data-col="${col}"
                             data-student-id="${student.id}"
                             draggable="true"
                             onclick="app.removeStudentFromSeat(${student.id})">
                            <span class="seat-number">${seatNum}</span>
                            ${tagIcon ? `<span class="seat-tag">${tagIcon}</span>` : ''}
                            <span class="seat-name">${student.name}</span>
                            <span class="seat-info">${student.gender === '女' ? '♀' : '♂'} ${student.height || '--'}cm</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="seat empty" 
                             data-row="${row}" 
                             data-col="${col}"
                             onclick="app.handleEmptySeatClick(${row}, ${col})">
                            <span class="seat-number">${seatNum}</span>
                            <span style="color: #ccc; font-size: 20px;">+</span>
                        </div>
                    `;
                }
                seatNum++;
            }
        }
        
        grid.innerHTML = html;
        this.initSeatDragAndDrop();
    }
    
    // ==================== 学生池渲染 ====================
    
    renderStudentPool() {
        const pool = document.getElementById('studentPool');
        const assignedIds = new Set(this.assignments.map(a => a.student_id));
        const unassigned = this.students.filter(s => !assignedIds.has(s.id));
        
        document.getElementById('pool-count').textContent = unassigned.length;
        
        if (unassigned.length === 0) {
            pool.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">所有学生已排座</p>';
            return;
        }
        
        pool.innerHTML = unassigned.map(student => {
            const genderClass = student.gender === '女' ? 'female' : '';
            const initials = student.name.charAt(0);
            const tags = JSON.parse(student.tags || '[]');
            const tagIcons = tags.map(t => {
                const map = { naughty: '😈', vision: '👓', hearing: '👂', special: '⭐' };
                return map[t] || '';
            }).join(' ');
            
            return `
                <div class="student-card" data-student-id="${student.id}" draggable="true">
                    <div class="student-avatar ${genderClass}">${initials}</div>
                    <div class="student-info">
                        <div class="student-name">${student.name}</div>
                        <div class="student-meta">${student.student_no || '--'} · ${student.gender || '--'} · ${student.height || '--'}cm</div>
                        ${tagIcons ? `<div class="student-tags">${tagIcons}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.initStudentPoolDrag();
    }
    
    // ==================== 学生表格渲染 ====================
    
    renderStudentTable() {
        const tbody = document.querySelector('#studentTable tbody');
        
        if (this.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">暂无学生数据，请添加或导入学生</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.students.map(student => {
            const tags = JSON.parse(student.tags || '[]');
            const tagMap = { naughty: '😈 调皮', vision: '👓 近视', hearing: '👂 听力', special: '⭐ 特殊' };
            const tagLabels = tags.map(t => tagMap[t] || t).join(' ');
            
            return `
                <tr>
                    <td>${student.student_no || '--'}</td>
                    <td><strong>${student.name}</strong></td>
                    <td>${student.gender || '--'}</td>
                    <td>${student.height ? student.height + 'cm' : '--'}</td>
                    <td>${student.score ? student.score : '--'}</td>
                    <td>${tagLabels || '--'}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${student.note || '--'}</td>
                    <td>
                        <div class="actions">
                            <button class="icon-btn" onclick="app.editStudent(${student.id})" title="编辑">✏️</button>
                            <button class="icon-btn" onclick="app.deleteStudent(${student.id})" title="删除">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // ==================== 方案渲染 ====================
    
    renderPlans(plans) {
        const grid = document.getElementById('plansGrid');
        
        if (plans.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">暂无保存的方案</p>';
            return;
        }
        
        grid.innerHTML = plans.map(plan => {
            const date = new Date(plan.created_at).toLocaleString('zh-CN');
            const typeMap = {
                manual: '手动排座',
                random: '随机排座',
                score: '按成绩排座',
                gender: '男女交替',
                height: '按身高排座'
            };
            
            return `
                <div class="plan-card" onclick="app.loadPlan(${plan.id})">
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-meta">📅 ${date}</div>
                    <div class="plan-meta">📊 ${typeMap[plan.arrangement_type] || '手动'}</div>
                    <div class="plan-stats">
                        <span>📏 ${plan.rows_count || 7}行 × ${plan.cols_count || 8}列</span>
                    </div>
                    <div class="plan-actions">
                        <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); app.loadPlan(${plan.id})">加载</button>
                        <button class="btn btn-small" onclick="event.stopPropagation(); app.deletePlan(${plan.id})">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // ==================== 拖拽功能 ====================
    
    initDragAndDrop() {
        // 全局拖拽初始化
    }
    
    initStudentPoolDrag() {
        const cards = document.querySelectorAll('.student-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedStudent = {
                    id: parseInt(card.dataset.studentId),
                    type: 'student'
                };
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedStudent = null;
            });
        });
    }
    
    initSeatDragAndDrop() {
        const seats = document.querySelectorAll('.seat');
        seats.forEach(seat => {
            seat.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                seat.style.borderColor = '#4a90d9';
                seat.style.background = '#e6f7ff';
            });
            
            seat.addEventListener('dragleave', () => {
                seat.style.borderColor = '';
                seat.style.background = '';
            });
            
            seat.addEventListener('drop', (e) => {
                e.preventDefault();
                seat.style.borderColor = '';
                seat.style.background = '';
                
                const row = parseInt(seat.dataset.row);
                const col = parseInt(seat.dataset.col);
                
                if (this.draggedStudent && this.draggedStudent.type === 'student') {
                    this.assignStudentToSeat(this.draggedStudent.id, row, col);
                } else if (this.draggedStudent && this.draggedStudent.type === 'seat') {
                    this.swapSeats(this.draggedStudent, { row, col });
                }
            });
            
            // 座位上的学生可以被拖走
            if (seat.classList.contains('occupied')) {
                seat.addEventListener('dragstart', (e) => {
                    const studentId = parseInt(seat.dataset.studentId);
                    const row = parseInt(seat.dataset.row);
                    const col = parseInt(seat.dataset.col);
                    
                    this.draggedStudent = {
                        id: studentId,
                        row,
                        col,
                        type: 'seat'
                    };
                    seat.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                
                seat.addEventListener('dragend', () => {
                    seat.classList.remove('dragging');
                    this.draggedStudent = null;
                });
            }
        });
    }
    
    // ==================== 座位操作 ====================
    
    assignStudentToSeat(studentId, row, col) {
        // 移除该学生原有的座位
        this.assignments = this.assignments.filter(a => a.student_id !== studentId);
        
        // 移除目标座位原有的学生
        this.assignments = this.assignments.filter(a => !(a.row_num === row && a.col_num === col));
        
        // 添加新分配
        const student = this.students.find(s => s.id === studentId);
        this.assignments.push({
            student_id: studentId,
            row_num: row,
            col_num: col,
            student
        });
        
        this.renderSeatGrid();
        this.renderStudentPool();
        this.updateStats();
    }
    
    removeStudentFromSeat(studentId) {
        if (!confirm('确定要将该学生移回学生池吗？')) return;
        
        this.assignments = this.assignments.filter(a => a.student_id !== studentId);
        this.renderSeatGrid();
        this.renderStudentPool();
        this.updateStats();
    }
    
    swapSeats(from, to) {
        const fromAssignment = this.assignments.find(a => 
            a.row_num === from.row && a.col_num === to.col
        );
        
        const toAssignment = this.assignments.find(a => 
            a.row_num === to.row && a.col_num === to.col
        );
        
        if (fromAssignment && toAssignment) {
            // 交换
            const tempRow = fromAssignment.row_num;
            const tempCol = fromAssignment.col_num;
            fromAssignment.row_num = toAssignment.row_num;
            fromAssignment.col_num = toAssignment.col_num;
            toAssignment.row_num = tempRow;
            toAssignment.col_num = tempCol;
        } else if (fromAssignment && !toAssignment) {
            // 移动到空位
            fromAssignment.row_num = to.row;
            fromAssignment.col_num = to.col;
        }
        
        this.renderSeatGrid();
    }
    
    handleEmptySeatClick(row, col) {
        // 点击空座位，可以打开学生选择器（简化处理，暂不实现）
        console.log('点击空座位:', row, col);
    }
    
    // ==================== 智能排座 ====================
    
    async smartArrange() {
        const type = document.querySelector('input[name="arrangeType"]:checked').value;
        
        try {
            const res = await axios.post(`${this.apiBase}/arrange`, {
                type,
                layout_id: 1
            });
            
            if (res.data.success) {
                this.assignments = res.data.data;
                this.renderSeatGrid();
                this.renderStudentPool();
                this.updateStats();
                this.showToast(`智能排座完成 (${type})`, 'success');
            }
        } catch (error) {
            this.showToast('排座失败：' + (error.response?.data?.message || error.message), 'error');
        }
    }
    
    clearSeats() {
        if (!confirm('确定要清空所有座位吗？')) return;
        
        this.assignments = [];
        this.renderSeatGrid();
        this.renderStudentPool();
        this.updateStats();
        this.showToast('座位已清空', 'success');
    }
    
    updateLayout() {
        const rows = parseInt(document.getElementById('rowCount').value) || 7;
        const cols = parseInt(document.getElementById('colCount').value) || 8;
        
        if (rows < 4 || rows > 10 || cols < 4 || cols > 10) {
            this.showToast('行列数必须在 4-10 之间', 'error');
            return;
        }
        
        const totalSeats = rows * cols;
        const studentCount = this.students.length;
        
        if (studentCount > totalSeats) {
            if (!confirm(`当前布局只有${totalSeats}个座位，但班级有${studentCount}名学生。部分学生将无法排座。是否继续？`)) {
                return;
            }
        }
        
        this.layout = { rows, cols };
        this.renderSeatGrid();
        this.showToast('教室布局已更新', 'success');
    }
    
    // ==================== 学生管理 ====================
    
    showStudentModal(studentId = null) {
        const modal = document.getElementById('studentModal');
        const title = document.getElementById('studentModalTitle');
        
        if (studentId) {
            const student = this.students.find(s => s.id === studentId);
            if (!student) return;
            
            title.textContent = '编辑学生';
            document.getElementById('studentId').value = student.id;
            document.getElementById('studentName').value = student.name;
            document.getElementById('studentNo').value = student.student_no || '';
            document.getElementById('studentGender').value = student.gender || '';
            document.getElementById('studentHeight').value = student.height || '';
            document.getElementById('studentScore').value = student.score || '';
            document.getElementById('studentNote').value = student.note || '';
            
            const tags = JSON.parse(student.tags || '[]');
            document.querySelectorAll('.tag-checkbox').forEach(cb => {
                cb.checked = tags.includes(cb.value);
            });
        } else {
            title.textContent = '添加学生';
            document.getElementById('studentId').value = '';
            document.getElementById('studentName').value = '';
            document.getElementById('studentNo').value = '';
            document.getElementById('studentGender').value = '';
            document.getElementById('studentHeight').value = '';
            document.getElementById('studentScore').value = '';
            document.getElementById('studentNote').value = '';
            document.querySelectorAll('.tag-checkbox').forEach(cb => cb.checked = false);
        }
        
        this.showModal('studentModal');
    }
    
    async saveStudent() {
        const id = document.getElementById('studentId').value;
        const name = document.getElementById('studentName').value.trim();
        
        if (!name) {
            this.showToast('请输入学生姓名', 'error');
            return;
        }
        
        const tags = Array.from(document.querySelectorAll('.tag-checkbox:checked')).map(cb => cb.value);
        
        const data = {
            name,
            student_no: document.getElementById('studentNo').value.trim(),
            gender: document.getElementById('studentGender').value,
            height: parseInt(document.getElementById('studentHeight').value) || null,
            score: parseFloat(document.getElementById('studentScore').value) || null,
            tags,
            note: document.getElementById('studentNote').value.trim()
        };
        
        try {
            if (id) {
                await axios.put(`${this.apiBase}/students/${id}`, data);
                this.showToast('学生信息已更新', 'success');
            } else {
                await axios.post(`${this.apiBase}/students`, data);
                this.showToast('学生添加成功', 'success');
            }
            
            this.closeModal('studentModal');
            await this.loadStudents();
            this.renderStudentPool();
            this.renderSeatGrid();
            this.updateStats();
        } catch (error) {
            this.showToast('保存失败：' + (error.response?.data?.message || error.message), 'error');
        }
    }
    
    editStudent(id) {
        this.showStudentModal(id);
    }
    
    async deleteStudent(id) {
        if (!confirm('确定要删除这个学生吗？此操作不可恢复。')) return;
        
        try {
            await axios.delete(`${this.apiBase}/students/${id}`);
            this.showToast('学生已删除', 'success');
            await this.loadStudents();
            this.renderStudentPool();
            this.renderSeatGrid();
            this.renderStudentTable();
            this.updateStats();
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }
    
    filterStudents() {
        const query = document.getElementById('studentSearch').value.toLowerCase();
        const cards = document.querySelectorAll('.student-card');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
    
    filterStudentTable() {
        const query = document.getElementById('studentTableSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#studentTable tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }
    
    // ==================== 方案管理 ====================
    
    savePlan() {
        if (this.assignments.length === 0) {
            this.showToast('请先排座再保存方案', 'error');
            return;
        }
        
        document.getElementById('planName').value = '';
        this.showModal('savePlanModal');
    }
    
    async confirmSavePlan() {
        const name = document.getElementById('planName').value.trim();
        if (!name) {
            this.showToast('请输入方案名称', 'error');
            return;
        }
        
        const type = document.getElementById('planType').value;
        
        try {
            // 创建方案
            const planRes = await axios.post(`${this.apiBase}/plans`, {
                name,
                layout_id: 1,
                arrangement_type: type
            });
            
            if (planRes.data.success) {
                const planId = planRes.data.data.id;
                
                // 保存座位分配
                const assignments = this.assignments.map(a => ({
                    student_id: a.student_id,
                    row_num: a.row_num,
                    col_num: a.col_num
                }));
                
                await axios.post(`${this.apiBase}/plans/${planId}/assignments`, { assignments });
                
                this.showToast('方案保存成功', 'success');
                this.closeModal('savePlanModal');
            }
        } catch (error) {
            this.showToast('保存失败：' + (error.response?.data?.message || error.message), 'error');
        }
    }
    
    async loadPlan(planId) {
        try {
            const res = await axios.get(`${this.apiBase}/plans/${planId}`);
            if (res.data.success) {
                const plan = res.data.data;
                this.currentPlan = plan;
                this.layout = { rows: plan.rows_count, cols: plan.cols_count };
                this.assignments = plan.assignments;
                
                document.getElementById('rowCount').value = this.layout.rows;
                document.getElementById('colCount').value = this.layout.cols;
                
                this.renderSeatGrid();
                this.renderStudentPool();
                this.updateStats();
                
                // 切换到排座页面
                document.querySelector('.nav-tab[data-tab="arrange"]').click();
                
                this.showToast(`已加载方案：${plan.name}`, 'success');
            }
        } catch (error) {
            this.showToast('加载方案失败', 'error');
        }
    }
    
    async deletePlan(planId) {
        if (!confirm('确定要删除这个方案吗？')) return;
        
        try {
            await axios.delete(`${this.apiBase}/plans/${planId}`);
            this.showToast('方案已删除', 'success');
            this.loadPlans();
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }
    
    // ==================== 导入导出 ====================
    
    showImportModal() {
        this.showModal('importModal');
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('importFile');
        
        uploadArea.onclick = () => fileInput.click();
        
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4a90d9';
            uploadArea.style.background = '#e6f7ff';
        };
        
        uploadArea.ondragleave = () => {
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        };
        
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.importFile(file);
            }
        };
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importFile(file);
            }
        };
    }
    
    async importFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const res = await axios.post(`${this.apiBase}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                this.showToast(res.data.message, 'success');
                this.closeModal('importModal');
                await this.loadStudents();
                this.renderStudentPool();
                this.updateStats();
            }
        } catch (error) {
            this.showToast('导入失败：' + (error.response?.data?.message || error.message), 'error');
        }
    }
    
    exportData() {
        window.open(`${this.apiBase}/export`, '_blank');
    }
    
    downloadTemplate() {
        // 创建简单的 Excel 模板
        const template = [
            { '姓名': '张三', '学号': '2024001', '性别': '男', '身高': 175, '成绩': 85.5, '备注': '活泼好动' },
            { '姓名': '李四', '学号': '2024002', '性别': '女', '身高': 162, '成绩': 92, '备注': '视力较弱' }
        ];
        
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '学生模板');
        XLSX.writeFile(wb, '学生导入模板.xlsx');
    }
    
    // ==================== 统计更新 ====================
    
    updateStats() {
        const total = this.students.length;
        const assigned = this.assignments.length;
        const unassigned = total - assigned;
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-assigned').textContent = assigned;
        document.getElementById('stat-unassigned').textContent = unassigned;
    }
    
    // ==================== 工具方法 ====================
    
    showModal(id) {
        document.getElementById(id).classList.add('show');
    }
    
    closeModal(id) {
        document.getElementById(id).classList.remove('show');
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    }
    
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlide 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    setupEventListeners() {
        // ESC 关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
    }
}

// 初始化应用
const app = new SeatApp();
