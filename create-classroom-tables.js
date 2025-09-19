// scripts/create-classroom-tables.js
// Script to create classroom assignment tables

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createClassroomTables() {
  try {
    console.log('Creating classroom assignment tables...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'aicn_user',
      password: process.env.DB_PASSWORD || 'SecurePass123!',
      database: process.env.DB_NAME || 'aicn_app_db',
      ssl: false
    });

    // Create classroom_assignments table
    const createClassroomAssignmentsTable = `
      CREATE TABLE IF NOT EXISTS classroom_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignmentId VARCHAR(50) NOT NULL UNIQUE,
        assignmentName VARCHAR(100) NOT NULL,
        assignmentDate DATE,
        totalStudents INT NOT NULL DEFAULT 0,
        totalRooms INT NOT NULL DEFAULT 0,
        generatedBy VARCHAR(100) DEFAULT 'System',
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment_id (assignmentId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createClassroomAssignmentsTable);
    console.log('✅ Created classroom_assignments table');
    
    // Create assigned_classrooms table
    const createAssignedClassroomsTable = `
      CREATE TABLE IF NOT EXISTS assigned_classrooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignmentId VARCHAR(50) NOT NULL,
        roomId INT NOT NULL,
        roomNumber VARCHAR(20) NOT NULL,
        building VARCHAR(100) NOT NULL,
        studentId INT NOT NULL,
        rollNo VARCHAR(20) NOT NULL,
        studentName VARCHAR(100) NOT NULL,
        assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assignedBy VARCHAR(100) DEFAULT 'System',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_assignment_student (assignmentId, studentId),
        FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createAssignedClassroomsTable);
    console.log('✅ Created assigned_classrooms table');
    
    // Create indexes for better query performance
    const createIndexes = [
      'CREATE INDEX idx_classroom_assignments_id ON classroom_assignments (assignmentId)',
      'CREATE INDEX idx_classroom_assignments_date ON classroom_assignments (assignmentDate)',
      'CREATE INDEX idx_classroom_assignments_active ON classroom_assignments (isActive)',
      'CREATE INDEX idx_assigned_classrooms_assignment ON assigned_classrooms (assignmentId)',
      'CREATE INDEX idx_assigned_classrooms_room ON assigned_classrooms (roomId)',
      'CREATE INDEX idx_assigned_classrooms_student ON assigned_classrooms (studentId)',
      'CREATE INDEX idx_assigned_classrooms_rollno ON assigned_classrooms (rollNo)'
    ];
    
    for (const indexQuery of createIndexes) {
      try {
        await connection.execute(indexQuery);
      } catch (error) {
        // Index might already exist, which is fine
        console.log(`Note: ${error.message}`);
      }
    }
    
    console.log('✅ Created indexes for classroom assignment tables');
    
    await connection.end();
    console.log('✅ All classroom assignment tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create classroom assignment tables:', error.message);
    console.error('Error code:', error.code);
  }
}

// Run if called directly
if (require.main === module) {
  createClassroomTables().then(() => {
    process.exit(0);
  });
}

module.exports = createClassroomTables;