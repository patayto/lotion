// Quick script to generate bcrypt hash for password123
const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = bcrypt.hashSync(password, 10);

console.log('Bcrypt hash for "password123":');
console.log(hash);
