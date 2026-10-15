/**
 * Topline Admin Dashboard - Interactive CRUD, Modals, and Notifications
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for flash messages and show toast
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) {
        showToast(decodeURIComponent(urlParams.get('success')), 'success');
        // Clean URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.has('error')) {
        showToast(decodeURIComponent(urlParams.get('error')), 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Modal open buttons
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-open-modal');
            openModal(modalId);
        });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.admin-modal-backdrop');
            if (modal) closeModal(modal.id);
        });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.admin-modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.admin-modal-backdrop.open').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });

    // Live search in table rows
    const searchInputs = document.querySelectorAll('.admin-search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const table = document.querySelector('.admin-modern-table tbody');
            if (!table) return;

            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
});

/**
 * Open Modal Helper
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close Modal Helper
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'success') {
    let container = document.querySelector('.admin-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'admin-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;

    let icon = 'fa-check-circle';
    let iconColor = '#10b981';
    if (type === 'error') {
        icon = 'fa-exclamation-circle';
        iconColor = '#ef4444';
    } else if (type === 'warning') {
        icon = 'fa-exclamation-triangle';
        iconColor = '#f59e0b';
    }

    toast.innerHTML = `
        <i class="fas ${icon}" style="color:${iconColor};font-size:18px;"></i>
        <div style="flex:1">${message}</div>
        <button style="background:none;border:none;cursor:pointer;color:#9ca3af;" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * Universal Delete Confirmation & Execution
 */
let currentDeleteAction = null;
let currentDeleteRow = null;

function confirmDelete(type, id, itemName, deleteUrl, rowElement = null) {
    const modal = document.getElementById('deleteConfirmModal');
    if (!modal) {
        if (confirm(`Are you sure you want to delete ${itemName || 'this ' + type}? This cannot be undone.`)) {
            submitDelete(deleteUrl, rowElement);
        }
        return;
    }

    document.getElementById('deleteItemDetails').textContent = itemName || `${type} #${id}`;
    currentDeleteAction = deleteUrl;
    currentDeleteRow = rowElement;

    openModal('deleteConfirmModal');
}

function executeDelete() {
    if (!currentDeleteAction) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    fetch(currentDeleteAction, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ajax: true })
    })
    .then(res => res.json())
    .then(data => {
        closeModal('deleteConfirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }

        if (data.success) {
            showToast(data.message || 'Deleted successfully', 'success');
            if (currentDeleteRow) {
                currentDeleteRow.style.opacity = '0';
                currentDeleteRow.style.transform = 'scale(0.95)';
                currentDeleteRow.style.transition = 'all 0.3s ease';
                setTimeout(() => currentDeleteRow.remove(), 300);
            } else {
                setTimeout(() => window.location.reload(), 600);
            }
        } else {
            showToast(data.message || 'Failed to delete record', 'error');
        }
    })
    .catch(err => {
        closeModal('deleteConfirmModal');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }
        console.error('Delete error:', err);
        showToast('Error deleting item: ' + err.message, 'error');
    });
}

/**
 * Autofill Client Details from Selected User in Training Payment Modal
 */
function autofillCreatePayment(select) {
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const name = selectedOption.getAttribute('data-name') || '';
    const phone = selectedOption.getAttribute('data-phone') || '';
    const email = selectedOption.getAttribute('data-email') || '';

    if (document.getElementById('createClientName') && name) {
        document.getElementById('createClientName').value = name;
    }
    if (document.getElementById('createClientPhone') && phone) {
        document.getElementById('createClientPhone').value = phone;
    }
    if (document.getElementById('createClientEmail') && email) {
        document.getElementById('createClientEmail').value = email;
    }
}

/**
 * Edit Training Payment
 */
function editTrainingPayment(id) {
    fetch(`/dashboard/admin/training/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const tx = data.transaction;

            const form = document.getElementById('editTrainingForm');
            if (!form) return;

            form.action = `/dashboard/admin/training/${id}/update`;
            document.getElementById('editPaymentId').value = tx.id;
            document.getElementById('editPaymentAmount').value = tx.amount;
            document.getElementById('editPaymentStatus').value = tx.status;
            document.getElementById('editPaymentReceipt').value = tx.mpesa_receipt || '';
            document.getElementById('editPaymentMethod').value = tx.payment_method || 'mpesa';
            document.getElementById('editPaymentDescription').value = tx.description || '';

            // Extract client contact details
            let clientName = tx.user ? tx.user.name : '';
            let clientEmail = tx.user ? tx.user.email : '';
            let clientPhone = tx.user ? tx.user.phone : '';

            if (!clientName || !clientPhone || !clientEmail) {
                const desc = tx.description || '';
                const matchName = desc.match(/Training Fee Payment -\s*([^|(\n]+)/i);
                const matchPhone = desc.match(/Phone:\s*([^|\n-]+)/i);
                const matchEmail = desc.match(/Email:\s*([^|\n-]+)/i);

                if (!clientName && matchName) clientName = matchName[1].trim();
                if (!clientPhone && matchPhone) clientPhone = matchPhone[1].trim();
                if (!clientEmail && matchEmail) clientEmail = matchEmail[1].trim();
            }

            if (document.getElementById('editPaymentClientName')) {
                document.getElementById('editPaymentClientName').value = clientName;
            }
            if (document.getElementById('editPaymentClientPhone')) {
                document.getElementById('editPaymentClientPhone').value = clientPhone;
            }
            if (document.getElementById('editPaymentClientEmail')) {
                document.getElementById('editPaymentClientEmail').value = clientEmail;
            }

            openModal('editTrainingModal');
        })
        .catch(err => {
            showToast('Failed to load payment details: ' + err.message, 'error');
        });
}

/**
 * View Training Payment Details
 */
function viewTrainingPayment(id) {
    fetch(`/dashboard/admin/training/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const tx = data.transaction;

            const detailsBody = document.getElementById('viewPaymentDetailsBody');
            if (!detailsBody) return;

            // Extract client contact details
            let userName = tx.user ? tx.user.name : '';
            let userEmail = tx.user ? tx.user.email : '';
            let userPhone = tx.user ? tx.user.phone : '';

            if (!userName || !userPhone || !userEmail) {
                const desc = tx.description || '';
                const matchName = desc.match(/Training Fee Payment -\s*([^|(\n]+)/i);
                const matchPhone = desc.match(/Phone:\s*([^|\n-]+)/i);
                const matchEmail = desc.match(/Email:\s*([^|\n-]+)/i);

                if (!userName && matchName) userName = matchName[1].trim();
                if (!userPhone && matchPhone) userPhone = matchPhone[1].trim();
                if (!userEmail && matchEmail) userEmail = matchEmail[1].trim();
            }

            userName = userName || 'Client';
            userPhone = userPhone || 'Not provided';
            userEmail = userEmail || 'Not provided';
            const dateStr = new Date(tx.created_at).toLocaleString();

            detailsBody.innerHTML = `
                <div style="background:#f9fafb;padding:16px;border-radius:10px;margin-bottom:16px;border:1px solid #e5e7eb;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Transaction ID</span>
                        <span style="font-weight:700;color:#0b3a6e;">#${tx.id}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Amount</span>
                        <span style="font-size:20px;font-weight:800;color:#f5a623;">KSh ${Number(tx.amount).toLocaleString()}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;">Status</span>
                        <span class="status-pill status-${tx.status}">${tx.status}</span>
                    </div>
                </div>

                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-bottom:16px;">
                    <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1e40af;margin-bottom:6px;letter-spacing:0.5px;">
                        <i class="fas fa-id-card"></i> Client Contact Information
                    </div>
                    <div style="font-weight:700;font-size:15px;color:#1e3a8a;margin-bottom:4px;">${userName}</div>
                    <div style="font-size:13px;color:#1d4ed8;margin-bottom:2px;">
                        <i class="fas fa-phone-alt" style="font-size:11px;margin-right:4px;"></i> <strong>Phone:</strong> ${userPhone}
                    </div>
                    <div style="font-size:13px;color:#1d4ed8;">
                        <i class="fas fa-envelope" style="font-size:11px;margin-right:4px;"></i> <strong>Email:</strong> ${userEmail}
                    </div>
                </div>

                <table style="width:100%;font-size:13.5px;border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:10px 0;color:#6b7280;font-weight:600;width:40%;">Receipt / Ref:</td>
                        <td style="padding:10px 0;font-weight:700;color:#111827;">${tx.mpesa_receipt || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:10px 0;color:#6b7280;font-weight:600;">Payment Method:</td>
                        <td style="padding:10px 0;text-transform:uppercase;font-weight:600;">${tx.payment_method || 'mpesa'}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:10px 0;color:#6b7280;font-weight:600;">Transaction Type:</td>
                        <td style="padding:10px 0;">${tx.type}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:10px 0;color:#6b7280;font-weight:600;">Date & Time:</td>
                        <td style="padding:10px 0;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#6b7280;font-weight:600;">Description:</td>
                        <td style="padding:10px 0;font-size:12.5px;">${tx.description || 'None'}</td>
                    </tr>
                </table>
            `;

            openModal('viewPaymentModal');
        })
        .catch(err => {
            showToast('Failed to load payment details: ' + err.message, 'error');
        });
}

/**
 * Edit User Details
 */
function editUser(id) {
    fetch(`/dashboard/admin/users/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const user = data.user;

            const form = document.getElementById('editUserForm');
            if (!form) return;

            form.action = `/dashboard/admin/users/${id}/update`;
            document.getElementById('editUserName').value = user.name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phone || '';
            document.getElementById('editUserRole').value = user.role || 'buyer';
            document.getElementById('editUserCounty').value = user.county || 'Nairobi';
            document.getElementById('editUserTown').value = user.town || 'Nairobi';
            document.getElementById('editUserVerified').value = user.is_verified ? 'true' : 'false';

            openModal('editUserModal');
        })
        .catch(err => {
            showToast('Failed to load user info: ' + err.message, 'error');
        });
}

/**
 * Toggle Provider Status
 */
function toggleProvider(id, buttonElement) {
    fetch(`/dashboard/admin/providers/${id}/toggle`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.reload(), 500);
        } else {
            showToast(data.message || 'Toggle failed', 'error');
        }
    })
    .catch(err => showToast(err.message, 'error'));
}

/**
 * Edit Provider
 */
function editProvider(id) {
    fetch(`/dashboard/admin/providers/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const p = data.provider;

            const form = document.getElementById('editProviderForm');
            if (!form) return;

            form.action = `/dashboard/admin/providers/${id}/update`;
            document.getElementById('editProviderTrade').value = p.trade || '';
            document.getElementById('editProviderExperience').value = p.experience_years || 0;
            document.getElementById('editProviderRate').value = p.daily_rate || 2000;
            document.getElementById('editProviderNca').value = p.nca_reg_number || '';
            document.getElementById('editProviderBio').value = p.bio || '';
            document.getElementById('editProviderAvailable').value = p.is_available ? 'true' : 'false';

            openModal('editProviderModal');
        })
        .catch(err => showToast('Failed to load provider: ' + err.message, 'error'));
}

/**
 * Edit Product
 */
function editProduct(id) {
    fetch(`/dashboard/admin/products/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const product = data.product;

            const form = document.getElementById('editProductForm');
            if (!form) return;

            form.action = `/dashboard/admin/products/${id}/update`;
            document.getElementById('editProductTitle').value = product.title || '';
            document.getElementById('editProductPrice').value = product.price || 0;
            document.getElementById('editProductStock').value = product.stock_quantity || 0;
            document.getElementById('editProductUnit').value = product.unit || 'item';
            document.getElementById('editProductCounty').value = product.location_county || 'Nairobi';
            document.getElementById('editProductCategory').value = product.category_id || 1;
            document.getElementById('editProductStatus').value = product.is_active ? 'true' : 'false';
            document.getElementById('editProductDescription').value = product.description || '';

            openModal('editProductModal');
        })
        .catch(err => showToast('Failed to load product: ' + err.message, 'error'));
}

/**
 * Edit Job
 */
function editJob(id) {
    fetch(`/dashboard/admin/jobs/${id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
            const job = data.job;

            const form = document.getElementById('editJobForm');
            if (!form) return;

            form.action = `/dashboard/admin/jobs/${id}/update`;
            document.getElementById('editJobTitle').value = job.title || '';
            document.getElementById('editJobTrade').value = job.trade_required || '';
            document.getElementById('editJobBudget').value = job.budget_estimate || 0;
            document.getElementById('editJobDuration').value = job.duration || '2 weeks';
            document.getElementById('editJobCounty').value = job.location_county || 'Nairobi';
            document.getElementById('editJobTown').value = job.location_town || 'Nairobi';
            document.getElementById('editJobStatus').value = job.status || 'open';
            document.getElementById('editJobDescription').value = job.description || '';

            openModal('editJobModal');
        })
        .catch(err => showToast('Failed to load job: ' + err.message, 'error'));
}
