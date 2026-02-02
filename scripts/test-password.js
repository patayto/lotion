// Test script to verify bcrypt password hashing
const bcrypt = require('bcryptjs');

const password = 'password123';
const storedHash = '$2b$10$/CJBL6oaTvh2oA/zuutfsOv9nV4FBwElnOoNjP/bZhakOMYbhr9B2'; // From SQL script

console.log('Testing password verification...');
console.log('Password:', password);
console.log('Stored hash:', storedHash);
console.log('');

// Test 1: Verify the stored hash
const isValid = bcrypt.compareSync(password, storedHash);
console.log('✓ Test 1 - Does "password123" match stored hash?', isValid);

// Test 2: Generate a fresh hash and test it
const freshHash = bcrypt.hashSync(password, 10);
console.log('✓ Test 2 - Fresh hash:', freshHash);
const freshIsValid = bcrypt.compareSync(password, freshHash);
console.log('✓ Test 2 - Does "password123" match fresh hash?', freshIsValid);

// Test 3: Test async version (used in auth.ts)
bcrypt.compare(password, storedHash).then(result => {
    console.log('✓ Test 3 - Async compare with stored hash:', result);
});
