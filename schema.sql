-- new-database-setup.sql
-- SQL script to create the AICN application database and user

-- Create database with proper character set and collation
CREATE DATABASE IF NOT EXISTS `aicn_app_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with localhost access
CREATE USER IF NOT EXISTS 'aicn_user'@'localhost' IDENTIFIED BY 'SecurePass123!';

-- Create user with remote access (optional, for development)
CREATE USER IF NOT EXISTS 'aicn_user'@'%' IDENTIFIED BY 'SecurePass123!';

-- Grant privileges to the user for localhost
GRANT ALL PRIVILEGES ON `aicn_app_db`.* TO 'aicn_user'@'localhost';

-- Grant privileges to the user for remote access
GRANT ALL PRIVILEGES ON `aicn_app_db`.* TO 'aicn_user'@'%';

-- Apply the changes
FLUSH PRIVILEGES;

-- Verify setup
SHOW DATABASES LIKE 'aicn_app_db';
SELECT User, Host FROM mysql.user WHERE User = 'aicn_user';

-- End of setup
```

```
-- schema.sql
-- Unified database schema for AICN application

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS `assigned_classrooms`;
DROP TABLE IF EXISTS `classroom_assignments`;
DROP TABLE IF EXISTS `login`;
DROP TABLE IF EXISTS `seating_plans`;
DROP TABLE IF EXISTS `staff_allocations`;
DROP TABLE IF EXISTS `daily_assignments`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `timetables`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `assigned_classrooms`;
DROP TABLE IF EXISTS `classroom_assignments`;
DROP TABLE IF EXISTS `login`;

-- Create students table
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rollNo` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `section` VARCHAR(10) NOT NULL,
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create login table for authentication
CREATE TABLE IF NOT EXISTS `login` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rollNo` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `section` VARCHAR(10) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`rollNo`) REFERENCES `students`(`rollNo`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create rooms table
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `number` VARCHAR(20) NOT NULL,
  `building` VARCHAR(100) NOT NULL,
  `capacity` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_room` (`number`, `building`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create seating_plans table
CREATE TABLE IF NOT EXISTS `seating_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `planData` JSON NOT NULL,
  `examDate` DATE,
  `examCode` VARCHAR(20),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_exam` (`examDate`, `examCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create staff table
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `availability` TEXT,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create staff_allocations table
CREATE TABLE IF NOT EXISTS `staff_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `allocationData` JSON NOT NULL,
  `date` DATE NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_allocation_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create daily_assignments table
CREATE TABLE IF NOT EXISTS `daily_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `day` VARCHAR(20) NOT NULL,
  `timeSlot` VARCHAR(50) NOT NULL,
  `assignments` JSON NOT NULL,
  `generatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `generatedBy` VARCHAR(100) DEFAULT 'System',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'info',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'medium',
  `recipientType` VARCHAR(20) NOT NULL DEFAULT 'all',
  `status` VARCHAR(20) NOT NULL DEFAULT 'unread',
  `sendEmail` BOOLEAN DEFAULT FALSE,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_notification` (`title`, `message`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create classroom_assignments table to store assignment metadata
CREATE TABLE IF NOT EXISTS `classroom_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignmentId` VARCHAR(50) NOT NULL UNIQUE,
  `assignmentName` VARCHAR(100) NOT NULL,
  `assignmentDate` DATE,
  `totalStudents` INT NOT NULL DEFAULT 0,
  `totalRooms` INT NOT NULL DEFAULT 0,
  `generatedBy` VARCHAR(100) DEFAULT 'System',
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_assignment_id` (`assignmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create assigned_classrooms table to store classroom assignment data
CREATE TABLE IF NOT EXISTS `assigned_classrooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignmentId` VARCHAR(50) NOT NULL,
  `roomId` INT NOT NULL,
  `roomNumber` VARCHAR(20) NOT NULL,
  `building` VARCHAR(100) NOT NULL,
  `studentId` INT NOT NULL,
  `rollNo` VARCHAR(20) NOT NULL,
  `studentName` VARCHAR(100) NOT NULL,
  `assignedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `assignedBy` VARCHAR(100) DEFAULT 'System',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_assignment_student` (`assignmentId`, `studentId`),
  FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignmentId`) REFERENCES `classroom_assignments`(`assignmentId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'student',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sessions table for session management
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sessionId` VARCHAR(128) NOT NULL UNIQUE,
  `data` TEXT,
  `expires` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS
