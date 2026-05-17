/**
 * Chức năng: Xử lý các hành động của thiết bị (Thêm, Sửa, Xóa)
 */

// Lắng nghe sự kiện click toàn cục để bắt nút Lưu Thay Đổi
document.addEventListener('click', function(e) {
    if (e.target && (e.target.id === 'btnSaveUpdate' || e.target.closest('#btnSaveUpdate'))) {
        console.log(">>> SYSTEM: Save button clicked!");
        submitUpdateDevice();
    }
    if (e.target && (e.target.id === 'btnConfirmDelete' || e.target.closest('#btnConfirmDelete'))) {
        console.log(">>> SYSTEM: Delete button clicked!");
        confirmDelete();
    }
});

// HÀM UPLOAD ẢNH CHUNG
async function uploadDeviceImage(file, deviceIds, deviceName) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('device_ids', deviceIds);
    formData.append('device_name', deviceName);

    try {
        const response = await fetch('/api/web/devices/upload-image', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error("Upload ảnh thất bại");
        return await response.json();
    } catch (error) {
        console.error(">>> Lỗi upload ảnh:", error);
    }
}

// XỬ LÝ CẬP NHẬT (VIP UI)
async function submitUpdateDevice() {
    console.log(">>> DEBUG: submitUpdateDevice STARTED");
    try {
        const idEl = document.getElementById('sdInternalId');
        if (!idEl) return;
        
        const id = idEl.innerText;
        const payload = {
            device_name: document.getElementById('eName').value,
            status: document.getElementById('eStatus').value,
            room_name: document.getElementById('eRoom').value,
            description: document.getElementById('eDesc').value,
            category: document.getElementById('eCategory').value,
            device_price: document.getElementById('ePrice').value,
            purchase_date: document.getElementById('ePurchaseDate')?.value || null
        };
        
        const rawRole = (window.userRole || 'teacher').toString().toLowerCase();
        const isAdmin = rawRole.indexOf('admin') !== -1;
        console.log(">>> DEBUG: Update - Role:", rawRole, "| Is Admin:", isAdmin);

        if (!isAdmin) {
            // Ẩn modal hiện tại để tránh xung đột focus (lỗi không nhập được chữ)
            const singleModalEl = document.getElementById('singleDeviceModal');
            const bsModal = bootstrap.Modal.getInstance(singleModalEl);
            if (bsModal) bsModal.hide();

            // TEACHER FLOW: Gửi yêu cầu
            const { value: reason, isDismissed } = await Swal.fire({
                title: 'Lý do thay đổi',
                input: 'textarea',
                inputPlaceholder: 'Vui lòng nhập lý do...',
                showCancelButton: true,
                confirmButtonText: 'Gửi yêu cầu',
                cancelButtonText: 'Hủy',
                inputValidator: (value) => { if (!value) return 'Bạn phải nhập lý do!'; }
            });

            if (isDismissed || !reason) {
                // Hiện lại modal nếu hủy
                if (bsModal) bsModal.show();
                return;
            }

            Swal.fire({ title: 'Đang gửi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const apiUrl = window.location.origin + '/requests/api/advanced';
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: id,
                    description: reason,
                    request_type: 'UPDATE',
                    update_payload: payload
                })
            });

            if (res.ok) {
                await Swal.fire("Thành công", "Yêu cầu đã được gửi tới Admin.", "success");
                location.reload();
            } else {
                const errData = await res.json();
                throw new Error(errData.error || "Gửi thất bại");
            }
            return;
        }

        // ADMIN FLOW: Cập nhật trực tiếp
        Swal.fire({ title: 'Đang cập nhật...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const response = await fetch(`/update/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const editImageInput = document.getElementById('editDeviceImage');
            if (editImageInput && editImageInput.files[0]) {
                await uploadDeviceImage(editImageInput.files[0], id, payload.device_name);
            }
            await Swal.fire({ icon: "success", title: "Thành công", timer: 1500, showConfirmButton: false });
            location.reload();
        } else {
            const err = await response.json();
            throw new Error(err.message || "Lỗi máy chủ");
        }
    } catch (err) {
        console.error(">>> ERROR:", err);
        Swal.fire("Lỗi", err.message, "error");
    }
}

// XỬ LÝ BÁO HỎNG (TỪ MODAL CHI TIẾT)
async function reportIssue() {
    console.log(">>> DEBUG: reportIssue STARTED");
    try {
        const idEl = document.getElementById('sdInternalId');
        const codeEl = document.getElementById('vCode');
        const nameEl = document.getElementById('vName');
        if (!idEl) return;
        
        const id = idEl.innerText;
        const code = codeEl ? codeEl.innerText : 'N/A';
        const name = nameEl ? nameEl.innerText : 'Thiết bị';

        // Ẩn modal hiện tại
        const singleModalEl = document.getElementById('singleDeviceModal');
        const bsModal = bootstrap.Modal.getInstance(singleModalEl);
        if (bsModal) bsModal.hide();

        const { value: formValues, isDismissed } = await Swal.fire({
            title: 'Báo cáo sự cố',
            html: `
                <div class="text-start mb-3">
                    <p class="mb-1 small fw-bold">Thiết bị: <span class="text-primary">${name} [${code}]</span></p>
                    <label class="form-label small fw-bold mt-2">1. TRẠNG THÁI HIỆN TẠI</label>
                    <select id="swal-status" class="form-select mb-3">
                        <option value="Tốt">Tốt</option>
                        <option value="Hỏng">Hỏng</option>
                        <option value="Cần bảo trì">Cần bảo trì</option>
                        <option value="Đang bảo trì">Đang bảo trì</option>
                    </select>
                    <label class="form-label small fw-bold">2. MÔ TẢ CHI TIẾT</label>
                    <textarea id="swal-desc" class="form-control" rows="3" placeholder="Mô tả tình trạng..."></textarea>
                </div>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const status = document.getElementById('swal-status').value;
                const desc = document.getElementById('swal-desc').value;
                if (!desc) {
                    Swal.showValidationMessage('Vui lòng nhập mô tả sự cố');
                    return false;
                }
                return { status, desc };
            },
            showCancelButton: true,
            confirmButtonText: 'Gửi báo cáo',
            cancelButtonText: 'Hủy'
        });

        if (isDismissed || !formValues) {
            if (bsModal) bsModal.show();
            return;
        }

        const { status: selectedStatus, desc: reason } = formValues;

        Swal.fire({ title: 'Đang gửi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch('/requests/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: id, description: reason, status_device: selectedStatus })
        });
        
        if (res.ok) {
            await Swal.fire("Thành công", "Yêu cầu báo hỏng đã được gửi tới Admin.", "success");
            location.reload();
        } else {
            const errData = await res.json();
            throw new Error(errData.error || "Gửi thất bại");
        }
    } catch (err) {
        console.error(">>> ERROR:", err);
        Swal.fire("Lỗi", err.message, "error");
    }
}

// XỬ LÝ XÓA (VIP UI)
async function confirmDelete() {
    console.log(">>> DEBUG: confirmDelete STARTED");
    try {
        const idEl = document.getElementById('sdInternalId');
        const codeEl = document.getElementById('vCode');
        if (!idEl || !codeEl) return;
        
        const id = idEl.innerText;
        const code = codeEl.innerText;
        const rawRole = (window.userRole || 'teacher').toString().toLowerCase();
        const isAdmin = rawRole.indexOf('admin') !== -1;

        if (!isAdmin) {
            // Ẩn modal hiện tại
            const singleModalEl = document.getElementById('singleDeviceModal');
            const bsModal = bootstrap.Modal.getInstance(singleModalEl);
            if (bsModal) bsModal.hide();

            // TEACHER FLOW: Gửi yêu cầu xóa
            const { value: reason, isDismissed } = await Swal.fire({
                title: 'Gửi yêu cầu xóa',
                html: `Thiết bị <strong class="text-danger">[${code}]</strong> sẽ được gửi yêu cầu xóa.`,
                input: 'textarea',
                inputPlaceholder: 'Nhập lý do xóa...',
                showCancelButton: true,
                confirmButtonText: 'Gửi yêu cầu',
                cancelButtonText: 'Hủy',
                inputValidator: (value) => { if (!value) return 'Bạn phải nhập lý do!'; }
            });

            if (isDismissed || !reason) {
                if (bsModal) bsModal.show();
                return;
            }

            Swal.fire({ title: 'Đang gửi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            // Thu thập thông tin thiết bị để lưu vào payload (để hiển thị log sau này nếu thiết bị bị xóa thật)
            const devicePayload = {
                device_name: document.getElementById('vName')?.innerText || 'N/A',
                device_code: code,
                room_name: document.getElementById('vRoom')?.innerText || 'N/A',
                status: document.getElementById('vStatus')?.innerText || 'N/A',
                category: document.getElementById('vCategory')?.innerText || 'N/A',
                description: document.getElementById('vDes')?.innerText || ''
            };

            const apiUrl = window.location.origin + '/requests/api/advanced';
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    device_id: id, 
                    description: reason, 
                    request_type: 'DELETE',
                    update_payload: devicePayload 
                })
            });
            
            if (res.ok) {
                await Swal.fire("Thành công", "Yêu cầu xóa đã được gửi tới Admin.", "success");
                location.reload();
            } else {
                const errData = await res.json();
                throw new Error(errData.error || "Gửi thất bại");
            }
            return;
        }

        // ADMIN FLOW: Xóa trực tiếp
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            html: `Xóa vĩnh viễn thiết bị <strong class="text-danger">[${code}]</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa vĩnh viễn',
            cancelButtonText: 'Hủy bỏ'
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'Đang xóa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetch(`/delete/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await Swal.fire({ icon: "success", title: "Đã xóa!", timer: 1500, showConfirmButton: false });
                location.reload();
            } else {
                throw new Error("Xóa thất bại");
            }
        }
    } catch (err) {
        console.error(">>> ERROR:", err);
        Swal.fire("Lỗi", err.message, "error");
    }
}

// CÁC CHỨC NĂNG KHÁC (Hàng loạt, Template...)
document.addEventListener('change', function(e) {
    if (e.target.id === 'selectAllItems') {
        const isChecked = e.target.checked;
        document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = isChecked);
        if (typeof updateDeleteButtonState === 'function') updateDeleteButtonState();
    }
});

// XỬ LÝ XUẤT EXCEL (Tự động lấy bộ lọc hiện tại)
function handleBackendExport() {
    const search = document.getElementById('searchInput').value;
    const room = document.getElementById('roomFilter').value;
    const cat = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (room) params.append('room', room);
    if (cat) params.append('category', cat);
    if (status) params.append('status', status);

    const url = `/devices/export-excel?${params.toString()}`;
    AppHelpers.downloadWithProgress(url, `Kho_Thiet_Bi_${new Date().getTime()}.xlsx`);
}

// XỬ LÝ XEM TRƯỚC FILE IMPORT
async function handleFilePreview(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    AppHelpers.updateFileName(input);

    Swal.fire({ title: 'Đang phân tích file...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/web/devices/import-check', { method: 'POST', body: formData });
        const result = await res.json();
        
        if (result.status === 'success') {
            renderImportPreview(result.data);
            document.getElementById('importStep1').style.display = 'none';
            document.getElementById('importStep2').style.display = 'block';
            Swal.close();
        } else {
            throw new Error(result.detail || "File không hợp lệ");
        }
    } catch (e) {
        Swal.fire("Lỗi", e.message, "error");
        input.value = '';
    }
}

function renderImportPreview(data) {
    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';
    let validCount = 0;
    let errorCount = 0;

    data.forEach((row, idx) => {
        if (row.is_valid) validCount++; else errorCount++;
        const tr = document.createElement('tr');
        tr.className = row.is_valid ? '' : 'table-danger';
        tr.innerHTML = `
            <td class="ps-3">${idx + 1}</td>
            <td class="fw-bold">${row.device_name}</td>
            <td>${row.room_name} ${row.room_error ? '<i class="fas fa-exclamation-triangle text-danger"></i>' : ''}</td>
            <td>${row.category_name} ${row.cat_error ? '<i class="fas fa-exclamation-triangle text-danger"></i>' : ''}</td>
            <td class="text-center">${row.device_price}</td>
            <td class="text-center">${row.purchase_date}</td>
            <td class="text-muted small">${row.description || ''}</td>
            <td class="text-center">
                ${row.is_valid ? '<span class="badge bg-success">Hợp lệ</span>' : `<span class="badge bg-danger" title="${row.error_msg.join(', ')}">Lỗi</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('previewTotal').innerText = data.length;
    document.getElementById('previewValid').innerText = validCount;
    document.getElementById('previewErrors').innerText = errorCount;
    document.getElementById('btnConfirmImport').disabled = (validCount === 0);
}

// XỬ LÝ NHẬP KHO THỰC TẾ
async function executeImport() {
    const fileInput = document.getElementById('excelFile');
    const imgInput = document.getElementById('importDeviceImage');
    if (!fileInput.files[0]) return;

    Swal.fire({ title: 'Đang nhập kho...', text: 'Vui lòng không đóng trình duyệt', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch('/api/web/devices/import-excel', { method: 'POST', body: formData });
        const result = await res.json();

        if (result.status === 'success') {
            // Nếu có ảnh, upload ảnh cho tất cả ID vừa tạo
            if (imgInput && imgInput.files[0] && result.ids) {
                Swal.update({ title: 'Đang upload ảnh...', text: 'Áp dụng ảnh cho lô hàng...' });
                await uploadDeviceImage(imgInput.files[0], result.ids.join(','), "Imported_Batch");
            }

            // TỰ ĐỘNG TẢI FILE EXCEL KẾT QUẢ
            if (result.ids && result.ids.length > 0) {
                await Swal.fire({
                    icon: "success",
                    title: "Nhập kho thành công",
                    text: `Đã nhập thành công ${result.count} thiết bị. Nhấn OK để tải file mã QR kết quả.`,
                    confirmButtonText: "Tải file và Hoàn tất"
                });
                
                const exportUrl = `/devices/export-by-ids?ids=${result.ids.join(',')}`;
                AppHelpers.downloadWithProgress(exportUrl, `Ket_Qua_Import_${new Date().getTime()}.xlsx`, true);
            } else {
                await Swal.fire("Thành công", `Đã nhập thành công ${result.count} thiết bị vào hệ thống.`, "success");
                location.reload();
            }
        } else {
            throw new Error(result.error || "Nhập kho thất bại");
        }
    } catch (e) {
        Swal.fire("Lỗi", e.message, "error");
    }
}

function resetImport() {
    document.getElementById('importStep1').style.display = 'block';
    document.getElementById('importStep2').style.display = 'none';
    document.getElementById('excelFile').value = '';
}

// HÀM PREVIEW ẢNH CHUNG
function previewImage(input, imgId, containerId, placeholderId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(imgId).src = e.target.result;
            document.getElementById(containerId).style.display = 'block';
            if (placeholderId) document.getElementById(placeholderId).style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// XỬ LÝ FORM THÊM MỚI
document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('addDeviceForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addForm);
            const data = Object.fromEntries(formData.entries());
            
            // Chuyển quantity sang int
            data.quantity = parseInt(data.quantity || 1);

            Swal.fire({ title: 'Đang đăng ký...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const res = await fetch('/api/web/devices/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();

                if (res.ok) {
                    // Nếu có ảnh, upload ảnh
                    const imgInput = document.getElementById('addDeviceImage');
                    if (imgInput && imgInput.files[0] && result.ids) {
                        Swal.update({ title: 'Đang tải ảnh...' });
                        await uploadDeviceImage(imgInput.files[0], result.ids.join(','), data.device_name);
                    }

                    // TỰ ĐỘNG TẢI FILE EXCEL KẾT QUẢ (CHỨA MÃ QR)
                    if (result.ids && result.ids.length > 0) {
                        await Swal.fire({
                            title: 'Đăng ký thành công',
                            html: `
                                <div class="text-center">
                                    <div class="mb-3 text-success" style="font-size: 3.5rem;">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <p class="text-muted">Thiết bị đã được lưu vào hệ thống</p>
                                    <div class="notif-device-card">
                                        <div class="notif-device-icon">
                                            <i class="fas fa-laptop"></i>
                                        </div>
                                        <div>
                                            <div class="notif-device-name">${data.device_name}</div>
                                            <div class="notif-device-room">
                                                <i class="fas fa-map-marker-alt"></i> ${data.room_name}
                                                <span class="ms-2 badge bg-primary bg-opacity-10 text-primary border-primary border-opacity-25" style="font-size: 0.6rem;">${data.quantity} thiết bị</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p class="small text-muted mt-3 mb-0">Nhấn nút bên dưới để tải tệp chứa mã QR</p>
                                </div>
                            `,
                            showConfirmButton: true,
                            confirmButtonText: '<i class="fas fa-download me-2"></i> Tải mã QR & Hoàn tất',
                            customClass: {
                                popup: 'swal2-premium-popup',
                                confirmButton: 'notif-btn-download'
                            },
                            buttonsStyling: false
                        });

                        const exportUrl = `/devices/export-by-ids?ids=${result.ids.join(',')}`;
                        AppHelpers.downloadWithProgress(exportUrl, `Ket_Qua_Dang_Ky_${data.device_name}.xlsx`, true);
                    } else {
                        await Swal.fire({
                            icon: "success",
                            title: "Thành công",
                            text: "Thiết bị đã được đăng ký thành công!",
                            customClass: { popup: 'swal2-premium-popup' }
                        });
                        location.reload();
                    }
                } else {
                    const errText = await res.text();
                    let errMsg = "Đăng ký thất bại";
                    try { errMsg = JSON.parse(errText).error || errMsg; } catch(e) {}
                    throw new Error(errMsg);
                }
            } catch (error) {
                Swal.fire("Lỗi", error.message, "error");
            }
        });
    }
});

async function handleBulkDelete() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedIds.length === 0) return;

    const rawRole = (window.userRole || 'teacher').toString().toLowerCase();
    const isAdmin = rawRole.indexOf('admin') !== -1;

    if (!isAdmin) {
        // Ẩn modal chi tiết để hiện popup nhập lý do
        const detailModalEl = document.getElementById('detailModal');
        const bsModal = bootstrap.Modal.getInstance(detailModalEl);
        if (bsModal) bsModal.hide();

        const { value: reason, isDismissed } = await Swal.fire({
            title: 'Gửi yêu cầu xóa',
            html: `Bạn đang gửi yêu cầu xóa <strong>${selectedIds.length}</strong> thiết bị.`,
            input: 'textarea',
            inputPlaceholder: 'Nhập lý do xóa...',
            showCancelButton: true,
            confirmButtonText: 'Gửi yêu cầu',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => { if (!value) return 'Bạn phải nhập lý do!'; }
        });

        if (isDismissed || !reason) {
            if (bsModal) bsModal.show();
            return;
        }

        Swal.fire({ title: 'Đang gửi yêu cầu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const apiUrl = window.location.origin + '/requests/api/advanced';
            
            // Lặp qua từng ID để gửi yêu cầu 
            const promises = selectedIds.map(async (id) => {
                const cb = document.querySelector(`.item-checkbox[value="${id}"]`);
                let code = 'N/A';
                if (cb) {
                    const tr = cb.closest('tr');
                    if (tr) {
                        const codeTd = tr.querySelectorAll('td')[2];
                        if (codeTd) code = codeTd.innerText.trim();
                    }
                }

                const devicePayload = {
                    device_name: currentGroupData.name || 'N/A',
                    device_code: code,
                    room_name: currentGroupData.room || 'N/A',
                    status: currentGroupData.status || 'N/A',
                    category: currentGroupData.category || 'N/A',
                    description: currentGroupData.desc || ''
                };

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        device_id: id, 
                        description: reason, 
                        request_type: 'DELETE',
                        update_payload: devicePayload 
                    })
                });
                
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "Gửi thất bại cho thiết bị: " + code);
                }
            });

            await Promise.all(promises);

            await Swal.fire("Thành công", `Đã gửi ${selectedIds.length} yêu cầu xóa tới Admin.`, "success");
            location.reload();
        } catch (error) {
            Swal.fire("Lỗi", error.message, "error");
        }
        return;
    }

    const result = await Swal.fire({
        title: 'Xóa hàng loạt?',
        text: `Xóa vĩnh viễn ${selectedIds.length} thiết bị?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa tất cả'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'Đang xóa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const response = await fetch('/delete-multiple', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (response.ok) {
                await Swal.fire({ icon: 'success', title: 'Đã xóa!', timer: 2000, showConfirmButton: false });
                location.reload();
            } else {
                throw new Error("Xóa hàng loạt thất bại");
            }
        } catch (error) {
            Swal.fire("Lỗi", error.message, "error");
        }
    }
}

async function handleBulkEdit() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedIds.length === 0) return;

    // Cập nhật số lượng thiết bị đã chọn vào giao diện
    const bulkEditCountEl = document.getElementById('bulkEditCount');
    if (bulkEditCountEl) {
        bulkEditCountEl.innerText = selectedIds.length;
    }

    // Reset trạng thái checkbox và điền thông tin mặc định từ currentGroupData để hiển thị
    const fields = ['name', 'category', 'room', 'status', 'price', 'purchase', 'desc', 'image'];
    fields.forEach(f => {
        const chk = document.getElementById(`bulk-edit-${f}-check`);
        if (chk) {
            chk.checked = false;
            chk.dispatchEvent(new Event('change'));
        }
    });

    if (typeof currentGroupData !== 'undefined' && currentGroupData) {
        const nameVal = document.getElementById('bulk-edit-name-val');
        if (nameVal) nameVal.value = currentGroupData.name || '';

        const catVal = document.getElementById('bulk-edit-category-val');
        if (catVal) catVal.value = currentGroupData.category || '';

        const roomVal = document.getElementById('bulk-edit-room-val');
        if (roomVal) roomVal.value = currentGroupData.room || '';

        const statusVal = document.getElementById('bulk-edit-status-val');
        if (statusVal) statusVal.value = currentGroupData.status || '';

        const priceVal = document.getElementById('bulk-edit-price-val');
        if (priceVal) priceVal.value = currentGroupData.price || '';

        const descVal = document.getElementById('bulk-edit-desc-val');
        if (descVal) descVal.value = currentGroupData.desc || '';

        const purchaseVal = document.getElementById('bulk-edit-purchase-val');
        if (purchaseVal) {
            if (currentGroupData.date_purchase && currentGroupData.date_purchase !== 'N/A') {
                try {
                    const parts = currentGroupData.date_purchase.split('/');
                    if (parts.length === 3) {
                        purchaseVal.value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    } else {
                        purchaseVal.value = currentGroupData.date_purchase;
                    }
                } catch(e) {
                    purchaseVal.value = '';
                }
            } else {
                purchaseVal.value = '';
            }
        }
    }

    // Thiết lập phần preview ảnh từ ảnh hiện tại của nhóm
    const bulkImgPreview = document.getElementById('bulkImagePreview');
    const bulkImgPreviewImg = document.getElementById('bulkImagePreviewImg');
    const bulkImgPlaceholder = document.getElementById('bulkImagePlaceholder');
    const bulkImgInput = document.getElementById('bulk-edit-image-input');
    
    if (bulkImgInput) {
        bulkImgInput.value = '';
        bulkImgInput.disabled = true;
    }

    if (typeof currentGroupData !== 'undefined' && currentGroupData && currentGroupData.image_url) {
        if (bulkImgPreviewImg) bulkImgPreviewImg.src = currentGroupData.image_url;
        if (bulkImgPreview) bulkImgPreview.style.display = 'block';
        if (bulkImgPlaceholder) bulkImgPlaceholder.style.display = 'none';
    } else {
        if (bulkImgPreview) bulkImgPreview.style.display = 'none';
        if (bulkImgPlaceholder) bulkImgPlaceholder.style.display = 'block';
    }

    // Ẩn modal danh sách thiết bị con (detailModal)
    const detailModalEl = document.getElementById('detailModal');
    const bsDetail = bootstrap.Modal.getInstance(detailModalEl);
    if (bsDetail) bsDetail.hide();

    // Hiển thị modal chỉnh sửa hàng loạt mới
    const bulkModalEl = document.getElementById('bulkEditModal');
    const bsBulk = bootstrap.Modal.getInstance(bulkModalEl) || new bootstrap.Modal(bulkModalEl);
    bsBulk.show();
}

function closeBulkEditModal() {
    const bulkModalEl = document.getElementById('bulkEditModal');
    const bsBulk = bootstrap.Modal.getInstance(bulkModalEl);
    if (bsBulk) bsBulk.hide();

    // Hiện lại modal chi tiết thiết bị
    const detailModalEl = document.getElementById('detailModal');
    const bsDetail = bootstrap.Modal.getInstance(detailModalEl) || new bootstrap.Modal(detailModalEl);
    bsDetail.show();
}

async function submitBulkEdit() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedIds.length === 0) {
        Swal.fire("Lỗi", "Không tìm thấy thiết bị nào được chọn.", "error");
        return;
    }

    const fields = {};
    
    if (document.getElementById('bulk-edit-name-check').checked) {
        fields.device_name = document.getElementById('bulk-edit-name-val').value.trim();
        if (!fields.device_name) {
            Swal.fire("Lỗi", "Vui lòng nhập tên thiết bị mới", "error");
            return;
        }
    }
    if (document.getElementById('bulk-edit-category-check').checked) {
        fields.category = document.getElementById('bulk-edit-category-val').value;
    }
    if (document.getElementById('bulk-edit-room-check').checked) {
        fields.room_name = document.getElementById('bulk-edit-room-val').value;
    }
    if (document.getElementById('bulk-edit-status-check').checked) {
        fields.status = document.getElementById('bulk-edit-status-val').value;
    }
    if (document.getElementById('bulk-edit-price-check').checked) {
        fields.device_price = document.getElementById('bulk-edit-price-val').value.trim();
        if (!fields.device_price) {
            Swal.fire("Lỗi", "Vui lòng nhập giá tiền mới", "error");
            return;
        }
    }
    if (document.getElementById('bulk-edit-purchase-check').checked) {
        fields.purchase_date = document.getElementById('bulk-edit-purchase-val').value || null;
    }
    if (document.getElementById('bulk-edit-desc-check').checked) {
        fields.description = document.getElementById('bulk-edit-desc-val').value.trim();
    }

    const hasImageUpdate = document.getElementById('bulk-edit-image-check').checked;
    const imageInput = document.getElementById('bulk-edit-image-input');
    const imageFile = imageInput ? imageInput.files[0] : null;

    if (Object.keys(fields).length === 0 && !hasImageUpdate) {
        Swal.fire("Thông báo", "Vui lòng chọn ít nhất một thông tin để thay đổi.", "warning");
        return;
    }

    if (hasImageUpdate && !imageFile) {
        Swal.fire("Lỗi", "Vui lòng chọn ảnh thiết bị mới.", "error");
        return;
    }

    const rawRole = (window.userRole || 'teacher').toString().toLowerCase();
    const isAdmin = rawRole.indexOf('admin') !== -1;

    // Ẩn modal chỉnh sửa hàng loạt
    const bulkModalEl = document.getElementById('bulkEditModal');
    const bsBulk = bootstrap.Modal.getInstance(bulkModalEl);
    if (bsBulk) bsBulk.hide();

    if (!isAdmin) {
        // TEACHER FLOW: Gửi yêu cầu phê duyệt hàng loạt
        const { value: reason, isDismissed: isReasonDismissed } = await Swal.fire({
            title: 'Lý do thay đổi hàng loạt',
            input: 'textarea',
            inputPlaceholder: 'Vui lòng nhập lý do để gửi yêu cầu phê duyệt...',
            showCancelButton: true,
            confirmButtonText: 'Gửi yêu cầu',
            cancelButtonText: 'Hủy',
            inputValidator: (value) => { if (!value) return 'Bạn phải nhập lý do!'; }
        });

        if (isReasonDismissed || !reason) {
            if (bsBulk) bsBulk.show();
            return;
        }

        Swal.fire({ title: 'Đang gửi yêu cầu...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const apiUrl = window.location.origin + '/requests/api/advanced';
            
            // Nếu có ảnh, upload ảnh trước rồi lấy URL gán vào payload gửi giáo viên
            if (hasImageUpdate && imageFile) {
                Swal.update({ title: 'Đang tải ảnh lên...' });
                const uploadRes = await uploadDeviceImage(imageFile, selectedIds.join(','), fields.device_name || "Lô_Thiết_Bị");
                if (uploadRes && uploadRes.image_url) {
                    fields.image_url = uploadRes.image_url;
                }
            }

            const promises = selectedIds.map(async (id) => {
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        device_id: id, 
                        description: reason, 
                        request_type: 'UPDATE',
                        update_payload: fields 
                    })
                });
                
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "Gửi thất bại cho thiết bị ID: " + id);
                }
            });

            await Promise.all(promises);

            await Swal.fire("Thành công", `Đã gửi ${selectedIds.length} yêu cầu chỉnh sửa hàng loạt tới Admin.`, "success");
            location.reload();
        } catch (error) {
            Swal.fire("Lỗi", error.message, "error");
            if (bsBulk) bsBulk.show();
        }
        return;
    }

    // ADMIN FLOW: Cập nhật trực tiếp
    Swal.fire({ title: 'Đang cập nhật...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        let resultMsg = "Đã cập nhật hàng loạt thành công!";
        
        // 1. Cập nhật các trường dữ liệu văn bản/lựa chọn nếu có
        if (Object.keys(fields).length > 0) {
            const response = await fetch('/update-multiple', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, fields: fields })
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Cập nhật thông tin thất bại");
            }
            const resData = await response.json();
            resultMsg = resData.message || resultMsg;
        }

        // 2. Upload ảnh hàng loạt nếu có
        if (hasImageUpdate && imageFile) {
            Swal.update({ title: 'Đang upload ảnh hàng loạt...' });
            await uploadDeviceImage(imageFile, selectedIds.join(','), fields.device_name || "Lô_Thiết_Bị");
        }

        await Swal.fire({ icon: 'success', title: 'Thành công!', text: resultMsg, timer: 2000, showConfirmButton: false });
        location.reload();
    } catch (error) {
        Swal.fire("Lỗi", error.message, "error");
        if (bsBulk) bsBulk.show();
    }
}


async function downloadImportTemplate() {
    window.location.href = '/devices/download-template';
}
