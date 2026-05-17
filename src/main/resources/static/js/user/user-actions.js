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
                roomId: row.getAttribute('data-roomid'),
                email: row.getAttribute('data-email'),
                handheldName: row.getAttribute('data-handheld')
            });
        } else if (deleteBtn) {
            e.stopPropagation();
            confirmDeleteUser(row.getAttribute('data-id'));
        } else if (row) {
            openDetailModal({
                id: row.getAttribute('data-id'),
                fullname: row.getAttribute('data-fullname'),
                username: row.getAttribute('data-username'),
                role: row.getAttribute('data-role'),
                phone: row.getAttribute('data-phone'),
                roomName: row.getAttribute('data-room'),
                email: row.getAttribute('data-email'),
                created: row.getAttribute('data-created'),
                handheldName: row.getAttribute('data-handheld')
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
    console.log("DEBUG: Edit User Data ->", data);
    if (!userModalInstance) userModalInstance = new bootstrap.Modal(document.getElementById('userModal'));
    
    document.getElementById('userModalLabel').innerText = 'Chỉnh Sửa Thành Viên';
    document.getElementById('userId').value = data.id;
    document.getElementById('fullName').value = data.fullname;
    document.getElementById('role').value = data.role;
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('roomId').value = data.roomId || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('handheldName').value = data.handheldName || '';
    
    document.getElementById('usernameSection').style.display = 'none';
    document.getElementById('passwordSection').style.display = 'none';
    document.getElementById('username').required = false;
    document.getElementById('password').required = false;
    
    userModalInstance.show();
}

function openDetailModal(data) {
    console.log("DEBUG: Detail User Data ->", data);
    if (!detailModalInstance) detailModalInstance = new bootstrap.Modal(document.getElementById('userDetailModal'));
    
    document.getElementById('detailFullName').innerText = data.fullname;
    document.getElementById('detailUsername').innerText = data.username;
    document.getElementById('detailPhone').innerText = data.phone || 'Chưa cập nhật';
    document.getElementById('detailEmail').innerText = data.email || 'Chưa cập nhật';
    document.getElementById('detailRoom').innerText = data.roomName;
    document.getElementById('detailId').innerText = '#' + data.id;
    
    // Format creation date
    const dateStr = data.created ? data.created.replace('T', ' ').substring(0, 16) : 'Chưa rõ';
    document.getElementById('detailCreatedAt').innerText = dateStr;
    document.getElementById('detailHandheld').innerText = (data.handheldName && data.handheldName !== 'null' && data.handheldName !== '') ? data.handheldName : 'Chưa gán thiết bị';
    
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
        handheld_name: document.getElementById('handheldName').value || null,
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

    // Client-side validations
    const fullNameVal = (userData.full_name || '').trim();
    if (fullNameVal.length < 2) {
        Swal.fire('Cảnh báo', 'Họ và tên phải có ít nhất 2 ký tự', 'warning');
        return;
    }

    if (!isEdit) {
        const usernameVal = (userData.username || '').trim();
        const passwordVal = (userData.password_hash || '').trim();

        if (usernameVal.length < 3 || usernameVal.length > 20) {
            Swal.fire('Cảnh báo', 'Tên đăng nhập phải từ 3 đến 20 ký tự', 'warning');
            return;
        }

        // Only lowercase, numbers, underscores, and hyphens
        const usernameRegex = /^[a-z0-9_-]+$/;
        if (!usernameRegex.test(usernameVal)) {
            Swal.fire('Cảnh báo', 'Tên đăng nhập chỉ được chứa chữ cái thường (a-z), chữ số (0-9), dấu gạch dưới (_) hoặc gạch ngang (-)', 'warning');
            return;
        }

        if (passwordVal.length < 6) {
            Swal.fire('Cảnh báo', 'Mật khẩu phải có ít nhất 6 ký tự', 'warning');
            return;
        }

        if (passwordVal.includes(' ')) {
            Swal.fire('Cảnh báo', 'Mật khẩu không được chứa khoảng trắng', 'warning');
            return;
        }
    }

    if (userData.phone) {
        const phoneVal = userData.phone.trim();
        const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
        if (!phoneRegex.test(phoneVal)) {
            Swal.fire('Cảnh báo', 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 hoặc +84 và gồm 10 chữ số)', 'warning');
            return;
        }
    }

    if (userData.email) {
        const emailVal = userData.email.trim();
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        if (!emailRegex.test(emailVal)) {
            Swal.fire('Cảnh báo', 'Email không hợp lệ', 'warning');
            return;
        }
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
            let errMsg = err || 'Có lỗi xảy ra';
            try {
                const errJson = JSON.parse(err);
                if (errJson.detail) {
                    if (Array.isArray(errJson.detail)) {
                        errMsg = errJson.detail.map(d => d.msg).join('<br>');
                    } else {
                        errMsg = errJson.detail;
                    }
                } else if (errJson.error) {
                    errMsg = errJson.error;
                }
            } catch (e) {
                // If it is just a plain error string
            }
            Swal.fire({
                icon: 'error',
                title: 'Thất bại',
                html: errMsg
            });
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
