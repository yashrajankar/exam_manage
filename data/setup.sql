-- SQL Commands for Database Setup
-- Save this as setup.sql and run with: mysql -u root -p < setup.sql

-- Create database
CREATE DATABASE IF NOT EXISTS `aicn_app_db`;

-- Create user with localhost access
CREATE USER IF NOT EXISTS 'aicn_user'@'localhost' IDENTIFIED BY 'SecurePass123!';

-- Grant privileges for localhost access
GRANT ALL PRIVILEGES ON `aicn_app_db`.* TO 'aicn_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify setup
SHOW DATABASES LIKE 'aicn_app_db';
SELECT User, Host FROM mysql.user WHERE User = 'aicn_user';

-- End of setup