const express = require('express');
const mysql = require('mysql');
const app = express();

app.use(express.json());

// Vulnerable SQL injection
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  
  mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'myapp'
  }).query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Command injection vulnerability
app.post('/backup', (req, res) => {
  const filename = req.body.filename;
  const { exec } = require('child_process');
  exec(`tar -czf backup_${filename}.tar.gz /data`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    res.json({ message: 'Backup created' });
  });
});

// XSS vulnerability
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Search results for: ${query}</h1>`);
});

// Hardcoded secrets
const JWT_SECRET = 'super_secret_key_123';
const API_KEY = 'sk-1234567890abcdef';

app.listen(3000, () => {
  console.log('Server running on port 3000');
});