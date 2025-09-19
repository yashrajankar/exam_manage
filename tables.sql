-- SQL script to create the AICN application tables

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

-- Create timetables table
CREATE TABLE IF NOT EXISTS `timetables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `subject` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create staff table
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `department` VARCHAR(100) NOT NULL,
  `availability` TEXT,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'info',
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_notification` (`title`, `message`)
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

-- Create staff_allocations table
CREATE TABLE IF NOT EXISTS `staff_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `allocationData` JSON NOT NULL,
  `date` DATE NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_allocation_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sessions table
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sessionId` VARCHAR(128) NOT NULL UNIQUE,
  `data` TEXT,
  `expires` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'student',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better query performance
CREATE INDEX `idx_classroom_assignments_id` ON `classroom_assignments` (`assignmentId`);
CREATE INDEX `idx_classroom_assignments_date` ON `classroom_assignments` (`assignmentDate`);
CREATE INDEX `idx_classroom_assignments_active` ON `classroom_assignments` (`isActive`);
CREATE INDEX `idx_assigned_classrooms_assignment` ON `assigned_classrooms` (`assignmentId`);
CREATE INDEX `idx_assigned_classrooms_room` ON `assigned_classrooms` (`roomId`);
CREATE INDEX `idx_assigned_classrooms_student` ON `assigned_classrooms` (`studentId`);
CREATE INDEX `idx_assigned_classrooms_rollno` ON `assigned_classrooms` (`rollNo`);
