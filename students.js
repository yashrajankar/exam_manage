// Student Management JavaScript

let studentsData = []; // Make sure this is initialized
let currentSectionFilter = ''; // Track the current section filter

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    setupEventListeners();
    // Initialize stats with default values
    const totalStudentsElement = document.getElementById('totalStudents');
    const totalClassesElement = document.getElementById('totalClasses');
    const newStudentsElement = document.getElementById('newStudents');
    
    if (totalStudentsElement) totalStudentsElement.textContent = '0';
    if (totalClassesElement) totalClassesElement.textContent = '0';
    if (newStudentsElement) newStudentsElement.textContent = '0';
    
    // Initialize students data array
    studentsData = [];
    
    // Show initial loading message
    const tableBody = document.getElementById('studentsTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading students...</td></tr>';
    }
    
    // Load students data on page load to display existing students
    console.log('Initializing students data');
    initializeStudents();
});

async function initializeStudents() {
    console.log('initializeStudents called');
    await loadStudentsData();
    updateStats();
}

function setupEventListeners() {
    // Button event listeners
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => openStudentModal());
    }
    
    const importStudentsBtn = document.getElementById('importStudentsBtn');
    if (importStudentsBtn) {
        importStudentsBtn.addEventListener('click', () => openImportModal());
    }
    
    const exportStudentsBtn = document.getElementById('exportStudentsBtn');
    if (exportStudentsBtn) {
        exportStudentsBtn.addEventListener('click', exportStudents);
    }
    
    const clearAllStudentsBtn = document.getElementById('clearAllStudentsBtn');
    if (clearAllStudentsBtn) {
        clearAllStudentsBtn.addEventListener('click', clearAllStudents);
    }
    
    // Form submission
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentSubmit);
    }
    
    const importForm = document.getElementById('importForm');
    if (importForm) {
        importForm.addEventListener('submit', handleImportSubmit);
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('Search input element found:', searchInput);
        let searchTimeout;
        searchInput.addEventListener('input', function(event) {
            console.log('Search input changed. Value:', event.target.value);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadStudentsData();
            }, 300);
        });
    } else {
        console.warn('Search input element not found');
    }
    
    // Section filter functionality
    const sectionFilter = document.getElementById('sectionFilter');
    if (sectionFilter) {
        sectionFilter.addEventListener('change', function(event) {
            currentSectionFilter = event.target.value;
            loadStudentsData();
        });
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
    
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeModal);
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

async function loadStudentsData() {
    try {
        console.log('Attempting to fetch students data...');
        // Show loading state
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading students...</td></tr>';
        }
        
        // Get search term and section filter
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        console.log('Search term:', searchTerm);
        
        // Apply section filter
        console.log('Section filter:', currentSectionFilter);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (currentSectionFilter) params.append('section', currentSectionFilter);
        
        // Fetch students from API with search parameters
        console.log('Calling fetchData with endpoint: students?' + params.toString());
        const response = await fetchData(`students?${params.toString()}`);
        
        // Handle case where response might be wrapped in an object
        studentsData = Array.isArray(response) ? response : (response.students || response.data || []);
        
        console.log('Received students data. Length:', studentsData.length);
        console.log('First few students:', studentsData.slice(0, 3));
        
        // Check if studentsData is an array
        if (!Array.isArray(studentsData)) {
            console.error('Students data is not an array:', studentsData);
            throw new Error('Invalid data format received from server');
        }
        
        // Display all filtered data (removed pagination)
        renderStudentsTable(studentsData);
        updateStats();
    } catch (error) {
        console.error('Failed to load students data:', error);
        showError('Failed to load students data: ' + error.message);
        
        // Show error in table
        const tableBody = document.getElementById('studentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load students data: ' + error.message + '</td></tr>';
        }
    }
}

function renderStudentsTable(data) {
    console.log('Rendering students table with data:', data);
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) {
        console.error('Table body element not found');
        return;
    }
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">No students found. Click "Add Student" or "Import CSV" to get started.</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    data.forEach(student => {
        // Check if student object has required properties
        if (!student || typeof student !== 'object') {
            console.warn('Invalid student object:', student);
            return;
        }
        
        // Determine section badge class
        let sectionBadgeClass = 'section-badge';
        if (student.section) {
            sectionBadgeClass += ' ' + student.section.toLowerCase();
        }
        
        html += `
            <tr>
                <td>${student.rollNo || ''}</td>
                <td>${student.name || ''}</td>
                <td><span class="${sectionBadgeClass}">${student.section || ''}</span></td>
                <td>${student.email || ''}</td>
                <td>${student.phone || ''}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" data-id="${student._id || student.id || ''}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${student._id || student.id || ''}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Remove any existing event listeners to prevent duplicates
    document.querySelectorAll('.edit-btn').forEach(button => {
        const studentId = button.dataset.id;
        // Remove existing event listeners by cloning
        const newButton = button.cloneNode(true);
        newButton.addEventListener('click', () => {
            openStudentModal(studentId);
        });
        button.parentNode.replaceChild(newButton, button);
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        const studentId = button.dataset.id;
        // Remove existing event listeners by cloning
        const newButton = button.cloneNode(true);
        newButton.addEventListener('click', () => {
            deleteStudent(studentId);
        });
        button.parentNode.replaceChild(newButton, button);
    });
}

async function updateStats() {
    try {
        console.log('Updating stats...');
        // Fetch stats from API
        const statsResponse = await fetchData('students/stats');
        
        // Handle case where response might be wrapped in an object
        const stats = statsResponse.stats || statsResponse.data || statsResponse;
        
        console.log('Received stats:', stats);
        
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalClasses').textContent = stats.totalClasses || 0;
        
        // Update section-specific stats if elements exist
        const b1CountElement = document.getElementById('b1Count');
        const b2CountElement = document.getElementById('b2Count');
        const b3CountElement = document.getElementById('b3Count');
        
        if (b1CountElement) b1CountElement.textContent = stats.sectionCounts?.B1 || 0;
        if (b2CountElement) b2CountElement.textContent = stats.sectionCounts?.B2 || 0;
        if (b3CountElement) b3CountElement.textContent = stats.sectionCounts?.B3 || 0;
        
        console.log('Stats updated successfully');
    } catch (error) {
        console.error('Failed to update stats:', error);
        // Fallback to old method if new endpoint fails
        try {
            const studentsResponse = await fetchData('students');
            
            // Handle case where response might be wrapped in an object
            const students = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.students || studentsResponse.data || []);
            
            document.getElementById('totalStudents').textContent = students.length;
            
            // Calculate classes and count by section
            const sectionCounts = {
                'B1': 0,
                'B2': 0,
                'B3': 0
            };
            
            students.forEach(student => {
                if (student.section && sectionCounts.hasOwnProperty(student.section)) {
                    sectionCounts[student.section]++;
                }
            });
            
            // Update section-specific stats if elements exist
            const b1CountElement = document.getElementById('b1Count');
            const b2CountElement = document.getElementById('b2Count');
            const b3CountElement = document.getElementById('b3Count');
            
            if (b1CountElement) b1CountElement.textContent = sectionCounts.B1;
            if (b2CountElement) b2CountElement.textContent = sectionCounts.B2;
            if (b3CountElement) b3CountElement.textContent = sectionCounts.B3;
            
            // Calculate total unique classes/sections
            const classes = new Set(students.map(s => s.section));
            document.getElementById('totalClasses').textContent = classes.size;
        } catch (fallbackError) {
            console.error('Fallback stats update also failed:', fallbackError);
        }
    }
}

async function handleStudentSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        console.log('Form Data Entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        
        const studentData = {
            rollNo: (formData.get('rollNo') || '').trim(),
            name: `${(formData.get('firstName') || '').trim()} ${(formData.get('lastName') || '').trim()}`.trim(),
            section: (formData.get('classSelect') || '').trim(),
            email: (formData.get('email') || '').trim(),
            phone: (formData.get('phone') || '').trim()
        };
        
        console.log('Student Data:', studentData);
        
        // Validate required fields with specific error messages
        if (!studentData.rollNo) {
            showError('Roll Number is required');
            document.getElementById('rollNo').focus();
            return;
        }
        
        if (!studentData.name || studentData.name.trim() === '') {
            showError('Name is required');
            document.getElementById('firstName').focus();
            return;
        }
        
        if (!studentData.section) {
            showError('Section is required');
            document.getElementById('classSelect').focus();
            return;
        }
        
        // Validate that section is one of the allowed values
        const validSections = ['B1', 'B2', 'B3'];
        if (!validSections.includes(studentData.section)) {
            showError('Section must be one of: B1, B2, B3');
            document.getElementById('classSelect').focus();
            return;
        }
        
        // Validate email format if provided
        if (studentData.email && studentData.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(studentData.email)) {
                showError('Please enter a valid email address');
                document.getElementById('email').focus();
                return;
            }
        }
        
        // Validate phone format if provided
        if (studentData.phone && studentData.phone.trim() !== '') {
            // Simple phone validation - at least 10 digits
            const phoneRegex = /^\d{10,15}$/;
            // Remove any non-digit characters for validation
            const cleanPhone = studentData.phone.replace(/\D/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                showError('Please enter a valid phone number (10-15 digits)');
                document.getElementById('phone').focus();
                return;
            }
        }
        
        const studentId = formData.get('studentId');
        
        if (studentId) {
            // Update existing student
            await fetchData(`students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
        } else {
            // Add new student
            await fetchData('students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
        }
        
        closeModal();
        await loadStudentsData();
        updateStats();
        
        showSuccess(studentId ? 'Student updated successfully' : 'Student added successfully');
    } catch (error) {
        console.error('Failed to save student:', error);
        showError('Failed to save student: ' + (error.message || 'Unknown error occurred'));
    }
}

// Export students to CSV
function exportStudents() {
    try {
        // Generate CSV content
        const csvContent = generateStudentsCSV();
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'students_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Students exported successfully');
    } catch (error) {
        console.error('Failed to export students:', error);
        showError('Failed to export students: ' + error.message);
    }
}

// Generate CSV from students data
function generateStudentsCSV() {
    // Use the enhanced CSV generator from utils.js
    return generateCSV(studentsData, ['rollNo', 'name', 'section', 'email', 'phone']);
}

// Open student modal for adding/editing
function openStudentModal(studentId = null) {
    const modal = document.getElementById('studentModal');
    const modalTitle = document.getElementById('modalTitle');
    const studentForm = document.getElementById('studentForm');
    const studentIdInput = document.getElementById('studentId');
    
    if (studentId) {
        // Edit existing student
        modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Student';
        populateFormWithStudentData(studentId);
        studentIdInput.value = studentId;
    } else {
        // Add new student
        modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add Student';
        studentForm.reset();
        studentIdInput.value = '';
    }
    
    modal.style.display = 'block';
}

// Open import modal
function openImportModal() {
    const modal = document.getElementById('importModal');
    const importForm = document.getElementById('importForm');
    
    // Reset form
    importForm.reset();
    
    modal.style.display = 'block';
}

// Close all modals
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Delete student
async function deleteStudent(studentId) {
    if (!studentId) {
        showError('Invalid student ID');
        return;
    }
    
    try {
        // Find student name for confirmation message
        const student = studentsData.find(s => s._id == studentId);
        const studentName = student ? student.name : 'this student';
        
        // Confirm deletion with more detailed message
        const confirmMessage = `Are you sure you want to delete ${studentName}? This action cannot be undone.`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Delete student from API
        await fetchData(`students/${studentId}`, {
            method: 'DELETE'
        });
        
        // Reload students data
        await loadStudentsData();
        updateStats();
        
        showSuccess('Student deleted successfully');
    } catch (error) {
        console.error('Failed to delete student:', error);
        showError('Failed to delete student: ' + error.message);
    }
}

function clearAllStudents() {
    // Get current student count for confirmation message
    const studentCount = studentsData.length;
    
    const confirmMessage = `Are you sure you want to clear all ${studentCount} students? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        fetchData('students', {
            method: 'DELETE'
        })
        .then(() => {
            showSuccess('All students cleared successfully');
            loadStudentsData();
        })
        .catch(error => {
            console.error('Failed to clear students:', error);
            showError('Failed to clear students: ' + error.message);
        });
    }
}

// Populate form with student data for editing
function populateFormWithStudentData(studentId) {
    const student = studentsData.find(s => s._id == studentId);
    
    if (student) {
        document.getElementById('rollNo').value = student.rollNo || '';
        
        // Parse name into first and last name (assuming space separated)
        const nameParts = student.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastName;
        document.getElementById('classSelect').value = student.section || '';
        document.getElementById('email').value = student.email || '';
        document.getElementById('phone').value = student.phone || '';
    }
}

function showSuccess(message) {
    // Use the existing showToast function if available
    if (typeof showToast === 'function') {
        showToast(message, 'success');
    } else {
        // Fallback to custom implementation
        console.log('Showing success:', message);
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
}

function showError(message) {
    console.log('Showing error:', message);
    // Use the existing showToast function if available
    if (typeof showToast === 'function') {
        showToast(message, 'error', 5000);
    } else {
        // Fallback to custom implementation
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
}

function showWarning(message) {
    console.log('Showing warning:', message);
    // Use the existing showToast function if available
    if (typeof showToast === 'function') {
        showToast(message, 'warning', 5000);
    } else {
        // Fallback to custom implementation
        const toast = document.createElement('div');
        toast.className = 'toast warning';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            color: #856404;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border: 1px solid #ffeaa7;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                const headers = lines[0].split(',').map(h => h.trim().replace(/["']+/g, ''));
                
                const students = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;
                    
                    // Handle quoted values that may contain commas
                    const values = parseCSVLine(lines[i]);
                    const student = {};
                    
                    headers.forEach((header, index) => {
                        // Clean value by trimming whitespace and removing quotes and trailing carriage returns
                        const value = values[index] ? values[index].trim().replace(/["']+/g, '').replace(/\r$/, '') : '';
                        switch (header.toLowerCase()) {
                            case 'rollno':
                            case 'roll no':
                            case 'roll number':
                                student.rollNo = value;
                                break;
                            case 'name':
                            case 'student name':
                            case 'full name':
                                student.name = value;
                                break;
                            case 'section':
                            case 'class':
                                student.section = value;
                                break;
                            case 'email':
                            case 'email address':
                                student.email = value;
                                break;
                            case 'phone':
                            case 'phone number':
                            case 'mobile':
                                student.phone = value;
                                break;
                        }
                    });
                    
                    // Only add if we have required fields (rollNo, name, section)
                    // Validate that section is one of the allowed values
                    const validSections = ['B1', 'B2', 'B3'];
                    if (student.rollNo && student.name && student.section && validSections.includes(student.section)) {
                        students.push(student);
                    }
                }
                
                resolve(students);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function parseCSVLine(line) {
    const values = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            // Check for escaped quotes (double quotes)
            if (i + 1 < line.length && line[i + 1] === '"') {
                currentValue += '"';
                i++; // Skip the next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue);
    return values;
}

async function handleImportSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const file = formData.get('csvFile');
        // Fix checkbox handling - it returns "on" when checked, null when unchecked
        const overwriteData = formData.get('overwriteData') === 'on';
        
        if (!file) {
            showError('No file selected. Please choose a CSV file to import.');
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
        
        // Check file type
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showError('Please select a valid CSV file.');
            return;
        }
        
        const students = await parseCSVFile(file);
        console.log('Parsed students:', students);
        
        if (students.length === 0) {
            showError('No valid students found in the file. Please check the file format and try again.');
            return;
        }
        
        // Validate that we have at least some students with required fields
        const validStudents = students.filter(s => s.rollNo && s.name && s.section);
        if (validStudents.length === 0) {
            showError('No students with required fields (RollNo, Name, Section) found in the file.');
            return;
        }
        
        if (overwriteData) {
            // Clear existing data first if overwrite is selected
            await fetchData('students', {
                method: 'DELETE'
            });
        }
        
        // Add students to the database
        // Use bulk import endpoint for better performance
        const result = await fetchData('students/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(students)
        });
        
        closeModal();
        await loadStudentsData();
        updateStats();
        
        // Show detailed success message
        const successCount = result.results ? result.results.filter(r => r.success).length : students.length;
        const failedCount = result.results ? result.results.filter(r => !r.success).length : 0;
        
        if (failedCount > 0) {
            showWarning(`Students import completed: ${successCount} successful, ${failedCount} failed. Check the console for details.`);
        } else {
            showSuccess(`Students imported successfully (${successCount} students)`);
        }
    } catch (error) {
        console.error('Failed to import students:', error);
        showError('Failed to import students: ' + error.message);
    }
}