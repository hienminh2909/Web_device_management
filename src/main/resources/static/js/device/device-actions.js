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

// Hàm tiện ích chuẩn hóa tên file để tránh lỗi ký tự tiếng Việt hoặc ký tự đặc biệt như slashes /
function sanitizeFilename(str) {
    if (!str) return 'file';
    // Loại bỏ dấu tiếng Việt
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Thay thế các ký tự không hợp lệ bằng dấu gạch dưới
    return str.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

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
            showToast("Thành công");
            setTimeout(() => location.reload(), 1000);
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
            title: 'Báo cáo tình trạng',
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
                    Swal.showValidationMessage('Vui lòng nhập mô tả tình trạng');
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
            showToast("Yêu cầu báo cáo tình trạng đã được gửi tới Admin.");
            setTimeout(() => location.reload(), 1000);
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
            const result = await Swal.fire({
                title: 'Gửi yêu cầu xóa?',
                html: `
                    <div class="text-center">
                        <p class="text-muted">Bạn đang gửi yêu cầu đề xuất xóa thiết bị <strong class="text-danger">[${code}]</strong>.</p>
                        <div class="text-start px-2">
                            <label class="form-label small fw-bold text-muted">Lý do xóa <span class="text-danger">*</span>:</label>
                            <textarea id="singleDeleteReason" class="form-control" placeholder="Nhập lý do để gửi tới Ban quản lý..." rows="3" style="border-radius: 10px; font-size: 0.9rem;"></textarea>
                        </div>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Gửi yêu cầu',
                cancelButtonText: 'Hủy bỏ',
                customClass: {
                    popup: 'swal2-premium-popup',
                    confirmButton: 'btn btn-warning rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm me-2',
                    cancelButton: 'btn btn-light rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm'
                },
                buttonsStyling: false,
                preConfirm: () => {
                    const reasonVal = document.getElementById('singleDeleteReason').value.trim();
                    if (!reasonVal) {
                        Swal.showValidationMessage('Bạn phải nhập lý do xóa');
                        return false;
                    }
                    return reasonVal;
                }
            });

            if (result.isDismissed || !result.value) {
                if (bsModal) bsModal.show();
                return;
            }

            const reason = result.value;
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
                showToast("Yêu cầu xóa đã được gửi tới Admin.");
                setTimeout(() => location.reload(), 1000);
            } else {
                const errData = await res.json();
                throw new Error(errData.error || "Gửi thất bại");
            }
            return;
        }

        // ADMIN FLOW: Xóa trực tiếp
        const result = await Swal.fire({
            title: 'Xác nhận xóa?',
            html: `<p class="text-muted">Bạn có chắc chắn muốn xóa vĩnh viễn thiết bị <strong class="text-danger">[${code}]</strong>?</p><p class="text-danger small fw-bold"><i class="fas fa-exclamation-triangle"></i> Hành động này không thể hoàn tác!</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> Xóa vĩnh viễn',
            cancelButtonText: 'Hủy bỏ',
            customClass: {
                popup: 'swal2-premium-popup',
                confirmButton: 'btn btn-danger rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm me-2',
                cancelButton: 'btn btn-light rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm'
            },
            buttonsStyling: false
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'Đang xóa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetch(`/delete/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Đã xóa!");
                setTimeout(() => location.reload(), 1000);
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

            // TỰ ĐỘNG TẢI FILE KẾT QUẢ & CUNG CẤP CÁC LỰA CHỌN TẢI NHÃN
            if (result.ids && result.ids.length > 0) {
                Swal.fire({ 
                    title: 'Đang tải thông tin nhãn thiết bị...', 
                    allowOutsideClick: false, 
                    didOpen: () => Swal.showLoading() 
                });
                
                let newDevices = [];
                try {
                    const fetchRes = await fetch(`/api/devices/all?ids=${result.ids.join(',')}`);
                    if (fetchRes.ok) {
                        const rawDevices = await fetchRes.json();
                        newDevices = rawDevices.map(item => ({
                            id: item.id,
                            device_name: item.device_name,
                            device_code: item.device_code,
                            room_name: item.rooms?.room_name || 'N/A',
                            purchase_date: item.purchase_date || '',
                            qr_url: item.qr_url
                        }));
                    }
                } catch (err) {
                    console.error("Lỗi khi tải thông tin thiết bị nhập kho:", err);
                }

                const swalResult = await Swal.fire({
                    title: 'Nhập kho thành công',
                    html: `
                        <div class="text-center">
                            <div class="mb-3 text-success" style="font-size: 3.5rem;">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <p class="text-muted">Đã nhập thành công <strong>${result.count}</strong> thiết bị từ Excel vào hệ thống</p>
                            
                            <div class="text-start px-3 py-3 rounded-3 border bg-white shadow-sm mt-3" style="border-color: #e2e8f0;">
                                <span class="fw-bold text-muted small d-block mb-3 text-uppercase"><i class="fas fa-cog me-1"></i> Tùy chọn xuất dữ liệu:</span>
                                <div class="form-check mb-2" style="padding-left: 1.8em;">
                                    <input class="form-check-input" type="checkbox" id="chkDownloadZIP" checked style="cursor: pointer; width: 1.2em; height: 1.2em; margin-left: -1.8em;" ${newDevices.length === 0 ? 'disabled' : ''}>
                                    <label class="form-check-label fw-bold text-dark ms-2" for="chkDownloadZIP" style="cursor: pointer; font-size: 0.95rem;">
                                        <i class="fas fa-file-archive text-primary me-2"></i> Tải nhãn ảnh & PDF (.ZIP)
                                    </label>
                                </div>
                                <div class="form-check" style="padding-left: 1.8em;">
                                    <input class="form-check-input" type="checkbox" id="chkExportExcel" checked style="cursor: pointer; width: 1.2em; height: 1.2em; margin-left: -1.8em;">
                                    <label class="form-check-label fw-bold text-dark ms-2" for="chkExportExcel" style="cursor: pointer; font-size: 0.95rem;">
                                        <i class="fas fa-file-excel text-success me-2"></i> Tải tệp Excel thông tin (kèm QR)
                                    </label>
                                </div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: '<i class="fas fa-download me-2"></i> Tải về & Hoàn tất',
                    customClass: {
                        popup: 'swal2-premium-popup',
                        confirmButton: 'btn btn-primary rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm w-100 mt-4'
                    },
                    buttonsStyling: false,
                    preConfirm: () => {
                        return {
                            downloadZIP: document.getElementById('chkDownloadZIP').checked,
                            downloadExcel: document.getElementById('chkExportExcel').checked
                        };
                    }
                });

                if (swalResult.isConfirmed && swalResult.value) {
                    const opts = swalResult.value;

                    // Lấy blob Excel nếu người dùng chọn (để nhét vào ZIP, tránh tải 2 file bị Chrome chặn)
                    let excelBlob = null;
                    if (opts.downloadExcel) {
                        try {
                            const excelRes = await fetch(`/devices/export-by-ids?ids=${result.ids.join(',')}`);
                            if (excelRes.ok) excelBlob = await excelRes.blob();
                        } catch (err) {
                            console.error("Lỗi khi tải file Excel import:", err);
                        }
                    }

                    // Tải 1 file ZIP duy nhất (chứa PNG + PDF + Excel nếu có) → Chrome không chặn
                    if ((opts.downloadZIP && newDevices.length > 0) || excelBlob) {
                        const excelName = excelBlob ? `Ket_Qua_Import_${new Date().getTime()}.xlsx` : null;
                        await downloadZipForDevices(newDevices, `Import_Batch`, excelBlob, excelName);
                    }
                    location.reload();
                } else {
                    location.reload();
                }
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

                    // TỰ ĐỘNG TẢI FILE EXCEL KẾT QUẢ HOẶC IN/TẢI NHÃN MÃ QR
                    if (result.ids && result.ids.length > 0) {
                        const newDevices = result.ids.map((id, idx) => ({
                            id: id,
                            device_name: data.device_name,
                            device_code: result.device_codes[idx],
                            room_name: data.room_name,
                            purchase_date: data.purchase_date,
                            qr_url: result.qr_urls[idx]
                        }));

                        const swalResult = await Swal.fire({
                            title: 'Đăng ký thành công',
                            html: `
                                <div class="text-center">
                                    <div class="mb-3 text-success" style="font-size: 3.5rem;">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <p class="text-muted">Thiết bị đã được lưu vào hệ thống</p>
                                    <div class="notif-device-card" style="display: flex; align-items: center; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; text-align: left; margin-bottom: 20px;">
                                        <div class="notif-device-icon" style="background: rgba(2, 132, 199, 0.1); color: #0284c7; width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                            <i class="fas fa-laptop"></i>
                                        </div>
                                        <div style="flex:1; min-width:0;">
                                            <div class="notif-device-name" style="font-weight: bold; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.device_name}</div>
                                            <div class="notif-device-room" style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">
                                                <i class="fas fa-map-marker-alt"></i> ${data.room_name}
                                                <span class="ms-2 badge bg-primary bg-opacity-10 text-primary border-primary border-opacity-25" style="font-size: 0.7rem; padding: 3px 6px;">${data.quantity} thiết bị</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="text-start px-3 py-3 rounded-3 border bg-white shadow-sm mt-3" style="border-color: #e2e8f0;">
                                        <span class="fw-bold text-muted small d-block mb-3 text-uppercase"><i class="fas fa-cog me-1"></i> Tùy chọn xuất dữ liệu:</span>
                                        <div class="form-check mb-2" style="padding-left: 1.8em;">
                                            <input class="form-check-input" type="checkbox" id="chkDownloadZIP" checked style="cursor: pointer; width: 1.2em; height: 1.2em; margin-left: -1.8em;">
                                            <label class="form-check-label fw-bold text-dark ms-2" for="chkDownloadZIP" style="cursor: pointer; font-size: 0.95rem;">
                                                <i class="fas fa-file-archive text-primary me-2"></i> Tải nhãn ảnh & PDF (.ZIP)
                                            </label>
                                        </div>
                                        <div class="form-check" style="padding-left: 1.8em;">
                                            <input class="form-check-input" type="checkbox" id="chkExportExcel" checked style="cursor: pointer; width: 1.2em; height: 1.2em; margin-left: -1.8em;">
                                            <label class="form-check-label fw-bold text-dark ms-2" for="chkExportExcel" style="cursor: pointer; font-size: 0.95rem;">
                                                <i class="fas fa-file-excel text-success me-2"></i> Tải tệp Excel thông tin (kèm QR)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            `,
                            showConfirmButton: true,
                            confirmButtonText: '<i class="fas fa-download me-2"></i> Tải về & Hoàn tất',
                            customClass: {
                                popup: 'swal2-premium-popup',
                                confirmButton: 'btn btn-primary rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm w-100 mt-4'
                            },
                            buttonsStyling: false,
                            preConfirm: () => {
                                return {
                                    downloadZIP: document.getElementById('chkDownloadZIP').checked,
                                    downloadExcel: document.getElementById('chkExportExcel').checked
                                };
                            }
                        });

                        if (swalResult.isConfirmed && swalResult.value) {
                            const opts = swalResult.value;

                            // Lấy blob Excel nếu chọn (sẽ nhét vào ZIP – tránh Chrome chặn 2 download)
                            let excelBlob = null;
                            if (opts.downloadExcel) {
                                try {
                                    const excelRes = await fetch(`/devices/export-by-ids?ids=${result.ids.join(',')}`);
                                    if (excelRes.ok) excelBlob = await excelRes.blob();
                                } catch (err) {
                                    console.error("Lỗi khi tải file Excel:", err);
                                }
                            }

                            // Tải 1 file ZIP duy nhất (chứa PNG + PDF + Excel nếu có)
                            if (opts.downloadZIP || excelBlob) {
                                const excelName = excelBlob ? `Ket_Qua_Dang_Ky_${sanitizeFilename(data.device_name)}.xlsx` : null;
                                await downloadZipForDevices(newDevices, data.device_name, excelBlob, excelName);
                            }
                            location.reload();
                        } else {
                            location.reload();
                        }
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
                    let errMsg = 'Đăng ký thất bại';
                    try { const e = await res.json(); errMsg = e.error || errMsg; } catch(_) {}
                    throw new Error(errMsg);
                }
            } catch (error) {
                Swal.fire('Lỗi', error.message, 'error');
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
        // Ẩn modal chi tiết để hiện popup nhập lý do (tránh Bootstrap focus trap chặn input Swal)
        const detailModalEl = document.getElementById('detailModal');
        const bsModal = bootstrap.Modal.getInstance(detailModalEl);
        if (bsModal) bsModal.hide();

        const result = await Swal.fire({
            title: 'Yêu cầu xóa hàng loạt?',
            html: `
                <div class="text-center">
                    <p class="text-muted">Bạn đang gửi yêu cầu đề xuất xóa vĩnh viễn <strong class="text-danger">${selectedIds.length}</strong> thiết bị tới Ban quản lý.</p>
                    <p class="text-warning small fw-bold mb-3"><i class="fas fa-info-circle"></i> Yêu cầu này cần được Admin xét duyệt để thực thi.</p>
                    <div class="text-start px-2 mb-3">
                        <label class="form-label small fw-bold text-muted">Lý do xóa đề xuất <span class="text-danger">*</span>:</label>
                        <textarea id="bulkDeleteReason" class="form-control" placeholder="Nhập lý do chi tiết để gửi lên hệ thống..." rows="3" style="border-radius: 10px; font-size: 0.9rem;"></textarea>
                    </div>
                    <div class="text-start px-2">
                        <label class="form-label small fw-bold text-muted">Nhập chữ <span class="text-danger">"YÊU CẦU"</span> để xác nhận:</label>
                        <input type="text" id="confirmTeacherInput" class="form-control text-center fw-bold" placeholder="YÊU CẦU" autocomplete="off" style="border-radius: 10px;">
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-paper-plane me-1"></i> Gửi yêu cầu',
            cancelButtonText: 'Hủy bỏ',
            customClass: {
                popup: 'swal2-premium-popup',
                confirmButton: 'btn btn-warning rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm me-2',
                cancelButton: 'btn btn-light rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm'
            },
            buttonsStyling: false,
            preConfirm: () => {
                const reasonVal = document.getElementById('bulkDeleteReason').value.trim();
                // Normalize NFC trước khi so sánh để tránh lỗi dấu tiếng Việt từ IME
                const confirmVal = document.getElementById('confirmTeacherInput').value.trim().normalize('NFC').toUpperCase();
                if (!reasonVal) {
                    Swal.showValidationMessage('Bạn phải nhập lý do xóa đề xuất');
                    return false;
                }
                if (confirmVal !== 'Y\u00CAU C\u1EA6U' && confirmVal !== 'YEU CAU' && confirmVal !== 'REQUEST') {
                    Swal.showValidationMessage('Bạn phải nhập đúng chữ "YÊU CẦU" để xác nhận');
                    return false;
                }
                return reasonVal;
            }
        });

        if (result.isDismissed || !result.value) {
            if (bsModal) bsModal.show();
            return;
        }

        const reason = result.value;
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

    // --- Admin: ẩn modal trước, hiện Swal, restore nếu hủy ---
    const adminDetailModalEl = document.getElementById('detailModal');
    const adminBsModal = bootstrap.Modal.getInstance(adminDetailModalEl);
    if (adminBsModal) adminBsModal.hide();

    const result = await Swal.fire({
        title: 'Xác nhận xóa hàng loạt?',
        html: `
            <div class="text-center">
                <p class="text-muted">Bạn đang thực hiện xóa vĩnh viễn <strong class="text-danger">${selectedIds.length}</strong> thiết bị khỏi hệ thống.</p>
                <p class="text-danger small fw-bold mb-3"><i class="fas fa-exclamation-triangle"></i> Hành động này không thể hoàn tác!</p>
                <div class="text-start px-2">
                    <label class="form-label small fw-bold text-muted">Nhập chữ <span class="text-danger">"XÓA"</span> hoặc <span class="text-danger">"DELETE"</span> để xác nhận:</label>
                    <input type="text" id="confirmDeleteInput" class="form-control text-center fw-bold" placeholder="XÓA" autocomplete="off" style="border-radius: 10px;">
                </div>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> Xóa tất cả',
        cancelButtonText: 'Hủy bỏ',
        customClass: {
            popup: 'swal2-premium-popup',
            confirmButton: 'btn btn-danger rounded-pill px-4 py-2.5 fw-bold text-white shadow-sm me-2',
            cancelButton: 'btn btn-light rounded-pill px-4 py-2.5 fw-bold text-dark shadow-sm'
        },
        buttonsStyling: false,
        preConfirm: () => {
            // Normalize Unicode NFC trước khi so sánh, tránh lỗi dấu tiếng Việt từ bộ gõ (IME)
            const rawVal = document.getElementById('confirmDeleteInput').value.trim();
            const inputVal = rawVal.normalize('NFC').toUpperCase();
            // Chấp nhận: XÓA (NFC), XOA (không dấu), DELETE (tiếng Anh)
            if (inputVal !== 'X\u00D3A' && inputVal !== 'XOA' && inputVal !== 'DELETE') {
                Swal.showValidationMessage('Bạn phải nhập đúng chữ "XÓA" hoặc "DELETE" để xác nhận');
                return false;
            }
            return true;
        }
    });

    if (!result.isConfirmed) {
        // Hủy → mở lại modal chi tiết
        if (adminBsModal) adminBsModal.show();
        return;
    }

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

// ==========================================
// CHỨC NĂNG IN VÀ TẢI NHÃN MÃ QR (PROPERTY TAG)
// ==========================================

// Helper vẽ đường viền bo góc trên Canvas
function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') radius = 5;
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// Helper cắt ngắn chuỗi nếu quá dài trên Canvas
function truncateText(ctx, text, maxWidth) {
    let width = ctx.measureText(text).width;
    if (width <= maxWidth) return text;
    
    let ell = "...";
    let len = text.length;
    while (width > maxWidth && len > 0) {
        len--;
        text = text.substring(0, len);
        width = ctx.measureText(text + ell).width;
    }
    return text + ell;
}

// Hàm vẽ nhãn Property Tag chuẩn lên Canvas
function drawPropertyTag(canvas, data, callback) {
    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 280;
    
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = function() {
        render(qrImg);
    };
    qrImg.onerror = function() {
        console.warn("Could not load QR image with CORS, rendering without QR image");
        render(null);
    };
    qrImg.src = data.qrUrl || '';
    
    function render(qrImage) {
        ctx.clearRect(0, 0, 500, 280);
        
        // 1. Nền trắng bo góc
        ctx.fillStyle = "#ffffff";
        drawRoundRect(ctx, 0, 0, 500, 280, 16, true, false);
        
        // 2. Tiêu đề màu xanh dương đậm (Property Tag Header)
        ctx.fillStyle = "#1e3a8a";
        drawRoundRect(ctx, 0, 0, 500, 50, {tl: 16, tr: 16, bl: 0, br: 0}, true, false);
        
        // 3. Viết text tiêu đề
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TEM QUẢN LÝ THIẾT BỊ • PROPERTY TAG", 250, 25);
        
        // 4. Đường viền bao quanh thẻ
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 0, 0, 500, 280, 16, false, true);
        
        // 5. Viết thông tin bên trái
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        
        let startY = 70;
        const lineSpacing = 42;
        
        // Tên thiết bị
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Tên thiết bị: ", 25, startY);
        
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px Arial, sans-serif";
        let labelWidth1 = ctx.measureText("Tên thiết bị: ").width;
        ctx.fillText(truncateText(ctx, data.deviceName, 300 - labelWidth1), 25 + labelWidth1, startY);
        
        // Mã thiết bị
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Mã thiết bị: ", 25, startY + lineSpacing);
        
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px Courier New, monospace";
        let labelWidth2 = ctx.measureText("Mã thiết bị: ").width;
        let displayCode = data.deviceCode || 'N/A';
        if (displayCode.length > 18) {
            ctx.font = "bold 12px Courier New, monospace";
            ctx.fillText(displayCode, 25, startY + lineSpacing + 20);
        } else {
            ctx.fillText(displayCode, 25 + labelWidth2, startY + lineSpacing);
        }
        
        // Vị trí phòng
        let nextY = displayCode.length > 18 ? startY + (lineSpacing * 2) + 10 : startY + (lineSpacing * 2);
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Phòng: ", 25, nextY);
        
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px Arial, sans-serif";
        let labelWidth3 = ctx.measureText("Phòng: ").width;
        ctx.fillText(data.roomName || 'N/A', 25 + labelWidth3, nextY);
        
        // Ngày mua
        ctx.fillStyle = "#475569";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Ngày mua: ", 25, nextY + lineSpacing);
        
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px Arial, sans-serif";
        let labelWidth4 = ctx.measureText("Ngày mua: ").width;
        ctx.fillText(data.purchaseDate || 'N/A', 25 + labelWidth4, nextY + lineSpacing);
        
        // 6. Vẽ QR code bên phải
        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#e2e8f0";
        drawRoundRect(ctx, 335, 75, 140, 140, 12, true, true);
        
        if (qrImage) {
            ctx.drawImage(qrImage, 345, 85, 120, 120);
        } else {
            ctx.fillStyle = "#94a3b8";
            ctx.font = "12px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Mã QR", 405, 145);
        }
        
        callback(canvas.toDataURL("image/png"));
    }
}

// Tải một nhãn PNG cho thiết bị đơn lẻ
function downloadSinglePropertyTag() {
    const code = document.getElementById('vCode')?.innerText || 'device';
    const name = document.getElementById('vName')?.innerText || '';
    const room = document.getElementById('vRoom')?.innerText || '';
    const date = document.getElementById('vDate_purchase')?.innerText || '';
    const qrUrl = document.getElementById('sdQr')?.src || '';

    const data = {
        deviceName: name,
        deviceCode: code,
        roomName: room,
        purchaseDate: date,
        qrUrl: qrUrl
    };

    const canvas = document.createElement('canvas');
    Swal.fire({ title: 'Đang tạo nhãn...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    drawPropertyTag(canvas, data, function(dataUrl) {
        Swal.close();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Nhan_${code}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

// In nhãn cho thiết bị đơn lẻ
function printSinglePropertyTag() {
    const code = document.getElementById('vCode')?.innerText || 'device';
    const name = document.getElementById('vName')?.innerText || '';
    const room = document.getElementById('vRoom')?.innerText || '';
    const date = document.getElementById('vDate_purchase')?.innerText || '';
    const qrUrl = document.getElementById('sdQr')?.src || '';

    const labels = [{
        deviceName: name,
        deviceCode: code,
        roomName: room,
        purchaseDate: date,
        qrUrl: qrUrl
    }];

    printLabels(labels);
}

// Tải thư viện JSZip từ CDN khi cần thiết
// Tải thư viện JSZip từ CDN khi cần thiết
async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error("Không thể tải thư viện JSZip"));
        document.head.appendChild(script);
    });
}

// Tải thư viện jsPDF từ CDN khi cần thiết
async function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve((window.jspdf && window.jspdf.jsPDF) || window.jsPDF);
        script.onerror = () => reject(new Error("Không thể tải thư viện jsPDF"));
        document.head.appendChild(script);
    });
}

// Tải danh sách nhãn thiết bị tùy ý thành tệp ZIP (PNG lẻ + PDF tổng hợp + Excel tuỳ chọn)
// excelBlob & excelFilename: nếu có, sẽ nhét Excel vào ZIP → chỉ 1 lần tải → Chrome không chặn
async function downloadZipForDevices(devices, filenamePrefix, excelBlob = null, excelFilename = null) {
    Swal.fire({
        title: 'Đang chuẩn bị tải xuống...',
        text: 'Đang vẽ nhãn và đóng gói thành tệp ZIP...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const pngDataUrls = []; // lưu để tạo PDF

        // VẼ TUẦN TỰ - mỗi device một canvas riêng
        // (Promise.all + 1 canvas chung → ghi đè nhau → ảnh hỏng)
        for (const item of devices) {
            const tagData = {
                deviceName:   item.device_name   || '',
                deviceCode:   item.device_code   || '',
                roomName:     item.room_name      || '',
                purchaseDate: item.purchase_date  || '',
                qrUrl:        item.qr_url         || ''
            };
            const canvas = document.createElement('canvas');
            const dataUrl = await new Promise(resolve => {
                drawPropertyTag(canvas, tagData, url => resolve(url));
            });
            pngDataUrls.push(dataUrl);
            zip.file(`Nhan_${item.device_code || item.id}.png`, dataUrl.split(',')[1], { base64: true });
        }

        const safePrefix = sanitizeFilename(filenamePrefix);

        // Tạo PDF bằng jsPDF nhúng trực tiếp ảnh PNG (không dùng html2canvas → không lỗi CORS)
        try {
            const JsPDF = await loadJsPDF();
            const pdf  = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const PW   = pdf.internal.pageSize.getWidth();
            const PH   = pdf.internal.pageSize.getHeight();
            const M    = 10;
            const tagW = (PW - M * 3) / 2;
            const tagH = tagW * (280 / 500);
            let col = 0, y = M;

            for (let i = 0; i < pngDataUrls.length; i++) {
                const x = M + col * (tagW + M);
                pdf.addImage(pngDataUrls[i], 'PNG', x, y, tagW, tagH);
                col++;
                if (col >= 2) {
                    col = 0;
                    y += tagH + M;
                    if (i < pngDataUrls.length - 1 && y + tagH > PH - M) {
                        pdf.addPage();
                        y = M;
                    }
                }
            }
            zip.file(`Danh_Sach_Nhan_In_${safePrefix}.pdf`, pdf.output('blob'));
        } catch (pdfErr) {
            console.warn('Bỏ qua lỗi tạo PDF:', pdfErr);
        }

        // Nhét Excel vào ZIP nếu có (tránh tải 2 file riêng → Chrome chặn)
        if (excelBlob && excelFilename) {
            zip.file(excelFilename, excelBlob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const blobUrl = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Nhan_In_QR_${safePrefix}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        await Swal.fire({ icon: 'success', title: 'Hoàn tất!', text: 'Đã tải tệp ZIP nhãn thành công.', timer: 2000, showConfirmButton: false });
    } catch (e) {
        console.error(e);
        await Swal.fire('Lỗi', 'Không thể tải nhãn ZIP: ' + e.message, 'error');
    }
}

// Tải nhãn hàng loạt thành tệp ZIP
async function handleBulkDownloadQR() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedIds.length === 0) return;

    // Ẩn modal danh sách thiết bị con
    const detailModalEl = document.getElementById('detailModal');
    const bsDetail = bootstrap.Modal.getInstance(detailModalEl);
    if (bsDetail) bsDetail.hide();

    Swal.fire({
        title: 'Đang chuẩn bị tải xuống...',
        text: 'Đang vẽ nhãn và đóng gói mã QR thành tệp ZIP...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        
        // Lấy danh sách máy lẻ từ details
        const details = window.deviceDataStore.flatMap(d => d.all_devices_detail || []);
        const selectedDevices = details.filter(item => selectedIds.includes(item.id));

        // Vẽ tuần tự – mỗi thiết bị canvas riêng
        for (const item of selectedDevices) {
            const tagData = {
                deviceName:   currentGroupData.name          || '',
                deviceCode:   item.device_code               || '',
                roomName:     currentGroupData.room          || '',
                purchaseDate: currentGroupData.date_purchase || '',
                qrUrl:        item.qr_url                    || ''
            };
            const canvas = document.createElement('canvas');
            const dataUrl = await new Promise(resolve => {
                drawPropertyTag(canvas, tagData, url => resolve(url));
            });
            zip.file(`Nhan_${item.device_code || item.id}.png`, dataUrl.split(',')[1], { base64: true });
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const blobUrl = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = blobUrl;
        const safeName = sanitizeFilename(currentGroupData.name || 'Batch');
        a.download = `Nhan_In_QR_${safeName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        await Swal.fire({ icon: 'success', title: 'Hoàn tất!', text: 'Đã tải tệp ZIP nhãn thành công.', timer: 2000, showConfirmButton: false });
        if (bsDetail) bsDetail.show();
    } catch (e) {
        console.error(e);
        Swal.fire('Lỗi', 'Không thể tải nhãn hàng loạt: ' + e.message, 'error').then(() => {
            if (bsDetail) bsDetail.show();
        });
    }
}

// In nhãn hàng loạt
function handleBulkPrintQR() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedIds.length === 0) return;

    // Lấy danh sách máy lẻ từ details
    const details = window.deviceDataStore.flatMap(d => d.all_devices_detail || []);
    const selectedDevices = details.filter(item => selectedIds.includes(item.id));

    const labels = selectedDevices.map(item => ({
        deviceName: currentGroupData.name || '',
        deviceCode: item.device_code || '',
        roomName: currentGroupData.room || '',
        purchaseDate: currentGroupData.date_purchase || '',
        qrUrl: item.qr_url || ''
    }));

    printLabels(labels);
}

// Hàm mở cửa sổ in nhãn
function printLabels(labels) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        Swal.fire("Lỗi", "Không thể mở cửa sổ in. Vui lòng tắt trình chặn popup.", "error");
        return;
    }

    const htmlContent = `
    <html>
    <head>
        <title>In nhãn thiết bị</title>
        <style>
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                }
                .no-print {
                    display: none;
                }
                @page {
                    margin: 0;
                }
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f1f5f9;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .print-controls {
                background: white;
                padding: 15px 30px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                display: flex;
                gap: 15px;
                align-items: center;
            }
            .btn-print-now {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                padding: 10px 20px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
            }
            .btn-print-now:hover {
                transform: translateY(-1px);
            }
            .labels-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                gap: 15px;
                width: 100%;
                max-width: 1200px;
            }
            .property-tag {
                width: 360px;
                height: 200px;
                background: white;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                overflow: hidden;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                position: relative;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                page-break-inside: avoid;
            }
            .tag-header {
                background: #1e3a8a;
                color: white;
                text-align: center;
                font-size: 10px;
                font-weight: 800;
                padding: 6px 0;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .tag-body {
                display: flex;
                padding: 12px;
                flex: 1;
                align-items: center;
            }
            .tag-info {
                flex: 1;
                font-size: 11px;
                color: #0f172a;
                display: flex;
                flex-direction: column;
                gap: 5px;
                overflow: hidden;
            }
            .info-row {
                display: flex;
                flex-wrap: wrap;
                line-height: 1.3;
            }
            .info-label {
                font-weight: bold;
                color: #475569;
                margin-right: 4px;
            }
            .info-value {
                font-weight: bold;
                color: #0f172a;
            }
            .code-value {
                font-family: "Courier New", monospace;
                font-size: 11px;
                background: #f1f5f9;
                padding: 1px 4px;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
                word-break: break-all;
            }
            .tag-qr {
                width: 100px;
                height: 100px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: 10px;
                padding: 4px;
                flex-shrink: 0;
            }
            .tag-qr img {
                width: 90px;
                height: 90px;
            }
            @media print {
                body {
                    background: transparent;
                    padding: 0;
                }
                .print-controls {
                    display: none;
                }
                .labels-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 360px);
                    gap: 15px;
                }
                .property-tag {
                    border: 1px solid #000;
                    box-shadow: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="print-controls no-print">
            <span style="font-weight: bold; color: #1e293b;">Sẵn sàng in ${labels.length} nhãn</span>
            <button class="btn-print-now" onclick="window.print()">In ngay</button>
            <button onclick="window.close()" style="background: #e2e8f0; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;">Đóng</button>
        </div>
        <div class="labels-grid">
            ${labels.map(l => `
                <div class="property-tag">
                    <div class="tag-header">TEM QUẢN LÝ THIẾT BỊ • PROPERTY TAG</div>
                    <div class="tag-body">
                        <div class="tag-info">
                            <div class="info-row"><span class="info-label">Tên thiết bị:</span> <span class="info-value">${l.deviceName}</span></div>
                            <div class="info-row"><span class="info-label">Mã thiết bị:</span> <span class="info-value code-value">${l.deviceCode}</span></div>
                            <div class="info-row"><span class="info-label">Phòng:</span> <span class="info-value">${l.roomName}</span></div>
                            <div class="info-row"><span class="info-label">Ngày mua:</span> <span class="info-value">${l.purchaseDate}</span></div>
                        </div>
                        <div class="tag-qr">
                            <img src="${l.qrUrl}" crossorigin="anonymous" />
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <script>
            window.addEventListener('load', () => {
                setTimeout(() => {
                    window.print();
                }, 500);
            });
        <\/script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
