/**
 * User Management Actions (VIP PRO Edition)
 * Robust implementation with SweetAlert2 and Error Handling
 */

let currentPage = 1;
const rowsPerPage = 10;
let filteredRows = [];
let allRows = [];

// Use a single initialization function
function initUserManagement() {
    const searchInput = document.getElementById('userSearchInput');
    const roleFilter = document.getElementById('roleFilter');
    const userTableBody = document.getElementById('userTableBody');
    
    if (!userTableBody) return;

    // Load data
    allRows = Array.from(userTableBody.querySelectorAll('.user-row'));
    
    function applyLogic() {
        const searchTerm = (searchInput?.value || "").toLowerCase().trim();
        const roleTerm = (roleFilter?.value || "").toLowerCase();
        
        filteredRows = allRows.filter(row => {
            const name = (row.getAttribute('data-fullname') || "").toLowerCase();
            const username = (row.getAttribute('data-username') || "").toLowerCase();
            const phone = (row.getAttribute('data-phone') || "").toLowerCase();
            const email = (row.getAttribute('data-email') || "").toLowerCase();
            const role = (row.getAttribute('data-role') || "").toLowerCase();
            
            return (!searchTerm || name.includes(searchTerm) || username.includes(searchTerm) || phone.includes(searchTerm) || email.includes(searchTerm)) &&
                   (!roleTerm || role === roleTerm);
        });

        const total = filteredRows.length;
        const totalPages = Math.ceil(total / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        document.getElementById('showingCount').innerText = total;
        document.getElementById('totalPageNum').innerText = totalPages;
        document.getElementById('currentPageNum').innerText = currentPage;

        allRows.forEach(r => r.style.display = 'none');
        filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).forEach(row => row.style.display = '');

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        const container = document.getElementById('userPagination');
        if (!container) return;
        
        let html = `<button class="btn btn-sm btn-white border shadow-none ${currentPage === 1 ? 'disabled' : ''}" onclick="changeUserPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 5 && (i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1)) {
                if (i === 3 || i === totalPages - 1) html += `<span class="px-2">...</span>`;
                continue;
            }
            html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-white border'} shadow-none mx-1" style="${i === currentPage ? 'background:#4f46e5;border:none;' : ''}" onclick="changeUserPage(${i})">${i}</button>`;
        }
        html += `<button class="btn btn-sm btn-white border shadow-none ${currentPage === totalPages ? 'disabled' : ''}" onclick="changeUserPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        container.innerHTML = html;
    }

    window.changeUserPage = (page) => {
        currentPage = page;
        applyLogic();
    };

    searchInput?.addEventListener('input', () => { currentPage = 1; applyLogic(); });
    roleFilter?.addEventListener('change', () => { currentPage = 1; applyLogic(); });

    // Initial run
    applyLogic();

    // Event Delegation for Table Actions
    userTableBody.addEventListener('click', (e) => {
        const resetBtn = e.target.closest('.btn-reset-user');
        const editBtn = e.target.closest('.btn-edit-user');
        const deleteBtn = e.target.closest('.btn-delete-user');
        const row = e.target.closest('.user-row');
        
        if (resetBtn) {
            e.stopPropagation();
            confirmResetPassword(row.getAttribute('data-id'), row.getAttribute('data-fullname'));
        } else if (editBtn) {
            e.stopPropagation();
            openEditUserModal({
                id: row.getAttribute('data-id'),
                fullname: row.getAttribute('data-fullname'),
                role: row.getAttribute('data-role'),
                phone: row.getAttribute('data-phone'),
                roomId: row.getAttribute('data-room'),
                email: row.getAttribute('data-email')
            });
        } else if (deleteBtn) {
            e.stopPropagation();
            confirmDeleteUser(row.getAttribute('data-id'));
        } else if (row) {
            openDetailModal({
                fullname: row.getAttribute('data-fullname'),
                username: row.getAttribute('data-username'),
                role: row.getAttribute('data-role'),
                phone: row.getAttribute('data-phone'),
                roomName: row.querySelector('.text-slate-600').innerText,
                email: row.getAttribute('data-email')
            });
        }
    });
}

function confirmResetPassword(id, name) {
    Swal.fire({
        title: 'Đặt lại mật khẩu?',
        text: `Mật khẩu của ${name} sẽ được đặt về mặc định: 123456`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Đúng, đặt lại!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/users/${id}/reset-password`, { method: 'POST' });
                if (res.ok) {
                    Swal.fire('Thành công!', 'Mật khẩu đã được đặt về 123456', 'success');
                } else {
                    Swal.fire('Lỗi', 'Không thể đặt lại mật khẩu', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối', 'error');
            }
        }
    });
}

// Global Modal Instances (Initialized on demand)
let userModalInstance, detailModalInstance;

function openEditUserModal(data) {
    if (!userModalInstance) userModalInstance = new bootstrap.Modal(document.getElementById('userModal'));
    
    document.getElementById('userModalLabel').innerText = 'Chỉnh Sửa Thành Viên';
    document.getElementById('userId').value = data.id;
    document.getElementById('fullName').value = data.fullname;
    document.getElementById('role').value = data.role;
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('roomId').value = data.roomId || '';
    document.getElementById('email').value = data.email || '';
    
    document.getElementById('usernameSection').style.display = 'none';
    document.getElementById('passwordSection').style.display = 'none';
    document.getElementById('username').required = false;
    document.getElementById('password').required = false;
    
    userModalInstance.show();
}

function openDetailModal(data) {
    if (!detailModalInstance) detailModalInstance = new bootstrap.Modal(document.getElementById('userDetailModal'));
    
    document.getElementById('detailFullName').innerText = data.fullname;
    document.getElementById('detailUsername').innerText = data.username;
    document.getElementById('detailPhone').innerText = data.phone || 'Chưa cập nhật';
    document.getElementById('detailEmail').innerText = data.email || 'Chưa cập nhật';
    document.getElementById('detailRoom').innerText = data.roomName;
    
    const badge = document.getElementById('detailRoleBadge');
    badge.innerText = data.role.toUpperCase();
    badge.className = 'role-badge ' + (data.role === 'admin' ? 'role-admin' : (data.role === 'teacher' ? 'role-teacher' : 'role-staff'));
    
    const avatar = document.getElementById('detailAvatar');
    avatar.innerText = data.fullname.charAt(0);
    avatar.style.background = (data.role === 'admin' ? '#ef4444' : (data.role === 'teacher' ? '#10b981' : '#3b82f6'));
    
    detailModalInstance.show();
}

async function saveUser() {
    const userId = document.getElementById('userId').value;
    const isEdit = userId !== '';
    const btn = document.getElementById('btnSaveUser');
    
    const userData = {
        full_name: document.getElementById('fullName').value,
        role: document.getElementById('role').value,
        phone: document.getElementById('phone').value || null,
        email: document.getElementById('email').value || null,
        room_id: document.getElementById('roomId').value ? parseInt(document.getElementById('roomId').value) : null
    };

    if (!isEdit) {
        userData.username = document.getElementById('username').value;
        userData.password_hash = document.getElementById('password').value;
    }

    if (!userData.full_name || (!isEdit && (!userData.username || !userData.password_hash))) {
        Swal.fire('Cảnh báo', 'Vui lòng điền đầy đủ thông tin bắt buộc (*)', 'warning');
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...';

        const response = await fetch(isEdit ? `/users/${userId}` : '/users/add', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: isEdit ? 'Đã cập nhật!' : 'Đã thêm mới!',
                text: 'Dữ liệu đã được đồng bộ hệ thống.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            const err = await response.text();
            Swal.fire('Thất bại', err || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        Swal.fire('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Lưu thông tin';
    }
}

function confirmDeleteUser(id) {
    Swal.fire({
        title: 'Xóa tài khoản?',
        text: "Hành động này không thể hoàn tác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Đúng, xóa nó!',
        cancelButtonText: 'Hủy'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Người dùng đã được loại bỏ khỏi hệ thống.', 'success').then(() => location.reload());
                } else {
                    Swal.fire('Lỗi', 'Không thể xóa người dùng này', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối', 'error');
            }
        }
    });
}

// Reset for Add New
document.getElementById('userModal')?.addEventListener('show.bs.modal', function (e) {
    if (e.relatedTarget && e.relatedTarget.id === 'btnAddUser') {
        document.getElementById('userModalLabel').innerText = 'Thêm Người Dùng Mới';
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('usernameSection').style.display = 'block';
        document.getElementById('passwordSection').style.display = 'block';
        document.getElementById('username').required = true;
        document.getElementById('password').required = true;
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initUserManagement);
