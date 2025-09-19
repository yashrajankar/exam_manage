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
CREATE INDEX `idx_assignment_id` ON `assigned_classrooms` (`assignmentId`);
CREATE INDEX `idx_room_id` ON `assigned_classrooms` (`roomId`);
CREATE INDEX `idx_student_id` ON `assigned_classrooms` (`studentId`);
CREATE INDEX `idx_roll_no` ON `assigned_classrooms` (`rollNo`);