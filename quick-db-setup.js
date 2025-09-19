// scripts/quick-db-setup.js
// Quick script to set up database configuration with default values

const fs = require('fs');
const path = require('path');

function quickDBSetup() {
  try {
    console.log('=== Quick Database Setup ===\n');
    
    // Default configuration
    const config = {
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'aicn_user',
      DB_PASSWORD: 'SecurePass123!',
      DB_NAME: 'aicn_app_db'
    };
    
    // Create or update .env file
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    // Try to read existing .env file
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('Found existing .env file, updating database configuration...\n');
    } catch (error) {
      console.log('Creating new .env file...\n');
      envContent = '# AICN Application Configuration\n\n';
    }
    
    // Update or add database configuration
    Object.entries(config).forEach(([key, value]) => {
      const regex = new RegExp(`${key}=.*`, 'g');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // If the key doesn't exist, add it
        envContent += `${key}=${value}\n`;
      }
    });
    
    // Write updated content
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Database configuration updated successfully!\n');
    
    console.log('=== Configuration Summary ===');
    console.log(`Host: ${config.DB_HOST}`);
    console.log(`Port: ${config.DB_PORT}`);
    console.log(`Database: ${config.DB_NAME}`);
    console.log(`User: ${config.DB_USER}`);
    console.log(`Password: ${config.DB_PASSWORD}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Create the database and user in MySQL manually:');
    console.log('   Run these SQL commands in your MySQL client:');
    console.log(`   CREATE DATABASE IF NOT EXISTS ${config.DB_NAME};`);
    console.log(`   CREATE USER IF NOT EXISTS '${config.DB_USER}'@'localhost' IDENTIFIED BY '${config.DB_PASSWORD}';`);
    console.log(`   CREATE USER IF NOT EXISTS '${config.DB_USER}'@'%' IDENTIFIED BY '${config.DB_PASSWORD}';`);
    console.log(`   GRANT ALL PRIVILEGES ON ${config.DB_NAME}.* TO '${config.DB_USER}'@'localhost';`);
    console.log(`   GRANT ALL PRIVILEGES ON ${config.DB_NAME}.* TO '${config.DB_USER}'@'%';`);
    console.log('   FLUSH PRIVILEGES;');
    console.log('\n2. Run: npm run db:init (to initialize tables)');
    console.log('3. Run: npm start (to start the application)');
    
    console.log('\n⚠️  Important:');
    console.log('- Make sure MySQL server is running');
    console.log('- Update the database credentials if needed');
    console.log('- Keep your database credentials secure!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup if called directly
if (require.main === module) {
  quickDBSetup();
}

module.exports = quickDBSetup;