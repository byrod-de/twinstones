const dbConfig = require('../conf/dbConfig');
const mysql = require('mysql2/promise');
const { printLog } = require('./misc');

async function writeToDB(roll) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'INSERT INTO rollstats (isCrit, hopeGained, fearGained, stressCleared) VALUES (?, ?, ?, ?)';
    const values = [roll.isCrit, roll.hopeGained, roll.fearGained, roll.stressCleared];
    await connection.query(query, values);
    connection.end();
    printLog(`Roll result successfully written to DB: ${JSON.stringify(roll)}`);
  } catch (error) {
    console.error('Error writing roll result to DB:', error);
  } finally {
    printLog('DB connection closed.', 'debug');
  }
}

module.exports = { writeToDB };