console.log('Server starting...');
// server.mysql.js
// MySQL version of the server

// Add timestamp tracking store at the top of the file after the imports
const lastUpdateStore = new Map();

// Add helper functions for timestamp tracking
function updateLastModified(entityType) {
    lastUpdateStore.set(entityType, new Date().toISOString());
}

function getLastModified(entityType) {
    return lastUpdateStore.get(entityType) || new Date().toISOString();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const databaseService = require('./services/databaseService');
const { testConnection, pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS with specific options
const corsOptions = {
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize database
async function initDB() {
  try {
    console.log('Initializing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('Database initialized successfully');
    
    // Test database functionality with a simple query
    console.log('Testing database functionality...');
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    console.log('Database functionality test passed');
  } catch (error) {
    console.error('Error initializing database:', error);
    
    // Provide more specific error messages
    if (error.message.includes('connection')) {
      console.error('  → Check if MySQL server is running and accessible');
      console.error('  → Verify database host, port, username, and password in .env file');
    } else if (error.message.includes('access')) {
      console.error('  → Verify database username and password');
    } else if (error.message.includes('database')) {
      console.error('  → Verify database name exists');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Check if MySQL server is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Access denied. Check username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  → Database does not exist. Check database name.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  → Host not found. Check database host.');
    } else if (error.errno === 'ETIMEDOUT') {
      console.error('  → Connection timed out. Check network connectivity.');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('  → DNS resolution failed. Check database host configuration.');
    }
    
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await databaseService.getDatabaseStatus();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus.status === 'connected' ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database Status Endpoint
app.get('/api/database/status', async (req, res) => {
  try {
    const status = await databaseService.getDatabaseStatus();
    res.json(status);
  } catch (error) {
    console.error('Database status endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/database/status/detailed', async (req, res) => {
  try {
    const status = await databaseService.getDatabaseStatus();
    res.json(status);
  } catch (error) {
    console.error('Database detailed status endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test POST endpoint
app.post('/api/test', (req, res) => {
  console.log('Test POST endpoint called with body:', req.body);
  res.json({ message: 'Test POST endpoint working', received: req.body });
});

// Routes for Students
app.get('/api/students', async (req, res) => {
    try {
        const { search, section } = req.query;
        const students = await databaseService.getStudents(search, section);
        console.log(`Fetched ${students.length} students`);
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students', details: error.message });
    }
});

// Bulk import students
app.post('/api/students/bulk', async (req, res) => {
    try {
        const students = req.body;
        
        if (!Array.isArray(students)) {
            return res.status(400).json({ error: 'Expected an array of students' });
        }
        
        // Use the database service method for bulk import
        const results = await databaseService.createStudents(students);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Bulk imported ${students.length} students: ${successful} successful, ${failed} failed`);
        res.status(201).json({ 
            message: `Bulk import completed: ${successful} successful, ${failed} failed`, 
            results 
        });
    } catch (error) {
        console.error('Error bulk importing students:', error);
        res.status(500).json({ error: 'Failed to bulk import students', details: error.message });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        if (!req.body.rollNo || !req.body.name || !req.body.section) {
            return res.status(400).json({ error: 'Missing required fields: rollNo, name, section' });
        }
        
        const student = { 
            ...req.body 
        };
        
        // Check for duplicate roll number
        const existingStudent = await databaseService.getStudentByRollNo(student.rollNo);
        if (existingStudent) {
            return res.status(409).json({ error: 'Student with this roll number already exists' });
        }
        
        await databaseService.createStudent(student);
        
        console.log(`Created student: ${student.name} (${student.rollNo})`);
        res.status(201).json(student);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Failed to create student', details: error.message });
    }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await databaseService.getStudentById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const updatedStudent = { 
      ...req.body 
    };
    
    await databaseService.updateStudent(req.params.id, updatedStudent);
    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await databaseService.getStudentById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await databaseService.deleteStudent(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Clear all students
app.delete('/api/students', async (req, res) => {
  try {
    await databaseService.clearStudents();
    res.json({ message: 'All students cleared successfully' });
  } catch (error) {
    console.error('Error clearing students:', error);
    res.status(500).json({ error: 'Failed to clear students' });
  }
});

// Sync students (same as bulk import)
app.post('/api/students/sync', async (req, res) => {
  try {
    const students = req.body;
    
    if (!Array.isArray(students)) {
      return res.status(400).json({ error: 'Expected an array of students' });
    }
    
    // First clear existing students
    await databaseService.clearStudents();
    
    // Then import new students
    const results = await databaseService.createStudents(students);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Synced ${students.length} students: ${successful} successful, ${failed} failed`);
    res.status(201).json({ 
      success: true,
      message: `Sync completed: ${successful} successful, ${failed} failed`, 
      results 
    });
  } catch (error) {
    console.error('Error syncing students:', error);
    res.status(500).json({ error: 'Failed to sync students', details: error.message });
  }
});

// User authentication endpoint
app.post('/api/auth/user/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { rollNo, password } = req.body;
    
    // Validate input
    if (!rollNo || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number and password are required' 
      });
    }
    
    // Extract the numeric part of the roll number
    const numericPart = rollNo.match(/\d+/g);
    if (!numericPart || numericPart.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Roll No. format' 
      });
    }
    
    // Get the last numeric part to determine odd/even
    const lastNumber = parseInt(numericPart[numericPart.length - 1]);
    
    // Determine the correct password based on odd/even roll number
    const correctPassword = lastNumber % 2 === 0 ? '2024' : '2000';
    
    // Validate password
    if (password !== correctPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }
    
    // Check if student exists in database
    const databaseService = require('./services/databaseService');
    const student = await databaseService.getStudentByRollNo(rollNo);
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found in database' 
      });
    }
    
    // Successful authentication
    res.json({ 
      success: true, 
      message: 'Login successful',
      student: {
        id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        section: student.section,
        email: student.email,
        phone: student.phone
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get student statistics
app.get('/api/students/stats', async (req, res) => {
    try {
        const stats = await databaseService.getStudentStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching student stats:', error);
        res.status(500).json({ error: 'Failed to fetch student statistics', details: error.message });
    }
});

// Routes for Timetables
app.get('/api/timetables', async (req, res) => {
    try {
        const timetables = await databaseService.getTimetables();
        res.json(timetables);
    } catch (error) {
        console.error('Error fetching timetables:', error);
        res.status(500).json({ error: 'Failed to fetch timetables' });
    }
});

// Bulk import timetables
app.post('/api/timetables/bulk', async (req, res) => {
    try {
        const timetables = req.body;
        
        if (!Array.isArray(timetables)) {
            return res.status(400).json({ error: 'Expected an array of timetables' });
        }
        
        // Use the database service method for bulk import
        const results = await databaseService.createTimetables(timetables);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Bulk imported ${timetables.length} timetables: ${successful} successful, ${failed} failed`);
        res.status(201).json({ 
            message: `Bulk import completed: ${successful} successful, ${failed} failed`, 
            results 
        });
    } catch (error) {
        console.error('Error bulk importing timetables:', error);
        res.status(500).json({ error: 'Failed to bulk import timetables', details: error.message });
    }
});

app.post('/api/timetables', async (req, res) => {
    try {
        if (!req.body.code || !req.body.subject || !req.body.date || !req.body.time || !req.body.status) {
            return res.status(400).json({ error: 'Missing required fields: code, subject, date, time, status' });
        }
        
        const timetable = { 
            ...req.body 
        };
        
        // Check for duplicate code
        const existingTimetable = await databaseService.getTimetableByCode(timetable.code);
        if (existingTimetable) {
            return res.status(409).json({ error: 'Timetable with this code already exists' });
        }
        
        await databaseService.createTimetable(timetable);
        
        console.log(`Created timetable: ${timetable.code} - ${timetable.subject}`);
        res.status(201).json(timetable);
    } catch (error) {
        console.error('Error creating timetable:', error);
        res.status(500).json({ error: 'Failed to create timetable', details: error.message });
    }
});

app.put('/api/timetables/:id', async (req, res) => {
  try {
    const timetable = await databaseService.getTimetableById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    const updatedTimetable = { 
      ...req.body 
    };
    
    await databaseService.updateTimetable(req.params.id, updatedTimetable);
    res.json(updatedTimetable);
  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ error: 'Failed to update timetable', details: error.message });
  }
});

app.delete('/api/timetables/:id', async (req, res) => {
  try {
    const timetable = await databaseService.getTimetableById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    await databaseService.deleteTimetable(req.params.id);
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

// Clear all timetables
app.delete('/api/timetables', async (req, res) => {
  try {
    await databaseService.clearTimetables();
    res.json({ message: 'All timetables cleared successfully' });
  } catch (error) {
    console.error('Error clearing timetables:', error);
    res.status(500).json({ error: 'Failed to clear timetables' });
  }
});

// Sync timetables (same as bulk import)
app.post('/api/timetables/sync', async (req, res) => {
  try {
    const timetables = req.body;
    
    if (!Array.isArray(timetables)) {
      return res.status(400).json({ error: 'Expected an array of timetables' });
    }
    
    // First clear existing timetables
    await databaseService.clearTimetables();
    
    // Then import new timetables
    const results = await databaseService.createTimetables(timetables);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Synced ${timetables.length} timetables: ${successful} successful, ${failed} failed`);
    res.status(201).json({ 
      success: true,
      message: `Sync completed: ${successful} successful, ${failed} failed`, 
      results 
    });
  } catch (error) {
    console.error('Error syncing timetables:', error);
    res.status(500).json({ error: 'Failed to sync timetables', details: error.message });
  }
});

// Routes for Seating Plans
app.get('/api/seatingPlans', async (req, res) => {
  try {
    console.log('=== Seating Plans Endpoint Called ===');
    console.log('Fetching seating plans from database service...');
    const seatingPlans = await databaseService.getSeatingPlans();
    console.log('Successfully fetched seating plans, count:', seatingPlans.length);
    console.log('First plan sample:', JSON.stringify(seatingPlans[0], null, 2));
    res.json(seatingPlans);
    console.log('=== Seating Plans Response Sent ===');
  } catch (error) {
    console.error('=== Seating Plans Endpoint Error ===');
    console.error('Error fetching seating plans:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch seating plans' });
  }
});

// Update the POST seatingPlans endpoint to send notifications
app.post('/api/seatingPlans', async (req, res) => {
  try {
    const seatingPlan = { 
      timestamp: new Date(),
      ...req.body 
    };
    
    // Check for duplicate seating plan (same exam date and code)
    if (seatingPlan.examDate && seatingPlan.examCode) {
      const existingPlan = await databaseService.getSeatingPlanByDateAndCode(seatingPlan.examDate, seatingPlan.examCode);
      if (existingPlan) {
        return res.status(409).json({ error: 'Seating plan for this exam date and code already exists' });
      }
    }
    
    // Ensure planData is properly structured
    if (seatingPlan.planData && typeof seatingPlan.planData === 'string') {
      try {
        seatingPlan.planData = JSON.parse(seatingPlan.planData);
      } catch (parseError) {
        console.error('Error parsing planData:', parseError);
        return res.status(400).json({ error: 'Invalid planData format' });
      }
    }
    
    const result = await databaseService.createSeatingPlan(seatingPlan);
    
    // Update last modified timestamp
    updateLastModified('seatingPlans');
    
    console.log(`Created seating plan for ${seatingPlan.examDate || 'unknown date'}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating seating plan:', error);
    res.status(500).json({ error: 'Failed to create seating plan', details: error.message });
  }
});

app.delete('/api/seatingPlans/:id', async (req, res) => {
  try {
    await databaseService.deleteSeatingPlan(req.params.id);
    res.json({ message: 'Seating plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting seating plan:', error);
    res.status(500).json({ error: 'Failed to delete seating plan' });
  }
});

app.delete('/api/seatingPlans', async (req, res) => {
  try {
    await databaseService.clearSeatingPlans();
    res.json({ message: 'All seating plans cleared successfully' });
  } catch (error) {
    console.error('Error clearing seating plans:', error);
    res.status(500).json({ error: 'Failed to clear seating plans' });
  }
});

// Routes for Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await databaseService.getNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notification = { 
      type: 'info',
      priority: 'medium',
      recipientType: 'all',
      status: 'unread',
      sendEmail: false,
      isActive: true,
      ...req.body 
    };
    
    // Validate required fields
    if (!notification.message) {
      return res.status(400).json({ error: 'Missing required field: message' });
    }
    
    // Set default title if not provided
    if (!notification.title) {
      notification.title = 'Notification';
    }
    
    // Check for duplicate notification (same title and message)
    const existingNotification = await databaseService.getNotificationByTitleAndMessage(notification.title, notification.message);
    if (existingNotification) {
      return res.status(409).json({ error: 'Notification with this title and message already exists' });
    }
    
    await databaseService.createNotification(notification);
    
    console.log(`Created notification: ${notification.title}`);
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const notification = await databaseService.getNotificationById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await databaseService.deleteNotification(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications
app.delete('/api/notifications', async (req, res) => {
  try {
    await databaseService.clearNotifications();
    res.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Bulk import notifications
app.post('/api/notifications/bulk', async (req, res) => {
    try {
        const notifications = req.body;
        
        if (!Array.isArray(notifications)) {
            return res.status(400).json({ error: 'Expected an array of notifications' });
        }
        
        // Use the database service method for bulk import
        const results = await databaseService.createNotifications(notifications);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Bulk imported ${notifications.length} notifications: ${successful} successful, ${failed} failed`);
        res.status(201).json({ 
            message: `Bulk import completed: ${successful} successful, ${failed} failed`, 
            results 
        });
    } catch (error) {
        console.error('Error bulk importing notifications:', error);
        res.status(500).json({ error: 'Failed to bulk import notifications', details: error.message });
    }
});

// Routes for Staff
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await databaseService.getStaff();
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

app.get('/api/staff/:id', async (req, res) => {
  try {
    const staff = await databaseService.getStaffById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff', details: error.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }
    
    const staff = { 
      availability: [],
      isActive: true,
      ...req.body 
    };
    
    // Check for duplicate staff name
    const existingStaff = await databaseService.getStaffByName(staff.name);
    if (existingStaff) {
      return res.status(409).json({ error: 'Staff member with this name already exists' });
    }
    
    await databaseService.createStaff(staff);
    
    // Get the created staff member from the database to ensure all fields are included
    const createdStaff = await databaseService.getStaffByName(staff.name);
    
    console.log(`Created staff: ${staff.name}`);
    res.status(201).json(createdStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const staff = await databaseService.getStaffById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    const updatedStaff = { 
      ...req.body 
    };
    
    await databaseService.updateStaff(req.params.id, updatedStaff);
    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Failed to update staff', details: error.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    const staff = await databaseService.getStaffById(req.params.id);
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    
    await databaseService.deleteStaff(req.params.id);
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Clear all staff
app.delete('/api/staff', async (req, res) => {
  try {
    await databaseService.clearStaff();
    res.json({ message: 'All staff cleared successfully' });
  } catch (error) {
    console.error('Error clearing staff:', error);
    res.status(500).json({ error: 'Failed to clear staff' });
  }
});

// Routes for Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await databaseService.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Update the POST rooms endpoint to send notifications
app.post('/api/rooms', async (req, res) => {
  try {
    if (!req.body.number || !req.body.building || !req.body.capacity) {
      return res.status(400).json({ error: 'Missing required fields: number, building, capacity' });
    }
    
    const room = { 
      ...req.body 
    };
    
    // Check for duplicate room (same number and building)
    const existingRoom = await databaseService.getRoomByNumberAndBuilding(room.number, room.building);
    if (existingRoom) {
      return res.status(409).json({ error: 'Room with this number and building already exists' });
    }
    
    const result = await databaseService.createRoom(room);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    console.log(`Created room: ${room.number} - ${room.building}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update the PUT rooms endpoint to send notifications
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const room = await databaseService.getRoomById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Merge the existing room data with the updated fields
    const updatedRoom = { 
      ...room,
      ...req.body 
    };
    
    // Remove the _id field if it exists in the request body
    delete updatedRoom._id;
    
    const result = await databaseService.updateRoom(req.params.id, updatedRoom);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json(result);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room', details: error.message });
  }
});

// Update the DELETE rooms endpoint to send notifications
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const room = await databaseService.getRoomById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const result = await databaseService.deleteRoom(req.params.id);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Update the DELETE all rooms endpoint to send notifications
app.delete('/api/rooms', async (req, res) => {
  try {
    const result = await databaseService.clearRooms();
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json({ message: 'All rooms cleared successfully' });
  } catch (error) {
    console.error('Error clearing rooms:', error);
    res.status(500).json({ error: 'Failed to clear rooms' });
  }
});

// Bulk import rooms
app.post('/api/rooms/bulk', async (req, res) => {
    try {
        const rooms = req.body;
        
        console.log('Received rooms data:', rooms);
        
        if (!Array.isArray(rooms)) {
            return res.status(400).json({ error: 'Expected an array of rooms' });
        }
        
        // Use the database service method for bulk import
        const results = await databaseService.createRooms(rooms);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Bulk imported ${rooms.length} rooms: ${successful} successful, ${failed} failed`);
        res.status(201).json({ 
            message: `Bulk import completed: ${successful} successful, ${failed} failed`, 
            results 
        });
    } catch (error) {
        console.error('Error bulk importing rooms:', error);
        res.status(500).json({ error: 'Failed to bulk import rooms', details: error.message });
    }
});

// Bulk import staff
app.post('/api/staff/bulk', async (req, res) => {
    try {
        const staffMembers = req.body;
        
        if (!Array.isArray(staffMembers)) {
            return res.status(400).json({ error: 'Expected an array of staff members' });
        }
        
        // Use the database service method for bulk import
        const results = await databaseService.createStaffMembers(staffMembers);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Bulk imported ${staffMembers.length} staff members: ${successful} successful, ${failed} failed`);
        res.status(201).json({ 
            message: `Bulk import completed: ${successful} successful, ${failed} failed`, 
            results 
        });
    } catch (error) {
        console.error('Error bulk importing staff members:', error);
        res.status(500).json({ error: 'Failed to bulk import staff members', details: error.message });
    }
});

// Routes for Staff Allocations (for allocation history and details)
app.get('/api/staffAllocations/history', async (req, res) => {
  try {
    const allocations = await databaseService.getStaffAllocations();
    // Always return an array, even if empty
    res.json(allocations || []);
  } catch (error) {
    console.error('Error fetching allocation history:', error);
    // Always return JSON response
    res.status(500).json({ error: 'Failed to fetch allocation history', details: error.message });
  }
});

app.get('/api/staffAllocations/:id', async (req, res) => {
  try {
    const allocation = await databaseService.getStaffAllocationById(req.params.id);
    
    if (!allocation) {
      return res.status(404).json({ error: 'Allocation details not found' });
    }
    
    res.json(allocation);
  } catch (error) {
    console.error('Error fetching allocation details:', error);
    // Always return JSON response
    res.status(500).json({ error: 'Failed to fetch allocation details', details: error.message });
  }
});

app.post('/api/staffAllocations', async (req, res) => {
  try {
    if (!req.body.date) {
      return res.status(400).json({ error: 'Missing required field: date' });
    }
    
    // Check for duplicate allocation
    const existingAllocation = await databaseService.getStaffAllocationByDate(req.body.date);
    if (existingAllocation) {
      return res.status(409).json({ error: 'Staff allocation for this date already exists' });
    }
    
    const allocation = await databaseService.createStaffAllocation(req.body);
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Error creating staff allocation:', error);
    res.status(500).json({ error: 'Failed to create staff allocation' });
  }
});

app.delete('/api/staffAllocations/:id', async (req, res) => {
  try {
    const allocation = await databaseService.getStaffAllocationById(req.params.id);
    
    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }
    
    await databaseService.deleteStaffAllocation(req.params.id);
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ error: 'Failed to delete allocation' });
  }
});

// Clear all staff allocations
app.delete('/api/staffAllocations', async (req, res) => {
  try {
    await databaseService.clearStaffAllocations();
    res.json({ message: 'All staff allocations cleared successfully' });
  } catch (error) {
    console.error('Error clearing staff allocations:', error);
    res.status(500).json({ error: 'Failed to clear staff allocations' });
  }
});

// Routes for Daily Assignments
app.get('/api/dailyAssignments', async (req, res) => {
  try {
    const assignments = await databaseService.getDailyAssignments();
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching daily assignments:', error);
    res.status(500).json({ error: 'Failed to fetch daily assignments' });
  }
});

app.post('/api/dailyAssignments', async (req, res) => {
  try {
    if (!req.body.day) {
      return res.status(400).json({ error: 'Missing required field: day' });
    }
    
    const assignment = { 
      timeSlot: 'General',
      generatedAt: new Date(),
      generatedBy: 'System',
      assignments: {},
      ...req.body 
    };
    
    await databaseService.createDailyAssignment(assignment);
    
    console.log(`Created daily assignment for ${assignment.day}`);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating daily assignment:', error);
    res.status(500).json({ error: 'Failed to create daily assignment' });
  }
});

app.delete('/api/dailyAssignments/:id', async (req, res) => {
  try {
    await databaseService.deleteDailyAssignment(req.params.id);
    res.json({ message: 'Daily assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily assignment:', error);
    res.status(500).json({ error: 'Failed to delete daily assignment' });
  }
});

// Clear all daily assignments
app.delete('/api/dailyAssignments', async (req, res) => {
  try {
    await databaseService.clearDailyAssignments();
    res.json({ message: 'All daily assignments cleared successfully' });
  } catch (error) {
    console.error('Error clearing daily assignments:', error);
    res.status(500).json({ error: 'Failed to clear daily assignments' });
  }
});

// Reset all data (clear all tables)
app.delete('/api/reset', async (req, res) => {
  try {
    // Clear all tables in order to avoid foreign key constraints
    await databaseService.clearSeatingPlans();
    await databaseService.clearDailyAssignments();
    await databaseService.clearNotifications();
    await databaseService.clearTimetables();
    await databaseService.clearStudents();
    await databaseService.clearRooms();
    await databaseService.clearStaff();
    
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error resetting all data:', error);
    res.status(500).json({ error: 'Failed to reset all data', details: error.message });
  }
});

// Analytics Endpoint - Get comprehensive dashboard data
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get total counts
    const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM students');
    const [timetableCount] = await connection.execute('SELECT COUNT(*) as count FROM timetables');
    const [staffCount] = await connection.execute('SELECT COUNT(*) as count FROM staff');
    const [roomCount] = await connection.execute('SELECT COUNT(*) as count FROM rooms');
    const [seatingPlanCount] = await connection.execute('SELECT COUNT(*) as count FROM seating_plans');
    const [notificationCount] = await connection.execute('SELECT COUNT(*) as count FROM notifications');
    
    // Get students by section
    const [studentsBySection] = await connection.execute(`
      SELECT section, COUNT(*) as count 
      FROM students 
      GROUP BY section 
      ORDER BY count DESC
    `);
    
    // Get upcoming exams (next 30 days)
    const [upcomingExams] = await connection.execute(`
      SELECT subject, date, time, status
      FROM timetables 
      WHERE date >= CURDATE() AND date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY date ASC
      LIMIT 5
    `);
    
    // Get recent notifications
    const [recentNotifications] = await connection.execute(`
      SELECT title, message, type, createdAt
      FROM notifications 
      ORDER BY createdAt DESC
      LIMIT 5
    `);
    
    // Get staff availability
    const [staffAvailability] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN availability = 'Yes' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN availability = 'No' THEN 1 ELSE 0 END) as unavailable
      FROM staff
    `);
    
    // Get room utilization (based on seating plans)
    const [roomUtilization] = await connection.execute(`
      SELECT 
        JSON_LENGTH(planData) as assignedStudents,
        examDate
      FROM seating_plans 
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    
    connection.release();
    
    res.json({
      totals: {
        students: studentCount[0].count,
        timetables: timetableCount[0].count,
        staff: staffCount[0].count,
        rooms: roomCount[0].count,
        seatingPlans: seatingPlanCount[0].count,
        notifications: notificationCount[0].count
      },
      studentsBySection: studentsBySection,
      upcomingExams: upcomingExams,
      recentNotifications: recentNotifications,
      staffAvailability: {
        available: staffAvailability[0].available || 0,
        unavailable: staffAvailability[0].unavailable || 0
      },
      roomUtilization: roomUtilization[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics data',
      details: error.message
    });
  }
});

// Analytics Endpoint - Get students distribution
app.get('/api/analytics/students', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get students by section
    const [studentsBySection] = await connection.execute(`
      SELECT section, COUNT(*) as count 
      FROM students 
      GROUP BY section 
      ORDER BY section ASC
    `);
    
    // Get student registration trend (by month)
    const [studentTrend] = await connection.execute(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as count
      FROM students
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `);
    
    connection.release();
    
    res.json({
      bySection: studentsBySection,
      trend: studentTrend
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch student analytics',
      details: error.message
    });
  }
});

// Analytics Endpoint - Get timetable insights
app.get('/api/analytics/timetables', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get exams by date
    const [examsByDate] = await connection.execute(`
      SELECT date, COUNT(*) as count 
      FROM timetables 
      GROUP BY date 
      ORDER BY date ASC
    `);
    
    // Get exams by status
    const [examsByStatus] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM timetables 
      GROUP BY status
    `);
    
    // Get upcoming exams
    const [upcomingExams] = await connection.execute(`
      SELECT subject, date, time, status
      FROM timetables 
      WHERE date >= CURDATE()
      ORDER BY date ASC
      LIMIT 10
    `);
    
    connection.release();
    
    res.json({
      byDate: examsByDate,
      byStatus: examsByStatus,
      upcoming: upcomingExams
    });
  } catch (error) {
    console.error('Error fetching timetable analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch timetable analytics',
      details: error.message
    });
  }
});

// Add endpoint for room roll number assignments
app.get('/api/roomAssignments', async (req, res) => {
  try {
    console.log('Room assignments endpoint called - checking for shuffled seating plans');
    
    // First, try to get shuffled seating plans from the database
    const seatingPlans = await databaseService.getSeatingPlans();
    
    // Filter for shuffled plans (those with SHUFFLE_ in the examCode)
    const shuffledPlans = seatingPlans.filter(plan => 
      plan.examCode && plan.examCode.startsWith('SHUFFLE_')
    );
    
    // If we have shuffled plans, use them
    if (shuffledPlans.length > 0) {
      console.log(`Found ${shuffledPlans.length} shuffled seating plans`);
      
      // Convert seating plans to room assignments format
      const assignments = shuffledPlans.map(plan => {
        // Extract students from seats
        const students = [];
        if (plan.seats && Array.isArray(plan.seats)) {
          plan.seats.forEach(seat => {
            if (seat.rollNo && !seat.isTeacherDesk) {
              students.push({
                rollNo: seat.rollNo,
                name: seat.name || seat.rollNo // Use name if available, otherwise rollNo
              });
            }
          });
        }
        
        return {
          _id: plan.roomId,
          number: plan.roomNumber,
          building: plan.building,
          capacity: plan.capacity,
          students: students
        };
      });
      
      // Create result structure
      const result = {
        assignments: assignments,
        stats: {
          assigned_students: assignments.reduce((total, room) => total + (room.students ? room.students.length : 0), 0),
          total_students: assignments.reduce((total, room) => total + (room.students ? room.students.length : 0), 0),
          total_rooms: assignments.length,
          source: 'shuffled_plans'
        }
      };
      
      console.log('Returning shuffled room assignments');
      res.json(result);
      return;
    }
    
    // If no shuffled plans exist, fall back to generating assignments
    console.log('No shuffled plans found, generating assignments in Node.js');
    
    // Get the rooms and students from the database
    const rooms = await databaseService.getRooms();
    const students = await databaseService.getStudents();
    
    console.log(`Found ${rooms.length} rooms and ${students.length} students`);
    
    // Generate assignments
    const assignments = [];
    let studentIndex = 0;
    
    // Sort students by roll number before assigning to rooms
    const sortedStudents = [...students].sort((a, b) => {
      // Improved sorting for roll numbers like "AIDSU24001"
      // Extract the numeric part and sort by it
      const numA = parseInt(a.rollNo.match(/\d+/g)?.join('') || '0');
      const numB = parseInt(b.rollNo.match(/\d+/g)?.join('') || '0');
      return numA - numB;
    });
    
    for (const room of rooms) {
      const roomAssignment = {
        _id: room._id,
        number: room.number,
        building: room.building,
        capacity: room.capacity,
        students: []
      };
      
      // Assign students to this room (up to capacity)
      for (let i = 0; i < room.capacity && studentIndex < sortedStudents.length; i++) {
        if (studentIndex < sortedStudents.length) {
          roomAssignment.students.push({
            rollNo: sortedStudents[studentIndex].rollNo,
            name: sortedStudents[studentIndex].name
          });
          studentIndex++;
        }
      }
      
      assignments.push(roomAssignment);
    }
    
    // Create result structure
    const result = {
      assignments: assignments,
      stats: {
        assigned_students: studentIndex,
        total_students: students.length,
        total_rooms: rooms.length,
        source: 'generated'
      }
    };
    
    console.log('Room assignments generated successfully');
    res.json(result);
  } catch (error) {
    console.error('Error generating room assignments:', error);
    res.status(500).json({ 
      error: 'Failed to generate room assignments',
      details: error.message
    });
  }
});

// Update the POST seatingPlans endpoint to track updates
app.post('/api/seatingPlans', async (req, res) => {
  try {
    const seatingPlan = { 
      timestamp: new Date(),
      ...req.body 
    };
    
    // Check for duplicate seating plan (same exam date and code)
    if (seatingPlan.examDate && seatingPlan.examCode) {
      const existingPlan = await databaseService.getSeatingPlanByDateAndCode(seatingPlan.examDate, seatingPlan.examCode);
      if (existingPlan) {
        return res.status(409).json({ error: 'Seating plan for this exam date and code already exists' });
      }
    }
    
    const result = await databaseService.createSeatingPlan(seatingPlan);
    
    // Update last modified timestamp
    updateLastModified('seatingPlans');
    
    console.log(`Created seating plan for ${seatingPlan.examDate || 'unknown date'}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating seating plan:', error);
    res.status(500).json({ error: 'Failed to create seating plan' });
  }
});

// Update the PUT rooms endpoint to track updates
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const room = await databaseService.getRoomById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Merge the existing room data with the updated fields
    const updatedRoom = { 
      ...room,
      ...req.body 
    };
    
    // Remove the _id field if it exists in the request body
    delete updatedRoom._id;
    
    const result = await databaseService.updateRoom(req.params.id, updatedRoom);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json(result);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room', details: error.message });
  }
});

// Update the POST rooms endpoint to track updates
app.post('/api/rooms', async (req, res) => {
  try {
    if (!req.body.number || !req.body.building || !req.body.capacity) {
      return res.status(400).json({ error: 'Missing required fields: number, building, capacity' });
    }
    
    const room = { 
      ...req.body 
    };
    
    // Check for duplicate room (same number and building)
    const existingRoom = await databaseService.getRoomByNumberAndBuilding(room.number, room.building);
    if (existingRoom) {
      return res.status(409).json({ error: 'Room with this number and building already exists' });
    }
    
    const result = await databaseService.createRoom(room);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    console.log(`Created room: ${room.number} - ${room.building}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update the DELETE rooms endpoint to track updates
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const room = await databaseService.getRoomById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const result = await databaseService.deleteRoom(req.params.id);
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Update the DELETE all rooms endpoint to track updates
app.delete('/api/rooms', async (req, res) => {
  try {
    const result = await databaseService.clearRooms();
    
    // Update last modified timestamp
    updateLastModified('rooms');
    
    res.json({ message: 'All rooms cleared successfully' });
  } catch (error) {
    console.error('Error clearing rooms:', error);
    res.status(500).json({ error: 'Failed to clear rooms' });
  }
});

// Update the DELETE seatingPlans endpoint to track updates
app.delete('/api/seatingPlans/:id', async (req, res) => {
  try {
    const result = await databaseService.deleteSeatingPlan(req.params.id);
    
    // Update last modified timestamp
    updateLastModified('seatingPlans');
    
    res.json({ message: 'Seating plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting seating plan:', error);
    res.status(500).json({ error: 'Failed to delete seating plan' });
  }
});

// Update the DELETE all seatingPlans endpoint to track updates
app.delete('/api/seatingPlans', async (req, res) => {
  try {
    const result = await databaseService.clearSeatingPlans();
    
    // Update last modified timestamp
    updateLastModified('seatingPlans');
    
    res.json({ message: 'All seating plans cleared successfully' });
  } catch (error) {
    console.error('Error clearing seating plans:', error);
    res.status(500).json({ error: 'Failed to clear seating plans' });
  }
});

// Add endpoint to get last modified timestamps
app.get('/api/lastModified', (req, res) => {
    res.json({
        seatingPlans: getLastModified('seatingPlans'),
        rooms: getLastModified('rooms'),
        students: getLastModified('students'),
        timestamp: new Date().toISOString()
    });
});

// Update the shuffleClassrooms endpoint to track updates
app.post('/api/shuffleClassrooms', async (req, res) => {
  try {
    console.log('Shuffle classrooms endpoint called - shuffling rooms while maintaining student sequence');
    
    // Get the rooms and students from the database
    const rooms = await databaseService.getRooms();
    const students = await databaseService.getStudents();
    
    console.log(`Found ${rooms.length} rooms and ${students.length} students for assignment`);
    
    // Log the first few students to see their roll numbers
    console.log('First 10 students from database:', students.slice(0, 10).map(s => s.rollNo));
    
    // Sort students by roll number to maintain sequence
    const sortedStudents = [...students].sort((a, b) => {
      // Improved sorting for roll numbers like "AIDSU24001"
      // Extract the numeric part and sort by it
      const numA = parseInt(a.rollNo.match(/\d+/g)?.join('') || '0');
      const numB = parseInt(b.rollNo.match(/\d+/g)?.join('') || '0');
      return numA - numB;
    });
    
    // Log the first few sorted students to verify sorting
    console.log('First 10 sorted students:', sortedStudents.slice(0, 10).map(s => s.rollNo));
    
    // Shuffle rooms randomly
    const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5);
    
    // Log the room order
    console.log('Room order:', shuffledRooms.map(r => `${r.building}-${r.number}`));
    
    // Clear existing seating plans
    await databaseService.clearSeatingPlans();
    
    // Distribute students to rooms evenly while maintaining sequence
    const assignments = [];
    const totalStudents = sortedStudents.length;
    const totalRooms = shuffledRooms.length;
    
    // Calculate base allocation and remainder
    const baseAllocation = Math.floor(totalStudents / totalRooms);
    let remainder = totalStudents % totalRooms;
    
    console.log(`Total students: ${totalStudents}, Total rooms: ${totalRooms}`);
    console.log(`Base allocation: ${baseAllocation}, Remainder: ${remainder}`);
    
    // Log the first few sorted students to verify sorting
    console.log('First 10 sorted students:', sortedStudents.slice(0, 10).map(s => s.rollNo));
    
    let studentIndex = 0;
    
    for (let roomIndex = 0; roomIndex < totalRooms; roomIndex++) {
      const room = shuffledRooms[roomIndex];
      
      // Create seating plan for this room
      const seats = [];
      const roomStudents = [];
      
      // Determine how many students this room should get
      // Each room gets base allocation, and first 'remainder' rooms get one extra
      let studentsForThisRoom = baseAllocation;
      if (roomIndex < remainder) {
        studentsForThisRoom++;
      }
      
      // But don't exceed room capacity
      studentsForThisRoom = Math.min(studentsForThisRoom, room.capacity);
      
      console.log(`Room ${room.number}: base=${baseAllocation}, extra=${roomIndex < remainder ? 1 : 0}, capacity=${room.capacity}, final=${studentsForThisRoom}`);
      
      console.log(`Room ${room.number} will get ${studentsForThisRoom} students`);
      
      // Log the first student that will be assigned to this room
      if (studentIndex < totalStudents) {
        console.log(`First student for room ${room.number}: ${sortedStudents[studentIndex].rollNo}`);
      }
      
      // Assign students to this room (consecutive block from the sorted list)
      for (let i = 0; i < studentsForThisRoom && studentIndex < totalStudents; i++) {
        const student = sortedStudents[studentIndex];
        roomStudents.push({
          rollNo: student.rollNo,
          name: student.name
        });
        
        // Add seat information
        seats.push({
          id: `seat-${room._id}-${i}`,
          row: Math.floor(i / 5), // Assuming 5 seats per row
          col: i % 5,
          studentId: student._id,
          rollNo: student.rollNo,
          isTeacherDesk: false
        });
        
        studentIndex++;
      }
      
      const roomAssignment = {
        _id: room._id,
        number: room.number,
        building: room.building,
        capacity: room.capacity,
        students: roomStudents
      };
      
      assignments.push(roomAssignment);
      
      // Save seating plan to database with correct structure that matches frontend expectations
      const seatingPlan = {
        planData: {
          roomId: room._id,
          building: room.building,
          roomNumber: room.number,
          capacity: room.capacity,
          rows: Math.ceil(room.capacity / 5),
          columns: 5,
          seats: seats
        },
        examDate: new Date().toISOString().split('T')[0],
        examCode: `SHUFFLE_${Date.now().toString().substring(5)}`
      };
      
      try {
        await databaseService.createSeatingPlan(seatingPlan);
        console.log(`Saved seating plan for room ${room.number} with ${roomStudents.length} students`);
      } catch (error) {
        console.error(`Failed to save seating plan for room ${room.number}:`, error);
      }
    }
    
    // Update last modified timestamp for seating plans
    updateLastModified('seatingPlans');
    
    // Create result structure
    const result = {
      assignments: assignments,
      stats: {
        assigned_students: studentIndex,
        total_students: totalStudents,
        total_rooms: totalRooms,
        shuffle_timestamp: new Date().toISOString()
      }
    };
    
    console.log('Room shuffling completed successfully');
    res.json(result);
  } catch (error) {
    console.error('Error shuffling classrooms:', error);
    res.status(500).json({ 
      error: 'Failed to shuffle classrooms',
      details: error.message
    });
  }
});

// Add new export endpoint for direct database export
app.get('/api/export/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const validTables = ['students', 'timetables', 'staff', 'rooms', 'seating_plans', 'notifications'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    // Get all data from the specified table
    const data = await databaseService.executeQuery(`SELECT * FROM ${table}`);
    
    // Convert to CSV format
    if (data.length === 0) {
      return res.status(200).json({ message: 'No data to export', data: [] });
    }
    
    // Get column headers
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert to string
        const stringValue = String(value);
        
        // Escape commas, quotes, and newlines in values
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(',') + '\n';
    });
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error(`Error exporting ${table}:`, error);
    res.status(500).json({ error: `Failed to export ${table}`, details: error.message });
  }
});

// Add new import endpoint for direct database import
app.post('/api/import/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { data, overwrite = false } = req.body;
    
    const validTables = ['students', 'timetables', 'staff', 'rooms', 'seating_plans', 'notifications'];
    
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }
    
    if (overwrite) {
      // Clear existing data based on table
      switch (table) {
        case 'students':
          await databaseService.clearStudents();
          break;
        case 'timetables':
          await databaseService.clearTimetables();
          break;
        case 'staff':
          await databaseService.clearStaff();
          break;
        case 'rooms':
          await databaseService.clearRooms();
          break;
        case 'seating_plans':
          await databaseService.clearSeatingPlans();
          break;
        case 'notifications':
          await databaseService.clearNotifications();
          break;
      }
    }
    
    // Import data based on table
    let results = [];
    switch (table) {
      case 'students':
        results = await databaseService.createStudents(data);
        break;
      case 'timetables':
        results = await databaseService.createTimetables(data);
        break;
      case 'staff':
        results = await databaseService.createStaffMembers(data);
        break;
      case 'rooms':
        results = await databaseService.createRooms(data);
        break;
      default:
        return res.status(400).json({ error: `Import not supported for table: ${table}` });
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.status(201).json({
      message: `Import completed: ${successful} successful, ${failed} failed`,
      results
    });
  } catch (error) {
    console.error(`Error importing ${table}:`, error);
    res.status(500).json({ error: `Failed to import ${table}`, details: error.message });
  }
});

// Add endpoint for staffing operations using Python script
app.post('/api/staffing/python', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    // Get operation from request body
    const { operation, params } = req.body;
    
    // Path to the Python staffing manager script
    const scriptPath = path.join(__dirname, 'staffing_manager.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ 
        error: 'Python script not found',
        details: `Script not found at ${scriptPath}`
      });
    }
    
    // Prepare arguments based on operation
    let args = [scriptPath];
    
    switch (operation) {
      case 'report':
        // Run with no additional arguments to generate report
        break;
      case 'export':
        // Add export argument
        args.push('--export');
        if (params && params.filename) {
          args.push('--filename', params.filename);
        }
        break;
      case 'sync':
        // Add sync argument
        args.push('--sync');
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid operation', 
          validOperations: ['report', 'export', 'sync'] 
        });
    }
    
    console.log(`Executing Python script with args: ${args.join(' ')}`);
    
    // Spawn the Python process
    const python = spawn('python', args);
    
    let stdout = '';
    let stderr = '';
    
    // Capture stdout
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Capture stderr
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    python.on('close', (code) => {
      console.log(`Python script exited with code ${code}`);
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      
      if (code !== 0) {
        console.error(`Python staffing script exited with code ${code}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ 
          error: 'Failed to execute staffing operation',
          details: stderr,
          code: code
        });
      }
      
      // For report operation, return the output
      if (operation === 'report') {
        res.json({ 
          message: 'Staffing report generated successfully',
          output: stdout
        });
      } 
      // For export operation, indicate success
      else if (operation === 'export') {
        res.json({ 
          message: 'Staffing data exported successfully',
          filename: params && params.filename ? params.filename : 'staff_export.csv'
        });
      }
      // For sync operation, indicate success
      else if (operation === 'sync') {
        res.json({ 
          message: 'Staffing data synchronized successfully'
        });
      }
    });
    
    // Handle process error
    python.on('error', (error) => {
      console.error('Failed to start Python staffing script:', error);
      res.status(500).json({ 
        error: 'Failed to start Python staffing script',
        details: error.message
      });
    });
  } catch (error) {
    console.error('Error executing Python staffing operation:', error);
    res.status(500).json({ 
      error: 'Failed to execute Python staffing operation',
      details: error.message
    });
  }
});

// Add endpoint to get Python staffing script status
app.get('/api/staffing/python/status', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    // Path to the Python staffing manager script
    const scriptPath = path.join(__dirname, 'staffing_manager.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ 
        status: 'unavailable',
        error: 'Python script not found',
        details: `Script not found at ${scriptPath}`
      });
    }
    
    // Spawn the Python process with --help to check if script is accessible
    const python = spawn('python', [scriptPath, '--help']);
    
    let stdout = '';
    let stderr = '';
    
    // Capture stdout
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Capture stderr
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    python.on('close', (code) => {
      console.log(`Python status check exited with code ${code}`);
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      
      if (code === 0) {
        res.json({ 
          status: 'available',
          message: 'Python staffing manager is accessible'
        });
      } else {
        res.status(500).json({ 
          status: 'unavailable',
          error: 'Python staffing manager is not accessible',
          details: stderr
        });
      }
    });
    
    // Handle process error
    python.on('error', (error) => {
      console.error('Failed to check Python staffing manager status:', error);
      res.status(500).json({ 
        status: 'unavailable',
        error: 'Failed to check Python staffing manager status',
        details: error.message
      });
    });
  } catch (error) {
    console.error('Error checking Python staffing manager status:', error);
    res.status(500).json({ 
      status: 'unavailable',
      error: 'Failed to check Python staffing manager status',
      details: error.message
    });
  }
});

// Add endpoint for smart invigilator assignment
app.options('/api/staffing/smart-assign', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

app.post('/api/staffing/smart-assign', async (req, res) => {
  try {
    console.log('Smart assign endpoint called - generating assignments in Node.js');
    
    // Instead of calling Python, generate assignments directly in Node.js
    // First, get the staff and rooms from the database
    const staff = await databaseService.getStaff();
    const rooms = await databaseService.getRooms();
    
    console.log(`Found ${staff.length} staff members and ${rooms.length} rooms`);
    
    // Check if we have data to work with
    if (!staff || staff.length === 0) {
      return res.status(400).json({ 
        error: 'No staff members found',
        details: 'Cannot generate assignments without staff members'
      });
    }
    
    if (!rooms || rooms.length === 0) {
      return res.status(400).json({ 
        error: 'No rooms found',
        details: 'Cannot generate assignments without rooms'
      });
    }
    
    // Generate smart assignments
    const assignments = generateSmartAssignments(staff, rooms, 6); // Generate for 6 days
    
    // Create a mock allocation ID
    const allocation_id = `alloc_${Date.now()}`;
    
    res.json({ 
      success: true,
      message: 'Invigilator assignments generated successfully',
      assignments: assignments,
      allocation_id: allocation_id
    });
  } catch (error) {
    console.error('Error performing smart assignment:', error);
    // Always return JSON response
    res.status(500).json({ 
      error: 'Failed to perform smart assignment',
      details: error.message
    });
  }
});

// Utility function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Utility function to generate smart assignments
function generateSmartAssignments(staff, rooms, days) {
  // Filter out unavailable staff members
  const availableStaff = staff.filter(member => 
    member.availability && member.availability.trim().toLowerCase() === 'yes'
  );
  
  // Check if we have any available staff
  if (availableStaff.length === 0) {
    throw new Error('No available staff members found for assignment');
  }
  
  const assignments = {};
  const staffPool = [...availableStaff]; // Create a copy to avoid modifying original array
  
  // Shuffle staff array to randomize selection
  shuffleArray(staffPool);
  
  // Generate assignments for each day
  for (let day = 1; day <= days; day++) {
    const dayKey = `Day ${day}`;
    assignments[dayKey] = {};
    
    // Shuffle rooms for this day
    const shuffledRooms = [...rooms];
    shuffleArray(shuffledRooms);
    
    // Assign staff to rooms ensuring no duplicates on the same day
    const assignedStaff = new Set();
    const dayAssignments = {};
    
    for (let i = 0; i < shuffledRooms.length; i++) {
      const room = shuffledRooms[i];
      const roomKey = `Room ${room.number || room.id || i + 1}`;
      
      // Find an available staff member who hasn't been assigned today
      let assignedStaffMember = null;
      
      // Try each staff member until we find one not assigned today
      for (let j = 0; j < staffPool.length; j++) {
        const candidateIndex = (i + j) % staffPool.length;
        const candidateStaff = staffPool[candidateIndex];
        
        if (!assignedStaff.has(candidateStaff.name)) {
          assignedStaffMember = candidateStaff;
          assignedStaff.add(candidateStaff.name);
          break;
        }
      }
      
      // If we couldn't find an unassigned staff member (unlikely but possible with few staff),
      // just use the first one
      if (!assignedStaffMember && staffPool.length > 0) {
        assignedStaffMember = staffPool[i % staffPool.length];
      }
      
      dayAssignments[roomKey] = assignedStaffMember.name;
    }
    
    assignments[dayKey] = dayAssignments;
  }
  
  return assignments;
}

// Routes for User Panel
// Get user profile
app.get('/api/user/profile', async (req, res) => {
    try {
        // In a real implementation, this would fetch the authenticated user's profile
        // For now, we'll return mock data but with a note that this should be replaced
        // Let's fetch a sample student from the database to make it more realistic
        const students = await databaseService.getStudents(null, null);
        let userProfile = {
            name: 'John Doe',
            rollNo: 'B1-123',
            section: 'B1',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            enrollmentDate: '2023-08-15',
            note: 'This is mock data. In a real implementation, this would fetch the authenticated user\'s profile from the database.'
        };
        
        // If we have students in the database, use the first one as sample data
        if (students && students.length > 0) {
            const sampleStudent = students[0];
            userProfile = {
                name: sampleStudent.name,
                rollNo: sampleStudent.rollNo,
                section: sampleStudent.section,
                email: sampleStudent.email || 'N/A',
                phone: sampleStudent.phone || 'N/A',
                enrollmentDate: '2023-08-15', // This would come from the database in a real implementation
                note: 'Sample data from database'
            };
        }
        
        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
    }
});

// Update user profile
app.put('/api/user/profile', async (req, res) => {
    try {
        // In a real implementation, this would update the authenticated user's profile
        // For now, we'll just return the updated data
        const updatedProfile = req.body;
        res.json({
            ...updatedProfile,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile', details: error.message });
    }
});

// Get user's exam timetable
app.get('/api/user/exams', async (req, res) => {
    try {
        // Fetch real timetable data from the database
        const timetables = await databaseService.getTimetables();
        
        // Transform the data to match the user exam format
        const exams = timetables.map(timetable => ({
            code: timetable.code,
            subject: timetable.subject,
            date: timetable.date,
            time: timetable.time,
            status: timetable.status
        }));
        
        res.json(exams);
    } catch (error) {
        console.error('Error fetching user exams:', error);
        res.status(500).json({ error: 'Failed to fetch user exams', details: error.message });
    }
});

// Get user's upcoming exams
app.get('/api/user/exams/upcoming', async (req, res) => {
    try {
        // Fetch real timetable data from the database
        const timetables = await databaseService.getTimetables();
        
        // Filter for upcoming exams (next 30 days)
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);
        
        const upcomingExams = timetables
            .filter(timetable => {
                const examDate = new Date(timetable.date);
                return examDate >= today && examDate <= next30Days;
            })
            .map(timetable => ({
                subject: timetable.subject,
                date: timetable.date,
                time: timetable.time,
                status: timetable.status
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
        
        res.json(upcomingExams);
    } catch (error) {
        console.error('Error fetching upcoming exams:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming exams', details: error.message });
    }
});

// Get user's seating arrangements
app.get('/api/user/seating', async (req, res) => {
    try {
        // Fetch real seating plan data from the database
        const seatingPlans = await databaseService.getSeatingPlans();
        
        // Transform the data to match the user seating format
        const arrangements = seatingPlans.map((plan, index) => {
            // Extract room information from the plan
            const planData = plan.planData || {};
            
            // For demonstration purposes, we'll assign a sample seat
            // In a real implementation, this would be the specific seat for the authenticated user
            let seatInfo = 'TBD';
            let roomInfo = 'N/A';
            
            // Extract room information
            if (planData.building && planData.roomNumber) {
                roomInfo = `${planData.building}-${planData.roomNumber}`;
            } else if (planData.building) {
                roomInfo = planData.building;
            } else if (planData.roomNumber) {
                roomInfo = planData.roomNumber;
            } else if (plan.building && plan.roomNumber) {
                // Try to get room info from the plan directly
                roomInfo = `${plan.building}-${plan.roomNumber}`;
            } else if (plan.building) {
                roomInfo = plan.building;
            } else if (plan.roomNumber) {
                roomInfo = plan.roomNumber;
            }
            
            // Extract seat information if available
            if (planData.seats && planData.seats.length > 0) {
                // Find a student seat (not a teacher desk)
                const studentSeat = planData.seats.find(seat => !seat.isTeacherDesk);
                if (studentSeat) {
                    if (studentSeat.row !== undefined && studentSeat.col !== undefined) {
                        seatInfo = `${String.fromCharCode(65 + studentSeat.row)}${studentSeat.col + 1}`; // e.g., A1, B2
                    } else {
                        seatInfo = `Seat ${studentSeat.id || index + 1}`;
                    }
                } else {
                    // If no student seats found, use the first available seat
                    const firstSeat = planData.seats[0];
                    if (firstSeat.row !== undefined && firstSeat.col !== undefined) {
                        seatInfo = `${String.fromCharCode(65 + firstSeat.row)}${firstSeat.col + 1}`; // e.g., A1, B2
                    } else {
                        seatInfo = `Seat ${index + 1}`;
                    }
                }
            }
            
            const examInfo = {
                exam: plan.examCode || `Exam ${index + 1}`,
                room: roomInfo,
                seat: seatInfo
            };
            return examInfo;
        });
        
        res.json(arrangements);
    } catch (error) {
        console.error('Error fetching seating arrangements:', error);
        res.status(500).json({ error: 'Failed to fetch seating arrangements', details: error.message });
    }
});

// Classroom Assignments API Endpoints
// Get all classroom assignments
app.get('/api/classroomAssignments', async (req, res) => {
    try {
        const assignments = await databaseService.getClassroomAssignments();
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching classroom assignments:', error);
        res.status(500).json({ error: 'Failed to fetch classroom assignments', details: error.message });
    }
});

// Get classroom assignment by ID
app.get('/api/classroomAssignments/:id', async (req, res) => {
    try {
        const assignment = await databaseService.getClassroomAssignmentById(req.params.id);
        
        if (!assignment) {
            return res.status(404).json({ error: 'Classroom assignment not found' });
        }
        
        res.json(assignment);
    } catch (error) {
        console.error('Error fetching classroom assignment:', error);
        res.status(500).json({ error: 'Failed to fetch classroom assignment', details: error.message });
    }
});

// Create a new classroom assignment
app.post('/api/classroomAssignments', async (req, res) => {
    try {
        const assignment = req.body;
        
        // Validate required fields
        if (!assignment.assignmentId || !assignment.assignmentName) {
            return res.status(400).json({ error: 'Missing required fields: assignmentId, assignmentName' });
        }
        
        // Check for duplicate assignmentId
        const existingAssignment = await databaseService.getClassroomAssignmentByAssignmentId(assignment.assignmentId);
        if (existingAssignment) {
            return res.status(409).json({ error: 'Classroom assignment with this assignmentId already exists' });
        }
        
        const result = await databaseService.createClassroomAssignment(assignment);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating classroom assignment:', error);
        res.status(500).json({ error: 'Failed to create classroom assignment', details: error.message });
    }
});

// Update a classroom assignment
app.put('/api/classroomAssignments/:id', async (req, res) => {
    try {
        const assignment = await databaseService.getClassroomAssignmentById(req.params.id);
        
        if (!assignment) {
            return res.status(404).json({ error: 'Classroom assignment not found' });
        }
        
        const result = await databaseService.updateClassroomAssignment(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Error updating classroom assignment:', error);
        res.status(500).json({ error: 'Failed to update classroom assignment', details: error.message });
    }
});

// Delete a classroom assignment
app.delete('/api/classroomAssignments/:id', async (req, res) => {
    try {
        const assignment = await databaseService.getClassroomAssignmentById(req.params.id);
        
        if (!assignment) {
            return res.status(404).json({ error: 'Classroom assignment not found' });
        }
        
        // Also delete associated assigned classrooms
        await databaseService.deleteAssignedClassroomsByAssignmentId(assignment.assignmentId);
        
        const result = await databaseService.deleteClassroomAssignment(req.params.id);
        res.json({ message: 'Classroom assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting classroom assignment:', error);
        res.status(500).json({ error: 'Failed to delete classroom assignment', details: error.message });
    }
});

// Assigned Classrooms API Endpoints
// Get all assigned classrooms
app.get('/api/assignedClassrooms', async (req, res) => {
    try {
        const assignments = await databaseService.getAssignedClassrooms();
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms', details: error.message });
    }
});

// Get assigned classrooms by assignment ID
app.get('/api/assignedClassrooms/assignment/:assignmentId', async (req, res) => {
    try {
        const assignments = await databaseService.getAssignedClassroomsByAssignmentId(req.params.assignmentId);
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms', details: error.message });
    }
});

// Get assigned classrooms by roll number
app.get('/api/assignedClassrooms/roll/:rollNo', async (req, res) => {
    try {
        const assignments = await databaseService.getAssignedClassroomsByRollNo(req.params.rollNo);
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms', details: error.message });
    }
});

// Get assigned classrooms with room details
app.get('/api/assignedClassroomsWithRooms', async (req, res) => {
    try {
        // Get all rooms to get capacity information
        const rooms = await databaseService.getRooms();
        const roomMap = {};
        rooms.forEach(room => {
            roomMap[room._id] = room;
        });
        
        // Get all assigned classrooms
        const assignments = await databaseService.getAssignedClassrooms();
        
        // Group assignments by room
        const roomAssignments = {};
        
        assignments.forEach(assignment => {
            const roomId = assignment.roomId;
            if (!roomAssignments[roomId]) {
                const roomInfo = roomMap[roomId] || {};
                roomAssignments[roomId] = {
                    _id: assignment.roomId,
                    number: assignment.roomNumber,
                    building: assignment.building,
                    capacity: roomInfo.capacity || 0,
                    students: []
                };
            }
            roomAssignments[roomId].students.push({
                rollNo: assignment.rollNo,
                name: assignment.studentName
            });
        });
        
        // Convert to array format
        const result = Object.values(roomAssignments);
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching assigned classrooms with rooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms with rooms', details: error.message });
    }
});

// Assigned Classrooms API Endpoints
// Get all assigned classrooms
app.get('/api/assignedClassrooms', async (req, res) => {
    try {
        const assignments = await databaseService.getAssignedClassrooms();
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms', details: error.message });
    }
});

// Get assigned classrooms by roll number
app.get('/api/assignedClassrooms/roll/:rollNo', async (req, res) => {
    try {
        const assignments = await databaseService.getAssignedClassroomsByRollNo(req.params.rollNo);
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms', details: error.message });
    }
});

// Get assigned classrooms with room details
app.get('/api/assignedClassroomsWithRooms', async (req, res) => {
    try {
        // Get all rooms to get capacity information
        const rooms = await databaseService.getRooms();
        const roomMap = {};
        rooms.forEach(room => {
            roomMap[room._id] = room;
        });
        
        // Get all assigned classrooms
        const assignments = await databaseService.getAssignedClassrooms();
        
        // Group assignments by room
        const roomAssignments = {};
        
        assignments.forEach(assignment => {
            const roomId = assignment.roomId;
            if (!roomAssignments[roomId]) {
                const roomInfo = roomMap[roomId] || {};
                roomAssignments[roomId] = {
                    _id: assignment.roomId,
                    number: assignment.roomNumber,
                    building: assignment.building,
                    capacity: roomInfo.capacity || 0,
                    students: []
                };
            }
            roomAssignments[roomId].students.push({
                rollNo: assignment.rollNo,
                name: assignment.studentName
            });
        });
        
        // Convert to array format
        const result = Object.values(roomAssignments);
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching assigned classrooms with rooms:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classrooms with rooms', details: error.message });
    }
});

// Create new assigned classrooms
app.post('/api/assignedClassrooms', async (req, res) => {
    try {
        const assignments = Array.isArray(req.body) ? req.body : [req.body];
        
        // Validate required fields
        for (const assignment of assignments) {
            if (!assignment.assignmentId || !assignment.studentId || !assignment.roomId) {
                return res.status(400).json({ error: 'Missing required fields: assignmentId, studentId, roomId' });
            }
        }
        
        const results = await databaseService.createAssignedClassrooms(assignments);
        res.status(201).json(results);
    } catch (error) {
        console.error('Error creating assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to create assigned classrooms', details: error.message });
    }
});

// Delete assigned classrooms by assignment ID
app.delete('/api/assignedClassrooms/assignment/:assignmentId', async (req, res) => {
    try {
        const result = await databaseService.deleteAssignedClassroomsByAssignmentId(req.params.assignmentId);
        res.json({ message: 'Assigned classrooms deleted successfully', result });
    } catch (error) {
        console.error('Error deleting assigned classrooms:', error);
        res.status(500).json({ error: 'Failed to delete assigned classrooms', details: error.message });
    }
});

// Get user's notifications
app.get('/api/user/notifications', async (req, res) => {
    try {
        const { limit } = req.query;
        
        // Fetch real notifications from the database
        const notifications = await databaseService.getNotifications();
        
        // Transform the data to match the expected format for the frontend
        let formattedNotifications = notifications.map(notification => ({
            id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            timestamp: notification.createdAt
        }));
        
        // Apply limit if provided
        if (limit) {
            formattedNotifications = formattedNotifications.slice(0, parseInt(limit));
        }
        
        res.json(formattedNotifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
    }
});

// Serve static files from the current directory
app.use(express.static('.'));

// Start server
initDB().then(() => {
  let currentPort = PORT;
  
  const startServer = () => {
    const server = app.listen(currentPort, () => {
      console.log(`🚀 Server running on http://localhost:${currentPort}`);
      console.log(`📊 Admin dashboard: http://localhost:${currentPort}/admin-features/dashboard/dashboard.html`);
      console.log(`👥 User dashboard: http://localhost:${currentPort}/user.html`);
      console.log(`💾 Database: MySQL`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${currentPort} is already in use. Trying port ${++currentPort}...`);
        if (currentPort < PORT + 10) { // Try up to 10 ports
          setTimeout(startServer, 1000); // Wait 1 second before retrying
        } else {
          console.error(`Unable to find an available port after trying ${PORT} through ${PORT + 9}`);
          process.exit(1);
        }
      }
    });
  };
  
  startServer();
}).catch(error => {
  console.error('Failed to start server:', error);
  console.error('Please check your database configuration and try again.');
  process.exit(1);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
