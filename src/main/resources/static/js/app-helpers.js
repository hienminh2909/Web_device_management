/**
 * Chức năng: Các hàm tiện ích dùng chung
 */
const AppHelpers = {
    // Tải file từ Server kèm thanh tiến độ % chuyên nghiệp
    downloadWithProgress: function(url, fileName = 'Bao_cao.xlsx', shouldReload = false) {
        Swal.fire({
            title: 'Đang chuẩn bị file...',
            html: `
                <div class="progress mt-3" style="height: 25px; border-radius: 12px; overflow: hidden;">
                    <div id="download-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                         role="progressbar" style="width: 0%; transition: width 0.3s ease;">0%</div>
                </div>
                <p class="mt-2 mb-0 small text-muted">Vui lòng chờ trong giây lát...</p>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                const progressBar = document.getElementById('download-progress-bar');
                const xhr = new XMLHttpRequest();

                xhr.open('GET', url, true);
                xhr.responseType = 'blob';

                // Cập nhật % tiến độ thực tế
                xhr.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBar.style.width = percent + '%';
                        progressBar.textContent = percent + '%';
                    } else {
                        // Nếu không biết tổng dung lượng (streaming), giả lập chạy đến 95%
                        progressBar.style.width = '95%';
                        progressBar.textContent = 'Đang tải...';
                    }
                };

                xhr.onload = function() {
                    if (this.status === 200) {
                        const blobUrl = window.URL.createObjectURL(this.response);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(blobUrl);

                        Swal.fire({
                            icon: 'success',
                            title: 'Hoàn tất!',
                            text: 'File đã được tải xuống máy tính của bạn.',
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            if (shouldReload) location.reload();
                        });
                    } else {
                        Swal.fire("Lỗi", "Không thể trích xuất dữ liệu từ Server (Mã: " + this.status + ")", "error");
                    }
                };

                xhr.onerror = () => {
                    Swal.fire("Lỗi kết nối", "Không thể kết nối đến máy chủ!", "error");
                };

                xhr.send();
            }
        });
    },

    // Hiển thị tên file khi chọn file Excel
    updateFileName: function(input) {
        const display = document.getElementById('fileNameDisplay');
        if (input.files && input.files[0]) {
            display.innerHTML = `<strong>Đã chọn:</strong> ${input.files[0].name}`;
            display.classList.remove('text-muted');
            display.classList.add('text-success');
        }
    },

    // --- NOTIFICATION SYSTEM ---
    loadNotificationBadges: async function() {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            const unreadCount = data.filter(n => !n.is_read).length;
            
            const badge = document.getElementById('notifBadge');
            const sideBadge = document.getElementById('sidebarNotifBadge');
            
            if (unreadCount > 0) {
                if (badge) {
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    badge.classList.remove('d-none');
                }
                if (sideBadge) {
                    sideBadge.textContent = unreadCount;
                    sideBadge.classList.remove('d-none');
                }
            } else {
                if (badge) badge.classList.add('d-none');
                if (sideBadge) sideBadge.classList.add('d-none');
            }
        } catch (e) { console.error("Error loading notifs", e); }
    },

    loadRequestBadges: async function() {
        try {
            const res = await fetch('/requests/api/count/pending');
            const data = await res.json();
            const count = data.count || 0;
            const badge = document.getElementById('sidebarRequestBadge');
            
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        } catch (e) { console.error("Error loading request count", e); }
    },

    formatVND: function(priceStr) {
        if (!priceStr || priceStr === '---' || priceStr === 'Chưa cập nhật' || priceStr === 'null') return 'Chưa cập nhật';
        let s = priceStr.toString().trim();
        if (s.endsWith('.0')) s = s.slice(0, -2);
        else if (s.endsWith('.00')) s = s.slice(0, -3);
        const num = parseInt(s.replace(/[^0-9]/g, ''));
        if (isNaN(num) || num === 0) return 'Chưa cập nhật';
        return num.toLocaleString('vi-VN') + ' ₫';
    },

    autoFormatVND: function() {
        document.querySelectorAll('.format-vnd').forEach(el => {
            let txt = el.textContent.replace(' ₫', '').trim();
            if (txt && txt !== 'Chưa cập nhật' && txt !== '---' && txt !== 'null') {
                const formatted = AppHelpers.formatVND(txt);
                el.textContent = formatted;
            }
        });
    },

    loadQuickNotifs: async function() {
        const list = document.getElementById('quickNotifList');
        if (!list) return;
        
        list.innerHTML = '<div class="p-4 text-center text-muted small"><i class="fas fa-spinner fa-spin me-2"></i>Đang tải...</div>';
        
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            
            if (data.length === 0) {
                list.innerHTML = '<div class="p-4 text-center text-muted small">Không có thông báo nào</div>';
                return;
            }

            list.innerHTML = data.slice(0, 5).map(n => `
                <div class="p-3 border-bottom dropdown-item d-flex gap-3 align-items-start ${n.is_read ? 'opacity-75' : 'bg-light'}" 
                     style="white-space: normal; cursor: pointer;" onclick="markRead(${n.id}, '${n.link}')">
                    <div class="rounded-circle bg-primary bg-opacity-10 text-primary p-2 flex-shrink-0" style="width: 35px; height: 35px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-bell small"></i>
                    </div>
                    <div>
                        <div class="fw-bold small ${n.is_read ? 'text-dark' : 'text-primary'}">${n.title}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${n.content}</div>
                    </div>
                </div>
            `).join('') + '<div class="p-2 text-center"><a href="/notifications" class="small text-primary fw-bold text-decoration-none">Xem tất cả</a></div>';
        } catch (e) {
            list.innerHTML = '<div class="p-3 text-center text-danger small">Lỗi tải thông báo</div>';
        }
    }
};

// Tự động chạy khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    AppHelpers.loadNotificationBadges();
    AppHelpers.loadRequestBadges();
    AppHelpers.autoFormatVND();
    // Định kỳ 30s check 1 lần
    setInterval(() => {
        AppHelpers.loadNotificationBadges();
        AppHelpers.loadRequestBadges();
    }, 30000);
});

// Alias cho các function dùng trong HTML onclick
const loadQuickNotifs = () => AppHelpers.loadQuickNotifs();
const markRead = async (id, link) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (link && link !== 'null' && link !== 'undefined') window.location.href = link;
    else location.reload();
};
const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    location.reload();
};