/**
 * Chức năng: Xử lý giao diện danh sách thiết bị
 */
let currentGroupData = {};

document.addEventListener('DOMContentLoaded', function() {
    const filters = ['searchInput', 'roomFilter', 'categoryFilter', 'statusFilter'];
    filters.forEach(id => {
        document.getElementById(id)?.addEventListener('input', filterDevices);
        document.getElementById(id)?.addEventListener('change', filterDevices);
    });
    // Gọi lọc lần đầu để tính tổng ban đầu
    filterDevices();
});

// ========== LỌC THIẾT BỊ ==========
function filterDevices() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const room = document.getElementById('roomFilter').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value.toLowerCase();
    const status = document.getElementById('statusFilter').value.toLowerCase();
    
    let totalQty = 0;
    let totalValue = 0;

    const gridItems = document.querySelectorAll('.device-item');
    const tableRows = document.querySelectorAll('#deviceTableBody tr');

    // Tự động mở nếu tìm thấy mã QR chính xác (Dành cho quét QR)
    if (search.length > 5 && window.deviceDataStore) {
        for (let i = 0; i < window.deviceDataStore.length; i++) {
            const group = window.deviceDataStore[i];
            const foundItem = (group.all_devices_detail || []).find(d => (d.device_code || '').toLowerCase() === search);
            if (foundItem) {
                const targetElement = document.querySelector(`.device-item[data-index="${i}"]`);
                if (targetElement) {
                    currentGroupData = {
                        name:          group.device_name     || '',
                        room:          (group.rooms && group.rooms.room_name) || '',
                        status:        group.status          || '',
                        desc:          group.description     || '',
                        date_purchase: group.purchase_date   || 'N/A',
                        inventory_at:  group.last_inventory_at || '',
                        image_url:     group.image_url       || '',
                        category:      (group.categories && group.categories.category_name) || '',
                        price:         group.device_price    || '',
                        createdBy:     (group.users && group.users.full_name) || 'Hệ thống',
                        createdAt:     group.created_at      || '',
                        updatedAt:     group.updated_at      || ''
                    };
                    showSingleDeviceInfo(foundItem);
                    document.getElementById('searchInput').value = '';
                    return; 
                }
            }
        }
    }

    gridItems.forEach((item, index) => {
        const matches = ((item.dataset.name || '').toLowerCase().includes(search) || 
                         (item.dataset.code || '').toLowerCase().includes(search) ||
                         (item.dataset.allCodes || '').toLowerCase().includes(search)) &&
            (room === "" || (item.dataset.room || '').toLowerCase() === room) &&
            (cat === "" || (item.dataset.category || '').toLowerCase().includes(cat)) &&
            (status === "" || (item.dataset.status || '').toLowerCase() === status);

        if (!matches) {
            item.classList.add('d-none');
            item.classList.remove('fade-in-scale');
        } else {
            if (item.classList.contains('d-none')) {
                item.classList.remove('d-none');
                // Force reflow
                void item.offsetWidth;
                item.classList.add('fade-in-scale');
            }
        }
        
        if (tableRows[index]) {
            if (!matches) {
                tableRows[index].classList.add('d-none');
            } else {
                tableRows[index].classList.remove('d-none');
            }
        }
        
        if (matches) {
            const qty = parseInt(item.dataset.quantity || 0);
            totalQty += qty;
            
            // Tính giá trị: Xóa các ký tự không phải số (ví dụ "15.000.000 ₫" -> 15000000)
            const priceStr = item.dataset.price || "0";
            const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
            totalValue += (price * qty);
        }
    });

    const totalCountEl = document.getElementById('totalCount');
    const totalValueEl = document.getElementById('totalValueDisplay');
    
    if (totalCountEl) totalCountEl.innerText = totalQty;
    if (totalValueEl) totalValueEl.innerText = totalValue.toLocaleString('vi-VN') + ' ₫';
}

// ========== CHUYỂN ĐỔI GRID / TABLE ==========
function switchView(mode) {
    const gridEl = document.getElementById('deviceGrid');
    const tableEl = document.getElementById('deviceTableWrapper');
    const btnGrid = document.getElementById('btnGridView');
    const btnTable = document.getElementById('btnTableView');

    if (mode === 'table') {
        gridEl.style.display = 'none';
        tableEl.style.display = 'block';
        
        btnGrid.style.background = 'transparent';
        btnGrid.style.color = '#64748b';
        btnGrid.style.boxShadow = 'none';
        btnGrid.style.transform = 'none';
        
        btnTable.style.background = 'var(--primary-gradient, linear-gradient(135deg, var(--primary), #008080))';
        btnTable.style.color = 'white';
        btnTable.style.boxShadow = '0 4px 10px rgba(15, 118, 110, 0.2)';
        btnTable.style.transform = 'translateY(-1px)';
    } else {
        gridEl.style.display = '';
        tableEl.style.display = 'none';
        
        btnGrid.style.background = 'var(--primary-gradient, linear-gradient(135deg, var(--primary), #008080))';
        btnGrid.style.color = 'white';
        btnGrid.style.boxShadow = '0 4px 10px rgba(15, 118, 110, 0.2)';
        btnGrid.style.transform = 'translateY(-1px)';
        
        btnTable.style.background = 'transparent';
        btnTable.style.color = '#64748b';
        btnTable.style.boxShadow = 'none';
        btnTable.style.transform = 'none';
    }
}

// ========== XEM CHI TIẾT NHÓM ==========
function showDeviceDetails(element) {
    const index = parseInt(element.dataset.index);

    if (!window.deviceDataStore || isNaN(index) || index < 0 || index >= window.deviceDataStore.length) {
        console.error('Dữ liệu thiết bị không tìm thấy, index:', index);
        return;
    }

    const d = window.deviceDataStore[index];

    currentGroupData = {
        name:          d.device_name     || '',
        room:          (d.rooms && d.rooms.room_name) || '',
        status:        d.status          || '',
        desc:          d.description     || '',
        date_purchase: d.purchase_date   || 'N/A',
        inventory_at:  d.last_inventory_at || '',
        image_url:     d.image_url       || '',
        category:      (d.categories && d.categories.category_name) || '',
        price:         d.device_price    || '',
        createdBy:     (d.users && d.users.full_name) || 'Hệ thống',
        createdAt:     d.created_at      || '',
        updatedAt:     d.updated_at      || ''
    };

    const details = d.all_devices_detail || [];

    document.getElementById('modalDeviceName').innerText = currentGroupData.name;

    const tableBody = document.getElementById('detailTableBody');
    if (tableBody) {
        tableBody.innerHTML = details.length > 0
            ? details.map((item, idx) => {
                const safeJson = JSON.stringify(item).replace(/'/g, "&#39;").replace(/\\/g, "\\\\");
                return `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input item-checkbox"
                           value="${item.id}"
                           onclick="event.stopPropagation(); updateDeleteButtonState();">
                </td>
                <td class="text-center fw-bold" onclick='showSingleDeviceInfo(${safeJson})' style="cursor:pointer">
                    ${idx + 1}
                </td>
                <td class="fw-bold text-primary" onclick='showSingleDeviceInfo(${safeJson})' style="cursor:pointer">
                    ${item.device_code || ''}
                </td>
                <td class="text-center" onclick='showSingleDeviceInfo(${safeJson})' style="cursor:pointer">
                    <button class="btn btn-sm btn-outline-info rounded-circle"><i class="fas fa-eye"></i></button>
                </td>
            </tr>`;
            }).join('')
            : `<tr><td colspan="4" class="text-center text-muted py-4">
                   <i class="fas fa-box-open me-2"></i>Chưa có thiết bị con nào.
               </td></tr>`;
    }

    const selectAllCb = document.getElementById('selectAllItems');
    if (selectAllCb) selectAllCb.checked = false;
    if (typeof updateDeleteButtonState === 'function') updateDeleteButtonState();

    const modalElement = document.getElementById('detailModal');
    if (modalElement) {
        const modalDetail = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modalDetail.show();
    }
}

// ========== XEM CHI TIẾT 1 MÁY LẺ ==========
function showSingleDeviceInfo(item) {
    if (typeof toggleEditMode === 'function') toggleEditMode(false);
    
    document.getElementById('sdInternalId').innerText = item.id;
    document.getElementById('vName').innerText = currentGroupData.name;
    document.getElementById('vCode').innerText = item.device_code || '';
    document.getElementById('vRoom').innerText = currentGroupData.room;
    document.getElementById('vDes').innerText = currentGroupData.desc || 'Không có mô tả.';
    document.getElementById('vCategory').innerText = currentGroupData.category;
    document.getElementById('vPrice').innerText = currentGroupData.price || 'Chưa cập nhật';
    document.getElementById('vCreatedBy').innerText = currentGroupData.createdBy || 'Hệ thống';
    document.getElementById('vCreatedAt').innerText = currentGroupData.createdAt ? currentGroupData.createdAt.substring(0, 19).replace('T', ' ') : 'N/A';
    document.getElementById('vUpdatedAt').innerText = currentGroupData.updatedAt ? currentGroupData.updatedAt.substring(0, 19).replace('T', ' ') : 'Chưa cập nhật';

    const dpEl = document.getElementById('vDate_purchase');
    if (dpEl) dpEl.innerText = currentGroupData.date_purchase || 'N/A';
    const ivEl = document.getElementById('vDate_inven');
    if (ivEl) ivEl.innerText = currentGroupData.inventory_at || 'Chưa kiểm kê';

    const statusEl = document.getElementById('vStatus');
    if (statusEl) {
        const status = currentGroupData.status;
        statusEl.innerText = status;
        statusEl.className = 'badge rounded-pill px-3 py-2';
        switch (status) {
            case 'Tốt':          statusEl.style.background = 'linear-gradient(135deg,#10b981,#059669)'; break;
            case 'Hỏng':         statusEl.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)'; break;
            case 'Cần bảo trì':
            case 'Đang bảo trì': statusEl.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)'; break;
            default:              statusEl.style.background = 'linear-gradient(135deg,#64748b,#475569)'; break;
        }
        statusEl.style.color = 'white';
    }

    const qrEl = document.getElementById('sdQr');
    if (qrEl) qrEl.src = item.qr_url || '';

    const imgEl = document.getElementById('sdRealImage');
    if (imgEl) {
        const finalImage = item.image_url || currentGroupData.image_url || 'https://via.placeholder.com/600x400?text=No+Image';
        imgEl.src = finalImage;
    }

    const detailModalEl = document.getElementById('detailModal');
    if (detailModalEl) {
        const existingModal = bootstrap.Modal.getInstance(detailModalEl);
        if (existingModal) existingModal.hide();
    }

    setTimeout(() => {
        const singleModalEl = document.getElementById('singleDeviceModal');
        if (singleModalEl) {
            new bootstrap.Modal(singleModalEl).show();
        }
    }, 200);
}

// ========== NÚT THAO TÁC HÀNG LOẠT ==========
function updateDeleteButtonState() {
    const checkedCount = document.querySelectorAll('.item-checkbox:checked').length;
    const btnDelete = document.getElementById('btnBulkDelete');
    const btnEdit = document.getElementById('btnBulkEdit');
    const counter = document.getElementById('selectedCounter');
    const editCounter = document.getElementById('selectedEditCounter');

    if (btnDelete && counter) {
        btnDelete.style.display = checkedCount > 0 ? 'block' : 'none';
        counter.innerText = checkedCount;
    }
    if (btnEdit && editCounter) {
        btnEdit.style.display = checkedCount > 0 ? 'block' : 'none';
        editCounter.innerText = checkedCount;
    }
}

// ========== TOGGLE EDIT/VIEW ==========
function toggleEditMode(isEdit) {
    const viewMode = document.getElementById('viewMode');
    const editMode = document.getElementById('editMode');

    if (viewMode) viewMode.classList.toggle('d-none', isEdit);
    if (editMode) editMode.classList.toggle('d-none', !isEdit);

    if (isEdit) {
        document.getElementById('eName').value = document.getElementById('vName').innerText;
        document.getElementById('eStatus').value = document.getElementById('vStatus').innerText;
        document.getElementById('eRoom').value = document.getElementById('vRoom').innerText;
        document.getElementById('eDesc').value = document.getElementById('vDes').innerText;
        document.getElementById('eCategory').value = document.getElementById('vCategory').innerText;
        document.getElementById('ePrice').value = currentGroupData.price || '';

        const ePurchase = document.getElementById('ePurchaseDate');
        if (ePurchase) {
            ePurchase.value = currentGroupData.date_purchase && currentGroupData.date_purchase !== 'N/A'
                ? currentGroupData.date_purchase.substring(0, 10) : '';
        }
    }
}