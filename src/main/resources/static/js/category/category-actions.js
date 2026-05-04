// Global Modal Instances
let categoryModalInstance = null;

/**
 * Open Edit Modal
 */
window.openEditCategoryModal = function(data) {
    console.log(">>> CATEGORY JS: Opening Edit Modal", data);
    try {
        if (!categoryModalInstance) {
            const modalEl = document.getElementById('categoryModal');
            if (modalEl) categoryModalInstance = new bootstrap.Modal(modalEl);
        }
        
        document.getElementById('categoryModalLabel').innerHTML = '<i class="fas fa-edit me-2"></i>Chỉnh Sửa Danh Mục';
        document.getElementById('categoryId').value = data.id;
        document.getElementById('categoryName').value = data.name;
        document.getElementById('categoryCode').value = data.code || '';
        document.getElementById('categoryDescription').value = data.desc || '';
        
        if (categoryModalInstance) categoryModalInstance.show();
    } catch (err) {
        console.error(">>> CATEGORY JS: Error opening modal", err);
    }
}

/**
 * Save Category Logic
 */
window.saveCategory = async function() {
    console.log(">>> CATEGORY JS: saveCategory() START");
    const id = document.getElementById('categoryId').value;
    const isEdit = id !== '';
    const btn = document.getElementById('btnSaveCategory');
    
    const categoryData = {
        category_name: document.getElementById('categoryName').value.trim(),
        category_code: document.getElementById('categoryCode').value.trim(),
        description: document.getElementById('categoryDescription').value.trim() || null
    };

    if (!categoryData.category_name || !categoryData.category_code) {
        Swal.fire('Cảnh báo', 'Vui lòng nhập đầy đủ Tên và Mã danh mục!', 'warning');
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Đang xử lý...';

        const url = isEdit ? `/categories/${id}` : '/categories/add';
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log(`>>> CATEGORY JS: [REQUEST] ${method} ${url}`, categoryData);
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });

        const rawRes = await response.text();
        console.log(">>> CATEGORY JS: [RESPONSE] Body:", rawRes);

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: isEdit ? 'Đã cập nhật!' : 'Đã thêm mới!',
                text: 'Dữ liệu đã được đồng bộ hệ thống.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            let errorMsg = rawRes;
            try {
                const json = JSON.parse(rawRes);
                errorMsg = json.error || json.message || rawRes;
            } catch (e) {
                console.error(">>> CATEGORY JS: Failed to parse error JSON", e);
            }
            Swal.fire('Thất bại', errorMsg || 'Có lỗi xảy ra', 'error');
        }
    } catch (err) {
        Swal.fire('Lỗi kết nối', 'Không thể kết nối đến máy chủ', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Lưu Danh Mục';
        }
    }
}

/**
 * Confirm Delete
 */
window.confirmDeleteCategory = function(id) {
    Swal.fire({
        title: 'Xóa danh mục?',
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
                const res = await fetch(`/categories/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.fire('Đã xóa!', 'Danh mục đã được loại bỏ.', 'success').then(() => location.reload());
                } else {
                    const err = await res.text();
                    Swal.fire('Lỗi', err || 'Không thể xóa danh mục này', 'error');
                }
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối', 'error');
            }
        }
    });
}

// Initializations
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('categorySearchInput');
    const categoryGrid = document.getElementById('categoryGrid');
    
    if (!categoryGrid) return;

    // Search Logic
    searchInput?.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        const items = document.querySelectorAll('.category-item');
        items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            const desc = (item.getAttribute('data-desc') || '').toLowerCase();
            item.style.display = (name.includes(term) || desc.includes(term)) ? '' : 'none';
        });
    });

    // Event Delegation
    categoryGrid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-category');
        const deleteBtn = e.target.closest('.btn-delete-category');
        const row = e.target.closest('.category-item');
        
        if (editBtn) {
            window.openEditCategoryModal({
                id: row.getAttribute('data-id'),
                name: row.getAttribute('data-name'),
                code: row.getAttribute('data-code'),
                desc: row.getAttribute('data-desc')
            });
        } else if (deleteBtn) {
            window.confirmDeleteCategory(row.getAttribute('data-id'));
        }
    });

    // Modal Reset
    document.getElementById('categoryModal')?.addEventListener('show.bs.modal', function (e) {
        if (e.relatedTarget && (e.relatedTarget.id === 'btnAddCategory' || e.relatedTarget.classList.contains('btn-add-vip'))) {
            document.getElementById('categoryModalLabel').innerHTML = '<i class="fas fa-plus-circle me-2"></i>Thêm Danh Mục Mới';
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryId').value = '';
        }
    });
});

console.log(">>> CATEGORY JS: SCRIPT LOADED COMPLETELY");
