const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'localhost',
  port:     parseInt(process.env.MYSQLPORT || '3306'),
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.MYSQLHOST && process.env.MYSQLHOST.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = pool;
