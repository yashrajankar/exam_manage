// Polyfill for padStart if not available
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; // truncate if number, or convert non-number to 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); // append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

// Test the padStart function
console.log('Testing padStart:');
console.log('5'.padStart(2, '0')); // Should be "05"
console.log('12'.padStart(2, '0')); // Should be "12"

// Exam Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Run test for debugging
    testDateConversion();
    
    initializeTimetable();
});

async function initializeTimetable() {
    setupEventListeners();
    await loadTimetableData();
    updateStats();
}

function setupEventListeners() {
    // Button event listeners
    const addTimetableBtn = document.getElementById('addTimetableBtn');
    if (addTimetableBtn) {
        addTimetableBtn.addEventListener('click', () => openTimetableModal());
    }
    
    const importTimetableBtn = document.getElementById('importTimetableBtn');
    if (importTimetableBtn) {
        importTimetableBtn.addEventListener('click', () => openImportModal());
    }
    
    const exportTimetableBtn = document.getElementById('exportTimetableBtn');
    if (exportTimetableBtn) {
        exportTimetableBtn.addEventListener('click', exportTimetable);
    }
    
    const clearAllTimetableBtn = document.getElementById('clearAllTimetableBtn');
    if (clearAllTimetableBtn) {
        clearAllTimetableBtn.addEventListener('click', clearAllTimetable);
    }
    
    // Form submission
    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.addEventListener('submit', handleTimetableSubmit);
    }
    
    const importForm = document.getElementById('importForm');
    if (importForm) {
        importForm.addEventListener('submit', handleImportSubmit);
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
    
    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadTimetableData);
    }
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', loadTimetableData);
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

let timetableData = [];

async function loadTimetableData() {
    try {
        // Show loading state
        const timetableBody = document.getElementById('timetableTableBody');
        if (timetableBody) {
            timetableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading exams...</td></tr>';
        }
        
        // Fetch timetable data from API
        timetableData = await fetchData('timetables');
        
        // Apply filters
        const statusFilter = document.getElementById('statusFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;
        
        let filteredData = timetableData;
        
        // Apply status filter
        if (statusFilter) {
            filteredData = filteredData.filter(entry => entry.status === statusFilter);
        }
        
        // Apply date filter
        if (dateFilter) {
            const today = new Date();
            if (dateFilter === 'upcoming') {
                filteredData = filteredData.filter(entry => new Date(entry.date) >= today);
            } else if (dateFilter === 'past') {
                filteredData = filteredData.filter(entry => new Date(entry.date) < today);
            }
        }
        
        renderTimetable(filteredData);
        updateStats();
    } catch (error) {
        console.error('Failed to load exam data:', error);
        showError('Failed to load exam data: ' + error.message);
        
        // Show error in timetable
        const timetableBody = document.getElementById('timetableTableBody');
        if (timetableBody) {
            timetableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load exam data</td></tr>';
        }
    }
}

function renderTimetable(data) {
    const timetableBody = document.getElementById('timetableTableBody');
    if (!timetableBody) return;
    
    if (data.length === 0) {
        timetableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No exams found</td></tr>';
        return;
    }
    
    let html = '';
    
    // Sort by date
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    data.forEach(entry => {
        html += `
            <tr>
                <td>${entry.code}</td>
                <td>${entry.subject}</td>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.time}</td>
                <td>
                    <select class="status-select" data-id="${entry._id}">
                        <option value="Scheduled" ${entry.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="Completed" ${entry.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${entry.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" data-id="${entry._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${entry._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    timetableBody.innerHTML = html;
    
    // Add event listeners to status select elements
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (event) => {
            const entryId = event.currentTarget.dataset.id;
            const newStatus = event.currentTarget.value;
            
            try {
                // Update the exam status
                await fetchData(`timetables/${entryId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                
                showSuccess(`Exam status updated to ${newStatus}`);
                await loadTimetableData();
                updateStats();
            } catch (error) {
                console.error('Failed to update exam status:', error);
                showError('Failed to update exam status: ' + error.message);
                
                // Revert the select to the previous value
                const entry = timetableData.find(e => e._id == entryId);
                if (entry) {
                    event.currentTarget.value = entry.status;
                }
            }
        });
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const entryId = event.currentTarget.dataset.id;
            openTimetableModal(entryId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const entryId = event.currentTarget.dataset.id;
            deleteTimetableEntry(entryId);
        });
    });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function openTimetableModal(entryId = null) {
    const modal = document.getElementById('timetableModal');
    const modalTitle = document.getElementById('modalTitle');
    const entryIdInput = document.getElementById('entryId');
    
    if (entryId) {
        // Edit existing entry
        modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Edit Exam';
        entryIdInput.value = entryId;
        populateFormWithEntryData(entryId);
    } else {
        // Add new entry
        modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Add Exam';
        entryIdInput.value = '';
        resetForm();
    }
    
    modal.style.display = 'block';
}

function populateFormWithEntryData(entryId) {
    const entry = timetableData.find(e => e._id == entryId);
    
    if (entry) {
        document.getElementById('codeInput').value = entry.code || '';
        document.getElementById('subjectInput').value = entry.subject || '';
        document.getElementById('dateInput').value = entry.date || '';
        document.getElementById('timeInput').value = entry.time || '';
        document.getElementById('statusSelect').value = entry.status || 'Scheduled';
    }
}

function resetForm() {
    const form = document.getElementById('timetableForm');
    if (form) {
        form.reset();
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

async function handleTimetableSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        
        // Log all form data entries for debugging
        console.log('All form data entries:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
        
        const entryData = {
            code: formData.get('codeInput'),
            subject: formData.get('subjectInput'),
            date: formData.get('dateInput'),
            time: formData.get('timeInput'),
            status: formData.get('statusSelect')
        };
        
        // Log the form data for debugging
        console.log('Form data being sent:', entryData);
        
        // Validate that all required fields are present
        if (!entryData.code || !entryData.subject || !entryData.date || !entryData.time || !entryData.status) {
            const missingFields = [];
            if (!entryData.code) missingFields.push('code');
            if (!entryData.subject) missingFields.push('subject');
            if (!entryData.date) missingFields.push('date');
            if (!entryData.time) missingFields.push('time');
            if (!entryData.status) missingFields.push('status');
            
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Ensure date is in correct format (YYYY-MM-DD)
        if (entryData.date) {
            // The HTML5 date input should already return in YYYY-MM-DD format
            // But let's make sure it's a string and properly formatted
            entryData.date = entryData.date.toString();
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(entryData.date)) {
                console.log('Date is not in correct format, attempting conversion');
                // If it's not in the correct format, try to convert it
                entryData.date = ensureCorrectDateFormat(entryData.date);
                console.log('Converted date:', entryData.date);
            }
        }
        
        const entryId = formData.get('entryId');
        
        if (entryId) {
            // Update existing entry
            await fetchData(`timetables/${entryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entryData)
            });
        } else {
            // Add new entry
            await fetchData('timetables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entryData)
            });
        }
        
        closeModal();
        await loadTimetableData();
        updateStats();
        
        showSuccess(entryId ? 'Exam updated successfully' : 'Exam added successfully');
    } catch (error) {
        console.error('Failed to save exam:', error);
        showError('Failed to save exam: ' + error.message);
    }
}

function openImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function handleImportSubmit(event) {
    event.preventDefault();
    
    try {
        const csvFile = document.getElementById('csvFile').files[0];
        const overwrite = document.getElementById('overwriteData').checked;
        
        if (!csvFile) {
            showError('Please select a CSV file');
            return;
        }
        
        showLoadingOverlay('Parsing CSV file...');
        
        // Parse CSV file
        const timetableEntries = await parseCSVFile(csvFile);
        
        console.log('Sending timetable entries to server:', timetableEntries);
        
        // Verify the dates are in the correct format before sending
        let allDatesValid = true;
        const validatedEntries = timetableEntries.map((entry, index) => {
            console.log(`Entry ${index} date:`, entry.date, 'Type:', typeof entry.date);
            // Check if date is in YYYY-MM-DD format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const isDateValid = dateRegex.test(entry.date);
            console.log(`Entry ${index} date format is correct:`, isDateValid);
            
            // If date is not valid, try one more conversion
            if (!isDateValid) {
                console.log(`Attempting final conversion for entry ${index}`);
                const finalConvertedDate = ensureCorrectDateFormat(entry.date);
                entry.date = finalConvertedDate;
                console.log(`After final conversion, entry ${index} date:`, entry.date);
                
                // Check again
                const isFinalDateValid = dateRegex.test(entry.date);
                console.log(`Entry ${index} date format after final conversion:`, isFinalDateValid);
                
                if (!isFinalDateValid) {
                    allDatesValid = false;
                    console.error(`Entry ${index} has invalid date format:`, entry.date);
                }
            }
            
            return entry;
        });
        
        if (!allDatesValid) {
            hideLoadingOverlay();
            showError('Some dates are not in the correct format. Please ensure all dates are in DD-MM-YYYY format (e.g., 18-08-2025).');
            return;
        }
        
        hideLoadingOverlay();
        
        if (validatedEntries.length === 0) {
            showError('No valid timetable entries found in the CSV file. Please check that your CSV file contains the required columns: Code, Subject, Date, Time, and Status.');
            return;
        }
        
        showLoadingOverlay(`Importing ${validatedEntries.length} exam entries...`);
        
        // Log the data being sent
        const requestData = { data: validatedEntries, overwrite };
        console.log('Request data being sent to server:', JSON.stringify(requestData, null, 2));
        
        // Use the new direct import endpoint
        const response = await fetchData('import/timetables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Server response:', response);
        
        hideLoadingOverlay();
        closeModal();
        await loadTimetableData();
        updateStats();
        
        // Show detailed success message
        showSuccess(`Exams imported successfully: ${response.message}`);
        
        // If there were failures, show details
        if (response.results && response.results.some(r => !r.success)) {
            const failedCount = response.results.filter(r => !r.success).length;
            const errorDetails = response.results
                .filter(r => !r.success)
                .map(r => `${r.timetable?.subject || 'Unknown'}: ${r.error}`)
                .join('\n');
            
            showError(`Import completed with ${failedCount} failures:\n${errorDetails}`);
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to import exams:', error);
        // Provide more detailed error message
        let errorMessage = `Failed to import exams: ${error.message}`;
        if (error.message.includes('date')) {
            errorMessage = 'Import failed due to date format issues. Please ensure dates are in DD-MM-YYYY format (e.g., 18-08-2025).';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Import failed due to invalid file format. Please ensure you are uploading a valid CSV file.';
        }
        showError(errorMessage);
    }
}

async function parseCSVFile(file) {
    try {
        const { data, headers } = await parseCSV(file);
        
        console.log('Raw CSV data:', data);
        console.log('CSV headers:', headers);
        
        // Validate and filter timetable entries
        const timetableEntries = data.map((row, index) => {
            console.log(`Processing row ${index}:`, row);
            
            // Log all possible date field names
            console.log(`Row ${index} date fields:`, {
                date: row.date,
                Date: row.Date,
                'Exam Date': row['Exam Date']
            });
            
            // Convert date format - make sure we're getting the right field
            const rawDate = row.date || row.Date || row['Exam Date'] || '';
            console.log(`Raw date for row ${index}:`, rawDate);
            
            // Use the enhanced date conversion function
            const dateValue = ensureCorrectDateFormat(rawDate);
            console.log(`Converted date for row ${index}:`, dateValue);
            
            const entry = {
                code: row.code || row.Code || row['Exam Code'] || '',
                subject: row.subject || row.Subject || row['Subject Name'] || '',
                date: dateValue,
                time: row.time || row.Time || row['Exam Time'] || '',
                status: row.status || row.Status || 'Scheduled'
            };
            
            console.log(`Final entry for row ${index}:`, entry);
            return entry;
        }).filter((entry, index) => {
            const isValid = entry.code && entry.subject && entry.date && entry.time;
            console.log(`Entry ${index} is valid:`, isValid, 'Entry:', entry);
            return isValid;
        });
        
        console.log('Final parsed timetable entries:', timetableEntries);
        
        // Double-check the dates in the final entries
        timetableEntries.forEach((entry, index) => {
            console.log(`Final entry ${index} date:`, entry.date);
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            console.log(`Final entry ${index} date format is correct:`, dateRegex.test(entry.date));
        });
        
        return timetableEntries;
    } catch (error) {
        console.error('Error in parseCSVFile:', error);
        throw new Error(`Failed to parse timetable CSV: ${error.message}`);
    }
}

function exportTimetable() {
    try {
        // Use the new direct export endpoint
        window.location.href = 'http://localhost:3000/api/export/timetables';
        showSuccess('Exams export started successfully');
    } catch (error) {
        console.error('Failed to export exams:', error);
        showError('Failed to export exams: ' + error.message);
    }
}

function generateTimetableCSV() {
    try {
        // Generate CSV from current timetable data
        if (timetableData.length === 0) {
            return 'Code,Subject,Date,Time,Status\n';
        }
        
        // Prepare data for export
        const exportData = timetableData.map(entry => ({
            Code: entry.code || '',
            Subject: entry.subject || '',
            Date: entry.date || '',
            Time: entry.time || '',
            Status: entry.status || 'Scheduled'
        }));
        
        // Generate CSV with standardized headers
        return generateCSV(exportData, ['Code', 'Subject', 'Date', 'Time', 'Status']);
    } catch (error) {
        throw new Error(`Failed to generate timetable CSV: ${error.message}`);
    }
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function updateStats() {
    try {
        // Fetch actual stats from API
        const timetables = await fetchData('timetables');
        
        document.getElementById('totalEntries').textContent = timetables.length;
        
        // Calculate subjects
        const subjects = new Set(timetables.map(t => t.subject));
        document.getElementById('totalSubjects').textContent = subjects.size;
        
        // Calculate upcoming exams
        const today = new Date();
        const upcomingExams = timetables.filter(t => new Date(t.date) >= today).length;
        document.getElementById('upcomingExams').textContent = upcomingExams;
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

async function deleteTimetableEntry(entryId) {
    if (confirm('Are you sure you want to delete this exam?')) {
        try {
            await fetchData(`timetables/${entryId}`, {
                method: 'DELETE'
            });
            
            showSuccess('Exam deleted successfully');
            await loadTimetableData();
            updateStats();
        } catch (error) {
            console.error('Failed to delete exam:', error);
            showError('Failed to delete exam: ' + error.message);
        }
    }
}

function clearAllTimetable() {
    if (confirm('Are you sure you want to clear all exams? This action cannot be undone.')) {
        fetchData('timetables', {
            method: 'DELETE'
        })
        .then(() => {
            showSuccess('All exams cleared successfully');
            loadTimetableData();
            updateStats();
        })
        .catch(error => {
            console.error('Failed to clear exams:', error);
            showError('Failed to clear exams: ' + error.message);
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

// Function to show loading overlay
function showLoadingOverlay(message = 'Loading...') {
    // Remove any existing overlay
    hideLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'importLoadingOverlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// Function to hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('importLoadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// Test function for date conversion (for debugging)
function testDateConversion() {
    const testDates = ['18-08-2025', '19/08/2025', '2025-08-18', 'invalid-date'];
    console.log('Testing date conversion:');
    testDates.forEach(date => {
        const converted = convertDateFormat(date);
        console.log(`${date} -> ${converted}`);
    });
    
    // Additional test with actual CSV parsing
    console.log('Testing with sample CSV data:');
    const sampleData = [
        { Code: 'TEST001', Subject: 'Test Subject', Date: '18-08-2025', Time: '10:00 AM', Status: 'Scheduled' },
        { Code: 'TEST002', Subject: 'Test Subject 2', Date: '19/08/2025', Time: '2:00 PM', Status: 'Scheduled' },
        { 'Exam Code': 'TEST003', 'Subject Name': 'Test Subject 3', 'Exam Date': '20-08-2025', 'Exam Time': '9:00 AM', Status: 'Scheduled' }
    ];
    
    const convertedData = sampleData.map(row => {
        const dateValue = convertDateFormat(row.date || row.Date || row['Exam Date'] || '');
        return {
            code: row.code || row.Code || row['Exam Code'] || '',
            subject: row.subject || row.Subject || row['Subject Name'] || '',
            date: dateValue,
            time: row.time || row.Time || row['Exam Time'] || '',
            status: row.status || row.Status || 'Scheduled'
        };
    });
    
    console.log('Converted sample data:', convertedData);
    
    // Test the entire flow with actual timetable CSV format
    console.log('Testing complete flow with actual timetable format:');
    const testData = [
        { Code: 'AI302PCC03', Subject: 'Programming Methodology', Date: '18-08-2025', Time: '11.15am-12.45pm', Status: 'Scheduled' },
        { Code: 'AI301PPC02', Subject: 'Data Structures', Date: '19-08-2025', Time: '11.15am-12.45pm', Status: 'Scheduled' }
    ];
    
    const processedData = testData.map(row => {
        const dateValue = convertDateFormat(row.date || row.Date || row['Exam Date'] || '');
        return {
            code: row.code || row.Code || row['Exam Code'] || '',
            subject: row.subject || row.Subject || row['Subject Name'] || '',
            date: dateValue,
            time: row.time || row.Time || row['Exam Time'] || '',
            status: row.status || row.Status || 'Scheduled'
        };
    }).filter(entry => entry.code && entry.subject && entry.date && entry.time);
    
    console.log('Processed test data:', processedData);
    
    // Verify the dates are in the correct format
    processedData.forEach((entry, index) => {
        console.log(`Entry ${index} date:`, entry.date, 'Type:', typeof entry.date);
        // Check if date is in YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        console.log(`Entry ${index} date format is correct:`, dateRegex.test(entry.date));
    });
    
    // Test with the exact data from the error message
    console.log('Testing with exact error data:');
    const errorData = [
        { code: 'AI302PCC03', subject: 'Programming Methodology', date: '18-08-2025', time: '11.15am-12.45pm', status: 'Scheduled' },
        { code: 'AI301PPC02', subject: 'Data Structures', date: '19-08-2025', time: '11.15am-12.45pm', status: 'Scheduled' }
    ];
    
    const processedErrorData = errorData.map(row => {
        const dateValue = convertDateFormat(row.date || row.Date || row['Exam Date'] || '');
        return {
            code: row.code || row.Code || row['Exam Code'] || '',
            subject: row.subject || row.Subject || row['Subject Name'] || '',
            date: dateValue,
            time: row.time || row.Time || row['Exam Time'] || '',
            status: row.status || row.Status || 'Scheduled'
        };
    }).filter(entry => entry.code && entry.subject && entry.date && entry.time);
    
    console.log('Processed error data:', processedErrorData);
    
    // Test the enhanced date conversion function
    console.log('Testing enhanced date conversion function:');
    const enhancedTestData = ['18-08-2025', '19/08/2025', '2025-08-18'];
    enhancedTestData.forEach(date => {
        const result = ensureCorrectDateFormat(date);
        console.log(`${date} -> ${result}`);
    });
}

// Function to convert date format from DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
function convertDateFormat(dateStr) {
    console.log('Converting date:', dateStr);
    
    if (!dateStr) {
        console.log('Date is empty, returning as is');
        return dateStr;
    }
    
    // Trim whitespace
    dateStr = dateStr.trim();
    
    // Check if already in correct format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.log('Date already in correct format, returning as is');
        return dateStr;
    }
    
    // Handle DD-MM-YYYY or DD/MM/YYYY formats
    const separators = ['-', '/'];
    for (const separator of separators) {
        if (dateStr.includes(separator)) {
            const parts = dateStr.split(separator);
            if (parts.length === 3) {
                const [day, month, year] = parts;
                console.log('Parsing date parts:', { day, month, year });
                
                // Validate that we have valid numbers
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    // Ensure day, month, and year are valid
                    const dayNum = parseInt(day, 10);
                    const monthNum = parseInt(month, 10);
                    const yearNum = parseInt(year, 10);
                    
                    console.log('Parsed numbers:', { dayNum, monthNum, yearNum });
                    
                    // Validate ranges
                    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum > 1900 && yearNum < 2100) {
                        // Format as YYYY-MM-DD with zero-padding
                        const result = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                        console.log('Converted date result:', result);
                        return result;
                    } else {
                        console.log('Date values out of valid ranges');
                    }
                } else {
                    console.log('Date parts are not valid numbers');
                }
            } else {
                console.log('Date does not have 3 parts');
            }
        }
    }
    
    // If we can't parse it, return as is
    console.log('Could not parse date, returning as is');
    return dateStr;
}

// Enhanced function to ensure date is always in correct format
function ensureCorrectDateFormat(dateStr) {
    console.log('Ensuring correct date format for:', dateStr);
    
    // First convert the date using our conversion function
    const convertedDate = convertDateFormat(dateStr);
    console.log('After convertDateFormat:', convertedDate);
    
    // Double-check that it's in the correct format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(convertedDate)) {
        console.log('Date is in correct format');
        return convertedDate;
    } else {
        console.log('Date is not in correct format, trying alternative parsing');
        
        // Try to parse it as a date and format it correctly
        try {
            // Handle DD-MM-YYYY format specifically
            if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    console.log('Alternative parsing result:', result);
                    return result;
                }
            }
            
            // Handle DD/MM/YYYY format specifically
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    console.log('Alternative parsing result:', result);
                    return result;
                }
            }
        } catch (error) {
            console.log('Error in alternative parsing:', error);
        }
    }
    
    // If all else fails, return the converted date
    console.log('Returning converted date as fallback');
    return convertedDate;
}
