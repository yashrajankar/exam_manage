const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// API base URL
const API_BASE = 'http://localhost:3000/api';

// Function to parse CSV data
function parseCsvData(csvText) {
  // Normalize line endings
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.trim().split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Handle potential BOM (Byte Order Mark)
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.slice(1);
  }
  
  const headers = parseCsvLine(headerLine);
  if (headers.length === 0) {
    throw new Error('No headers found in CSV file');
  }
  
  // Clean headers (remove quotes and trim)
  const cleanHeaders = headers.map(header => {
    let clean = header.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.substring(1, clean.length - 1);
    }
    return clean;
  });
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length > 0 && values.some(val => val.trim() !== '')) {
      const row = {};
      cleanHeaders.forEach((header, index) => {
        const value = index < values.length ? values[index] : '';
        // Clean value (remove surrounding quotes if present)
        let cleanValue = value.trim();
        if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
          cleanValue = cleanValue.substring(1, cleanValue.length - 1);
        }
        row[header] = cleanValue;
      });
      data.push(row);
    }
  }
  
  if (data.length === 0) {
    throw new Error('No valid data found in CSV file');
  }
  
  return data;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inQuotes = !inQuotes;
      continue;
    }
    
    if (char === '\\' && inQuotes) {
      escaped = true;
      continue;
    }
    
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    
    current += char;
  }
  
  result.push(current);
  return result;
}

// Function to convert date format from DD-MM-YYYY to YYYY-MM-DD
function convertDateFormat(dateStr) {
  if (!dateStr) return dateStr;
  
  // Check if already in correct format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert from DD-MM-YYYY to YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

// Import functions for each data type
async function importStudents() {
  console.log('Importing students...');
  try {
    const csvPath = path.join(__dirname, '..', 'import', 'student.csv');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const data = parseCsvData(csvText);
    
    // Transform data to match API expectations
    const students = data.map(row => ({
      rollNo: row['RollNo'] || row['Roll.No.'] || row['Roll No.'] || row['rollNo'] || '',
      name: row['Name'] || row['Name of Students'] || row['name'] || '',
      section: row['Section'] || row['section'] || '',
      email: row['Email'] || '',
      phone: row['Phone'] || ''
    }));
    
    // Filter out empty rows
    const validStudents = students.filter(s => s.rollNo && s.name && s.section);
    
    if (validStudents.length === 0) {
      throw new Error('No valid student data found');
    }
    
    const response = await fetch(`${API_BASE}/students/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validStudents)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const successful = result.results.filter(r => r.success).length;
    const failed = result.results.filter(r => !r.success).length;
    console.log(`✅ Successfully imported ${successful} students (${failed} duplicates skipped)`);
    return result;
  } catch (error) {
    console.error('❌ Error importing students:', error.message);
    throw error;
  }
}

async function importTimetable() {
  console.log('Importing timetable...');
  try {
    const csvPath = path.join(__dirname, '..', 'import', 'timetable1.csv');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const data = parseCsvData(csvText);
    
    // Transform data to match API expectations and fix date format
    const timetables = data.map(row => ({
      code: row['Code'] || row['code'] || '',
      subject: row['Subject'] || row['subject'] || '',
      date: convertDateFormat(row['Date'] || row['date'] || ''),
      time: row['Time'] || row['time'] || '',
      status: row['Status'] || row['status'] || 'Scheduled'
    }));
    
    // Filter out empty rows
    const validTimetables = timetables.filter(t => t.code && t.subject && t.date && t.time);
    
    if (validTimetables.length === 0) {
      throw new Error('No valid timetable data found');
    }
    
    const response = await fetch(`${API_BASE}/timetables/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validTimetables)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const successful = result.results.filter(r => r.success).length;
    const failed = result.results.filter(r => !r.success).length;
    console.log(`✅ Successfully imported ${successful} timetable entries (${failed} duplicates skipped)`);
    return result;
  } catch (error) {
    console.error('❌ Error importing timetable:', error.message);
    throw error;
  }
}

async function importRooms() {
  console.log('Importing rooms...');
  try {
    const csvPath = path.join(__dirname, '..', 'import', 'rooms.csv');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const data = parseCsvData(csvText);
    
    // Transform data to match API expectations
    const rooms = data.map(row => ({
      number: row['room_number'] || row['Room No.'] || row['number'] || '',
      building: row['location'] || row['Location'] || row['building'] || '',
      capacity: parseInt(row['capacity'] || row['Capacity'] || 0),
      isActive: true
    }));
    
    // Filter out empty rows
    const validRooms = rooms.filter(r => r.number && r.building && r.capacity > 0);
    
    if (validRooms.length === 0) {
      throw new Error('No valid room data found');
    }
    
    const response = await fetch(`${API_BASE}/rooms/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validRooms)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const successful = result.results.filter(r => r.success).length;
    const failed = result.results.filter(r => !r.success).length;
    console.log(`✅ Successfully imported ${successful} rooms (${failed} duplicates skipped)`);
    return result;
  } catch (error) {
    console.error('❌ Error importing rooms:', error.message);
    throw error;
  }
}

async function importStaff() {
  console.log('Importing staff...');
  try {
    const csvPath = path.join(__dirname, '..', 'import', 'staff.csv');
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const data = parseCsvData(csvText);
    
    // Transform data to match API expectations
    const staffMembers = data.map(row => ({
      name: row['Name of Faculty'] || row['Name'] || row['name'] || '',
      department: 'AI & DS Department', // Default department
      availability: row['Avalibility'] === 'Yes' ? 'Available' : 'Not Available',
      isActive: row['Avalibility'] === 'Yes'
    }));
    
    // Filter out empty rows
    const validStaff = staffMembers.filter(s => s.name);
    
    if (validStaff.length === 0) {
      throw new Error('No valid staff data found');
    }
    
    const response = await fetch(`${API_BASE}/staff/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validStaff)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    const successful = result.results.filter(r => r.success).length;
    const failed = result.results.filter(r => !r.success).length;
    console.log(`✅ Successfully imported ${successful} staff members (${failed} duplicates skipped)`);
    return result;
  } catch (error) {
    console.error('❌ Error importing staff:', error.message);
    throw error;
  }
}

// Main function to import all data
async function importAllData() {
  console.log('🚀 Starting bulk import of all data...\n');
  
  try {
    // Import in order: rooms, staff, timetable, students
    await importRooms();
    await importStaff();
    await importTimetable();
    await importStudents();
    
    console.log('\n🎉 All data imported successfully!');
    console.log('You can now access the admin dashboard at http://localhost:3000/admin-features/dashboard/dashboard.html');
  } catch (error) {
    console.error('\n💥 Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  importAllData();
}

module.exports = {
  importAllData,
  importStudents,
  importTimetable,
  importRooms,
  importStaff
};