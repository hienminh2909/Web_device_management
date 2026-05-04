console.log(">>> SETTINGS JS LOADED");

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        
        if (data.length === 0) {
            list.innerHTML = `
                <div class="text-center py-5">
                    <img src="https://illustrations.popsy.co/white/surprised-man.svg" style="width: 150px;" class="mb-3">
                    <h6 class="fw-bold">Bạn chưa có thông báo nào</h6>
                    <p class="text-muted small">Mọi tin tức mới nhất sẽ xuất hiện tại đây.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = data.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markRead(${n.id}, '${n.link}')">
                <div class="d-flex gap-3 align-items-start">
                    <div class="notif-icon ${n.title.includes('Duyệt') || n.title.includes('PHÊ DUYỆT') ? 'bg-success bg-opacity-10 text-success' : 'bg-primary bg-opacity-10 text-primary'}">
                        <i class="${getIcon(n.title)}"></i>
                    </div>
                    <div class="flex-fill">
                        <div class="d-flex justify-content-between">
                            <h6 class="fw-bold mb-1 ${n.is_read ? 'text-dark' : 'text-primary'}">${n.title}</h6>
                            <span class="text-muted small">${formatTime(n.created_at)}</span>
                        </div>
                        <p class="text-muted small m-0">${n.content}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<div class="alert alert-danger">Không thể tải thông báo</div>';
    }
}

function getIcon(title) {
    if (title.includes('Duyệt') || title.includes('PHÊ DUYỆT')) return 'fas fa-check-circle';
    if (title.includes('Từ chối') || title.includes('TỪ CHỐI')) return 'fas fa-times-circle';
    return 'fas fa-bell';
}

function formatTime(isoStr) {
    const date = new Date(isoStr);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
}

async function markRead(id, link) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    if (link && link !== 'null' && link !== 'undefined') window.location.href = link;
    else loadNotifications();
}

async function markAllAsRead() {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    loadNotifications();
}

function switchSection(sectionId, btn) {
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.settings-section').forEach(s => s.classList.add('d-none'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.remove('d-none');
    
    if (sectionId === 'notifications') loadNotifications();
}

async function updateProfile() {
    const payload = {
        full_name: document.getElementById('pFullName').value,
        email: document.getElementById('pEmail').value,
        phone: document.getElementById('pPhone').value
    };

    Swal.fire({ title: 'Đang lưu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch('/settings/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            Swal.fire("Thành công", "Thông tin cá nhân đã được cập nhật!", "success");
        } else {
            const errData = await res.json();
            throw new Error(errData.error || "Cập nhật thất bại");
        }
    } catch (err) {
        Swal.fire("Lỗi", err.message, "error");
    }
}

async function changePassword() {
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmPass').value;

    if (!oldPass || !newPass) {
        Swal.fire("Lỗi", "Vui lòng nhập đầy đủ thông tin mật khẩu!", "warning");
        return;
    }
    if (newPass !== confirmPass) {
        Swal.fire("Lỗi", "Xác nhận mật khẩu mới không khớp!", "error");
        return;
    }

    Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch('/settings/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass })
        });
        
        const data = await res.json();
        if (res.ok) {
            Swal.fire("Thành công", "Mật khẩu đã được đổi thành công!", "success").then(() => {
                document.getElementById('formPassword').reset();
            });
        } else {
            throw new Error(data.error || "Mật khẩu cũ không chính xác!");
        }
    } catch (err) {
        Swal.fire("Lỗi", err.message, "error");
    }
}
