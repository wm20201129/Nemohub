// API基础URL
const API_BASE = '';

// 全局变量
let currentClassId = null;
let currentPage = 1;
let studentsPerPage = 10;
let allStudents = [];
let selectedStudents = new Set();
let currentGroupMembers = [];
let availableStudentsForGroup = [];

// 确保 showToast 函数存在
if (typeof showToast === 'undefined') {
    function showToast(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // 尝试创建简单的提示
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                           type === 'success' ? 'check-circle' : 
                           type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span style="margin-left: 10px;">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // 添加CSS动画
    if (!document.querySelector('#toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 通用工具函数
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 班级管理函数
async function loadClasses() {
    try {
        console.log("正在尝试加载班级数据...");
        
        const response = await fetch('/api/classes');
        
        if (!response.ok) {
            console.error(`HTTP错误: ${response.status} ${response.statusText}`);
            let errorMsg = '无法加载班级数据';
            if (response.status === 0) {
                errorMsg = '无法连接到服务器，请检查服务器是否启动';
            } else if (response.status >= 500) {
                errorMsg = '服务器内部错误';
            }
            
            if (typeof showToast === 'function') {
                showToast(errorMsg, 'error');
            }
            return;
        }
        
        const classes = await response.json();
        console.log("API返回数据:", classes);
        
        // 检查元素是否存在再更新
        const selectors = [
            'class-select',
            'classSelect', // 新增：适配 report.html
            'student-class-select', 
            'points-class-select',
            'ranking-class-select',
            'randomClassSelect',
            'reportClassSelect',
            'deleteClassSelect'
        ];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                console.log(`找到选择器: ${selectorId}`);
                select.innerHTML = '<option value="">请选择班级</option>';
                
                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name + (cls.teacher ? ` (${cls.teacher})` : '');
                    select.appendChild(option);
                });
                
                console.log(`更新 ${selectorId}，共 ${classes.length} 个选项`);
            } else {
                console.log(`未找到选择器: ${selectorId}，跳过更新`);
            }
        });
        
        if (classes.length === 0) {
            console.warn("班级列表为空");
            if (typeof showToast === 'function') {
                showToast('没有找到班级，请先创建班级', 'warning');
            }
        } else {
            console.log(`成功加载 ${classes.length} 个班级`);
            
            // 检查 class-select 是否存在
            const classSelect = document.getElementById('class-select');
            if (classSelect) {
                classSelect.value = classes[0].id;
                // 检查 loadClassData 函数是否存在
                if (typeof loadClassData === 'function') {
                    loadClassData();
                }
            }
        }
        
    } catch (error) {
        console.error('加载班级失败:', error);
        if (typeof showToast === 'function') {
            showToast('加载班级失败: ' + error.message, 'error');
        }
    }
}

function showClassModal() {
    document.getElementById('classModal').style.display = 'block';
}

function closeClassModal() {
    document.getElementById('classModal').style.display = 'none';
    document.getElementById('classForm').reset();
}

async function createClass(event) {
    event.preventDefault();
    
    const name = document.getElementById('className').value;
    const teacher = document.getElementById('classTeacher').value;
    
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, teacher })
        });
        
        if (response.ok) {
            showToast('班级创建成功', 'success');
            closeClassModal();
            loadClasses();
        } else {
            const error = await response.json();
            showToast(error.error || '创建失败', 'error');
        }
    } catch (error) {
        console.error('创建班级失败:', error);
        showToast('创建班级失败', 'error');
    }
}

async function loadClassData() {
    const classId = document.getElementById('class-select').value;
    
    if (!classId) {
        document.getElementById('class-info').style.display = 'none';
        return;
    }
    
    currentClassId = classId;
    
    try {
        // 加载班级信息
        const response = await fetch(`/api/classes/${classId}/stats`);
        const stats = await response.json();
        
        // 更新班级信息
        const classOption = document.querySelector(`#class-select option[value="${classId}"]`);
        document.getElementById('class-name').textContent = classOption ? classOption.textContent : '未知班级';
        document.getElementById('class-teacher').textContent = stats.class_info.teacher || '班主任';
        document.getElementById('class-created').textContent = formatDate(stats.class_info.created_at).split(' ')[0]; // 只显示日期
        
        // 更新统计数据
        document.getElementById('total-students').textContent = stats.total_students;
        document.getElementById('avg-points').textContent = stats.avg_points.toFixed(1);
        document.getElementById('max-points').textContent = stats.max_points;
        document.getElementById('min-points').textContent = stats.min_points;
        
        // === 更新最近活动 (带滚动特效) ===
        const recentChangesContainer = document.getElementById('recent-changes');
        recentChangesContainer.innerHTML = '';
        
        // 创建滚动轨道
        const track = document.createElement('div');
        track.className = 'activity-track';
        
        // 数据源（如果少于5条就不滚动，不用复制）
        let displayData = stats.recent_changes;
        const shouldScroll = displayData.length > 5;
        
        if (shouldScroll) {
            // 复制一份数据实现无缝滚动
            displayData = [...displayData, ...displayData];
            track.classList.add('scrolling');
            
            // 动态设置动画时长，根据数据量调整速度 (每条2秒)
            track.style.animationDuration = `${displayData.length * 1.5}s`; 
        }

        if (displayData.length === 0) {
            recentChangesContainer.innerHTML = '<div style="text-align:center;color:#cbd5e0;padding:20px;">暂无活动</div>';
        } else {
            displayData.forEach(change => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                
                const changeType = change.change_amount > 0 ? 'add' : 'subtract';
                const iconClass = changeType === 'add' ? 'fa-plus' : 'fa-minus';
                const bgColor = changeType === 'add' ? '#48bb78' : '#f56565';
                
                // 简单的时间格式化
                let timeStr = '刚刚';
                if (change.created_at) {
                    const date = new Date(change.created_at);
                    const now = new Date();
                    const isToday = date.toDateString() === now.toDateString();
                    
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    
                    if (isToday) {
                        timeStr = `今天 ${hours}:${minutes}`;
                    } else {
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const day = date.getDate().toString().padStart(2, '0');
                        timeStr = `${month}-${day} ${hours}:${minutes}`;
                    }
                }
                
                item.innerHTML = `
                    <div class="activity-icon" style="background-color: ${bgColor};">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="activity-details">
                        <h4>
                            <span>${change.student_name}</span>
                            <span class="activity-time">${timeStr}</span>
                        </h4>
                        <p>${change.reason || '无理由'}</p>
                    </div>
                    <div class="activity-points" style="color: ${bgColor};">
                        ${change.change_amount > 0 ? '+' : ''}${change.change_amount}
                    </div>
                `;
                track.appendChild(item);
            });
            
            recentChangesContainer.appendChild(track);
        }
        
        document.getElementById('class-info').style.display = 'block';
        
    } catch (error) {
        console.error('加载班级数据失败:', error);
        showToast('加载班级数据失败', 'error');
    }
}

// 学生管理函数
async function loadClassesForStudents() {
    try {
        const response = await fetch('/api/classes');
        const classes = await response.json();
        
        const select = document.getElementById('student-class-select');
        select.innerHTML = '<option value="">请选择班级</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
        showToast('加载班级失败', 'error');
    }
}

async function loadStudents() {
    const classId = document.getElementById('student-class-select').value;
    
    if (!classId) {
        allStudents = [];
        renderStudentsTable();
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${classId}/students`);
        allStudents = await response.json();
        
        currentPage = 1;
        renderStudentsTable();
    } catch (error) {
        console.error('加载学生失败:', error);
        showToast('加载学生失败', 'error');
    }
}

function renderStudentsTable() {
    const tbody = document.getElementById('students-table-body');
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const pageStudents = allStudents.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    if (pageStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 60px 20px;">
                    <div class="beauty-empty-state">
                        <i class="fas fa-users"></i>
                        <p>暂无学生数据</p>
                        <p style="font-size: 14px; margin-top: 10px; color: #a0aec0;">
                            请先添加学生或选择其他班级
                        </p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        pageStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input 
                        type="checkbox" 
                        class="beauty-checkbox"
                        id="student-${student.id}"
                        onchange="toggleStudentSelection(${student.id}, this.checked)"
                    >
                </td>
                <td>${startIndex + index + 1}</td>
                <td>
                    <strong>${student.student_id}</strong>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="student-avatar" style="width: 32px; height: 32px; font-size: 14px;">
                            ${student.name.charAt(0)}
                        </div>
                        ${student.name}
                    </div>
                </td>
                <td>
                    <span class="beauty-points-badge">
                        ${student.points}
                        <span style="font-size: 12px; opacity: 0.8;">分</span>
                    </span>
                </td>
                <td>
                    <span style="color: #718096; font-size: 13px;">
                        ${formatDate(student.created_at)}
                    </span>
                </td>
                <td>
                    <div class="beauty-action-buttons">
                        <button class="beauty-btn beauty-btn-info" onclick="viewStudentDetails(${student.id})" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="beauty-btn beauty-btn-warning" onclick="editStudent(${student.id})" title="编辑信息">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="beauty-btn beauty-btn-primary" onclick="showSinglePointsModal(${student.id})" title="积分操作">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="beauty-btn beauty-btn-danger" onclick="deleteStudent(${student.id})" title="删除学生">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 更新分页信息
    updatePaginationInfo();
}

function updatePaginationInfo() {
    document.getElementById('student-count').textContent = allStudents.length;
    document.getElementById('page-info').textContent = `第 ${currentPage} 页`;
    
    const totalPages = Math.ceil(allStudents.length / studentsPerPage);
    document.getElementById('prev-btn').disabled = currentPage <= 1;
    document.getElementById('next-btn').disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderStudentsTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allStudents.length / studentsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderStudentsTable();
    }
}

function searchStudents() {
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    
    if (!searchTerm) {
        currentPage = 1;
        renderStudentsTable();
        return;
    }
    
    const filteredStudents = allStudents.filter(student => 
        student.name.toLowerCase().includes(searchTerm) || 
        student.student_id.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    <i class="fas fa-search"></i>
                    <p>未找到匹配的学生</p>
                </td>
            </tr>
        `;
    } else {
        filteredStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="points-badge">${student.points}</span>
                </td>
                <td>${formatDate(student.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-info" onclick="viewStudentDetails(${student.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-warning" onclick="editStudent(${student.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteStudent(${student.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    document.getElementById('student-count').textContent = `${filteredStudents.length} 名学生（已过滤）`;
}

function showAddStudentModal() {
    document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> 添加学生';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    
    // 加载班级选项
    loadClassesForStudentModal();
    
    document.getElementById('studentModal').style.display = 'block';
}

function closeStudentModal() {
    document.getElementById('studentModal').style.display = 'none';
}

async function loadClassesForStudentModal() {
    try {
        const response = await fetch('/api/classes');
        const classes = await response.json();
        
        const select = document.getElementById('studentClass');
        select.innerHTML = '<option value="">请选择班级</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
        showToast('加载班级失败', 'error');
    }
}

async function saveStudent(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const name = document.getElementById('studentName').value;
    const studentNumber = document.getElementById('studentNumber').value;
    const classId = document.getElementById('studentClass').value;
    
    if (!name || !studentNumber || !classId) {
        showToast('请填写所有必填项', 'warning');
        return;
    }
    
    try {
        let url = '/api/students';
        let method = 'POST';
        let body = { class_id: classId, name, student_id: studentNumber };
        
        if (studentId) {
            url = `/api/students/${studentId}`;
            method = 'PUT';
            body = { name };
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            showToast(studentId ? '学生信息更新成功' : '学生添加成功', 'success');
            closeStudentModal();
            loadStudents();
        } else {
            const error = await response.json();
            showToast(error.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存学生失败:', error);
        showToast('保存学生失败', 'error');
    }
}

async function editStudent(id) {
    try {
        // 获取学生信息
        const student = allStudents.find(s => s.id === id);
        if (!student) return;
        
        // 设置表单值
        document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-edit"></i> 编辑学生';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentNumber').value = student.student_id;
        
        // 加载班级选项并选中当前班级
        await loadClassesForStudentModal();
        document.getElementById('studentClass').value = student.class_id;
        
        // 禁用学号输入框（编辑时不能修改学号）
        document.getElementById('studentNumber').disabled = true;
        
        document.getElementById('studentModal').style.display = 'block';
    } catch (error) {
        console.error('编辑学生失败:', error);
        showToast('编辑学生失败', 'error');
    }
}

async function deleteStudent(id) {
    if (!confirm('确定要删除这个学生吗？此操作将删除该学生的所有积分记录，且无法恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('学生删除成功', 'success');
            loadStudents();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (error) {
        console.error('删除学生失败:', error);
        showToast('删除学生失败', 'error');
    }
}

async function viewStudentDetails(id) {
    try {
        // 获取学生信息
        const student = allStudents.find(s => s.id === id);
        if (!student) return;
        
        // 获取积分历史
        const response = await fetch(`/api/students/${id}/history`);
        const history = await response.json();
        
        // 更新详情模态框
        document.getElementById('detail-name').textContent = student.name;
        document.getElementById('detail-id').textContent = student.student_id;
        document.getElementById('detail-points').textContent = student.points;
        
        // 更新积分历史
        const historyList = document.getElementById('points-history');
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-message">暂无积分记录</p>';
        } else {
            history.forEach(record => {
                const item = document.createElement('div');
                item.className = 'history-item';
                
                const changeType = record.change_amount > 0 ? 'add' : 'subtract';
                const iconClass = changeType === 'add' ? 'fa-plus-circle' : 'fa-minus-circle';
                const colorClass = changeType === 'add' ? 'text-success' : 'text-danger';
                
                item.innerHTML = `
                    <div class="history-icon">
                        <i class="fas ${iconClass} ${colorClass}"></i>
                    </div>
                    <div class="history-details">
                        <div class="history-reason">${record.reason || '未说明原因'}</div>
                        <div class="history-meta">
                            <span class="history-teacher">${record.teacher}</span>
                            <span class="history-date">${formatDate(record.created_at)}</span>
                        </div>
                    </div>
                    <div class="history-amount ${colorClass}">
                        ${record.change_amount > 0 ? '+' : ''}${record.change_amount}
                    </div>
                `;
                
                historyList.appendChild(item);
            });
        }
        
        document.getElementById('studentDetailModal').style.display = 'block';
    } catch (error) {
        console.error('查看学生详情失败:', error);
        showToast('查看学生详情失败', 'error');
    }
}

function closeStudentDetailModal() {
    document.getElementById('studentDetailModal').style.display = 'none';
}

// 积分管理函数
async function loadClassesForPoints() {
    try {
        const response = await fetch('/api/classes');
        const classes = await response.json();
        
        const select = document.getElementById('points-class-select');
        select.innerHTML = '<option value="">请选择班级</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
        showToast('加载班级失败', 'error');
    }
}

async function loadStudentsForPoints() {
    const classId = document.getElementById('points-class-select').value;
    
    if (!classId) {
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${classId}/students`);
        const students = await response.json();
        
        renderPointsTable(students);
    } catch (error) {
        console.error('加载学生失败:', error);
        showToast('加载学生失败', 'error');
    }
}

function renderPointsTable(students) {
    const tbody = document.getElementById('points-table-body');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    <i class="fas fa-users"></i>
                    <p>暂无学生数据</p>
                </td>
            </tr>
        `;
    } else {
        students.forEach((student, index) => {
            const isSelected = selectedStudents.has(student.id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" id="student-${student.id}" 
                           ${isSelected ? 'checked' : ''} 
                           onchange="toggleStudentSelection(${student.id}, this.checked)">
                </td>
                <td>${index + 1}</td>
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="points-badge">${student.points}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-primary" onclick="showSinglePointsModal(${student.id})" title="积分操作">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="btn-icon btn-info" onclick="viewStudentDetails(${student.id})" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 更新全选复选框状态
    updateSelectAllCheckbox();
}

function toggleStudentSelection(studentId, isSelected) {
    if (isSelected) {
        selectedStudents.add(studentId);
    } else {
        selectedStudents.delete(studentId);
    }
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('select-all');
    
    // 检查元素是否存在
    if (!selectAllCheckbox) {
        console.warn('updateSelectAllCheckbox: 找不到 #select-all 元素');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#points-table-body input[type="checkbox"]');
    
    // 检查是否有复选框
    if (!checkboxes || checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    
    try {
        // 将 NodeList 转换为数组并计算状态
        const checkboxArray = Array.from(checkboxes);
        const allChecked = checkboxArray.length > 0 && checkboxArray.every(cb => cb.checked);
        const someChecked = checkboxArray.some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = !allChecked && someChecked;
    } catch (error) {
        console.error('updateSelectAllCheckbox 错误:', error);
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

function toggleSelectAll() {
    const isChecked = document.getElementById('select-all').checked;
    const checkboxes = document.querySelectorAll('#points-table-body input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const studentId = parseInt(cb.id.split('-')[1]);
        if (isChecked) {
            selectedStudents.add(studentId);
        } else {
            selectedStudents.delete(studentId);
        }
    });
}

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('#points-table-body input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = true;
        const studentId = parseInt(cb.id.split('-')[1]);
        selectedStudents.add(studentId);
    });
    updateSelectAllCheckbox();
}

function deselectAllStudents() {
    const checkboxes = document.querySelectorAll('#points-table-body input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        const studentId = parseInt(cb.id.split('-')[1]);
        selectedStudents.delete(studentId);
    });
    updateSelectAllCheckbox();
}

async function addPointsToSelected() {
    if (selectedStudents.size === 0) {
        showToast('请先选择学生', 'warning');
        return;
    }
    
    const amount = parseInt(document.getElementById('add-points-amount').value);
    const reason = document.getElementById('add-points-reason').value;
    
    if (!amount || amount <= 0) {
        showToast('请输入有效的积分值', 'warning');
        return;
    }
    
    await updateMultiplePoints(selectedStudents, amount, reason);
}

async function subtractPointsFromSelected() {
    if (selectedStudents.size === 0) {
        showToast('请先选择学生', 'warning');
        return;
    }
    
    const amount = parseInt(document.getElementById('subtract-points-amount').value);
    const reason = document.getElementById('subtract-points-reason').value;
    
    if (!amount || amount <= 0) {
        showToast('请输入有效的积分值', 'warning');
        return;
    }
    
    await updateMultiplePoints(selectedStudents, -amount, reason);
}

async function updateMultiplePoints(studentIds, amount, reason) {
    const promises = Array.from(studentIds).map(id => 
        fetch(`/api/students/${id}/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                change_amount: amount,
                reason,
                teacher: document.getElementById('current-teacher').textContent || '班主任'
            })
        })
    );
    
    try {
        const results = await Promise.all(promises);
        const allSuccessful = results.every(r => r.ok);
        
        if (allSuccessful) {
            showToast(`成功为 ${studentIds.size} 名学生更新积分`, 'success');
            selectedStudents.clear();
            loadStudentsForPoints();
        } else {
            showToast('部分学生积分更新失败', 'error');
        }
    } catch (error) {
        console.error('批量更新积分失败:', error);
        showToast('更新积分失败', 'error');
    }
}

function showSinglePointsModal(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    document.getElementById('points-student-id').value = studentId;
    document.getElementById('points-student-name').textContent = student.name;
    document.getElementById('points-current-points').textContent = student.points;
    
    document.getElementById('singlePointsModal').style.display = 'block';
}

function closeSinglePointsModal() {
    document.getElementById('singlePointsModal').style.display = 'none';
    document.getElementById('singlePointsForm').reset();
}

async function updateSinglePoints(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('points-student-id').value;
    const operation = document.getElementById('single-operation').value;
    const reason = document.getElementById('single-reason').value;
    
    let amount = 0;
    if (operation === 'set') {
        const targetValue = parseInt(document.getElementById('single-set-value').value);
        const currentValue = parseInt(document.getElementById('points-current-points').textContent);
        amount = targetValue - currentValue;
    } else {
        amount = parseInt(document.getElementById('single-amount').value);
        if (operation === 'subtract') {
            amount = -amount;
        }
    }
    
    if (amount === 0) {
        showToast('积分变化不能为0', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/students/${studentId}/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                change_amount: amount,
                reason,
                teacher: document.getElementById('current-teacher').textContent || '班主任'
            })
        });
        
        if (response.ok) {
            showToast('积分更新成功', 'success');
            closeSinglePointsModal();
            loadStudentsForPoints();
        } else {
            const error = await response.json();
            showToast(error.error || '更新失败', 'error');
        }
    } catch (error) {
        console.error('更新积分失败:', error);
        showToast('更新积分失败', 'error');
    }
}

function toggleBatchOptions() {
    const operation = document.getElementById('batch-operation').value;
    const amountGroup = document.getElementById('batch-amount-group');
    const setGroup = document.getElementById('batch-set-group');
    
    if (operation === 'set') {
        amountGroup.style.display = 'none';
        setGroup.style.display = 'block';
    } else {
        amountGroup.style.display = 'block';
        setGroup.style.display = 'none';
    }
}

function showPointsModal() {
    document.getElementById('batchModal').style.display = 'block';
}

function closeBatchModal() {
    document.getElementById('batchModal').style.display = 'none';
    document.getElementById('batchForm').reset();
    toggleBatchOptions();
}

// 排行榜函数
async function loadClassesForRanking() {
    try {
        const response = await fetch('/api/classes');
        const classes = await response.json();
        
        const select = document.getElementById('ranking-class-select');
        select.innerHTML = '<option value="">请选择班级</option>';
        
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
        showToast('加载班级失败', 'error');
    }
}

async function loadRanking() {
    const classId = document.getElementById('ranking-class-select').value;
    
    if (!classId) {
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${classId}/ranking`);
        rankingData = await response.json();
        
        renderRanking();
       // updateCharts();
    } catch (error) {
        console.error('加载排行榜失败:', error);
        showToast('加载排行榜失败', 'error');
    }
}

function renderRanking() {
    // 渲染前三名奖台
    renderPodium();
    
    // 渲染排行榜列表
    const listBody = document.getElementById('ranking-list-body');
    listBody.innerHTML = '';
    
    rankingData.forEach((student, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        
        // 确定排名变化趋势（这里使用随机数据演示）
        const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
        const trendIcon = trend === 'up' ? 'fa-arrow-up' : 
                         trend === 'down' ? 'fa-arrow-down' : 'fa-minus';
        const trendClass = trend === 'up' ? 'trend-up' : 
                          trend === 'down' ? 'trend-down' : 'trend-stable';
        
        item.innerHTML = `
            <div class="rank-number">${index + 1}</div>
            <div class="student-name">
                <div class="student-avatar">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <span>${student.name}</span>
            </div>
            <div class="student-id">${student.student_id}</div>
            <div class="student-points">${student.points}</div>
            <div class="trend-indicator ${trendClass}">
                <i class="fas ${trendIcon}"></i>
                <span>${trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定'}</span>
            </div>
        `;
        
        item.onclick = () => showRankingDetails(student);
        listBody.appendChild(item);
    });
    
    // 更新统计信息
    document.getElementById('ranking-stats').textContent = `共 ${rankingData.length} 名学生`;
}

function renderPodium() {
    const podium = document.getElementById('podium');
    podium.innerHTML = '';
    
    // 前三名学生
    const topThree = rankingData.slice(0, 3);
    
    // 奖台位置（第二、第一、第三）
    const podiumPlaces = [
        { position: 2, data: topThree[1] },
        { position: 1, data: topThree[0] },
        { position: 3, data: topThree[2] }
    ];
    
    podiumPlaces.forEach(place => {
        if (!place.data) return;
        
        const placeDiv = document.createElement('div');
        placeDiv.className = `podium-place ${place.position === 1 ? 'first' : 
                                                    place.position === 2 ? 'second' : 'third'}`;
        
        // 奖牌图标
        let medalIcon = 'fa-medal';
        if (place.position === 1) medalIcon = 'fa-crown';
        if (place.position === 2) medalIcon = 'fa-medal';
        if (place.position === 3) medalIcon = 'fa-award';
        
        placeDiv.innerHTML = `
            <div class="place-medal">
                <i class="fas ${medalIcon}"></i>
            </div>
            <div class="place-name">${place.data.name}</div>
            <div class="place-points">${place.data.points} 分</div>
            <div class="place-rank">第 ${place.position} 名</div>
        `;
        
        podium.appendChild(placeDiv);
    });
}

// 导出功能
async function exportData() {
    if (!currentClassId) {
        showToast('请先选择班级', 'warning');
        return;
    }
    
    try {
        // 获取班级数据
        const [classResponse, rankingResponse] = await Promise.all([
            fetch(`/api/classes/${currentClassId}/stats`),
            fetch(`/api/classes/${currentClassId}/ranking`)
        ]);
        
        const classStats = await classResponse.json();
        const ranking = await rankingResponse.json();
        
        // 创建CSV内容
        let csvContent = '班级积分报告\n\n';
        csvContent += `班级名称：${document.getElementById('class-name').textContent}\n`;
        csvContent += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
        
        csvContent += '积分排行榜\n';
        csvContent += '排名,姓名,学号,积分\n';
        
        ranking.forEach((student, index) => {
            csvContent += `${index + 1},${student.name},${student.student_id},${student.points}\n`;
        });
        
        csvContent += '\n班级统计数据\n';
        csvContent += `学生总数：${classStats.total_students}\n`;
        csvContent += `平均积分：${classStats.avg_points.toFixed(2)}\n`;
        csvContent += `最高积分：${classStats.max_points}\n`;
        csvContent += `最低积分：${classStats.min_points}\n`;
        
        // 创建下载链接
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `班级积分报告_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        showToast('数据导出成功', 'success');
        
    } catch (error) {
        console.error('导出数据失败:', error);
        showToast('导出数据失败', 'error');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载班级数据
    loadClasses();
    
    // 初始化当前老师名称
    const teacherName = localStorage.getItem('teacherName') || '班主任';
    document.getElementById('current-teacher').textContent = teacherName;
    
    // 如果老师名称可以编辑，添加编辑功能
    document.getElementById('current-teacher').onclick = function() {
        const newName = prompt('请输入您的姓名：', this.textContent);
        if (newName && newName.trim()) {
            this.textContent = newName.trim();
            localStorage.setItem('teacherName', newName.trim());
        }
    };
    
    // 添加CSS样式
    addDynamicStyles();
});

// 添加动态CSS样式
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .btn-icon {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin: 0 2px;
            color: white;
        }
        
        .btn-info { background-color: #17a2b8; }
        .btn-warning { background-color: #ffc107; }
        .btn-danger { background-color: #dc3545; }
        .btn-primary { background-color: #007bff; }
        
        .points-badge {
            display: inline-block;
            padding: 3px 8px;
            background-color: #e3f2fd;
            color: #1976d2;
            border-radius: 12px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .empty-message {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .empty-message i {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(150%);
            transition: transform 0.3s ease;
            z-index: 9999;
        }
        
        .toast.show {
            transform: translateX(0);
        }
        
        .toast i {
            font-size: 20px;
        }
        
        .toast-success i { color: #28a745; }
        .toast-error i { color: #dc3545; }
        .toast-warning i { color: #ffc107; }
        .toast-info i { color: #17a2b8; }
        
        .history-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .history-icon {
            width: 30px;
            text-align: center;
        }
        
        .history-details {
            flex: 1;
            padding: 0 10px;
        }
        
        .history-reason {
            font-weight: 500;
            margin-bottom: 3px;
        }
        
        .history-meta {
            font-size: 12px;
            color: #6c757d;
        }
        
        .history-teacher {
            margin-right: 10px;
        }
        
        .history-amount {
            font-weight: 600;
            font-size: 16px;
        }
        
        .text-success { color: #28a745; }
        .text-danger { color: #dc3545; }
        .text-warning { color: #ffc107; }
        
        .pagination-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM加载完成，初始化系统...");
        initSystem();
    });
} else {
    // DOM已经加载完成
    console.log("DOM已加载，直接初始化系统...");
    initSystem();
}

function initSystem() {
    console.log("开始初始化系统...");
    
    // 检查当前页面，只加载必要的功能
    const path = window.location.pathname;
    console.log("当前路径:", path);
    
    // 所有页面都需要加载班级
    loadClasses();
    
    // 根据页面初始化特定功能
    if (path === '/' || path === '/index.html') {
        console.log("在首页，初始化首页功能");
        // 首页特定初始化
        if (typeof initHomePage === 'function') {
            initHomePage();
        }
    } else if (path === '/students' || path.includes('students')) {
        console.log("在学生管理页面");
        // 学生页面特定初始化
        if (typeof initStudentsPage === 'function') {
            initStudentsPage();
        }
    } else if (path === '/points' || path.includes('points')) {
        console.log("在积分管理页面");
        // 积分页面特定初始化
        if (typeof initPointsPage === 'function') {
            initPointsPage();
        }
    }
}

// 在 main.js 中添加以下函数

// Excel导入功能
function showImportModal() {
    document.getElementById('importModal').style.display = 'block';
    
    // 加载班级选项
    loadClassesForImport();
    
    // 重置状态
    resetImportState();
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function closeImportModalAndRefresh() {
    closeImportModal();
    loadStudents(); // 重新加载学生列表
}

function loadClassesForImport() {
    try {
        const select = document.getElementById('import-class');
        select.innerHTML = '<option value="">请选择班级</option>';
        
        // 从现有的class-select获取班级数据
        const classSelect = document.getElementById('student-class-select');
        if (classSelect) {
            Array.from(classSelect.options).forEach(option => {
                if (option.value) {
                    const newOption = document.createElement('option');
                    newOption.value = option.value;
                    newOption.textContent = option.textContent;
                    select.appendChild(newOption);
                }
            });
        }
    } catch (error) {
        console.error('加载班级失败:', error);
    }
}

function handleFileSelect(input) {
    const fileInfo = document.getElementById('file-info');
    if (input.files && input.files[0]) {
        const file = input.files[0];
        fileInfo.innerHTML = `
            <i class="fas fa-file-excel" style="color: #217346;"></i>
            <span><strong>${file.name}</strong></span>
            <p class="file-hint">大小: ${(file.size / 1024).toFixed(2)} KB</p>
        `;
    }
}

function resetImportState() {
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('import-results').style.display = 'none';
    document.getElementById('file-info').innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <span>点击选择或拖拽Excel文件到此区域</span>
        <p class="file-hint">支持 .xlsx 和 .xls 格式</p>
    `;
    document.getElementById('excel-file').value = '';
    document.getElementById('import-class').value = '';
}

async function downloadTemplate() {
    try {
        showToast('正在下载模板...', 'info');
        
        const response = await fetch('/api/students/template');
        if (!response.ok) {
            throw new Error('下载失败');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '学生导入模板.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('模板下载成功', 'success');
    } catch (error) {
        console.error('下载模板失败:', error);
        showToast('下载模板失败: ' + error.message, 'error');
    }
}

async function importStudents() {
    const classId = document.getElementById('import-class').value;
    const fileInput = document.getElementById('excel-file');
    const autoCreateGroup = document.getElementById('auto-create-group').checked;
    
    if (!classId) {
        showToast('请选择班级', 'warning');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('请选择Excel文件', 'warning');
        return;
    }
    
    const file = fileInput.files[0];
    
    // 显示进度条
    document.getElementById('import-progress').style.display = 'block';
    document.getElementById('import-results').style.display = 'none';
    updateProgress(0, '准备上传...');
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('class_id', classId);
        formData.append('auto_create_group', autoCreateGroup);
        
        updateProgress(30, '正在上传文件...');
        
        const response = await fetch('/api/students/import', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(60, '正在处理数据...');
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '导入失败');
        }
        
        updateProgress(90, '正在保存数据...');
        
        const result = await response.json();
        
        updateProgress(100, '导入完成');
        
        // 显示结果
        showImportResults(result);
        
        if (result.success) {
            showToast(`导入完成，成功 ${result.success_count} 条，失败 ${result.fail_count} 条`, 'success');
        } else {
            showToast('导入失败: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('导入失败:', error);
        showToast('导入失败: ' + error.message, 'error');
        document.getElementById('import-progress').style.display = 'none';
    }
}

function updateProgress(percentage, message) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
}

function showImportResults(result) {
    const importResults = document.getElementById('import-results');
    const successCount = document.getElementById('success-count');
    const failCount = document.getElementById('fail-count');
    const errorList = document.getElementById('error-list');
    
    successCount.textContent = result.success_count || 0;
    failCount.textContent = result.fail_count || 0;
    
    // 显示错误信息
    errorList.innerHTML = '';
    if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error}`;
            errorList.appendChild(errorItem);
        });
    } else if (result.fail_count > 0) {
        const errorItem = document.createElement('div');
        errorItem.className = 'error-item';
        errorItem.innerHTML = '<i class="fas fa-exclamation-circle"></i> 导入过程中发生未知错误';
        errorList.appendChild(errorItem);
    }
    
    document.getElementById('import-progress').style.display = 'none';
    importResults.style.display = 'block';
}

// 修改现有的exportStudents函数
async function exportStudents() {
    const classId = document.getElementById('student-class-select').value;
    
    if (!classId) {
        showToast('请先选择班级', 'warning');
        return;
    }
    
    try {
        showToast('正在生成Excel文件...', 'info');
        
        const response = await fetch(`/api/students/export?class_id=${classId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '导出失败');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = '学生名单.xlsx';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
                filename = match[1];
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Excel文件导出成功', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showToast('导出失败: ' + error.message, 'error');
    }
}

// 添加拖拽上传功能
document.addEventListener('DOMContentLoaded', function() {
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = document.getElementById('excel-file');
    
    if (fileUpload && fileInput) {
        // 拖拽进入
        fileUpload.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#667eea';
            this.style.backgroundColor = '#f7fafc';
        });
        
        // 拖拽离开
        fileUpload.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#cbd5e0';
            this.style.backgroundColor = '';
        });
        
        // 文件放置
        fileUpload.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.borderColor = '#cbd5e0';
            this.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(fileInput);
            }
        });
    }
});

// ============ 分组管理函数 ============

// 加载班级选项（分组页面）
async function loadClassesForGroups() {
    try {
        const response = await fetch('/api/classes');
        const classes = await response.json();
        
        const select = document.getElementById('group-class-select');
        const modalSelect = document.getElementById('groupClass');
        
        if (select) {
            select.innerHTML = '<option value="">请选择班级</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                select.appendChild(option);
            });
        }
        
        if (modalSelect) {
            modalSelect.innerHTML = '<option value="">请选择班级</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                modalSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载班级失败:', error);
        showToast('加载班级失败', 'error');
    }
}

// 加载分组数据
async function loadGroups() {
    const classId = document.getElementById('group-class-select').value;
    
    if (!classId) {
        currentGroups = [];
        renderGroups();
        renderGroupRanking();
        return;
    }
    
    try {
        // 加载分组列表
        const groupsResponse = await fetch(`/api/groups?class_id=${classId}`);
        currentGroups = await groupsResponse.json();
        
        // 加载分组排行
        const rankingResponse = await fetch(`/api/classes/${classId}/group-ranking`);
        const rankingData = await rankingResponse.json();
        
        renderGroups();
        renderGroupRanking(rankingData);
    } catch (error) {
        console.error('加载分组失败:', error);
        showToast('加载分组失败', 'error');
    }
}

// 渲染分组列表
function renderGroups() {
    const groupsGrid = document.getElementById('groups-grid');
    groupsGrid.innerHTML = '';
    
    if (currentGroups.length === 0) {
        groupsGrid.innerHTML = `
            <div class="empty-message" style="grid-column: 1 / -1;">
                <i class="fas fa-layer-group"></i>
                <p>暂无分组数据，请先创建分组</p>
            </div>
        `;
        return;
    }
    
    currentGroups.forEach(group => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.style.borderLeft = `4px solid ${group.color}`;
        
        groupCard.innerHTML = `
            <div class="group-card-header">
                <div class="group-icon" style="background-color: ${group.color};">
                    <i class="fas fa-users"></i>
                </div>
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p><i class="fas fa-school"></i> 班级ID: ${group.class_id}</p>
                </div>
            </div>
            <div class="group-card-stats">
                <div class="stat">
                    <span class="stat-label">成员数量</span>
                    <span class="stat-value">${group.student_count || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">平均积分</span>
                    <span class="stat-value">${group.avg_points || 0}</span>
                </div>
            </div>
            <div class="group-card-actions">
                <button class="btn btn-sm btn-info" onclick="viewGroupDetails(${group.id})">
                    <i class="fas fa-eye"></i> 查看
                </button>
                <button class="btn btn-sm btn-warning" onclick="editGroup(${group.id})">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup(${group.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;
        
        groupsGrid.appendChild(groupCard);
    });
}

// 渲染分组排行榜
function renderGroupRanking(rankingData = []) {
    const rankingContainer = document.getElementById('group-ranking');
    
    if (!rankingData || rankingData.length === 0) {
        rankingContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-trophy"></i>
                <p>暂无分组排行数据</p>
            </div>
        `;
        return;
    }
    
    rankingContainer.innerHTML = '';
    
    rankingData.forEach((group, index) => {
        const rankClass = index === 0 ? 'gold' : 
                         index === 1 ? 'silver' : 
                         index === 2 ? 'bronze' : '';
        
        const rankingItem = document.createElement('div');
        rankingItem.className = 'group-ranking-item';
        
        rankingItem.innerHTML = `
            <div class="rank-number ${rankClass}">
                ${index < 3 ? `<i class="fas fa-${index === 0 ? 'crown' : index === 1 ? 'medal' : 'award'}"></i>` : ''}
                <span>${index + 1}</span>
            </div>
            <div class="group-ranking-info">
                <div class="group-name">
                    <span class="group-color-dot" style="background-color: ${group.color || '#667eea'};"></span>
                    ${group.name}
                </div>
                <div class="group-stats">
                    <div class="stat">
                        <i class="fas fa-users"></i> ${group.student_count} 人
                    </div>
                    <div class="stat">
                        <i class="fas fa-star"></i> 总积分: ${group.total_points}
                    </div>
                    <div class="stat">
                        <i class="fas fa-chart-line"></i> 平均: ${group.avg_points}
                    </div>
                </div>
            </div>
        `;
        
        rankingItem.onclick = () => viewGroupDetails(group.id);
        rankingContainer.appendChild(rankingItem);
    });
}

// 创建分组
function showCreateGroupModal() {
    document.getElementById('groupModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> 创建分组';
    document.getElementById('groupId').value = '';
    document.getElementById('groupForm').reset();
    document.getElementById('groupModal').style.display = 'block';
}

function closeGroupModal() {
    document.getElementById('groupModal').style.display = 'none';
}

async function saveGroup(event) {
    event.preventDefault();
    
    const groupId = document.getElementById('groupId').value;
    const name = document.getElementById('groupName').value;
    const classId = document.getElementById('groupClass').value;
    const color = document.getElementById('groupColor').value;
    
    if (!name || !classId) {
        showToast('请填写所有必填项', 'warning');
        return;
    }
    
    try {
        let url = '/api/groups';
        let method = 'POST';
        let body = { class_id: classId, name, color };
        
        if (groupId) {
            url = `/api/groups/${groupId}`;
            method = 'PUT';
            body = { name, color };
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            showToast(groupId ? '分组更新成功' : '分组创建成功', 'success');
            closeGroupModal();
            loadGroups();
        } else {
            const error = await response.json();
            showToast(error.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存分组失败:', error);
        showToast('保存分组失败', 'error');
    }
}

// 编辑分组
async function editGroup(groupId) {
    try {
        // 获取分组信息
        const response = await fetch(`/api/groups/${groupId}/stats`);
        const data = await response.json();
        
        if (!data.group) {
            showToast('分组不存在', 'error');
            return;
        }
        
        const group = data.group;
        
        // 获取班级信息
        const classResponse = await fetch('/api/classes');
        const classes = await classResponse.json();
        const classInfo = classes.find(c => c.id == group.class_id);
        
        document.getElementById('groupModalTitle').innerHTML = '<i class="fas fa-edit"></i> 编辑分组';
        document.getElementById('groupId').value = group.id;
        document.getElementById('groupName').value = group.name;
        document.getElementById('groupColor').value = group.color || '#667eea';
        
        // 设置班级选择（显示班级名称）
        const classSelect = document.getElementById('groupClass');
        classSelect.innerHTML = '';
        
        if (classInfo) {
            const option = document.createElement('option');
            option.value = group.class_id;
            option.textContent = classInfo.name;
            option.selected = true;
            classSelect.appendChild(option);
        } else {
            const option = document.createElement('option');
            option.value = group.class_id;
            option.textContent = `班级 ${group.class_id}`;
            option.selected = true;
            classSelect.appendChild(option);
        }
        
        document.getElementById('groupModal').style.display = 'block';
    } catch (error) {
        console.error('编辑分组失败:', error);
        showToast('编辑分组失败', 'error');
    }
}

// 删除分组
async function deleteGroup(groupId) {
    if (!confirm('确定要删除这个分组吗？分组内的学生将变为无分组状态。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('分组删除成功', 'success');
            loadGroups();
        } else {
            const error = await response.json();
            showToast(error.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除分组失败:', error);
        showToast('删除分组失败', 'error');
    }
}

// 查看分组详情
async function viewGroupDetails(groupId) {
    try {
        // 获取分组信息
        const statsResponse = await fetch(`/api/groups/${groupId}/stats`);
        const statsData = await statsResponse.json();
        
        if (!statsData.group) {
            showToast('分组不存在', 'error');
            return;
        }
        
        // 获取分组成员
        const membersResponse = await fetch(`/api/groups/${groupId}/students`);
        const members = await membersResponse.json();
        
        // 更新详情模态框
        const group = statsData.group;
        document.getElementById('detail-group-icon').style.backgroundColor = group.color || '#667eea';
        document.getElementById('detail-group-name').textContent = group.name;
        document.getElementById('detail-group-class').textContent = `班级 ${group.class_id}`;
        document.getElementById('detail-group-avg-points').textContent = statsData.avg_points || 0;
        document.getElementById('detail-group-member-count').textContent = statsData.student_count || 0;
        
        // 更新成员列表
        const membersList = document.getElementById('group-members-list');
        membersList.innerHTML = '';
        
        if (members.length === 0) {
            membersList.innerHTML = '<p class="empty-message">暂无成员</p>';
        } else {
            members.forEach((student, index) => {
                const memberItem = document.createElement('div');
                memberItem.className = 'member-item';
                
                memberItem.innerHTML = `
                    <div class="member-rank">${index + 1}</div>
                    <div class="member-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${student.name}</div>
                        <div class="member-id">${student.student_id}</div>
                    </div>
                    <div class="member-points">${student.points} 分</div>
                `;
                
                membersList.appendChild(memberItem);
            });
        }
        
        // 保存当前分组ID
        currentGroupId = groupId;
        
        document.getElementById('groupDetailModal').style.display = 'block';
    } catch (error) {
        console.error('查看分组详情失败:', error);
        showToast('查看分组详情失败', 'error');
    }
}

function closeGroupDetailModal() {
    document.getElementById('groupDetailModal').style.display = 'none';
}

// 搜索分组
function searchGroups() {
    const searchTerm = document.getElementById('group-search').value.toLowerCase();
    
    const filteredGroups = currentGroups.filter(group => 
        group.name.toLowerCase().includes(searchTerm)
    );
    
    const groupsGrid = document.getElementById('groups-grid');
    groupsGrid.innerHTML = '';
    
    if (filteredGroups.length === 0) {
        groupsGrid.innerHTML = `
            <div class="empty-message" style="grid-column: 1 / -1;">
                <i class="fas fa-search"></i>
                <p>未找到匹配的分组</p>
            </div>
        `;
        return;
    }
    
    filteredGroups.forEach(group => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.style.borderLeft = `4px solid ${group.color}`;
        
        groupCard.innerHTML = `
            <div class="group-card-header">
                <div class="group-icon" style="background-color: ${group.color};">
                    <i class="fas fa-users"></i>
                </div>
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <p><i class="fas fa-school"></i> 班级ID: ${group.class_id}</p>
                </div>
            </div>
            <div class="group-card-stats">
                <div class="stat">
                    <span class="stat-label">成员数量</span>
                    <span class="stat-value">${group.student_count || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">平均积分</span>
                    <span class="stat-value">${group.avg_points || 0}</span>
                </div>
            </div>
            <div class="group-card-actions">
                <button class="btn btn-sm btn-info" onclick="viewGroupDetails(${group.id})">
                    <i class="fas fa-eye"></i> 查看
                </button>
                <button class="btn btn-sm btn-warning" onclick="editGroup(${group.id})">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup(${group.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;
        
        groupsGrid.appendChild(groupCard);
    });
}

// 为全组加分
async function addPointsToGroup() {
    if (!currentGroupId) return;
    
    const points = prompt('请输入要增加的积分值（正数为加分，负数为扣分）:', '10');
    if (points === null) return;
    
    const reason = prompt('请输入原因:', '分组集体表现优秀');
    if (reason === null) return;
    
    try {
        const response = await fetch(`/api/groups/${currentGroupId}/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                change_amount: parseInt(points),
                reason,
                teacher: document.getElementById('current-teacher').textContent || '班主任'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message || '操作成功', 'success');
            closeGroupDetailModal();
            loadGroups();
        } else {
            const error = await response.json();
            showToast(error.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('为全组加分失败:', error);
        showToast('操作失败', 'error');
    }
}

// 添加CSS样式（如果还没有）
function addGroupStyles() {
    if (!document.querySelector('#group-styles')) {
        const style = document.createElement('style');
        style.id = 'group-styles';
        style.textContent = `
            .groups-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                padding: 20px;
            }
            
            .group-card {
                background-color: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                transition: all 0.3s ease;
            }
            
            .group-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .group-card-header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .group-icon {
                width: 50px;
                height: 50px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
            }
            
            .group-card-stats {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .group-card-actions {
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }
            
            .group-ranking-item {
                display: flex;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #e2e8f0;
                cursor: pointer;
                transition: background-color 0.3s ease;
            }
            
            .group-ranking-item:hover {
                background-color: #f7fafc;
            }
            
            .rank-number {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 600;
                margin-right: 20px;
            }
            
            .rank-number.gold {
                background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
                color: white;
            }
            
            .rank-number.silver {
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                color: #2d3748;
            }
            
            .rank-number.bronze {
                background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
                color: #2d3748;
            }
        `;
        document.head.appendChild(style);
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果当前页面是分组管理页面，初始化分组相关功能
    if (window.location.pathname.includes('/groups')) {
        addGroupStyles();
        console.log('初始化分组管理页面...');
    }
});

// 打开管理分组成员模态框
async function editGroupMembers() {
    if (!currentGroupId) return;
    
    try {
        // 获取当前组成员
        const membersResponse = await fetch(`/api/groups/${currentGroupId}/students`);
        currentGroupMembers = await membersResponse.json();
        
        // 获取班级所有学生（用于添加新成员）
        const classId = document.getElementById('group-class-select').value;
        const allStudentsResponse = await fetch(`/api/classes/${classId}/students`);
        const allStudents = await allStudentsResponse.json();
        
        // 筛选出尚未加入该组的学生
        availableStudentsForGroup = allStudents.filter(student => 
            !currentGroupMembers.some(member => member.id === student.id)
        );
        
        // 渲染当前成员
        renderCurrentMembers();
        
        // 渲染可添加的学生
        renderAvailableStudents();
        
        // 显示模态框
        document.getElementById('groupMembersModal').style.display = 'block';
        
    } catch (error) {
        console.error('加载成员数据失败:', error);
        showToast('加载成员数据失败', 'error');
    }
}

// 渲染当前成员列表
function renderCurrentMembers() {
    const currentMembersDiv = document.getElementById('current-members');
    currentMembersDiv.innerHTML = '';
    
    if (currentGroupMembers.length === 0) {
        currentMembersDiv.innerHTML = '<p class="empty-message">暂无成员</p>';
        return;
    }
    
    currentGroupMembers.forEach((student, index) => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        
        memberItem.innerHTML = `
            <div class="member-info">
                <div class="member-name">
                    ${index + 1}. ${student.name} (${student.student_id})
                </div>
                <div class="member-points">${student.points} 分</div>
            </div>
            <div class="member-actions">
                <button class="btn-icon btn-danger btn-sm" onclick="removeFromGroup(${student.id})" title="移出分组">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        currentMembersDiv.appendChild(memberItem);
    });
}

// 渲染可添加的学生列表
function renderAvailableStudents() {
    const availableStudentsDiv = document.getElementById('available-students');
    availableStudentsDiv.innerHTML = '';
    
    if (availableStudentsForGroup.length === 0) {
        availableStudentsDiv.innerHTML = '<p class="empty-message">没有可添加的学生</p>';
        return;
    }
    
    availableStudentsForGroup.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        
        // 显示当前分组（如果有）
        const groupInfo = student.group_name ? 
            `<span class="student-group">当前分组: ${student.group_name}</span>` : 
            `<span class="student-group text-muted">无分组</span>`;
        
        studentItem.innerHTML = `
            <div class="student-info">
                <div class="student-name">
                    ${student.name} (${student.student_id})
                </div>
                <div class="student-details">
                    <span class="student-points">${student.points} 分</span>
                    ${groupInfo}
                </div>
            </div>
            <div class="student-actions">
                <button class="btn-icon btn-success btn-sm" onclick="addToGroup(${student.id})" title="添加到分组">
                    <i class="fas fa-plus"></i> 添加
                </button>
            </div>
        `;
        
        availableStudentsDiv.appendChild(studentItem);
    });
}

// 搜索可添加的学生
function searchStudentsForGroup() {
    const searchTerm = document.getElementById('add-member-search').value.toLowerCase();
    
    const filteredStudents = availableStudentsForGroup.filter(student => 
        student.name.toLowerCase().includes(searchTerm) || 
        student.student_id.toLowerCase().includes(searchTerm)
    );
    
    const availableStudentsDiv = document.getElementById('available-students');
    availableStudentsDiv.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        availableStudentsDiv.innerHTML = '<p class="empty-message">未找到匹配的学生</p>';
        return;
    }
    
    filteredStudents.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        
        const groupInfo = student.group_name ? 
            `<span class="student-group">当前分组: ${student.group_name}</span>` : 
            `<span class="student-group text-muted">无分组</span>`;
        
        studentItem.innerHTML = `
            <div class="student-info">
                <div class="student-name">
                    ${student.name} (${student.student_id})
                </div>
                <div class="student-details">
                    <span class="student-points">${student.points} 分</span>
                    ${groupInfo}
                </div>
            </div>
            <div class="student-actions">
                <button class="btn-icon btn-success btn-sm" onclick="addToGroup(${student.id})" title="添加到分组">
                    <i class="fas fa-plus"></i> 添加
                </button>
            </div>
        `;
        
        availableStudentsDiv.appendChild(studentItem);
    });
}

// 将学生添加到分组
async function addToGroup(studentId) {
    if (!currentGroupId) return;
    
    try {
        const response = await fetch(`/api/students/${studentId}/group`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                group_id: currentGroupId
            })
        });
        
        if (response.ok) {
            showToast('学生已添加到分组', 'success');
            
            // 刷新成员列表
            await editGroupMembers();
            
            // 刷新分组详情
            if (document.getElementById('groupDetailModal').style.display === 'block') {
                viewGroupDetails(currentGroupId);
            }
        } else {
            const error = await response.json();
            showToast(error.error || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加学生到分组失败:', error);
        showToast('添加失败', 'error');
    }
}

// 将学生从分组移除
async function removeFromGroup(studentId) {
    if (!currentGroupId) return;
    
    if (!confirm('确定要将该学生移出分组吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/students/${studentId}/group`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                group_id: null  // 设置为null表示无分组
            })
        });
        
        if (response.ok) {
            showToast('学生已从分组移除', 'success');
            
            // 刷新成员列表
            await editGroupMembers();
            
            // 刷新分组详情
            if (document.getElementById('groupDetailModal').style.display === 'block') {
                viewGroupDetails(currentGroupId);
            }
        } else {
            const error = await response.json();
            showToast(error.error || '移除失败', 'error');
        }
    } catch (error) {
        console.error('从分组移除学生失败:', error);
        showToast('移除失败', 'error');
    }
}

// 关闭管理成员模态框
function closeGroupMembersModal() {
    document.getElementById('groupMembersModal').style.display = 'none';
}

// ============ 在单个学生页面调整分组 ============

// 在学生管理页面添加分组选择功能（修改editStudent函数）
async function editStudent(id) {
    try {
        // 获取学生信息
        const student = allStudents.find(s => s.id === id);
        if (!student) return;
        
        // 设置表单值
        document.getElementById('studentModalTitle').innerHTML = '<i class="fas fa-edit"></i> 编辑学生';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentNumber').value = student.student_id;
        
        // 加载班级选项并选中当前班级
        await loadClassesForStudentModal();
        document.getElementById('studentClass').value = student.class_id;
        
        // 禁用学号输入框
        document.getElementById('studentNumber').disabled = true;
        
        // 加载分组选项（新增）
        await loadGroupOptionsForStudent(student.class_id, student.group_id);
        
        document.getElementById('studentModal').style.display = 'block';
    } catch (error) {
        console.error('编辑学生失败:', error);
        showToast('编辑学生失败', 'error');
    }
}

// 加载分组选项
async function loadGroupOptionsForStudent(classId, selectedGroupId) {
    try {
        // 创建或获取分组选择器
        let groupSelect = document.getElementById('studentGroup');
        if (!groupSelect) {
            // 如果不存在，创建分组选择器
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.innerHTML = `
                <label for="studentGroup"><i class="fas fa-layer-group"></i> 分组</label>
                <select id="studentGroup">
                    <option value="">无分组</option>
                </select>
            `;
            
            // 插入到班级选择器后面
            const classGroup = document.querySelector('#studentClass').closest('.form-group');
            classGroup.after(formGroup);
            groupSelect = document.getElementById('studentGroup');
        }
        
        // 获取该班级的所有分组
        const response = await fetch(`/api/groups?class_id=${classId}`);
        const groups = await response.json();
        
        // 更新选项
        groupSelect.innerHTML = '<option value="">无分组</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (group.id === selectedGroupId) {
                option.selected = true;
            }
            groupSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('加载分组选项失败:', error);
    }
}

// 修改saveStudent函数以支持分组
async function saveStudent(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const name = document.getElementById('studentName').value;
    const studentNumber = document.getElementById('studentNumber').value;
    const classId = document.getElementById('studentClass').value;
    const groupId = document.getElementById('studentGroup') ? 
                    document.getElementById('studentGroup').value : null;
    
    if (!name || !studentNumber || !classId) {
        showToast('请填写所有必填项', 'warning');
        return;
    }
    
    try {
        let url = '/api/students';
        let method = 'POST';
        let body = { 
            class_id: classId, 
            name, 
            student_id: studentNumber,
            group_id: groupId || null
        };
        
        if (studentId) {
            url = `/api/students/${studentId}`;
            method = 'PUT';
            body = { 
                name,
                group_id: groupId || null
            };
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            showToast(studentId ? '学生信息更新成功' : '学生添加成功', 'success');
            closeStudentModal();
            loadStudents();
        } else {
            const error = await response.json();
            showToast(error.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('保存学生失败:', error);
        showToast('保存学生失败', 'error');
    }
}

// ============ 批量调整学生分组 ============

// 在积分管理页面添加批量调整分组功能
function showBatchGroupModal() {
    if (selectedStudents.size === 0) {
        showToast('请先选择学生', 'warning');
        return;
    }
    
    // 创建批量分组调整模态框
    const modal = document.createElement('div');
    modal.id = 'batchGroupModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-exchange-alt"></i> 批量调整分组</h2>
                <span class="close" onclick="closeBatchGroupModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="batch-group-select">选择目标分组</label>
                    <select id="batch-group-select">
                        <option value="">无分组（移出分组）</option>
                    </select>
                </div>
                <div class="selected-students-info">
                    <p>已选择 <span id="batch-student-count">${selectedStudents.size}</span> 名学生</p>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeBatchGroupModal()">取消</button>
                    <button type="button" class="btn btn-primary" onclick="updateBatchGroup()">确认调整</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 加载分组选项
    loadBatchGroupOptions();
    
    modal.style.display = 'block';
}

function closeBatchGroupModal() {
    const modal = document.getElementById('batchGroupModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

async function loadBatchGroupOptions() {
    try {
        const classId = document.getElementById('points-class-select').value;
        if (!classId) return;
        
        const response = await fetch(`/api/groups?class_id=${classId}`);
        const groups = await response.json();
        
        const select = document.getElementById('batch-group-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">无分组（移出分组）</option>';
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载分组选项失败:', error);
    }
}

async function updateBatchGroup() {
    const groupId = document.getElementById('batch-group-select').value;
    const targetGroupId = groupId ? parseInt(groupId) : null;
    
    if (!confirm(`确定要将 ${selectedStudents.size} 名学生调整到选定的分组吗？`)) {
        return;
    }
    
    try {
        const promises = Array.from(selectedStudents).map(studentId => 
            fetch(`/api/students/${studentId}/group`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    group_id: targetGroupId
                })
            })
        );
        
        const results = await Promise.all(promises);
        const allSuccessful = results.every(r => r.ok);
        
        if (allSuccessful) {
            showToast(`成功调整 ${selectedStudents.size} 名学生的分组`, 'success');
            closeBatchGroupModal();
            selectedStudents.clear();
            loadStudentsForPoints();
        } else {
            showToast('部分学生分组调整失败', 'error');
        }
    } catch (error) {
        console.error('批量调整分组失败:', error);
        showToast('调整失败', 'error');
    }
}

// ============ 在积分管理页面添加分组操作按钮 ============

// 修改积分管理页面的HTML结构（建议修改points.html）
// 在table-header中添加分组操作按钮
function addGroupActionsToPointsPage() {
    const tableHeader = document.querySelector('.table-header');
    if (tableHeader && !document.getElementById('group-actions-btn')) {
        const groupActions = document.createElement('div');
        groupActions.className = 'table-actions';
        groupActions.innerHTML = `
            <button class="btn btn-sm btn-info" id="group-actions-btn" onclick="showBatchGroupModal()">
                <i class="fas fa-exchange-alt"></i> 批量调整分组
            </button>
        `;
        
        // 插入到搜索框前面
        const searchBox = tableHeader.querySelector('.search-box');
        if (searchBox) {
            searchBox.parentNode.insertBefore(groupActions, searchBox);
        }
    }
}


// 添加美化样式
function addBeautifyStyles() {
    const styleId = 'beautify-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* ========== 全局美化样式 ========== */
        
        /* 1. 表格美化 */
        .beautify-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            background: white;
            font-size: 14px;
        }
        
        .beautify-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .beautify-table th {
            padding: 16px 20px;
            color: white;
            font-weight: 600;
            text-align: left;
            border: none;
            position: relative;
        }
        
        .beautify-table th:not(:last-child)::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            height: 60%;
            width: 1px;
            background: rgba(255, 255, 255, 0.3);
        }
        
        .beautify-table tbody tr {
            transition: all 0.2s ease;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .beautify-table tbody tr:last-child {
            border-bottom: none;
        }
        
        .beautify-table tbody tr:hover {
            background-color: #f8f9ff;
            transform: translateY(-1px);
        }
        
        .beautify-table td {
            padding: 14px 20px;
            color: #333;
            vertical-align: middle;
        }
        
        /* 2. 积分徽章美化 */
        .beauty-points-badge {
            display: inline-block;
            padding: 6px 14px;
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            color: #2d3748;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 2px 8px rgba(168, 237, 234, 0.3);
            min-width: 50px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        /* 3. 操作按钮美化 */
        .beauty-action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .beauty-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .beauty-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .beauty-btn-info {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
        }
        
        .beauty-btn-warning {
            background: linear-gradient(135deg, #ffd166 0%, #f9a826 100%);
            color: white;
        }
        
        .beauty-btn-danger {
            background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
            color: white;
        }
        
        .beauty-btn-primary {
            background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            color: white;
        }
        
        /* 4. 筛选工具栏美化 */
        .beauty-filter-bar {
            background: white;
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            align-items: center;
        }
        
        .beauty-filter-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .beauty-filter-label {
            font-weight: 600;
            color: #4a5568;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .beauty-filter-label i {
            color: #667eea;
        }
        
        /* 5. 选择器美化 */
        .beauty-select {
            padding: 10px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            font-size: 14px;
            color: #2d3748;
            min-width: 180px;
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
        }
        
        .beauty-select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        /* 6. 按钮美化 */
        .beauty-action-btn {
            padding: 10px 22px;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .beauty-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .beauty-btn-all {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .beauty-btn-clear {
            background: linear-gradient(135deg, #f7f9fc 0%, #e2e8f0 100%);
            color: #4a5568;
            border: 1px solid #cbd5e0;
        }
        
        /* 7. 搜索框美化 */
        .beauty-search-box {
            flex: 1;
            position: relative;
            min-width: 280px;
        }
        
        .beauty-search-box input {
            width: 100%;
            padding: 12px 16px 12px 48px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .beauty-search-box input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            outline: none;
        }
        
        .beauty-search-box i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #a0aec0;
            font-size: 16px;
        }
        
        /* 8. 空状态美化 */
        .beauty-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #718096;
        }
        
        .beauty-empty-state i {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.3;
            color: #667eea;
        }
        
        .beauty-empty-state p {
            font-size: 16px;
            margin: 0;
            font-weight: 500;
        }
        
        /* 9. 分页美化 */
        .beauty-pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 20px;
            background: white;
            border-radius: 16px;
            margin-top: 24px;
            box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
        }
        
        .beauty-page-btn {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            color: #4a5568;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        }
        
        .beauty-page-btn:hover:not(:disabled) {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .beauty-page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .beauty-page-info {
            font-size: 14px;
            color: #4a5568;
            font-weight: 600;
            margin: 0 16px;
        }
        
        /* 10. 复选框美化 */
        .beauty-checkbox {
            width: 20px;
            height: 20px;
            border-radius: 6px;
            border: 2px solid #cbd5e0;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .beauty-checkbox:checked {
            background: #667eea;
            border-color: #667eea;
        }
        
        .beauty-checkbox:checked::after {
            content: '✓';
            position: absolute;
            color: white;
            font-size: 14px;
            font-weight: bold;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        
        /* 11. 学生卡片样式（适用于分组显示） */
        .beauty-student-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            border: 1px solid #f0f0f0;
        }
        
        .beauty-student-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
        
        .student-card-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .student-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
        }
        
        .student-info h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #2d3748;
        }
        
        .student-info p {
            margin: 0;
            font-size: 13px;
            color: #718096;
        }
        
        .student-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
        }
        
        .stat-label {
            font-size: 12px;
            color: #718096;
            margin-top: 4px;
        }
        
        /* 12. 响应式调整 */
        @media (max-width: 768px) {
            .beauty-filter-bar {
                flex-direction: column;
                align-items: stretch;
            }
            
            .beauty-filter-group {
                width: 100%;
            }
            
            .beauty-select {
                width: 100%;
            }
            
            .beauty-search-box {
                min-width: 100%;
            }
            
            .beauty-table th,
            .beauty-table td {
                padding: 12px 16px;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('美化样式已加载');
}

// 在页面加载时调用
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addBeautifyStyles, 100); // 延迟一点确保页面加载完成
});


function renderStudentsAsCards() {
    const container = document.getElementById('students-container');
    if (!container) return;
    
    const startIndex = (currentPage - 1) * studentsPerPage;
    const pageStudents = allStudents.slice(startIndex, startIndex + studentsPerPage);
    
    container.innerHTML = '';
    
    if (pageStudents.length === 0) {
        container.innerHTML = `
            <div class="beauty-empty-state" style="width: 100%;">
                <i class="fas fa-users"></i>
                <p>暂无学生数据</p>
            </div>
        `;
        return;
    }
    
    pageStudents.forEach((student, index) => {
        const card = document.createElement('div');
        card.className = 'beauty-student-card';
        card.innerHTML = `
            <div class="student-card-header">
                <div class="student-avatar">
                    ${student.name.charAt(0)}
                </div>
                <div class="student-info">
                    <h4>${student.name}</h4>
                    <p>学号: ${student.student_id}</p>
                </div>
            </div>
            
            <div class="student-stats">
                <div class="stat-item">
                    <div class="stat-value">${student.points}</div>
                    <div class="stat-label">当前积分</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${index + 1}</div>
                    <div class="stat-label">序号</div>
                </div>
            </div>
            
            <div style="margin-top: 16px; display: flex; justify-content: space-between;">
                <div>
                    <input 
                        type="checkbox" 
                        class="beauty-checkbox"
                        id="card-student-${student.id}"
                        onchange="toggleStudentSelection(${student.id}, this.checked)"
                    >
                    <label for="card-student-${student.id}" style="margin-left: 8px; font-size: 13px;">
                        选择
                    </label>
                </div>
                <div class="beauty-action-buttons">
                    <button class="beauty-btn beauty-btn-info" onclick="viewStudentDetails(${student.id})" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="beauty-btn beauty-btn-warning" onclick="editStudent(${student.id})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

