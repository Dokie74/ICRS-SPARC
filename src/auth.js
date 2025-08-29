const crypto = require('crypto');

// Weak cryptography
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Insecure randomness
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Path traversal vulnerability
function readFile(filename) {
  const fs = require('fs');
  const path = `/uploads/${filename}`;
  return fs.readFileSync(path, 'utf8');
}

// Unsafe deserialization
function processUserData(data) {
  return eval(`(${data})`);
}

module.exports = {
  hashPassword,
  generateToken,
  readFile,
  processUserData
};