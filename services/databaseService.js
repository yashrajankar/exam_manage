// services/databaseService.js
// Basic MySQL database service for Node.js

const { pool } = require('../config/db');

class DatabaseService {
  // Example: get all students
  async getStudents() {
    const [rows] = await pool.execute('SELECT * FROM students');
    return rows;
  }

  // Example: get student by ID
  async getStudentById(id) {
    const [rows] = await pool.execute('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0];
  }

  // Add more methods as needed for your app
}

module.exports = new DatabaseService();
