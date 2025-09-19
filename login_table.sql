-- SQL script to create a login table for the roll number-based authentication system
-- This table is specifically designed for the authentication requirements where:
-- - Odd roll numbers use password "2000"
-- - Even roll numbers use password "2024"

CREATE TABLE IF NOT EXISTS `login` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rollNo` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `section` VARCHAR(10) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Index for faster lookups by roll number
  INDEX `idx_rollno` (`rollNo`),
  
  -- Foreign key constraint to ensure roll numbers exist in the students table
  CONSTRAINT `fk_login_student` 
    FOREIGN KEY (`rollNo`) 
    REFERENCES `students`(`rollNo`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing (optional)
-- Note: In the actual application, data would be populated from the students table
-- INSERT INTO `login` (`rollNo`, `name`, `section`) VALUES
-- ('AIDSU24001', 'John Doe', 'B1'),
-- ('AIDSU24002', 'Jane Smith', 'B2'),
-- ('AIDSU24003', 'Robert Johnson', 'B3');

-- Example query to verify the authentication logic:
-- SELECT rollNo, name, section,
--        CASE 
--          WHEN CAST(REGEXP_SUBSTR(rollNo, '[0-9]+$') AS UNSIGNED) % 2 = 0 
--          THEN '2024' 
--          ELSE '2000' 
--        END AS password
-- FROM login;