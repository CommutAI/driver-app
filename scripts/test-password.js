/**
 * Test bcrypt password verification
 * Usage: node scripts/test-password.js <password> <hash>
 * Example: node scripts/test-password.js "mypassword" "$2b$10$..."
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];
const hash = process.argv[3];

if (!password || !hash) {
  console.error('Usage: node scripts/test-password.js <password> <hash>');
  console.error('Example: node scripts/test-password.js "mypassword" "$2b$10$..."');
  process.exit(1);
}

const match = bcrypt.compareSync(password, hash);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('Match:', match ? '✅ SUCCESS' : '❌ FAILED');

if (!match) {
  console.log('\nThe password does not match the hash.');
  console.log('Either:');
  console.log('1. The password is incorrect');
  console.log('2. You need to reset the password with a new hash');
}
