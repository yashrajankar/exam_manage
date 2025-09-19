// Notifications Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeNotifications();
});

async function initializeNotifications() {
    setupEventListeners();
    await loadNotifications();
}

function setupEventListeners() {
    // Button event listeners
    const sendNotificationBtn = document.getElementById('sendNotificationBtn');
    if (sendNotificationBtn) {
        sendNotificationBtn.addEventListener('click', () => {
            openNotificationModal();
        });
    }
    
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsRead);
    }
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotifications);
    }
    
    // Form submission
    const notificationForm = document.getElementById('notificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', handleNotificationSubmit);
    }
    
    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadNotifications);
    }
    
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', loadNotifications);
    }
    
    // Recipient type change
    const recipientType = document.getElementById('recipientType');
    if (recipientType) {
        recipientType.addEventListener('change', toggleCustomRecipients);
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Cancel buttons
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal();
            }
        });
    });
}

let notificationsData = [];

async function loadNotifications() {
    try {
        // Show loading state
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = '<div class="notification-item"><div class="notification-content"><p style="text-align: center;">Loading notifications...</p></div></div>';
        }
        
        // Fetch notifications from API
        notificationsData = await fetchData('notifications');
        
        // Apply filters
        const statusFilter = document.getElementById('statusFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        
        const filteredData = notificationsData.filter(notification => {
            if (statusFilter && notification.status !== statusFilter) return false;
            if (typeFilter && notification.type !== typeFilter) return false;
            return true;
        });
        
        renderNotifications(filteredData);
    } catch (error) {
        console.error('Failed to load notifications:', error);
        showError('Failed to load notifications: ' + error.message);
        
        // Show error in notification list
        const notificationList = document.getElementById('notificationList');
        if (notificationList) {
            notificationList.innerHTML = '<div class="notification-item"><div class="notification-content"><p style="text-align: center; color: red;">Failed to load notifications</p></div></div>';
        }
    }
}

function renderNotifications(data) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    if (data.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-item">
                <div class="notification-content">
                    <p style="text-align: center; color: #6c757d;">No notifications found</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    data.forEach(notification => {
        const iconClass = getNotificationIconClass(notification.type);
        const timeAgo = formatTimeAgo(notification.createdAt);
        
        // Add email indicator if email notification was sent
        const emailIndicator = notification.sendEmail ? '<span class="email-indicator" title="Email notification sent"><i class="fas fa-envelope"></i></span>' : '';
        
        html += `
            <div class="notification-item ${notification.status}" data-id="${notification._id}">
                <div class="notification-icon ${notification.type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h3 class="notification-title">${notification.title} ${emailIndicator}</h3>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    <div class="notification-footer">
                        <div class="notification-meta">
                            <span class="notification-type">${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}</span>
                            <span class="notification-priority">${notification.priority}</span>
                            <span class="notification-recipient">${notification.recipientType}</span>
                        </div>
                        <div class="notification-actions">
                            <button class="btn-icon mark-read-btn" data-id="${notification._id}">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-icon delete-btn" data-id="${notification._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    notificationList.innerHTML = html;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.mark-read-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const notificationId = event.currentTarget.dataset.id;
            markNotificationRead(notificationId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const notificationId = event.currentTarget.dataset.id;
            deleteNotification(notificationId);
        });
    });
}

function getNotificationIconClass(type) {
    switch (type) {
        case 'info':
            return 'fas fa-info-circle';
        case 'warning':
            return 'fas fa-exclamation-triangle';
        case 'alert':
            return 'fas fa-exclamation-circle';
        default:
            return 'fas fa-bell';
    }
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'block';
        resetForm();
    }
}

function resetForm() {
    const form = document.getElementById('notificationForm');
    if (form) {
        form.reset();
        // Also reset the textarea specifically
        const messageField = document.getElementById('notificationMessage');
        if (messageField) {
            messageField.value = '';
        }
        toggleCustomRecipients();
    }
}

function toggleCustomRecipients() {
    const recipientType = document.getElementById('recipientType')?.value;
    const customRecipientsGroup = document.getElementById('customRecipientsGroup');
    
    if (customRecipientsGroup) {
        customRecipientsGroup.style.display = recipientType === 'custom' ? 'block' : 'none';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

async function handleNotificationSubmit(event) {
    event.preventDefault();
    
    try {
        // Directly get form values instead of using FormData
        const title = document.getElementById('notificationTitle').value;
        const message = document.getElementById('notificationMessage').value;
        const type = document.getElementById('notificationType').value;
        const priority = document.getElementById('notificationPriority').value;
        const recipientType = document.getElementById('recipientType').value;
        const customRecipients = document.getElementById('customRecipients').value;
        const sendEmail = document.getElementById('sendEmail').checked;
        
        const notificationData = {
            title: title,
            message: message,
            type: type,
            priority: priority,
            recipientType: recipientType,
            customRecipients: customRecipients,
            sendEmail: sendEmail,
            status: 'unread',
            isActive: true
        };
        
        // Validate required fields
        if (!notificationData.message || notificationData.message.trim() === '') {
            throw new Error('Missing required field: message');
        }
        
        if (!notificationData.title || notificationData.title.trim() === '') {
            throw new Error('Missing required field: title');
        }
        
        // Add new notification
        const result = await fetchData('notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });
        
        closeModal();
        await loadNotifications();
        
        showSuccess('Notification sent successfully');
    } catch (error) {
        console.error('Failed to send notification:', error);
        showError('Failed to send notification: ' + error.message);
    }
}

function markNotificationRead(notificationId) {
    // In a real implementation, this would update the notification status via API
    showSuccess('Notification marked as read');
    loadNotifications();
}

function markAllNotificationsRead() {
    if (confirm('Are you sure you want to mark all notifications as read?')) {
        // In a real implementation, this would update all notifications via API
        setTimeout(() => {
            showSuccess('All notifications marked as read');
            loadNotifications();
        }, 500);
    }
}

async function deleteNotification(notificationId) {
    if (confirm('Are you sure you want to delete this notification?')) {
        try {
            await fetchData(`notifications/${notificationId}`, {
                method: 'DELETE'
            });
            
            showSuccess('Notification deleted successfully');
            await loadNotifications();
        } catch (error) {
            console.error('Failed to delete notification:', error);
            showError('Failed to delete notification: ' + error.message);
        }
    }
}

function clearAllNotifications() {
    if (confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
        fetchData('notifications', {
            method: 'DELETE'
        })
        .then(() => {
            showSuccess('All notifications cleared successfully');
            loadNotifications();
        })
        .catch(error => {
            console.error('Failed to clear notifications:', error);
            showError('Failed to clear notifications: ' + error.message);
        });
    }
}

function showSuccess(message) {
    // Show success notification
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        border: 1px solid #c3e6cb;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showError(message) {
    // Show error notification
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        border: 1px solid #f5c6cb;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Update current date/time
function updateCurrentDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    };
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000); // Update every minute
});
