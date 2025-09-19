# AI Classroom Network (AICN) - Deployment Package

This is a deployment-ready package of the AI Classroom Network application, a comprehensive classroom management system for educational institutions.

## Overview

The AICN system provides centralized management for:
- Student records and section organization
- Examination timetables and schedules
- Room allocation and capacity management
- Staff records and availability tracking
- Notification system for announcements
- Seating plan generation for examinations
- Classroom assignment tracking

## System Requirements

### Server Requirements
- Node.js v14 or higher
- MySQL v5.7 or higher
- Python 3.x (for auto-assignment features)

### Client Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

## Installation

1. **Database Setup**
   - Create a MySQL database for the application
   - Update the database configuration in `config/db.js` or set environment variables:
     ```
     DB_HOST=localhost
     DB_PORT=3306
     DB_USER=your_username
     DB_PASSWORD=your_password
     DB_NAME=your_database_name
     ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Initialize Database**
   ```bash
   npm run db:init
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Access the Application**
   Open your browser and navigate to `http://localhost:3000/admin-features/dashboard/dashboard.html`

## Directory Structure

- `admin-features/` - Frontend admin panels for all modules
- `config/` - Database and application configuration
- `import/` - Data import templates and examples
- `scripts/` - Database management and utility scripts
- `services/` - Database interaction services
- `templates/` - CSV templates for data import

## Classroom Assignment Tables

The system now includes dedicated tables for tracking classroom assignments:

### classroom_assignments
Stores metadata about each classroom assignment:
- `assignmentId` - Unique identifier for the assignment
- `assignmentName` - Human-readable name for the assignment
- `assignmentDate` - Date of the assignment
- `totalStudents` - Number of students in the assignment
- `totalRooms` - Number of rooms used in the assignment
- `generatedBy` - Who generated the assignment
- `isActive` - Whether the assignment is currently active

### assigned_classrooms
Stores the specific room assignments for each student:
- `assignmentId` - Links to classroom_assignments table
- `roomId` - The room ID from the rooms table
- `roomNumber` - The room number
- `building` - The building name
- `studentId` - The student ID from the students table
- `rollNo` - The student's roll number
- `studentName` - The student's name
- `assignedAt` - When the assignment was made
- `assignedBy` - Who made the assignment

## Database Scripts

- `npm run db:classroom-tables` - Create classroom assignment tables
- `npm run db:convert-seating` - Convert existing seating plans to classroom assignments

## API Endpoints

### Classroom Assignments
- `GET /api/classroomAssignments` - Get all classroom assignments
- `GET /api/classroomAssignments/:id` - Get a specific classroom assignment
- `POST /api/classroomAssignments` - Create a new classroom assignment
- `PUT /api/classroomAssignments/:id` - Update a classroom assignment
- `DELETE /api/classroomAssignments/:id` - Delete a classroom assignment

### Assigned Classrooms
- `GET /api/assignedClassrooms` - Get all assigned classrooms
- `GET /api/assignedClassrooms/assignment/:assignmentId` - Get assigned classrooms for a specific assignment
- `POST /api/assignedClassrooms` - Create new assigned classrooms
- `DELETE /api/assignedClassrooms/assignment/:assignmentId` - Delete assigned classrooms for an assignment