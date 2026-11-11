/**
 * Generate bcrypt password hash for staff_users
 * Usage: node scripts/generate-password-hash.js <password>
 * Example: node scripts/generate-password-hash.js "mypassword123"
 */

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.js <password>');
  console.error('Example: node scripts/generate-password-hash.js "mypassword123"');
  process.exit(1);
}

// Generate hash with 10 salt rounds (matches your existing hashes)
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Bcrypt Hash:', hash);
console.log('\nCopy this hash and use it in the UPDATE statement:');
console.log(`UPDATE staff_users SET password = '${hash}' WHERE email = 'your-email@example.com';`);
