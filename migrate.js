// scripts/migrate.js
// Script to migrate data from JSON database to MySQL

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Helper function to handle undefined values
function handleUndefined(value, defaultValue = null) {
  return value !== undefined ? value : defaultValue;
}

// Helper function to convert ISO datetime to MySQL datetime format
function convertToMySQLDateTime(isoValue) {
  if (!isoValue) return null;
  
  // If it's already a Date object, convert it to ISO string first
  let isoString;
  if (isoValue instanceof Date) {
    isoString = isoValue.toISOString();
  } else if (typeof isoValue === 'string') {
    isoString = isoValue;
  } else {
    return null;
  }
  
  // Convert ISO string to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
  return isoString.replace('T', ' ').substring(0, 19);
}

async function migrateData() {
  try {
    console.log('Starting data migration from JSON to MySQL...');
    
    // Read the JSON database
    const dbPath = path.join(__dirname, '..', 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found:', dbPath);
      process.exit(1);
    }
    
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Get database connection
    const connection = await pool.getConnection();
    
    try {
      // Migrate timetables
      if (dbData.timetables && dbData.timetables.length > 0) {
        console.log(`Migrating ${dbData.timetables.length} timetables...`);
        for (const timetable of dbData.timetables) {
          await connection.execute(
            'INSERT INTO timetables (code, subject, date, time, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject = VALUES(subject), date = VALUES(date), time = VALUES(time), status = VALUES(status)',
            [timetable.code, timetable.subject, timetable.date, timetable.time, timetable.status]
          );
        }
        console.log('Timetables migrated successfully');
      }
      
      // Migrate students
      if (dbData.students && dbData.students.length > 0) {
        console.log(`Migrating ${dbData.students.length} students...`);
        for (const student of dbData.students) {
          await connection.execute(
            'INSERT INTO students (rollNo, name, section) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), section = VALUES(section)',
            [student.rollNo, student.name, student.section]
          );
        }
        console.log('Students migrated successfully');
      }
      
      // Migrate seating plans
      if (dbData.seatingPlans && dbData.seatingPlans.length > 0) {
        console.log(`Migrating ${dbData.seatingPlans.length} seating plans...`);
        for (const plan of dbData.seatingPlans) {
          await connection.execute(
            'INSERT INTO seating_plans (planData, examDate, examCode) VALUES (?, ?, ?)',
            [JSON.stringify(plan), handleUndefined(plan.examDate), handleUndefined(plan.examCode)]
          );
        }
        console.log('Seating plans migrated successfully');
      }
      
      // Migrate notifications
      if (dbData.notifications && dbData.notifications.length > 0) {
        console.log(`Migrating ${dbData.notifications.length} notifications...`);
        for (const notification of dbData.notifications) {
          await connection.execute(
            'INSERT INTO notifications (title, message, type, isActive) VALUES (?, ?, ?, ?)',
            [notification.title, notification.message, handleUndefined(notification.type, 'info'), handleUndefined(notification.isActive, true)]
          );
        }
        console.log('Notifications migrated successfully');
      }
      
      // Migrate staff
      if (dbData.staff && dbData.staff.length > 0) {
        console.log(`Migrating ${dbData.staff.length} staff members...`);
        for (const staff of dbData.staff) {
          await connection.execute(
            'INSERT INTO staff (name, department, availability, isActive) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department), availability = VALUES(availability), isActive = VALUES(isActive)',
            [staff.name, handleUndefined(staff.department), JSON.stringify(handleUndefined(staff.availability, [])), handleUndefined(staff.isActive, true)]
          );
        }
        console.log('Staff members migrated successfully');
      }
      
      // Migrate rooms
      if (dbData.rooms && dbData.rooms.length > 0) {
        console.log(`Migrating ${dbData.rooms.length} rooms...`);
        for (const room of dbData.rooms) {
          await connection.execute(
            'INSERT INTO rooms (number, building, capacity, isActive) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE capacity = VALUES(capacity), isActive = VALUES(isActive)',
            [room.number, room.building, room.capacity, handleUndefined(room.isActive, true)]
          );
        }
        console.log('Rooms migrated successfully');
      }
      
      // Migrate users
      if (dbData.users && dbData.users.length > 0) {
        console.log(`Migrating ${dbData.users.length} users...`);
        for (const user of dbData.users) {
          // Generate a name from rollNo if not provided
          const userName = handleUndefined(user.name, user.rollNo || 'Unknown User');
          await connection.execute(
            'INSERT INTO users (rollNo, name, section, role, lastLogin, loginCount, firstLogin) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE lastLogin = VALUES(lastLogin), loginCount = VALUES(loginCount), firstLogin = VALUES(firstLogin)',
            [user.rollNo, userName, handleUndefined(user.section), handleUndefined(user.role, 'user'), convertToMySQLDateTime(handleUndefined(user.lastLogin)), handleUndefined(user.loginCount, 0), handleUndefined(user.firstLogin, true)]
          );
        }
        console.log('Users migrated successfully');
      }
      
      // Migrate sessions
      if (dbData.sessions && dbData.sessions.length > 0) {
        console.log(`Migrating ${dbData.sessions.length} sessions...`);
        for (const session of dbData.sessions) {
          // Only migrate sessions with required fields
          if (session.sessionId && session.role) {
            await connection.execute(
              'INSERT INTO sessions (sessionId, rollNo, userId, role, expiresAt) VALUES (?, ?, ?, ?, ?)',
              [session.sessionId, handleUndefined(session.rollNo), null, session.role, convertToMySQLDateTime(handleUndefined(session.expiresAt, new Date(Date.now() + 24 * 60 * 60 * 1000)))]
            );
          }
        }
        console.log('Sessions migrated successfully');
      }
      
      // Migrate daily assignments
      if (dbData.dailyAssignments && dbData.dailyAssignments.length > 0) {
        console.log(`Migrating ${dbData.dailyAssignments.length} daily assignments...`);
        for (const assignment of dbData.dailyAssignments) {
          await connection.execute(
            'INSERT INTO daily_assignments (day, timeSlot, assignments, generatedBy) VALUES (?, ?, ?, ?)',
            [assignment.day, handleUndefined(assignment.timeSlot, 'General'), JSON.stringify(handleUndefined(assignment.assignments, {})), handleUndefined(assignment.generatedBy)]
          );
        }
        console.log('Daily assignments migrated successfully');
      }
      
      console.log('✅ Data migration completed successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  }
}

// Run migration if script is called directly
if (require.main === module) {
  migrateData().then(() => {
    process.exit(0);
  });
}

module.exports = migrateData;