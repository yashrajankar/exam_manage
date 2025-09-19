// scripts/update-password.js
// Simple script to update the database password in .env file

const fs = require('fs');
const path = require('path');

function updatePassword() {
  try {
    // Get the new password from command line arguments
    const new_password = process.argv[2];
    
    if (!new_password) {
      console.log('Usage: node scripts/update-password.js <new_password>');
      console.log('Example: node scripts/update-password.js myNewPassword123');
      process.exit(1);
    }
    
    // Path to .env file
    const envPath = path.join(__dirname, '..', '.env');
    
    // Read the current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the DB_PASSWORD line
    const oldPasswordMatch = envContent.match(/DB_PASSWORD=(.*)/);
    const oldPassword = oldPasswordMatch ? oldPasswordMatch[1] : 'unknown';
    
    envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${new_password}`);
    
    // Write the updated content back to .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Database password updated successfully in .env file!');
    console.log(`Old password: ${oldPassword}`);
    console.log(`New password: ${new_password}`);
    
    console.log('\n⚠️  Important:');
    console.log('1. Make sure to update the actual MySQL user password manually');
    console.log('2. Restart the application for changes to take effect');
    console.log('3. Keep your new password secure!');
    
  } catch (error) {
    console.error('❌ Failed to update password:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  updatePassword();
}