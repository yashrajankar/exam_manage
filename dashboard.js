// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Format date for display
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format date only (without time)
function formatDateOnly(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Update summary statistics
async function updateSummaryStats() {
    try {
        // Fetch dashboard analytics data
        const analytics = await fetchData('analytics/dashboard');
        
        // Update total counts
        document.getElementById('totalStudents').textContent = analytics.totals.students || 0;
        document.getElementById('totalTimetables').textContent = analytics.totals.timetables || 0;
        document.getElementById('totalRooms').textContent = analytics.totals.rooms || 0;
        
        // Update student distribution
        updateStudentDistribution(analytics.studentsBySection);
        
        // Update recent notifications
        updateRecentNotifications(analytics.recentNotifications);
        
    } catch (error) {
        console.error('Failed to update summary stats:', error);
        showToast('Failed to load dashboard data: ' + error.message, 'error');
    }
}

// Update student distribution section
function updateStudentDistribution(studentsBySection) {
    const container = document.getElementById('studentDistribution');
    
    if (!studentsBySection || studentsBySection.length === 0) {
        container.innerHTML = '<p class="no-data">No student data available</p>';
        return;
    }
    
    let html = '<div class="student-distribution">';
    
    studentsBySection.forEach(section => {
        html += `
            <div class="distribution-item">
                <h4>${section.count}</h4>
                <p>Section ${section.section}</p>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Update recent notifications section
function updateRecentNotifications(notifications) {
    const container = document.getElementById('recentNotifications');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p class="no-data">No recent notifications</p>';
        return;
    }
    
    let html = '<ul class="notification-list">';
    
    notifications.slice(0, 5).forEach(notification => {
        // Determine type class
        let typeClass = 'type-info';
        if (notification.type === 'warning') typeClass = 'type-warning';
        if (notification.type === 'success') typeClass = 'type-success';
        if (notification.type === 'error') typeClass = 'type-error';
        
        html += `
            <li class="notification-item">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-meta">
                    <span class="notification-type ${typeClass}">${notification.type}</span>
                    <span class="notification-date">${formatDate(notification.createdAt)}</span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

// Update system information
async function updateSystemInfo() {
    try {
        // Fetch database status
        const dbStatus = await fetchData('database/status');
        
        if (dbStatus.status === 'connected') {
            document.getElementById('databaseStatus').innerHTML = `<span class="status-success"><i class="fas fa-check-circle"></i> Connected</span>`;
        } else {
            document.getElementById('databaseStatus').innerHTML = `<span class="status-error"><i class="fas fa-times-circle"></i> Disconnected</span>`;
        }
        
        // Update last updated time
        const now = new Date();
        document.getElementById('lastUpdated').textContent = now.toLocaleString();
    } catch (error) {
        console.error('Failed to update system info:', error);
        document.getElementById('databaseStatus').innerHTML = `<span class="status-error"><i class="fas fa-times-circle"></i> Error</span>`;
    }
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
    updateSummaryStats();
    updateSystemInfo();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000); // Update every minute
    setInterval(updateSystemInfo, 300000); // Update system info every 5 minutes
    setInterval(updateSummaryStats, 60000); // Update summary stats every minute
});