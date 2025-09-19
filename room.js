// Room Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeRooms();
    initializeRollAssignments(); // Initialize the roll assignments section
});

function setupEventListeners() {
    
    // Button event listeners
    const addRoomBtn = document.getElementById('addRoomBtn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', openAddRoomModal);
    }
    
    const importRoomsBtn = document.getElementById('importRoomsBtn');
    if (importRoomsBtn) {
        importRoomsBtn.addEventListener('click', openImportModal);
    }
    
    const exportStudentsBtn = document.getElementById('exportRoomsBtn');
    if (exportStudentsBtn) {
        exportStudentsBtn.addEventListener('click', exportRooms);
    }
    
    const clearAllRoomBtn = document.getElementById('clearAllRoomBtn');
    if (clearAllRoomBtn) {
        clearAllRoomBtn.addEventListener('click', clearAllRoomsAndNotify);
    }
    
    // Form submission
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', handleRoomSubmit);
    }
    
    const importForm = document.getElementById('importForm');
    if (importForm) {
        importForm.addEventListener('submit', handleImportSubmit);
    }
    
    // Search functionality
    const roomSearch = document.getElementById('roomSearch');
    if (roomSearch) {
        roomSearch.addEventListener('input', debounce(loadRooms, 300));
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Specific close button for import modal
    const closeImportModalBtn = document.getElementById('closeImportModal');
    if (closeImportModalBtn) {
        closeImportModalBtn.addEventListener('click', closeImportModal);
    }
    
    // Cancel buttons
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeImportModal);
    }
    
    // Import submit button
    const importSubmitBtn = document.getElementById('importSubmitBtn');
    if (importSubmitBtn) {
        importSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const importForm = document.getElementById('importForm');
            if (importForm) {
                const event = new Event('submit', { cancelable: true });
                importForm.dispatchEvent(event);
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                closeModal();
            }
        });
    });
    
    // Add event listeners for the new buttons
    setupRollAssignmentEventListeners();
}

// Add event listeners for the new buttons
function setupRollAssignmentEventListeners() {
    const refreshBtn = document.getElementById('refreshAssignmentsBtn');
    if (refreshBtn) {
        // Remove any existing event listeners to prevent duplicates
        refreshBtn.removeEventListener('click', loadRollAssignments);
        refreshBtn.addEventListener('click', loadRollAssignments);
    }
    
    const exportBtn = document.getElementById('exportAssignmentsBtn');
    if (exportBtn) {
        // Remove any existing event listeners to prevent duplicates
        exportBtn.removeEventListener('click', exportRollAssignments);
        exportBtn.addEventListener('click', exportRollAssignments);
    }
    
    // Add event listener for the shuffle classrooms button
    const shuffleBtn = document.getElementById('shuffleClassroomsBtn');
    if (shuffleBtn) {
        // Remove any existing event listeners to prevent duplicates
        shuffleBtn.removeEventListener('click', shuffleClassroomsAndNotify);
        shuffleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            shuffleClassroomsAndNotify();
        });
    }
    
    // Add event listener for the new Python generation button
    const generatePythonBtn = document.getElementById('generatePythonAssignmentsBtn');
    if (generatePythonBtn) {
        // Remove any existing event listeners to prevent duplicates
        generatePythonBtn.removeEventListener('click', generateRollAssignmentsWithPython);
        generatePythonBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            generateRollAssignmentsWithPython();
        });
    }
    
    // Add event listener for the new seating arrangement generation button
    const generateSeatingBtn = document.getElementById('generateSeatingArrangementsBtn');
    if (generateSeatingBtn) {
        // Remove any existing event listeners to prevent duplicates
        generateSeatingBtn.removeEventListener('click', generateSeatingArrangementsAndNotify);
        generateSeatingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            generateSeatingArrangementsAndNotify();
        });
    }
}

async function initializeRooms() {
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000); // Update every minute
    
    // Load rooms data
    await loadRooms();
}

async function initializeRollAssignments() {
    // Load roll assignments data
    await loadRollAssignments();
}

async function loadRooms() {
    try {
        showLoadingOverlay('Loading rooms...');
        const searchTerm = document.getElementById('roomSearch')?.value.toLowerCase() || '';
        const allRooms = await fetchData('rooms');
        
        // Filter rooms based on search term
        const roomsData = allRooms.filter(room => 
            (room.number && room.number.toLowerCase().includes(searchTerm)) ||
            (room.building && room.building.toLowerCase().includes(searchTerm))
        );
        
        renderRoomsTable(roomsData);
        updateStats(roomsData);
        
        // Also refresh roll assignments when rooms are loaded
        loadRollAssignments();
        hideLoadingOverlay();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to load rooms:', error);
        showToast('Failed to load rooms: ' + error.message, 'error');
    }
}

async function loadRollAssignments() {
    console.log('loadRollAssignments function called');
    
    try {
        showLoadingOverlay('Loading roll assignments...');

        // Try to get room assignments from the new API endpoint first
        try {
            console.log('Trying to fetch assignedClassroomsWithRooms endpoint');
            const assignments = await fetchData('assignedClassroomsWithRooms');
            console.log('Received assignments from assignedClassroomsWithRooms:', assignments);
            
            // If we got data from this endpoint, render it
            if (Array.isArray(assignments) && assignments.length > 0) {
                // Sort assignments by building and room number
                const sortedAssignments = assignments.sort((a, b) => {
                    // Sort by building first, then by room number
                    if (a.building !== b.building) {
                        return a.building.localeCompare(b.building);
                    }
                    return a.number.localeCompare(b.number);
                });
                
                // Sort roll numbers in each assignment
                sortedAssignments.forEach(assignment => {
                    if (assignment.students && assignment.students.length > 0) {
                        assignment.students.sort((a, b) => {
                            // Improved sorting for roll numbers like "AIDSU24001"
                            // Extract the numeric part and sort by it
                            const numA = parseInt((a.rollNo || '').match(/\d+/g)?.join('') || '0');
                            const numB = parseInt((b.rollNo || '').match(/\d+/g)?.join('') || '0');
                            return numA - numB;
                        });
                        
                        // Convert students array to rollNumbers array for compatibility
                        assignment.rollNumbers = assignment.students.map(student => student.rollNo);
                    } else {
                        assignment.rollNumbers = [];
                    }
                });
                
                renderRollAssignmentsTable(sortedAssignments);
                hideLoadingOverlay();
                return;
            }
        } catch (apiError) {
            console.log('assignedClassroomsWithRooms endpoint not available, falling back to seating plans');
        }

        // Fetch rooms, seating plans, and students data
        console.log('Fetching data for roll assignments');
        const [rooms, seatingPlans, students] = await Promise.all([
            fetchData('rooms'),
            fetchData('seatingPlans'),
            fetchData('students')
        ]).catch(error => {
            console.error('Error fetching data:', error);
            throw new Error('Failed to fetch required data: ' + error.message);
        });

        console.log('Data fetched:', { rooms, seatingPlans, students });

        // Validate data
        if (!Array.isArray(rooms) || !Array.isArray(seatingPlans) || !Array.isArray(students)) {
            throw new Error('Invalid data format received from server');
        }

        // Create a map of student ID to student data for quick lookup
        const studentMap = {};
        students.forEach(student => {
            if (student && student._id) {
                studentMap[student._id] = student;
            }
        });

        // Create a map of room ID to room details
        const roomMap = {};
        rooms.forEach(room => {
            if (room && room._id) {
                roomMap[room._id] = {
                    ...room,
                    rollNumbers: []
                };
            }
        });

        // Process seating plans to extract roll numbers for each room
        console.log('Processing seating plans, count:', seatingPlans.length);
        seatingPlans.forEach((plan, index) => {
            console.log(`Processing plan ${index}:`, plan);
            
            // Extract room information from planData
            // Handle different possible structures for the seating plan
            let roomId = null;
            let seats = [];
            
            // Check different possible structures for the seating plan
            if (plan.planData && plan.planData.roomId) {
                // Original structure
                roomId = plan.planData.roomId;
                seats = plan.planData.seats || [];
            } else if (plan.roomId) {
                // Alternative structure
                roomId = plan.roomId;
                seats = plan.seats || [];
            } else {
                // Try to find roomId in the plan object directly
                roomId = plan.roomId || plan.room_id || null;
                seats = plan.seats || plan.planData?.seats || [];
            }
            
            // Additional check for nested planData structure that might occur after shuffling
            if (!roomId && plan.planData && plan.planData.planData && plan.planData.planData.roomId) {
                roomId = plan.planData.planData.roomId;
                seats = plan.planData.planData.seats || [];
            }
            
            // Additional check for direct planData structure (after our fix)
            if (!roomId && plan.planData && typeof plan.planData === 'object' && plan.planData.roomId) {
                roomId = plan.planData.roomId;
                seats = plan.planData.seats || [];
            }
            
            console.log(`Plan ${index} roomId:`, roomId, 'seats:', seats);
            
            if (roomId && roomMap[roomId]) {
                // Extract roll numbers from seats
                if (Array.isArray(seats)) {
                    seats.forEach((seat, seatIndex) => {
                        console.log(`Processing seat ${seatIndex} in plan ${index}:`, seat);
                        
                        // Check if the seat has a student assigned and is not a teacher desk
                        if (seat && !seat.isTeacherDesk) {
                            // First try to get roll number directly from seat data
                            if (seat.rollNo) {
                                // Add roll number to the room's list if not already present
                                if (!roomMap[roomId].rollNumbers.includes(seat.rollNo)) {
                                    roomMap[roomId].rollNumbers.push(seat.rollNo);
                                    console.log(`Added rollNo ${seat.rollNo} to room ${roomId}`);
                                }
                            } else if (seat.studentId) {
                                // Fallback to looking up the student to get their roll number
                                const student = studentMap[seat.studentId];
                                if (student && student.rollNo) {
                                    // Add roll number to the room's list if not already present
                                    if (!roomMap[roomId].rollNumbers.includes(student.rollNo)) {
                                        roomMap[roomId].rollNumbers.push(student.rollNo);
                                        console.log(`Added student rollNo ${student.rollNo} to room ${roomId}`);
                                    }
                                } else {
                                    console.log(`No student found for studentId ${seat.studentId} or no rollNo for student`, student);
                                }
                            }
                        } else if (seat && seat.rollNo && !seat.isTeacherDesk) {
                            // Handle case where seat has rollNo but no studentId
                            if (!roomMap[roomId].rollNumbers.includes(seat.rollNo)) {
                                roomMap[roomId].rollNumbers.push(seat.rollNo);
                                console.log(`Added rollNo ${seat.rollNo} to room ${roomId} (no studentId)`);
                            }
                        }
                    });
                }
            } else {
                console.log(`No matching room found for roomId ${roomId} in plan ${index}`);
            }
        });

        // Convert map to array and sort by room number
        const assignments = Object.values(roomMap)
            .filter(room => room) // Filter out any null/undefined rooms
            .sort((a, b) => {
                // Sort by building first, then by room number
                if (a.building !== b.building) {
                    return a.building.localeCompare(b.building);
                }
                return a.number.localeCompare(b.number);
            });

        // Sort roll numbers in each assignment to ensure they are in ascending order
        assignments.forEach(assignment => {
            if (assignment.rollNumbers && assignment.rollNumbers.length > 0) {
                assignment.rollNumbers.sort((a, b) => {
                    // Improved sorting for roll numbers like "AIDSU24001"
                    // Extract the numeric part and sort by it
                    const numA = parseInt((a || '').match(/\d+/g)?.join('') || '0');
                    const numB = parseInt((b || '').match(/\d+/g)?.join('') || '0');
                    return numA - numB;
                });
            }
        });

        console.log('Processed assignments:', assignments);

        // Render the assignments table
        renderRollAssignmentsTable(assignments);
        hideLoadingOverlay();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to load roll assignments:', error);
        showToast('Failed to load roll assignments: ' + (error.message || 'Unknown error occurred'), 'error');
        
        // Show error in table
        const tableBody = document.getElementById('rollAssignmentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="error-state">
                            <div class="error-content">
                                <div class="error-icon">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                                <h3>Failed to Load Assignments</h3>
                                <p>${error.message || 'Unknown error occurred'}</p>
                                <button id="retryLoadAssignmentsBtn" class="btn btn-primary">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            
            // Add event listener to the retry button
            const retryBtn = document.getElementById('retryLoadAssignmentsBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', loadRollAssignments);
            }
        }
    }
}

function renderRollAssignmentsTable(assignments) {
    console.log('renderRollAssignmentsTable called with:', assignments);
    
    const tableBody = document.getElementById('rollAssignmentsTableBody');
    
    if (!tableBody) {
        console.warn('rollAssignmentsTableBody not found');
        return;
    }

    if (assignments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-content">
                            <div class="empty-icon">
                                <i class="fas fa-door-open"></i>
                            </div>
                            <h3>No Room Assignments Found</h3>
                            <p>Generate seating arrangements to see roll number assignments. You can either generate sample assignments or create your own seating plan.</p>
                            <button id="generateSampleAssignmentsBtn" class="btn btn-secondary">
                                <i class="fas fa-cogs"></i> Generate Sample Assignments
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        // Add event listener to the generate button
        const generateBtn = document.getElementById('generateSampleAssignmentsBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', generateSampleAssignments);
        }
        return;
    }

    let html = '';

    assignments.forEach(assignment => {
        console.log('Processing assignment:', assignment);
        
        // Format roll numbers as tags (they're already sorted)
        const rollNumbersHtml = assignment.rollNumbers && assignment.rollNumbers.length > 0 
            ? assignment.rollNumbers
                .map(rollNo => `<span class="roll-number-tag" title="${rollNo}">${rollNo}</span>`)
                .join('')
            : '<div class="no-assignments">No roll numbers assigned to this room</div>';

        html += `
            <tr>
                <td><strong>${assignment.number || 'N/A'}</strong></td>
                <td>${assignment.building || 'N/A'}</td>
                <td><span class="capacity-badge">${assignment.capacity || 0}</span></td>
                <td>
                    <div class="roll-numbers-cell">
                        ${rollNumbersHtml}
                    </div>
                </td>
                <td><span class="count-badge">${assignment.rollNumbers ? assignment.rollNumbers.length : 0}</span></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
    
    // Add event listener to any generate buttons that might have been added
    const generateBtn = document.getElementById('generateSampleAssignmentsBtn');
    if (generateBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newBtn = generateBtn.cloneNode(true);
        newBtn.addEventListener('click', generateSampleAssignments);
        generateBtn.parentNode.replaceChild(newBtn, generateBtn);
    }
}

// New function to generate sample assignments
async function generateSampleAssignments() {
    try {
        showLoadingOverlay('Generating sample assignments...');
        
        // Fetch rooms and students data
        const [rooms, students] = await Promise.all([
            fetchData('rooms'),
            fetchData('students')
        ]).catch(error => {
            throw new Error('Failed to fetch required data: ' + error.message);
        });
        
        if (!Array.isArray(rooms) || rooms.length === 0) {
            hideLoadingOverlay();
            showToast('No rooms available. Please add rooms first.', 'warning');
            await loadRollAssignments(); // Refresh the display
            return;
        }
        
        if (!Array.isArray(students) || students.length === 0) {
            hideLoadingOverlay();
            showToast('No students available. Please add students first.', 'warning');
            await loadRollAssignments(); // Refresh the display
            return;
        }
        
        // Clear existing seating plans
        await fetchData('seatingPlans', {
            method: 'DELETE'
        });
        
        // Sort students by roll number to maintain sequence
        const sortedStudents = [...students].sort((a, b) => {
            // Improved sorting for roll numbers like "AIDSU24001"
            // Extract the numeric part and sort by it
            const numA = parseInt((a.rollNo || '').match(/\d+/g)?.join('') || '0');
            const numB = parseInt((b.rollNo || '').match(/\d+/g)?.join('') || '0');
            return numA - numB;
        });
        
        // Generate sample seating plans for each room
        const seatingPlans = [];
        let studentIndex = 0;
        
        for (const room of rooms) {
            // Validate room data
            if (!room || !room._id || !room.number || !room.building) {
                console.warn('Invalid room data, skipping:', room);
                continue;
            }
            
            // Create a seating plan for this room with the correct structure
            const planData = {
                roomId: room._id,
                building: room.building || '',
                roomNumber: room.number || '',
                capacity: room.capacity || 0,
                rows: 5,
                columns: Math.ceil((room.capacity || 0) / 5),
                seats: []
            };
            
            // Assign students to seats
            const roomCapacity = Math.min(room.capacity || 0, sortedStudents.length - studentIndex);
            for (let i = 0; i < roomCapacity; i++) {
                if (studentIndex < sortedStudents.length) {
                    const student = sortedStudents[studentIndex];
                    // Validate student data
                    if (!student || !student._id || !student.rollNo) {
                        console.warn('Invalid student data, skipping:', student);
                        continue;
                    }
                    
                    planData.seats.push({
                        id: `seat-${room._id}-${i}`,
                        row: Math.floor(i / planData.columns),
                        col: i % planData.columns,
                        studentId: student._id,
                        rollNo: student.rollNo,
                        isTeacherDesk: false
                    });
                    studentIndex++;
                }
            }
            
            // Add the seating plan with proper structure
            seatingPlans.push({
                planData: planData,
                examDate: new Date().toISOString().split('T')[0],
                examCode: `SAMPLE-${room._id}`
            });
        }
        
        // Save the seating plans to the database
        let successCount = 0;
        let errorCount = 0;
        for (const plan of seatingPlans) {
            try {
                await fetchData('seatingPlans', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(plan)
                });
                successCount++;
            } catch (error) {
                errorCount++;
                console.warn('Failed to save seating plan for room:', plan.planData?.roomNumber || 'Unknown', error);
            }
        }
        
        // Refresh the assignments display
        await loadRollAssignments();
        hideLoadingOverlay();
        
        if (errorCount > 0) {
            showToast(`Sample assignments generated for ${successCount} rooms (${errorCount} failed)!`, 'warning');
        } else {
            showToast(`Sample assignments generated successfully for ${successCount} rooms!`, 'success');
        }
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to generate sample assignments:', error);
        showToast('Failed to generate sample assignments: ' + (error.message || 'Unknown error occurred'), 'error');
        await loadRollAssignments(); // Refresh the display even on error
    }
}

// Render rooms table
function renderRoomsTable(roomsData) {
    const tableBody = document.getElementById('roomsTableBody');
    
    if (!tableBody) return;
    
    if (roomsData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-door-open" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                    <h3>No Rooms Found</h3>
                    <p>Add rooms or import from CSV to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    roomsData.forEach(room => {
        html += `
            <tr>
                <td>${room.number}</td>
                <td>${room.building}</td>
                <td>${room.capacity}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" data-id="${room._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${room._id}">
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
        const roomId = button.dataset.id;
        // Clone the button to remove all event listeners
        const newButton = button.cloneNode(true);
        newButton.addEventListener('click', () => {
            editRoom(roomId);
        });
        button.parentNode.replaceChild(newButton, button);
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        const roomId = button.dataset.id;
        // Clone the button to remove all event listeners
        const newButton = button.cloneNode(true);
        newButton.addEventListener('click', () => {
            deleteRoom(roomId);
        });
        button.parentNode.replaceChild(newButton, button);
    });
}

// Update statistics
function updateStats(roomsData) {
    const totalRooms = roomsData.length;
    const totalCapacity = roomsData.reduce((sum, room) => sum + room.capacity, 0);
    const avgCapacity = totalRooms > 0 ? Math.round(totalCapacity / totalRooms) : 0;
    
    document.getElementById('totalRooms').textContent = totalRooms;
    document.getElementById('totalCapacity').textContent = totalCapacity;
    document.getElementById('avgCapacity').textContent = avgCapacity;
}

// Open add room modal
function openAddRoomModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-door-open"></i> Add Room';
    document.getElementById('roomId').value = '';
    document.getElementById('roomNumber').value = '';
    document.getElementById('building').value = '';
    document.getElementById('capacity').value = '';
    document.getElementById('roomModal').style.display = 'flex';
}

// Edit room
function editRoom(roomId) {
    // Find the row with the matching roomId
    const row = document.querySelector(`button[data-id="${roomId}"]`).closest('tr');
    if (!row) return;
    
    const cells = row.querySelectorAll('td');
    const roomNumber = cells[0].textContent;
    const building = cells[1].textContent;
    const capacity = cells[2].textContent;
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Room';
    document.getElementById('roomId').value = roomId;
    document.getElementById('roomNumber').value = roomNumber;
    document.getElementById('building').value = building;
    document.getElementById('capacity').value = capacity;
    document.getElementById('roomModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Handle room form submission
async function handleRoomSubmit(e) {
    e.preventDefault();
    
    e.preventDefault();
    
    const roomId = document.getElementById('roomId').value;
    const isUpdate = !!roomId;
    
    const roomData = {
        number: (document.getElementById('roomNumber').value || '').trim(),
        building: (document.getElementById('building').value || '').trim(),
        capacity: parseInt(document.getElementById('capacity').value) || 0
    };
    
    // Validate required fields
    if (!roomData.number) {
        showToast('Room number is required', 'error');
        document.getElementById('roomNumber').focus();
        return;
    }
    
    if (!roomData.building) {
        showToast('Building is required', 'error');
        document.getElementById('building').focus();
        return;
    }
    
    if (!roomData.capacity || roomData.capacity <= 0) {
        showToast('Capacity must be a positive number', 'error');
        document.getElementById('capacity').focus();
        return;
    }
    
    try {
        await saveRoomAndNotify(roomData, isUpdate, roomId);
    } catch (error) {
        // Error is handled in saveRoomAndNotify
        console.error('Error in handleRoomSubmit:', error);
    }
}

// Delete room
async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room?')) {
        return;
    }
    
    try {
        await deleteRoomAndNotify(roomId);
    } catch (error) {
        // Error is handled in deleteRoomAndNotify
        console.error('Error in deleteRoom:', error);
    }
}

// Clear all rooms function
async function clearAllRooms() {
    if (!confirm('Are you sure you want to clear all rooms? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Call the clear all rooms API endpoint using fetchData utility
        const result = await fetchData('rooms', {
            method: 'DELETE'
        });
        
        // Show success message
        showToast('All rooms cleared successfully!', 'success');
        
        // Refresh the rooms display
        await loadRooms();
    } catch (error) {
        console.error('Failed to clear all rooms:', error);
        showToast('Failed to clear all rooms: ' + error.message, 'error');
    }
}

// Open import modal
function openImportModal() {
    console.log('openImportModal called');
    const modal = document.getElementById('importModal');
    const importForm = document.getElementById('importForm');
    
    // Reset form
    if (importForm) {
        console.log('Resetting import form');
        importForm.reset();
    }
    
    if (modal) {
        console.log('Showing import modal');
        modal.style.display = 'flex';
    } else {
        console.log('Import modal not found');
    }
}

// Close import modal
function closeImportModal() {
    console.log('closeImportModal called');
    document.getElementById('importModal').style.display = 'none';
}

// Handle import form submission
async function handleImportSubmit(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file to import.');
        return;
    }
    
    try {
        // Show loading overlay with progress
        showLoadingOverlay('Processing CSV file...', true);
        
        // Parse CSV file
        const csvData = await parseCSV(file);
        
        // Process rooms data
        const rooms = processRoomsData(csvData.data);
        
        // Import rooms
        const results = await importRooms(rooms);
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        // Show results
        showImportResults(results);
        
        // Reset form
        document.getElementById('importForm').reset();
        
        // Reload rooms list
        await loadRooms();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Import failed:', error);
        alert('Import failed: ' + error.message);
    }
}

// Export rooms to CSV
function exportRooms() {
    try {
        // Generate CSV content
        generateRoomsCSV();
    } catch (error) {
        console.error('Failed to export rooms:', error);
        showToast('Failed to export rooms: ' + error.message, 'error');
    }
}

// Generate CSV from rooms data
function generateRoomsCSV() {
    fetchData('rooms')
        .then(roomsData => {
            if (roomsData.length === 0) {
                showToast('No rooms to export', 'warning');
                return;
            }
            
            // Prepare data for CSV
            const csvData = roomsData.map(room => ({
                number: room.number,
                building: room.building,
                capacity: room.capacity
            }));
            
            // Generate CSV using the enhanced CSV generator
            const csvContent = generateCSV(csvData, ['number', 'building', 'capacity']);
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'rooms_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Rooms exported successfully', 'success');
        })
        .catch(error => {
            console.error('Failed to fetch rooms for export:', error);
            showToast('Failed to export rooms: ' + error.message, 'error');
        });
}

// Export roll assignments to CSV
function exportRollAssignments() {
    try {
        // Generate CSV content
        generateRollAssignmentsCSV();
    } catch (error) {
        console.error('Failed to export roll assignments:', error);
        showToast('Failed to export roll assignments: ' + error.message, 'error');
    }
}

// Generate roll assignments using Python script
async function generateRollAssignmentsWithPython() {
    try {
        console.log('Generating roll assignments with Python script...');
        // Show loading state
        const tableBody = document.getElementById('rollAssignmentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-600); margin-bottom: 1rem;"></i>
                        <p>Generating room assignments with Python script...</p>
                    </td>
                </tr>
            `;
        }

        // Call the new API endpoint using fetchData utility
        console.log('Calling fetchData with endpoint: roomAssignments');
        const result = await fetchData('roomAssignments');
        console.log('Received result from roomAssignments endpoint:', result);
        
        // Render the assignments from the Python script
        renderRollAssignmentsTableFromPython(result.assignments);
        
        // Show success message with statistics
        const stats = result.stats;
        showToast(`Room assignments generated: ${stats.assigned_students}/${stats.total_students} students assigned`, 'success');
    } catch (error) {
        console.error('Failed to generate roll assignments with Python:', error);
        showToast('Failed to generate roll assignments: ' + error.message, 'error');
        
        // Show error in table
        const tableBody = document.getElementById('rollAssignmentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--error-600);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Failed to generate room assignments: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Render roll assignments table from Python script data
function renderRollAssignmentsTableFromPython(assignments) {
    const tableBody = document.getElementById('rollAssignmentsTableBody');
    
    if (!tableBody) return;

    if (assignments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-door-open" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                    <h3>No Room Assignments Found</h3>
                    <p>Generate seating arrangements to see roll number assignments</p>
                    <button id="generateSampleAssignmentsBtn" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-cogs"></i> Generate Sample Assignments
                    </button>
                </td>
            </tr>
        `;
        // Add event listener to the generate button
        const generateBtn = document.getElementById('generateSampleAssignmentsBtn');
        if (generateBtn) {
            // Remove any existing event listeners to prevent duplicates
            const newBtn = generateBtn.cloneNode(true);
            newBtn.addEventListener('click', generateSampleAssignments);
            generateBtn.parentNode.replaceChild(newBtn, generateBtn);
        }
        return;
    }

    let html = '';

    assignments.forEach(assignment => {
        // Format roll numbers as tags (they're already sorted)
        const rollNumbersHtml = assignment.students && assignment.students.length > 0 
            ? assignment.students
                .map(student => `<span class="roll-number-tag">${student.rollNo}</span>`)
                .join('')
            : '<span class="no-assignments">No roll numbers assigned</span>';

        html += `
            <tr>
                <td>${assignment.number}</td>
                <td>${assignment.building}</td>
                <td>${assignment.capacity}</td>
                <td>${assignment.students ? assignment.students.length : 0}</td>
                <td class="roll-numbers-cell">${rollNumbersHtml}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
    
    // Add event listener to any generate buttons that might have been added
    const generateBtn = document.getElementById('generateSampleAssignmentsBtn');
    if (generateBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newBtn = generateBtn.cloneNode(true);
        newBtn.addEventListener('click', generateSampleAssignments);
        generateBtn.parentNode.replaceChild(newBtn, generateBtn);
    }
}

// Update the generateRollAssignmentsCSV function with the same logic
function generateRollAssignmentsCSV() {
    Promise.all([
        fetchData('rooms'),
        fetchData('seatingPlans'),
        fetchData('students')
    ])
        .then(([rooms, seatingPlans, students]) => {
            // Create a map of student ID to student data for quick lookup
            const studentMap = {};
            students.forEach(student => {
                studentMap[student._id] = student;
            });

            // Create a map of room ID to room details
            const roomMap = {};
            rooms.forEach(room => {
                roomMap[room._id] = {
                    ...room,
                    rollNumbers: []
                };
            });

            // Process seating plans to extract roll numbers for each room
            seatingPlans.forEach(plan => {
                const roomId = plan.roomId;
                if (roomId && roomMap[roomId]) {
                    // Extract roll numbers from seats
                    if (plan.seats && Array.isArray(plan.seats)) {
                        plan.seats.forEach(seat => {
                            // Check if the seat has a student assigned and is not a teacher desk
                            if (seat.studentId && !seat.isTeacherDesk) {
                                // First try to get roll number directly from seat data
                                if (seat.rollNo) {
                                    // Add roll number to the room's list if not already present
                                    if (!roomMap[roomId].rollNumbers.includes(seat.rollNo)) {
                                        roomMap[roomId].rollNumbers.push(seat.rollNo);
                                    }
                                } else {
                                    // Fallback to looking up the student to get their roll number
                                    const student = studentMap[seat.studentId];
                                    if (student && student.rollNo) {
                                        // Add roll number to the room's list if not already present
                                        if (!roomMap[roomId].rollNumbers.includes(student.rollNo)) {
                                            roomMap[roomId].rollNumbers.push(student.rollNo);
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });

            // Convert map to array and sort by room number
            const assignments = Object.values(roomMap).sort((a, b) => {
                // Sort by building first, then by room number
                if (a.building !== b.building) {
                    return a.building.localeCompare(b.building);
                }
                return a.number.localeCompare(b.number);
            });

            if (assignments.length === 0) {
                showToast('No room assignments to export', 'warning');
                return;
            }

            // Sort roll numbers in each assignment before exporting
            assignments.forEach(assignment => {
                if (assignment.rollNumbers && assignment.rollNumbers.length > 0) {
                    assignment.rollNumbers.sort((a, b) => {
                        // Improved sorting for roll numbers like "AIDSU24001"
                        // Extract the numeric part and sort by it
                        const numA = parseInt(a.match(/\d+/g)?.join('') || '0');
                        const numB = parseInt(b.match(/\d+/g)?.join('') || '0');
                        return numA - numB;
                    });
                }
            });

            // Prepare data for CSV
            const csvData = assignments.map(assignment => ({
                roomNumber: assignment.number,
                building: assignment.building,
                capacity: assignment.capacity,
                rollNumbers: assignment.rollNumbers.join('; ')
            }));

            // Generate CSV
            const csvContent = generateCSV(csvData, ['roomNumber', 'building', 'capacity', 'rollNumbers']);

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'room_roll_assignments.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Room assignments exported successfully', 'success');
        })
        .catch(error => {
            console.error('Failed to fetch data for export:', error);
            showToast('Failed to export room assignments: ' + error.message, 'error');
        });
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

// New function to notify user interface of changes
async function notifyUserInterfaceOfChanges() {
    try {
        // In a real implementation, this could send WebSocket messages
        // For now, we'll just log that changes were made and refresh the display
        console.log('Notifying user interface of changes...');
        
        // Refresh the roll assignments display
        await loadRollAssignments();
    } catch (error) {
        console.error('Error notifying user interface of changes:', error);
    }
}

// Enhanced function to save room data and notify user interface
async function saveRoomAndNotify(roomData, isUpdate = false, roomId = null) {
    try {
        showLoadingOverlay(isUpdate ? 'Updating room...' : 'Adding room...');
        
        const endpoint = isUpdate ? `rooms/${roomId}` : 'rooms';
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetchData(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(roomData)
        });
        
        hideLoadingOverlay();
        
        if (isUpdate) {
            showToast('Room updated successfully!', 'success');
        } else {
            showToast('Room added successfully!', 'success');
        }
        
        // Close the modal
        closeModal();
        
        // Refresh rooms list
        await loadRooms();
        
        // Notify user interface of changes
        await notifyUserInterfaceOfChanges();
        
        return response;
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to save room:', error);
        
        if (error.message.includes('already exists')) {
            showToast('A room with this number and building already exists!', 'error');
        } else {
            showToast(`Failed to save room: ${error.message}`, 'error');
        }
        
        throw error;
    }
}

// Enhanced function to delete room and notify user interface
async function deleteRoomAndNotify(roomId) {
    try {
        showLoadingOverlay('Deleting room...');
        
        await fetchData(`rooms/${roomId}`, {
            method: 'DELETE'
        });
        
        hideLoadingOverlay();
        showToast('Room deleted successfully!', 'success');
        
        // Refresh rooms list
        await loadRooms();
        
        // Notify user interface of changes
        await notifyUserInterfaceOfChanges();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to delete room:', error);
        showToast(`Failed to delete room: ${error.message}`, 'error');
        throw error;
    }
}

// Enhanced function to clear all rooms and notify user interface
async function clearAllRoomsAndNotify() {
    if (!confirm('Are you sure you want to delete ALL rooms? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoadingOverlay('Clearing all rooms...');
        
        await fetchData('rooms', {
            method: 'DELETE'
        });
        
        hideLoadingOverlay();
        showToast('All rooms cleared successfully!', 'success');
        
        // Refresh rooms list
        await loadRooms();
        
        // Notify user interface of changes
        await notifyUserInterfaceOfChanges();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to clear rooms:', error);
        showToast(`Failed to clear rooms: ${error.message}`, 'error');
        throw error;
    }
}

// Enhanced function to generate seating arrangements and notify user interface
async function generateSeatingArrangementsAndNotify() {
    try {
        showLoadingOverlay('Generating seating arrangements...');
        
        // Fetch rooms and students data
        const [rooms, students] = await Promise.all([
            fetchData('rooms'),
            fetchData('students')
        ]).catch(error => {
            throw new Error('Failed to fetch required data: ' + error.message);
        });
        
        if (!Array.isArray(rooms) || rooms.length === 0) {
            hideLoadingOverlay();
            showToast('No rooms available. Please add rooms first.', 'warning');
            await loadRollAssignments();
            return;
        }
        
        if (!Array.isArray(students) || students.length === 0) {
            hideLoadingOverlay();
            showToast('No students available. Please add students first.', 'warning');
            await loadRollAssignments();
            return;
        }
        
        // Clear existing seating plans
        await fetchData('seatingPlans', {
            method: 'DELETE'
        });
        
        // Sort students by roll number to maintain sequence
        const sortedStudents = [...students].sort((a, b) => {
            // Improved sorting for roll numbers like "AIDSU24001"
            // Extract the numeric part and sort by it
            const numA = parseInt((a.rollNo || '').match(/\d+/g)?.join('') || '0');
            const numB = parseInt((b.rollNo || '').match(/\d+/g)?.join('') || '0');
            return numA - numB;
        });
        
        // Shuffle rooms randomly
        const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5);
        
        // Distribute students to rooms evenly while maintaining sequence
        const seatingPlans = [];
        const totalStudents = sortedStudents.length;
        const totalRooms = shuffledRooms.length;
        
        // Calculate base allocation and remainder
        const baseAllocation = Math.floor(totalStudents / totalRooms);
        let remainder = totalStudents % totalRooms;
        
        let studentIndex = 0;
        
        for (let roomIndex = 0; roomIndex < totalRooms; roomIndex++) {
            const room = shuffledRooms[roomIndex];
            
            // Validate room data
            if (!room || !room._id || !room.number || !room.building) {
                console.warn('Invalid room data, skipping:', room);
                continue;
            }
            
            // Create a seating plan for this room with the correct structure
            const planData = {
                roomId: room._id,
                building: room.building || '',
                roomNumber: room.number || '',
                capacity: room.capacity || 0,
                rows: Math.ceil((room.capacity || 0) / 5),
                columns: 5,
                seats: []
            };
            
            // Determine how many students this room should get
            // Each room gets base allocation, and first 'remainder' rooms get one extra
            let studentsForThisRoom = baseAllocation;
            if (roomIndex < remainder) {
                studentsForThisRoom++;
            }
            
            // But don't exceed room capacity
            studentsForThisRoom = Math.min(studentsForThisRoom, room.capacity || 0);
            
            // Assign students to this room (consecutive block from the sorted list)
            for (let i = 0; i < studentsForThisRoom && studentIndex < totalStudents; i++) {
                if (studentIndex < sortedStudents.length) {
                    const student = sortedStudents[studentIndex];
                    // Validate student data
                    if (!student || !student._id || !student.rollNo) {
                        console.warn('Invalid student data, skipping:', student);
                        continue;
                    }
                    
                    planData.seats.push({
                        id: `seat-${room._id}-${i}`,
                        row: Math.floor(i / 5), // Assuming 5 seats per row
                        col: i % 5,
                        studentId: student._id,
                        rollNo: student.rollNo,
                        isTeacherDesk: false
                    });
                    studentIndex++;
                }
            }
            
            // Add the seating plan with proper structure
            seatingPlans.push({
                planData: planData,
                examDate: new Date().toISOString().split('T')[0],
                examCode: `SHUFFLE_${Date.now().toString().substring(5)}`
            });
        }
        
        // Save the seating plans to the database
        let successCount = 0;
        let errorCount = 0;
        
        for (const plan of seatingPlans) {
            try {
                await fetchData('seatingPlans', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(plan)
                });
                successCount++;
            } catch (error) {
                errorCount++;
                console.warn('Failed to save seating plan for room:', plan.planData?.roomNumber || 'Unknown', error);
            }
        }
        
        hideLoadingOverlay();
        
        if (errorCount > 0) {
            showToast(`Seating arrangements generated for ${successCount} rooms (${errorCount} failed)!`, 'warning');
        } else {
            showToast(`Seating arrangements generated for ${successCount} rooms!`, 'success');
        }
        
        // Refresh the assignments display
        await loadRollAssignments();
        
        // Notify user interface of changes
        await notifyUserInterfaceOfChanges();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to generate seating arrangements:', error);
        showToast('Failed to generate seating arrangements: ' + (error.message || 'Unknown error occurred'), 'error');
        await loadRollAssignments();
    }
}

// Enhanced shuffle classrooms function that notifies user interface
async function shuffleClassroomsAndNotify() {
    console.log('Shuffle classrooms function called');
    
    if (!confirm('Are you sure you want to shuffle all classrooms? This will redistribute students among rooms while maintaining their sequence.')) {
        return;
    }
    
    try {
        console.log('User confirmed shuffle operation');
        
        showLoadingOverlay('Shuffling classrooms and redistributing students...');

        // Call the shuffle API endpoint using fetchData utility
        console.log('Calling shuffleClassrooms API endpoint');
        const result = await fetchData('shuffleClassrooms', {
            method: 'POST'
        });
        
        console.log('Shuffle API response:', result);
        
        hideLoadingOverlay();
        
        // Show success message
        showToast('Classrooms shuffled successfully!', 'success');
        
        // Refresh the assignments display
        await loadRollAssignments();
        
        // Notify user interface of changes
        await notifyUserInterfaceOfChanges();
    } catch (error) {
        hideLoadingOverlay();
        console.error('Failed to shuffle classrooms:', error);
        showToast('Failed to shuffle classrooms: ' + (error.message || 'Unknown error occurred'), 'error');
        
        // Still refresh the assignments display even on error
        await loadRollAssignments();
    }
}
