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
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better query performance
CREATE INDEX `idx_assignment_id` ON `classroom_assignments` (`assignmentId`);
CREATE INDEX `idx_assignment_date` ON `classroom_assignments` (`assignmentDate`);
CREATE INDEX `idx_is_active` ON `classroom_assignments` (`isActive`);