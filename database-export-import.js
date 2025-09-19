// scripts/database-export-import.js
// Utility script for exporting and importing database tables

const { pool } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

class DatabaseExportImport {
  constructor() {
    this.validTables = [
      'students', 
      'timetables', 
      'staff', 
      'rooms', 
      'seating_plans', 
      'notifications',
      'daily_assignments',
      'staff_allocations',
      'users'
    ];
  }

  // Export a single table to CSV
  async exportTableToCSV(tableName, outputPath) {
    if (!this.validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    try {
      const connection = await pool.getConnection();
      
      // Get column information
      const [columns] = await connection.execute(
        'SHOW COLUMNS FROM ??', 
        [tableName]
      );
      
      const columnNames = columns.map(col => col.Field);
      
      // Get all data from the table
      const [rows] = await connection.execute(
        `SELECT * FROM ??`, 
        [tableName]
      );
      
      connection.release();
      
      // Create CSV content
      let csvContent = columnNames.join(',') + '\n';
      
      rows.forEach(row => {
        const values = columnNames.map(column => {
          const value = row[column];
          if (value === null || value === undefined) {
            return '';
          }
          // Escape values with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });
      
      // Write to file
      const fileName = `${tableName}.csv`;
      const filePath = path.join(outputPath, fileName);
      await fs.writeFile(filePath, csvContent);
      
      console.log(`✅ Exported ${tableName} to ${filePath} (${rows.length} rows)`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }
  }

  // Export all tables to CSV files
  async exportAllTables(outputPath) {
    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(outputPath, { recursive: true });
      
      console.log('🚀 Starting database export...');
      
      const exportResults = [];
      
      for (const tableName of this.validTables) {
        try {
          const filePath = await this.exportTableToCSV(tableName, outputPath);
          exportResults.push({ table: tableName, success: true, file: filePath });
        } catch (error) {
          console.error(`❌ Failed to export ${tableName}: ${error.message}`);
          exportResults.push({ table: tableName, success: false, error: error.message });
        }
      }
      
      console.log('✅ Database export completed');
      return exportResults;
    } catch (error) {
      throw new Error(`Failed to export database: ${error.message}`);
    }
  }

  // Import CSV data to a table
  async importCSVToTable(tableName, csvFilePath, overwrite = false) {
    if (!this.validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    try {
      // Read CSV file
      const csvContent = await fs.readFile(csvFilePath, 'utf8');
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        console.log(`⚠️  CSV file is empty or contains only headers`);
        return { success: true, message: 'No data to import' };
      }
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
      
      // Parse data rows
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;
        
        // Handle quoted values that may contain commas
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"' && !inQuotes) {
            inQuotes = true;
          } else if (char === '"' && inQuotes) {
            inQuotes = false;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"(.*)"$/, '$1'));
            current = '';
          } else {
            current += char;
          }
        }
        
        // Add the last value
        values.push(current.trim().replace(/^"(.*)"$/, '$1'));
        
        // Create object with headers as keys
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = values[index] || '';
        });
        
        data.push(entry);
      }
      
      const connection = await pool.getConnection();
      
      if (overwrite) {
        // Clear existing data
        await connection.execute(`DELETE FROM ??`, [tableName]);
        console.log(`🗑️  Cleared existing data from ${tableName}`);
      }
      
      // Insert data
      let insertedCount = 0;
      let errorCount = 0;
      
      for (const row of data) {
        try {
          const columns = Object.keys(row);
          const values = columns.map(col => row[col]);
          const placeholders = columns.map(() => '?').join(', ');
          
          await connection.execute(
            `INSERT INTO ?? (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
            [tableName, ...values]
          );
          insertedCount++;
        } catch (insertError) {
          console.error(`❌ Error inserting row into ${tableName}:`, insertError.message);
          errorCount++;
        }
      }
      
      connection.release();
      
      console.log(`✅ Imported ${insertedCount} rows to ${tableName} (${errorCount} errors)`);
      return { 
        success: true, 
        inserted: insertedCount, 
        errors: errorCount,
        message: `Imported ${insertedCount} rows to ${tableName} (${errorCount} errors)`
      };
    } catch (error) {
      throw new Error(`Failed to import CSV to ${tableName}: ${error.message}`);
    }
  }

  // Import all CSV files from a directory
  async importAllCSVs(inputPath, overwrite = false) {
    try {
      console.log('🚀 Starting database import...');
      
      // Check if directory exists
      try {
        await fs.access(inputPath);
      } catch (error) {
        throw new Error(`Input directory does not exist: ${inputPath}`);
      }
      
      const importResults = [];
      
      for (const tableName of this.validTables) {
        try {
          const csvFilePath = path.join(inputPath, `${tableName}.csv`);
          
          // Check if CSV file exists
          try {
            await fs.access(csvFilePath);
          } catch (error) {
            console.log(`⚠️  CSV file not found for ${tableName}, skipping...`);
            importResults.push({ 
              table: tableName, 
              success: false, 
              error: 'CSV file not found' 
            });
            continue;
          }
          
          const result = await this.importCSVToTable(tableName, csvFilePath, overwrite);
          importResults.push({ table: tableName, success: true, ...result });
        } catch (error) {
          console.error(`❌ Failed to import ${tableName}: ${error.message}`);
          importResults.push({ table: tableName, success: false, error: error.message });
        }
      }
      
      console.log('✅ Database import completed');
      return importResults;
    } catch (error) {
      throw new Error(`Failed to import database: ${error.message}`);
    }
  }
}

module.exports = DatabaseExportImport;

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const pathArg = args[1];
  const overwriteFlag = args.includes('--overwrite') || args.includes('-o');
  
  const exporter = new DatabaseExportImport();
  
  (async () => {
    try {
      if (command === 'export' && pathArg) {
        const results = await exporter.exportAllTables(pathArg);
        console.log('\n📊 Export Results:');
        results.forEach(result => {
          if (result.success) {
            console.log(`  ✅ ${result.table}: ${result.file}`);
          } else {
            console.log(`  ❌ ${result.table}: ${result.error}`);
          }
        });
      } else if (command === 'import' && pathArg) {
        const results = await exporter.importAllCSVs(pathArg, overwriteFlag);
        console.log('\n📊 Import Results:');
        results.forEach(result => {
          if (result.success) {
            console.log(`  ✅ ${result.table}: ${result.message}`);
          } else {
            console.log(`  ❌ ${result.table}: ${result.error}`);
          }
        });
      } else {
        console.log('Usage:');
        console.log('  node database-export-import.js export <output_directory>');
        console.log('  node database-export-import.js import <input_directory> [--overwrite|-o]');
        console.log('');
        console.log('Examples:');
        console.log('  node database-export-import.js export ./exports');
        console.log('  node database-export-import.js import ./imports --overwrite');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}