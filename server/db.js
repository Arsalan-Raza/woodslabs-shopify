const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'localhost',
  port:     parseInt(process.env.MYSQLPORT || '3306'),
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  // MySQL 9.x uses caching_sha2_password; this lets the client fetch
  // the server's RSA public key needed for auth without TLS.
  allowPublicKeyRetrieval: true,
});

module.exports = pool;
