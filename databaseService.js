// services/databaseService.js
// Database service for MySQL operations

const { pool, checkConnectionHealth, getPoolStats } = require('../config/db');

class DatabaseService {
  // Helper function to convert JavaScript Date to MySQL datetime format
  toMySQLDateTime(date) {
    if (!date) return null;
    if (typeof date === 'string') {
      // Convert ISO string to MySQL datetime format
      return date.replace('T', ' ').substring(0, 19);
    }
    if (date instanceof Date) {
      // Convert Date object to MySQL datetime format
      return date.toISOString().replace('T', ' ').substring(0, 19);
    }
    return null;
  }

  // Helper function to get database status with enhanced error handling
  async getDatabaseStatus() {
    try {
      // First check connection health
      const health = await checkConnectionHealth();
      if (health.status !== 'healthy') {
        return {
          status: 'disconnected',
          error: health.error || 'Database connection unhealthy',
          timestamp: new Date().toISOString()
        };
      }

      const connection = await pool.getConnection();
      
      // Get database name
      let databaseName = null;
      try {
        const [dbRows] = await connection.execute('SELECT DATABASE() as databaseName');
        databaseName = dbRows && dbRows[0] ? dbRows[0].databaseName : null;
      } catch (dbError) {
        console.error('Error fetching database name:', dbError);
        databaseName = null;
      }
      
      // Get table information
      let tables = [];
      try {
        [tables] = await connection.execute('SHOW TABLES');
      } catch (tableError) {
        console.error('Error fetching tables:', tableError);
        tables = [];
      }
      
      // Get row counts for major tables
      const tableCounts = {};
      const importantTables = ['users', 'students', 'timetables', 'staff', 'rooms', 'seating_plans', 'sessions', 'notifications', 'daily_assignments', 'staff_allocations'];
      
      for (const table of importantTables) {
        try {
          const [countRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
          tableCounts[table] = countRows[0].count;
        } catch (error) {
          tableCounts[table] = 'Table not found';
        }
      }
      
      connection.release();
      
      // Get pool statistics
      const poolStats = getPoolStats();
      
      return {
        status: 'connected',
        database: databaseName,
        tables: tables && Array.isArray(tables) ? tables.length : 0,
        tableList: tables && Array.isArray(tables) ? tables.map(table => Object.values(table)[0]) : [],
        tableCounts: tableCounts,
        poolStats: poolStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database status check failed:', error);
      return {
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Generic method to execute queries with enhanced error handling
  async executeQuery(query, params = []) {
    let connection;
    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timed out after 30 seconds')), 30000);
      });
      
      const queryPromise = (async () => {
        connection = await pool.getConnection();
        const [results] = await connection.execute(query, params);
        return results;
      })();
      
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      // Log detailed error information
      console.error('Database query failed:');
      console.error('  Query:', query);
      console.error('  Params:', params);
      console.error('  Error:', error.message);
      
      // Provide more specific error messages
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Database connection refused. Check if MySQL server is running.');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error('Access denied to database. Check username and password.');
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        throw new Error('Database does not exist. Check database name.');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Database host not found. Check database host configuration.');
      } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        throw new Error('Database connection was lost. Please try again.');
      } else if (error.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        throw new Error('Database connection failed. Please restart the application.');
      } else if (error.errno === 'ETIMEDOUT' || error.message.includes('timed out')) {
        throw new Error('Database connection timed out. Check network connectivity.');
      } else if (error.message.includes('getaddrinfo')) {
        throw new Error('DNS resolution failed. Check database host configuration.');
      }
      
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Students operations
  async getStudents(searchTerm = null, sectionFilter = null) {
    let query = 'SELECT id as _id, rollNo, name, section, email, phone FROM students';
    const params = [];
    
    // Add filtering conditions
    const conditions = [];
    
    if (searchTerm) {
      conditions.push('(rollNo LIKE ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    if (sectionFilter) {
      conditions.push('section = ?');
      params.push(sectionFilter);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY rollNo';
    
    try {
      const results = await this.executeQuery(query, params);
      console.log(`Fetched ${results.length} students with search: ${searchTerm}, section: ${sectionFilter}`);
      return results;
    } catch (error) {
      console.error('Error in getStudents:', error);
      throw error;
    }
  }

  async getStudentById(id) {
    const rows = await this.executeQuery('SELECT id as _id, rollNo, name, section, email, phone FROM students WHERE id = ?', [id]);
    return rows[0];
  }

  async getStudentByRollNo(rollNo) {
    const [rows] = await pool.execute('SELECT id as _id, rollNo, name, section, email, phone FROM students WHERE rollNo = ?', [rollNo]);
    return rows[0];
  }

  async createStudent(student) {
    const { rollNo, name, section, email, phone } = student;
    try {
      // Clean up any trailing carriage returns from CSV parsing
      const cleanEmail = email ? email.replace(/\r$/, '') : email;
      const cleanPhone = phone ? phone.replace(/\r$/, '') : phone;
      
      const result = await this.executeQuery(
        'INSERT INTO students (rollNo, name, section, email, phone) VALUES (?, ?, ?, ?, ?)',
        [rollNo, name, section, cleanEmail, cleanPhone]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Student with this roll number already exists');
      }
      throw error;
    }
  }

  // Bulk create students with better error handling
  async createStudents(students) {
    const results = [];
    
    // Validate input
    if (!Array.isArray(students) || students.length === 0) {
      return results;
    }
    
    for (const student of students) {
      try {
        // Skip empty rows
        if (!student.rollNo && !student.name && !student.section) {
          results.push({ success: false, error: 'Empty row', student });
          continue;
        }
        
        // Validate required fields
        if (!student.rollNo || !student.name || !student.section) {
          results.push({ success: false, error: 'Missing required fields: rollNo, name, section', student });
          continue;
        }
        
        // Validate section
        const validSections = ['B1', 'B2', 'B3'];
        if (!validSections.includes(student.section)) {
          results.push({ success: false, error: `Invalid section: ${student.section}. Must be one of: B1, B2, B3`, student });
          continue;
        }
        
        // Clean up any trailing carriage returns from CSV parsing
        const cleanStudent = {
          ...student,
          email: student.email ? student.email.replace(/\r$/, '') : student.email,
          phone: student.phone ? student.phone.replace(/\r$/, '') : student.phone
        };
        
        const result = await this.createStudent(cleanStudent);
        results.push({ success: true, result, student: cleanStudent });
      } catch (error) {
        // Handle duplicate entry error specifically
        if (error.code === 'ER_DUP_ENTRY') {
          results.push({ success: false, error: `Student with roll number ${student.rollNo} already exists`, student });
        } else {
          results.push({ success: false, error: error.message, student });
        }
      }
    }
    return results;
  }

  async updateStudent(id, student) {
    const { rollNo, name, section, email, phone } = student;
    const [result] = await pool.execute(
      'UPDATE students SET rollNo = ?, name = ?, section = ?, email = ?, phone = ? WHERE id = ?',
      [rollNo, name, section, email, phone, id]
    );
    return result;
  }

  async deleteStudent(id) {
    const [result] = await pool.execute('DELETE FROM students WHERE id = ?', [id]);
    return result;
  }

  // Clear all students
  async clearStudents() {
    const [result] = await pool.execute('DELETE FROM students');
    return result;
  }

  // Get student statistics
  async getStudentStats() {
    try {
      const totalStudentsResult = await this.executeQuery('SELECT COUNT(*) as count FROM students');
      const sectionStatsResult = await this.executeQuery(`
        SELECT 
          section,
          COUNT(*) as count
        FROM students 
        WHERE section IN ('B1', 'B2', 'B3')
        GROUP BY section
      `);
      
      const classesResult = await this.executeQuery('SELECT COUNT(DISTINCT section) as count FROM students');
      
      // Initialize section counts
      const sectionCounts = {
        'B1': 0,
        'B2': 0,
        'B3': 0
      };
      
      // Fill in actual counts - check if sectionStatsResult exists and is an array
      if (sectionStatsResult && Array.isArray(sectionStatsResult)) {
        sectionStatsResult.forEach(row => {
          if (row && row.section) {
            sectionCounts[row.section] = row.count || 0;
          }
        });
      }
      
      // Ensure we handle cases where results might be undefined
      const totalStudents = totalStudentsResult && totalStudentsResult.length > 0 ? 
        (totalStudentsResult[0].count || 0) : 0;
        
      const totalClasses = classesResult && classesResult.length > 0 ? 
        (classesResult[0].count || 0) : 0;
      
      return {
        totalStudents: totalStudents,
        sectionCounts,
        totalClasses: totalClasses
      };
    } catch (error) {
      console.error('Error fetching student stats:', error);
      throw error;
    }
  }

  // Timetables operations
  async getTimetables() {
    const [rows] = await pool.execute('SELECT id as _id, code, subject, date, time, status FROM timetables');
    return rows;
  }

  async getTimetableById(id) {
    const [rows] = await pool.execute('SELECT id as _id, code, subject, date, time, status FROM timetables WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async getTimetableByCode(code) {
    const [rows] = await pool.execute('SELECT id as _id, code, subject, date, time, status FROM timetables WHERE code = ?', [code]);
    return rows[0];
  }

  async createTimetable(timetable) {
    const { code, subject, date, time, status } = timetable;
    try {
      const [result] = await pool.execute(
        'INSERT INTO timetables (code, subject, date, time, status) VALUES (?, ?, ?, ?, ?)',
        [code, subject, date, time, status]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Timetable with this code already exists');
      }
      throw error;
    }
  }

  // Bulk create timetables
  async createTimetables(timetables) {
    const results = [];
    for (const timetable of timetables) {
      try {
        // Skip empty rows
        if (!timetable.code && !timetable.subject && !timetable.date && !timetable.time && !timetable.status) {
          continue;
        }
        
        // Validate required fields
        if (!timetable.code || !timetable.subject || !timetable.date || !timetable.time || !timetable.status) {
          results.push({ success: false, error: 'Missing required fields: code, subject, date, time, status', timetable });
          continue;
        }
        
        const result = await this.createTimetable(timetable);
        results.push({ success: true, result, timetable });
      } catch (error) {
        results.push({ success: false, error: error.message, timetable });
      }
    }
    return results;
  }

  async updateTimetable(id, timetable) {
    // Get the existing timetable entry to preserve unchanged fields
    const existingTimetable = await this.getTimetableById(id);
    
    // Check if the timetable entry exists
    if (!existingTimetable) {
      throw new Error('Timetable entry not found');
    }
    
    // Merge the existing timetable data with the updates
    const updatedTimetable = {
      code: timetable.code !== undefined ? timetable.code : existingTimetable.code,
      subject: timetable.subject !== undefined ? timetable.subject : existingTimetable.subject,
      date: timetable.date !== undefined ? timetable.date : existingTimetable.date,
      time: timetable.time !== undefined ? timetable.time : existingTimetable.time,
      status: timetable.status !== undefined ? timetable.status : existingTimetable.status
    };
    
    const [result] = await pool.execute(
      'UPDATE timetables SET code = ?, subject = ?, date = ?, time = ?, status = ? WHERE id = ?',
      [updatedTimetable.code, updatedTimetable.subject, updatedTimetable.date, updatedTimetable.time, updatedTimetable.status, id]
    );
    return result;
  }

  async deleteTimetable(id) {
    const [result] = await pool.execute('DELETE FROM timetables WHERE id = ?', [id]);
    return result;
  }

  // Clear all timetables
  async clearTimetables() {
    const [result] = await pool.execute('DELETE FROM timetables');
    return result;
  }

  // Seating plans operations
  async getSeatingPlans() {
    try {
      const [rows] = await pool.execute('SELECT id as _id, planData, examDate, examCode, createdAt FROM seating_plans ORDER BY createdAt DESC');
      return rows.map(row => {
        // For JSON type columns, MySQL automatically parses the JSON
        // So we don't need to parse it manually
        // Create a new object with the planData properties
        let planData = row.planData || {};
        
        // Ensure planData is an object (not a string)
        if (typeof planData === 'string') {
          try {
            planData = JSON.parse(planData);
          } catch (parseError) {
            console.error('Error parsing planData:', parseError);
            planData = {};
          }
        }
        
        // Handle nested planData structure that might occur after shuffling
        // If planData contains another planData object, use the inner one
        if (planData.planData && typeof planData.planData === 'object') {
          planData = planData.planData;
        }
        
        return {
          _id: row._id,
          examDate: row.examDate,
          examCode: row.examCode,
          createdAt: row.createdAt,
          planData: planData, // Include the full planData object
          // Add planData properties for backward compatibility
          roomId: planData.roomId,
          building: planData.building,
          roomNumber: planData.roomNumber,
          capacity: planData.capacity,
          rows: planData.rows,
          columns: planData.columns,
          seats: planData.seats
        };
      });
    } catch (error) {
      console.error('Error in getSeatingPlans:', error);
      throw error;
    }
  }

  async createSeatingPlan(seatingPlan) {
    const { examDate, examCode, planData } = seatingPlan;
    try {
      // Ensure planData is properly structured and stringified for JSON column
      let processedPlanData = planData;
      
      // If planData is already stringified, parse it first to ensure proper structure
      if (typeof planData === 'string') {
        try {
          processedPlanData = JSON.parse(planData);
        } catch (parseError) {
          console.error('Error parsing planData:', parseError);
          throw new Error('Invalid planData format');
        }
      }
      
      // Stringify the planData for storage
      const stringifiedPlanData = JSON.stringify(processedPlanData);
      
      const [result] = await pool.execute(
        'INSERT INTO seating_plans (planData, examDate, examCode) VALUES (?, ?, ?)',
        [stringifiedPlanData, examDate, examCode]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Seating plan for this exam date and code already exists');
      }
      throw error;
    }
  }

  // Add this new function to check for duplicate seating plans
  async getSeatingPlanByDateAndCode(examDate, examCode) {
    const [rows] = await pool.execute('SELECT id as _id, planData, examDate, examCode, createdAt FROM seating_plans WHERE examDate = ? AND examCode = ?', [examDate, examCode]);
    return rows[0];
  }

  async deleteSeatingPlan(id) {
    const [result] = await pool.execute('DELETE FROM seating_plans WHERE id = ?', [id]);
    return result;
  }

  async clearSeatingPlans() {
    const [result] = await pool.execute('DELETE FROM seating_plans');
    return result;
  }

  // Notifications operations
  async getNotifications() {
    const [rows] = await pool.execute('SELECT id as _id, title, message, type, priority, recipientType, status, sendEmail, isActive, createdAt FROM notifications ORDER BY createdAt DESC');
    return rows;
  }

  async getNotificationById(id) {
    const [rows] = await pool.execute('SELECT id as _id, title, message, type, priority, recipientType, status, sendEmail, isActive, createdAt FROM notifications WHERE id = ?', [id]);
    return rows[0];
  }

  async createNotification(notification) {
    const { title, message, type, priority, recipientType, status, sendEmail, isActive } = notification;
    try {
      const [result] = await pool.execute(
        'INSERT INTO notifications (title, message, type, priority, recipientType, status, sendEmail, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, message, type, priority, recipientType, status, sendEmail, isActive]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Notification with this title and message already exists');
      }
      throw error;
    }
  }

  // Add this new function to check for duplicate notifications
  async getNotificationByTitleAndMessage(title, message) {
    const [rows] = await pool.execute('SELECT id as _id, title, message, type, priority, recipientType, status, sendEmail, isActive, createdAt FROM notifications WHERE title = ? AND message = ?', [title, message]);
    return rows[0];
  }

  // Bulk create notifications
  async createNotifications(notifications) {
    const results = [];
    for (const notification of notifications) {
      try {
        // Skip empty rows
        if (!notification.title && !notification.message && !notification.type) {
          continue;
        }
        
        // Validate required fields
        if (!notification.message) {
          results.push({ success: false, error: 'Missing required field: message', notification });
          continue;
        }
        
        const result = await this.createNotification(notification);
        results.push({ success: true, result, notification });
      } catch (error) {
        results.push({ success: false, error: error.message, notification });
      }
    }
    return results;
  }

  async deleteNotification(id) {
    const [result] = await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);
    return result;
  }

  // Clear all notifications
  async clearNotifications() {
    const [result] = await pool.execute('DELETE FROM notifications');
    return result;
  }

  // Staff operations
  async getStaff() {
    const [rows] = await pool.execute('SELECT id as _id, name, department, email, phone, availability, isActive FROM staff');
    return rows.map(row => ({
      ...row,
      email: row.email || null,
      phone: row.phone || null,
      availability: row.availability && row.availability.trim().toLowerCase() === 'no' ? 'No' : 'Yes'  // Only default to 'Yes' if explicitly 'No'
    }));
  }

  async getStaffById(id) {
    const [rows] = await pool.execute('SELECT id as _id, name, department, email, phone, availability, isActive FROM staff WHERE id = ?', [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        email: rows[0].email || null,
        phone: rows[0].phone || null,
        availability: rows[0].availability && rows[0].availability.trim().toLowerCase() === 'no' ? 'No' : 'Yes'  // Only default to 'Yes' if explicitly 'No'
      };
    }
    return null;
  }

  // Add this new function to check for duplicate staff by name
  async getStaffByName(name) {
    const [rows] = await pool.execute('SELECT id as _id, name, department, email, phone, availability, isActive FROM staff WHERE name = ?', [name]);
    if (rows[0]) {
      return {
        ...rows[0],
        email: rows[0].email || null,
        phone: rows[0].phone || null,
        availability: rows[0].availability && rows[0].availability.trim().toLowerCase() === 'no' ? 'No' : 'Yes'  // Only default to 'Yes' if explicitly 'No'
      };
    }
    return null;
  }

  async createStaff(staff) {
    const { name, department, email, phone, availability = 'Yes', isActive = true } = staff;
    try {
      const [result] = await pool.execute(
        'INSERT INTO staff (name, department, email, phone, availability, isActive) VALUES (?, ?, ?, ?, ?, ?)',
        [name, department, email, phone, availability, isActive]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Staff member with this name already exists');
      }
      throw error;
    }
  }

  async updateStaff(id, staff) {
    // Get the existing staff member to preserve unchanged fields
    const existingStaff = await this.getStaffById(id);
    
    // Merge the existing staff data with the updates
    const updatedStaff = {
      name: staff.name !== undefined ? staff.name : existingStaff.name,
      department: staff.department !== undefined ? staff.department : existingStaff.department,
      email: staff.email !== undefined ? staff.email : existingStaff.email,
      phone: staff.phone !== undefined ? staff.phone : existingStaff.phone,
      availability: staff.availability !== undefined ? staff.availability : existingStaff.availability,
      isActive: staff.isActive !== undefined ? staff.isActive : existingStaff.isActive
    };
    
    const [result] = await pool.execute(
      'UPDATE staff SET name = ?, department = ?, email = ?, phone = ?, availability = ?, isActive = ? WHERE id = ?',
      [updatedStaff.name, updatedStaff.department, updatedStaff.email, updatedStaff.phone, updatedStaff.availability, updatedStaff.isActive, id]
    );
    return result;
  }

  async deleteStaff(id) {
    const [result] = await pool.execute('DELETE FROM staff WHERE id = ?', [id]);
    return result;
  }

  // Clear all staff
  async clearStaff() {
    const [result] = await pool.execute('DELETE FROM staff');
    return result;
  }

  // Rooms operations
  async getRooms() {
    const [rows] = await pool.execute('SELECT id as _id, number, building, capacity FROM rooms');
    return rows;
  }

  async getRoomById(id) {
    const [rows] = await pool.execute('SELECT id as _id, number, building, capacity FROM rooms WHERE id = ?', [id]);
    return rows[0];
  }

  // Add this new function to check for duplicate rooms by number and building
  async getRoomByNumberAndBuilding(number, building) {
    const [rows] = await pool.execute('SELECT id as _id, number, building, capacity FROM rooms WHERE number = ? AND building = ?', [number, building]);
    return rows[0];
  }

  async createRoom(room) {
    const { number, building, capacity } = room;
    
    // Ensure all parameters are properly defined
    const safeNumber = number || null;
    const safeBuilding = building || null;
    const safeCapacity = capacity !== undefined ? capacity : null;
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO rooms (number, building, capacity) VALUES (?, ?, ?)',
        [safeNumber, safeBuilding, safeCapacity]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Room with this number and building already exists');
      }
      throw error;
    }
  }

  // Bulk create rooms
  async createRooms(rooms) {
    const results = [];
    for (const room of rooms) {
      try {
        // Skip empty rows
        if (!room.number && !room.building && !room.capacity) {
          continue;
        }
        
        // Validate required fields
        if (!room.number || !room.building || !room.capacity) {
          results.push({ success: false, error: 'Missing required fields: number, building, capacity', room });
          continue;
        }
        
        const result = await this.createRoom(room);
        results.push({ success: true, result, room });
      } catch (error) {
        results.push({ success: false, error: error.message, room });
      }
    }
    return results;
  }

  async updateRoom(id, room) {
    // Extract only the fields we want to update
    const { number, building, capacity } = room;
    
    // Use default values if fields are not provided
    const updateFields = [];
    const updateValues = [];
    
    if (number !== undefined) {
      updateFields.push('number = ?');
      updateValues.push(number);
    }
    
    if (building !== undefined) {
      updateFields.push('building = ?');
      updateValues.push(building);
    }
    
    if (capacity !== undefined) {
      updateFields.push('capacity = ?');
      updateValues.push(capacity);
    }
    
    // If no fields to update, return early
    if (updateFields.length === 0) {
      return { affectedRows: 0 };
    }
    
    // Add the id for the WHERE clause
    updateValues.push(id);
    
    const [result] = await pool.execute(
      `UPDATE rooms SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    return result;
  }

  async deleteRoom(id) {
    const [result] = await pool.execute('DELETE FROM rooms WHERE id = ?', [id]);
    return result;
  }

  // Clear all rooms
  async clearRooms() {
    const [result] = await pool.execute('DELETE FROM rooms');
    return result;
  }

  // Daily assignments operations
  async getDailyAssignments() {
    const [rows] = await pool.execute('SELECT id as _id, day, timeSlot, assignments, generatedAt, generatedBy FROM daily_assignments');
    return rows.map(row => ({
      ...row,
      assignments: JSON.parse(row.assignments)
    }));
  }

  async createDailyAssignment(assignment) {
    const { day, timeSlot, assignments, generatedAt, generatedBy } = assignment;
    const [result] = await pool.execute(
      'INSERT INTO daily_assignments (day, timeSlot, assignments, generatedAt, generatedBy) VALUES (?, ?, ?, ?, ?)',
      [day, timeSlot, JSON.stringify(assignments), this.toMySQLDateTime(generatedAt), generatedBy]
    );
    return result;
  }

  async deleteDailyAssignment(id) {
    const [result] = await pool.execute('DELETE FROM daily_assignments WHERE id = ?', [id]);
    return result;
  }

  // Clear all daily assignments
  async clearDailyAssignments() {
    const [result] = await pool.execute('DELETE FROM daily_assignments');
    return result;
  }

  // Bulk create staff members
  async createStaffMembers(staffMembers) {
    const results = [];
    for (const staff of staffMembers) {
      try {
        // Skip empty rows
        if (!staff.name && !staff.department && !staff.email && !staff.phone) {
          continue;
        }
        
        // Validate required fields
        if (!staff.name) {
          results.push({ success: false, error: 'Missing required field: name', staff });
          continue;
        }
        
        // Check for duplicate staff by name
        const existingStaff = await this.getStaffByName(staff.name);
        if (existingStaff) {
          results.push({ success: false, error: 'Staff member with this name already exists', staff });
          continue;
        }
        
        const result = await this.createStaff(staff);
        results.push({ success: true, result, staff });
      } catch (error) {
        results.push({ success: false, error: error.message, staff });
      }
    }
    return results;
  }

  // Staff allocations operations
  async getStaffAllocations() {
    try {
      const [rows] = await pool.execute('SELECT id as _id, allocationData, date, createdAt FROM staff_allocations ORDER BY createdAt DESC');
      // Ensure we always return an array
      if (!rows || rows.length === 0) {
        return [];
      }
      return rows.map(row => {
        try {
          return {
            ...row,
            ...JSON.parse(row.allocationData)
          };
        } catch (parseError) {
          console.error('Error parsing allocationData for row:', row);
          // Return the row with empty assignments if parsing fails
          return {
            ...row,
            assignments: {}
          };
        }
      });
    } catch (error) {
      console.error('Error in getStaffAllocations:', error);
      // Always return an array even in case of error
      return [];
    }
  }

  async getStaffAllocationById(id) {
    try {
      const [rows] = await pool.execute('SELECT id as _id, allocationData, date, createdAt FROM staff_allocations WHERE id = ?', [id]);
      if (rows[0]) {
        try {
          return {
            ...rows[0],
            ...JSON.parse(rows[0].allocationData)
          };
        } catch (parseError) {
          console.error('Error parsing allocationData for row:', rows[0]);
          // Return the row with empty assignments if parsing fails
          return {
            ...rows[0],
            assignments: {}
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error in getStaffAllocationById:', error);
      return null;
    }
  }

  async getStaffAllocationByDate(date) {
    try {
      const [rows] = await pool.execute('SELECT id as _id, allocationData, date, createdAt FROM staff_allocations WHERE date = ?', [date]);
      if (rows[0]) {
        try {
          return {
            ...rows[0],
            ...JSON.parse(rows[0].allocationData)
          };
        } catch (parseError) {
          console.error('Error parsing allocationData for row:', rows[0]);
          // Return the row with empty assignments if parsing fails
          return {
            ...rows[0],
            assignments: {}
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error in getStaffAllocationByDate:', error);
      return null;
    }
  }

  async createStaffAllocation(allocation) {
    const { date, ...allocationData } = allocation;
    try {
      const [result] = await pool.execute(
        'INSERT INTO staff_allocations (allocationData, date) VALUES (?, ?)',
        [JSON.stringify(allocationData), date]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Staff allocation for this date already exists');
      }
      throw error;
    }
  }

  async deleteStaffAllocation(id) {
    const [result] = await pool.execute('DELETE FROM staff_allocations WHERE id = ?', [id]);
    return result;
  }

  // Clear all staff allocations
  async clearStaffAllocations() {
    const [result] = await pool.execute('DELETE FROM staff_allocations');
    return result;
  }

  // Enhanced method to get all table data for export
  async getTableData(tableName) {
    const validTables = ['students', 'timetables', 'staff', 'rooms', 'seating_plans', 'notifications', 'daily_assignments', 'staff_allocations'];
    
    if (!validTables.includes(tableName)) {
      throw new Error('Invalid table name');
    }
    
    try {
      const query = `SELECT * FROM ${tableName}`;
      const results = await this.executeQuery(query);
      return results;
    } catch (error) {
      throw new Error(`Failed to fetch data from ${tableName}: ${error.message}`);
    }
  }

  // Enhanced method to import data into a table
  async importTableData(tableName, data, overwrite = false) {
    const validTables = ['students', 'timetables', 'staff', 'rooms', 'seating_plans', 'notifications', 'daily_assignments', 'staff_allocations', 'classroom_assignments', 'assigned_classrooms'];
    
    if (!validTables.includes(tableName)) {
      throw new Error('Invalid table name');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    if (overwrite) {
      // Clear existing data based on table
      switch (tableName) {
        case 'students':
          await this.clearStudents();
          break;
        case 'timetables':
          await this.clearTimetables();
          break;
        case 'staff':
          await this.clearStaff();
          break;
        case 'rooms':
          await this.clearRooms();
          break;
        case 'seating_plans':
          await this.clearSeatingPlans();
          break;
        case 'notifications':
          await this.clearNotifications();
          break;
        case 'daily_assignments':
          await this.clearDailyAssignments();
          break;
        case 'staff_allocations':
          await this.clearStaffAllocations();
          break;
        case 'classroom_assignments':
          await this.clearClassroomAssignments();
          break;
        case 'assigned_classrooms':
          await this.clearAssignedClassrooms();
          break;
      }
    }
    
    // Import data based on table
    let results = [];
    switch (tableName) {
      case 'students':
        results = await this.createStudents(data);
        break;
      case 'timetables':
        results = await this.createTimetables(data);
        break;
      case 'staff':
        results = await this.createStaffMembers(data);
        break;
      case 'rooms':
        results = await this.createRooms(data);
        break;
      case 'notifications':
        results = await this.createNotifications(data);
        break;
      case 'classroom_assignments':
        results = await this.createClassroomAssignments(data);
        break;
      case 'assigned_classrooms':
        results = await this.createAssignedClassrooms(data);
        break;
      default:
        // For other tables, we'll need custom import logic
        throw new Error(`Import not yet implemented for table: ${tableName}`);
    }
    
    return results;
  }

  // Classroom Assignments operations
  async getClassroomAssignments() {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive, createdAt FROM classroom_assignments ORDER BY createdAt DESC');
    return rows;
  }

  async getClassroomAssignmentById(id) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive, createdAt FROM classroom_assignments WHERE id = ?', [id]);
    return rows[0];
  }

  async getClassroomAssignmentByAssignmentId(assignmentId) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive, createdAt FROM classroom_assignments WHERE assignmentId = ?', [assignmentId]);
    return rows[0];
  }

  async createClassroomAssignment(assignment) {
    const { assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive } = assignment;
    try {
      const [result] = await pool.execute(
        'INSERT INTO classroom_assignments (assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Classroom assignment with this assignmentId already exists');
      }
      throw error;
    }
  }

  async createClassroomAssignments(assignments) {
    const results = [];
    for (const assignment of assignments) {
      try {
        // Skip empty rows
        if (!assignment.assignmentId && !assignment.assignmentName) {
          continue;
        }
        
        const result = await this.createClassroomAssignment(assignment);
        results.push({ success: true, result, assignment });
      } catch (error) {
        results.push({ success: false, error: error.message, assignment });
      }
    }
    return results;
  }

  async updateClassroomAssignment(id, assignment) {
    const { assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive } = assignment;
    try {
      const [result] = await pool.execute(
        'UPDATE classroom_assignments SET assignmentId = ?, assignmentName = ?, assignmentDate = ?, totalStudents = ?, totalRooms = ?, generatedBy = ?, isActive = ? WHERE id = ?',
        [assignmentId, assignmentName, assignmentDate, totalStudents, totalRooms, generatedBy, isActive, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteClassroomAssignment(id) {
    const [result] = await pool.execute('DELETE FROM classroom_assignments WHERE id = ?', [id]);
    return result;
  }

  async clearClassroomAssignments() {
    const [result] = await pool.execute('DELETE FROM classroom_assignments');
    return result;
  }

  // Assigned Classrooms operations
  async getAssignedClassrooms() {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedAt, assignedBy, createdAt FROM assigned_classrooms ORDER BY assignmentId, roomId, rollNo');
    return rows;
  }

  async getAssignedClassroomsByAssignmentId(assignmentId) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedAt, assignedBy, createdAt FROM assigned_classrooms WHERE assignmentId = ? ORDER BY roomId, rollNo', [assignmentId]);
    return rows;
  }

  async getAssignedClassroomsByRoomId(roomId) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedAt, assignedBy, createdAt FROM assigned_classrooms WHERE roomId = ? ORDER BY assignmentId, rollNo', [roomId]);
    return rows;
  }

  async getAssignedClassroomsByStudentId(studentId) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedAt, assignedBy, createdAt FROM assigned_classrooms WHERE studentId = ? ORDER BY assignmentId, roomId', [studentId]);
    return rows;
  }

  async getAssignedClassroomsByRollNo(rollNo) {
    const [rows] = await pool.execute('SELECT id as _id, assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedAt, assignedBy, createdAt FROM assigned_classrooms WHERE rollNo = ? ORDER BY assignmentId, roomId', [rollNo]);
    return rows;
  }

  async createAssignedClassroom(assignment) {
    const { assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedBy } = assignment;
    try {
      const [result] = await pool.execute(
        'INSERT INTO assigned_classrooms (assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [assignmentId, roomId, roomNumber, building, studentId, rollNo, studentName, assignedBy]
      );
      return result;
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Student already assigned to this assignment');
      }
      throw error;
    }
  }

  async createAssignedClassrooms(assignments) {
    const results = [];
    for (const assignment of assignments) {
      try {
        // Skip empty rows
        if (!assignment.assignmentId && !assignment.studentId) {
          continue;
        }
        
        const result = await this.createAssignedClassroom(assignment);
        results.push({ success: true, result, assignment });
      } catch (error) {
        results.push({ success: false, error: error.message, assignment });
      }
    }
    return results;
  }

  async deleteAssignedClassroom(id) {
    const [result] = await pool.execute('DELETE FROM assigned_classrooms WHERE id = ?', [id]);
    return result;
  }

  async clearAssignedClassrooms() {
    const [result] = await pool.execute('DELETE FROM assigned_classrooms');
    return result;
  }

  async deleteAssignedClassroomsByAssignmentId(assignmentId) {
    const [result] = await pool.execute('DELETE FROM assigned_classrooms WHERE assignmentId = ?', [assignmentId]);
    return result;
  }
}

module.exports = new DatabaseService();