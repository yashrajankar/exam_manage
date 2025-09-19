// Staff Management JavaScript

let staffData = [];
let editingStaffId = null;

// DOM Elements
const staffTableBody = document.getElementById('staffTableBody');
const staffForm = document.getElementById('staffForm');
const staffModal = document.getElementById('staffModal');
const importModal = document.getElementById('importModal');
const staffSearch = document.getElementById('staffSearch');

// Buttons
const addStaffBtn = document.getElementById('addStaffBtn');
const importStaffBtn = document.getElementById('importStaffBtn');
const exportStaffBtn = document.getElementById('exportStaffBtn');
const clearAllStaffBtn = document.getElementById('clearAllStaffBtn');

// Modal Elements
const modalTitle = document.getElementById('modalTitle');
const staffIdInput = document.getElementById('staffId');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const departmentInput = document.getElementById('department');
const availabilityInput = document.getElementById('availability');
const isActiveInput = document.getElementById('isActive');

// Import Form Elements
const importForm = document.getElementById('importForm');
const csvFileInput = document.getElementById('csvFile');
const overwriteDataCheckbox = document.getElementById('overwriteData');
const closeImportModal = document.getElementById('closeImportModal');
const cancelImportBtn = document.getElementById('cancelImportBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing staff management');
    initializeStaffManagement();
});

async function initializeStaffManagement() {
    console.log('Setting up staff management');
    setupEventListeners();
    await loadStaffData();
    updateStats();
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Existing event listeners
    document.getElementById('addStaffBtn')?.addEventListener('click', openAddStaffModal);
    document.getElementById('importStaffBtn')?.addEventListener('click', openImportModal);
    document.getElementById('exportStaffBtn')?.addEventListener('click', exportStaffData);
    document.getElementById('clearAllStaffBtn')?.addEventListener('click', clearAllStaff);
    document.getElementById('staffSearch')?.addEventListener('input', filterStaff);
    
    // Form submissions
    document.getElementById('staffForm')?.addEventListener('submit', handleStaffSubmit);
    document.getElementById('importForm')?.addEventListener('submit', handleImportSubmit);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Cancel buttons
    document.getElementById('cancelImportBtn')?.addEventListener('click', closeModal);
    
    // Download sample CSV
    document.getElementById('downloadSampleBtn')?.addEventListener('click', downloadSampleCSV);
    
    // Add event listeners for assignment section
    document.getElementById('assignInvigilatorsBtn')?.addEventListener('click', generateAssignments);
    document.getElementById('viewAssignmentsBtn')?.addEventListener('click', viewAssignments);
    document.getElementById('exportAssignmentsBtn')?.addEventListener('click', exportAssignments);
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

// Load Staff Data
async function loadStaffData() {
    try {
        showLoadingState();
        staffData = await fetchData('/api/staff');
        renderStaffTable();
        updateStats();
        hideLoadingState();
    } catch (error) {
        console.error('Error loading staff data:', error);
        hideLoadingState();
        showToast('Failed to load staff data', 'error');
    }
}

// Render Staff Table
function renderStaffTable(filteredData = null) {
    const dataToRender = filteredData || staffData;
    
    if (dataToRender.length === 0) {
        staffTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-user-tie" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No staff members found</p>
                    <button class="btn btn-primary" onclick="openAddStaffModal()" style="margin-top: 1rem;">
                        <i class="fas fa-plus-circle"></i> Add Staff Member
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    staffTableBody.innerHTML = dataToRender.map(staff => `
        <tr>
            <td><i class="fas fa-user"></i> ${escapeHtml(staff.name)}</td>
            <td><i class="fas fa-building"></i> ${escapeHtml(staff.department || 'N/A')}</td>
            <td><i class="fas fa-envelope"></i> ${escapeHtml(staff.email || 'N/A')}</td>
            <td><i class="fas fa-phone"></i> ${escapeHtml(staff.phone || 'N/A')}</td>
            <td>
                <span class="status-badge status-${staff.availability === 'Yes' ? 'available' : 'unavailable'}">
                    <i class="fas fa-${staff.availability === 'Yes' ? 'check-circle' : 'times-circle'}"></i>
                    ${staff.availability === 'Yes' ? 'Available' : 'Unavailable'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-${staff.availability === 'Yes' ? 'warning' : 'success'}" onclick="toggleAvailability('${staff._id}', '${staff.availability}')">
                    <i class="fas fa-${staff.availability === 'Yes' ? 'times' : 'check'}"></i> ${staff.availability === 'Yes' ? 'Set Unavailable' : 'Set Available'}
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editStaff('${staff._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteStaff('${staff._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Update Statistics
function updateStats() {
    const totalStaff = staffData.length;
    const availableStaff = staffData.filter(staff => staff.availability === 'Yes').length;
    const unavailableStaff = totalStaff - availableStaff;
    
    document.getElementById('totalStaff').textContent = totalStaff;
    document.getElementById('availableStaff').textContent = availableStaff;
    document.getElementById('unavailableStaff').textContent = unavailableStaff;
}

// Show Loading State
function showLoadingState() {
    staffTableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600); margin-bottom: 1rem;"></i>
                <p>Loading staff data...</p>
            </td>
        </tr>
    `;
}

// Hide Loading State
function hideLoadingState() {
    // This function is intentionally left empty as the loading state is replaced by renderStaffTable
}

// Open Add Staff Modal
function openAddStaffModal() {
    editingStaffId = null;
    modalTitle.innerHTML = '<i class="fas fa-user-tie"></i> Add Staff';
    staffForm.reset();
    staffIdInput.value = '';
    availabilityInput.value = 'Yes';
    emailInput.value = '';
    phoneInput.value = '';
    staffModal.style.display = 'block';
}

// Open Edit Staff Modal
function editStaff(id) {
    const staff = staffData.find(s => s._id == id);
    if (!staff) {
        showToast('Staff member not found', 'error');
        return;
    }
    
    editingStaffId = id;
    modalTitle.innerHTML = '<i class="fas fa-user-tie"></i> Edit Staff';
    staffIdInput.value = staff._id;
    nameInput.value = staff.name;
    emailInput.value = staff.email || '';
    phoneInput.value = staff.phone || '';
    departmentInput.value = staff.department || '';
    availabilityInput.value = staff.availability || 'Yes';
    
    staffModal.style.display = 'block';
}

// Close Modal
function closeModal() {
    staffModal.style.display = 'none';
    importModal.style.display = 'none';
    editingStaffId = null;
}

// Handle Staff Form Submission
async function handleStaffSubmit(event) {
    event.preventDefault();
    
    const staffData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        department: departmentInput.value.trim(),
        availability: availabilityInput.value
    };
    
    if (!staffData.name) {
        showToast('Please enter a name', 'error');
        return;
    }
    
    if (!staffData.email) {
        showToast('Please enter an email', 'error');
        return;
    }
    
    if (!staffData.phone) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    if (!staffData.department) {
        showToast('Please enter a department', 'error');
        return;
    }
    
    try {
        if (editingStaffId) {
            // Update existing staff
            await fetchData(`/api/staff/${editingStaffId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(staffData)
            });
            showToast('Staff member updated successfully', 'success');
        } else {
            // Create new staff
            await fetchData('/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(staffData)
            });
            showToast('Staff member added successfully', 'success');
        }
        
        closeModal();
        loadStaffData(); // Refresh the data
    } catch (error) {
        console.error('Error saving staff:', error);
        showToast(`Failed to save staff member: ${error.message}`, 'error');
    }
}

// Delete Staff
async function deleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff member?')) {
        return;
    }
    
    try {
        await fetchData(`/api/staff/${id}`, {
            method: 'DELETE'
        });
        showToast('Staff member deleted successfully', 'success');
        loadStaffData(); // Refresh the data
    } catch (error) {
        console.error('Error deleting staff:', error);
        showToast(`Failed to delete staff member: ${error.message}`, 'error');
    }
}

// Toggle Staff Availability
async function toggleAvailability(id, currentAvailability) {
    try {
        // Determine new availability status
        const newAvailability = currentAvailability === 'Yes' ? 'No' : 'Yes';
        
        // Get the current staff member data
        const staffMember = staffData.find(s => s._id == id);
        if (!staffMember) {
            showToast('Staff member not found', 'error');
            return;
        }
        
        // Prepare updated data
        const updatedData = {
            ...staffMember,
            availability: newAvailability
        };
        
        // Update the staff member
        await fetchData(`/api/staff/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });
        
        showToast(`Staff member marked as ${newAvailability === 'Yes' ? 'available' : 'unavailable'}`, 'success');
        loadStaffData(); // Refresh the data
    } catch (error) {
        console.error('Error updating staff availability:', error);
        showToast(`Failed to update availability: ${error.message}`, 'error');
    }
}

// Open Import Modal
function openImportModal() {
    importForm.reset();
    importModal.style.display = 'block';
}

// Close Import Modal
function closeImportModalFunc() {
    importModal.style.display = 'none';
}

// Handle Import Form Submission
async function handleImportSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const file = formData.get('csvFile');
        // Fix checkbox handling - it returns "on" when checked, null when unchecked
        const overwriteData = formData.get('overwriteData') === 'on';
        
        if (!file) {
            showToast('No file selected. Please choose a CSV file to import.', 'error');
            // Add visual feedback to highlight the file input
            const fileInput = document.getElementById('csvFile');
            if (fileInput) {
                fileInput.focus();
                fileInput.style.borderColor = 'red';
                fileInput.style.boxShadow = '0 0 5px red';
                
                // Remove highlight after user interacts with the input
                fileInput.addEventListener('change', function() {
                    fileInput.style.borderColor = '';
                    fileInput.style.boxShadow = '';
                }, { once: true });
            }
            return;
        }
        
        const parsedData = await parseCSVFile(file);
        console.log('Parsed staff:', parsedData);
        
        if (parsedData.length === 0) {
            showToast('No valid staff found in the file', 'error');
            return;
        }
        
        if (overwriteData) {
            // Clear existing data first if overwrite is selected
            await fetchData('/api/staff', {
                method: 'DELETE'
            });
        }
        
        // Add staff to the database
        // Use bulk import endpoint for better performance
        await fetchData('/api/staff/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parsedData)  // Send the array directly, not wrapped in an object
        });
        
        closeImportModalFunc();
        await loadStaffData();
        updateStats();
        
        showToast(`Staff imported successfully (${parsedData.length} staff members)`, 'success');
    } catch (error) {
        console.error('Failed to import staff:', error);
        showToast(`Failed to import staff: ${error.message}`, 'error');
    }
}

// Enhanced CSV parser with better error handling and data validation
async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                
                if (lines.length === 0) {
                    reject(new Error('CSV file is empty'));
                    return;
                }
                
                // Parse headers using the improved CSV parser
                const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"(.*)"$/, '$1'));
                
                const staff = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;
                    
                    // Handle quoted values that may contain commas
                    const values = parseCSVLine(lines[i]);
                    const staffMember = {};
                    
                    headers.forEach((header, index) => {
                        // Clean value by trimming whitespace and removing quotes and trailing carriage returns
                        const value = values[index] ? values[index].trim().replace(/^"(.*)"$/, '$1').replace(/\r$/, '') : '';
                        switch (header.toLowerCase()) {
                            case 'name':
                            case 'staff name':
                            case 'full name':
                                staffMember.name = value;
                                break;
                            case 'email':
                            case 'email address':
                                staffMember.email = value;
                                break;
                            case 'phone':
                            case 'phone number':
                            case 'mobile':
                                staffMember.phone = value;
                                break;
                            case 'department':
                            case 'dept':
                                staffMember.department = value;
                                break;
                            case 'availability':
                                staffMember.availability = value || 'Yes';
                                break;
                        }
                    });
                    
                    // Only add if we have required fields (name, email, phone)
                    if (staffMember.name && staffMember.email && staffMember.phone) {
                        staff.push(staffMember);
                    }
                }
                
                resolve(staff);
            } catch (error) {
                reject(new Error(`Failed to parse CSV file: ${error.message}`));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            // Check for escaped quotes (double quotes)
            if (i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i += 2; // Skip both quotes
                continue;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            values.push(current);
            current = '';
            i++;
            continue;
        } else {
            // Regular character
            current += char;
            i++;
        }
    }
    
    // Add the last value
    values.push(current);
    
    return values;
}

// Export Staff Data
function exportStaffData() {
    try {
        // Generate CSV content
        const csvContent = generateStaffCSV();
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'staff_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Staff data exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export staff:', error);
        showToast(`Failed to export staff data: ${error.message}`, 'error');
    }
}

// Generate CSV from staff data
function generateStaffCSV() {
    // Use the enhanced CSV generator from utils.js
    return generateCSV(staffData, ['name', 'email', 'phone', 'department', 'availability']);
}

// Clear All Staff
async function clearAllStaff() {
    if (!confirm('Are you sure you want to delete ALL staff members? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetchData('/api/staff', {
            method: 'DELETE'
        });
        showToast('All staff members cleared successfully', 'success');
        loadStaffData(); // Refresh the data
    } catch (error) {
        console.error('Error clearing staff:', error);
        showToast(`Failed to clear staff members: ${error.message}`, 'error');
    }
}

// Handle Search
function handleSearch() {
    const searchTerm = staffSearch.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderStaffTable();
        return;
    }
    
    const filteredData = staffData.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm) ||
        (staff.department && staff.department.toLowerCase().includes(searchTerm)) ||
        staff.availability.toLowerCase().includes(searchTerm)
    );
    
    renderStaffTable(filteredData);
}

// Filter Staff based on search input
function filterStaff(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    const filteredData = staffData.filter(staff => {
        return (
            (staff.name && staff.name.toLowerCase().includes(searchTerm)) ||
            (staff.department && staff.department.toLowerCase().includes(searchTerm)) ||
            (staff.email && staff.email.toLowerCase().includes(searchTerm)) ||
            (staff.phone && staff.phone.toLowerCase().includes(searchTerm))
        );
    });
    
    renderStaffTable(filteredData);
}

// Download Sample CSV
function downloadSampleCSV(event) {
    event.preventDefault();
    
    const csvContent = `Name,Email,Phone,Department,Availability
John Doe,john.doe@example.com,123-456-7890,Computer Science,Yes
Jane Smith,jane.smith@example.com,098-765-4321,Mathematics,No
Robert Johnson,robert.johnson@example.com,555-123-4567,Physics,Yes
Emily Davis,emily.davis@example.com,555-987-6543,Chemistry,Yes
Michael Wilson,michael.wilson@example.com,555-456-7890,Biology,No`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-staff.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility Functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Toast Notification Function
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Redirect to login page or home page
        window.location.href = '../../index.html';
    }
}

// New functions for invigilator assignment
async function generateAssignments() {
    try {
        showLoading('Generating random assignments...');
        
        // Call the smart assignment API endpoint using fetchData
        const result = await fetchData('staffing/smart-assign', {
            method: 'POST'
        });
        
        showSuccess(result.message);
        displayAssignments(result.assignments, 'generated');
        
        // Save the generated assignments to the database
        try {
            // Structure the data correctly for the database
            const allocationData = {
                date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
                assignments: result.assignments,
                // Add any additional metadata
                totalDays: Object.keys(result.assignments).length,
                totalRooms: Object.keys(result.assignments[Object.keys(result.assignments)[0]] || {}).length
            };
            
            await fetchData('staffAllocations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(allocationData)
            });
            
            console.log('Assignments saved to database');
        } catch (saveError) {
            console.error('Failed to save assignments to database:', saveError);
            // Don't show error to user since the assignments were generated successfully
        }
    } catch (error) {
        console.error('Error generating assignments:', error);
        showError('Failed to generate assignments: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function viewAssignments() {
    try {
        showLoading('Loading assignments...');
        
        // Fetch the latest staff allocations using fetchData
        const allocations = await fetchData('staffAllocations/history');
        
        if (allocations.length > 0) {
            // Get the most recent allocation
            const latestAllocation = allocations[0];
            // Fix: Access assignments from allocationData property
            displayAssignments(latestAllocation.allocationData.assignments, 'viewed');
        } else {
            showError('No assignments found');
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        showError('Failed to load assignments: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayAssignments(assignments, mode = 'viewed') {
    const container = document.getElementById('assignmentsContainer');
    const resultsSection = document.getElementById('assignmentResults');
    
    if (!container || !resultsSection) return;
    
    // Set mode-specific class
    resultsSection.className = `assignment-results ${mode}-assignments`;
    
    if (!assignments) {
        container.innerHTML = '<p>No assignments available</p>';
        resultsSection.style.display = 'block';
        return;
    }
    
    let html = '';
    
    // Add header only for generated assignments
    if (mode === 'generated') {
        html += '<h3>Generated Assignments</h3>';
    } else {
        html += '<h3>Viewing Assignments</h3>';
    }
    
    // Loop through each day in the assignments
    Object.keys(assignments).forEach(day => {
        html += `
            <div class="day-assignment">
                <h4>${day}</h4>
                <div class="room-assignments">
        `;
        
        // Get all rooms for this day and sort them for consistent display
        const rooms = Object.keys(assignments[day]).sort();
        console.log(`Displaying ${rooms.length} rooms for ${day}`);
        
        // Loop through each room for this day
        rooms.forEach(room => {
            const staffName = assignments[day][room];
            html += `
                <div class="room-assignment">
                    <h5>${room}</h5>
                    <p>${staffName}</p>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    resultsSection.style.display = 'block';
}

async function exportAssignments() {
    try {
        showLoading('Exporting assignments...');
        
        // Fetch the latest staff allocations using fetchData
        const allocations = await fetchData('staffAllocations/history');
        
        if (allocations.length > 0) {
            // Get the most recent allocation
            const latestAllocation = allocations[0];
            
            // Create CSV content
            let csvContent = 'Day,Room,Staff Member\n';
            
            // Fix: Access assignments from allocationData property
            Object.keys(latestAllocation.allocationData.assignments).forEach(day => {
                Object.keys(latestAllocation.allocationData.assignments[day]).forEach(room => {
                    const staffName = latestAllocation.allocationData.assignments[day][room];
                    csvContent += `"${day}","${room}","${staffName}"\n`;
                });
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'invigilator_assignments.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccess('Assignments exported successfully');
        } else {
            showError('No assignments found to export');
        }
    } catch (error) {
        console.error('Error exporting assignments:', error);
        showError('Failed to export assignments: ' + error.message);
    } finally {
        hideLoading();
    }
}

function showLoading(message) {
    // Create or update loading indicator
    let loadingElement = document.getElementById('loadingIndicator');
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'loadingIndicator';
        loadingElement.className = 'toast info';
        loadingElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e3f2fd;
            color: #1976d2;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border: 1px solid #bbdefb;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(loadingElement);
    }
    loadingElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    loadingElement.style.display = 'block';
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
        loadingElement.style.display = 'none';
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
