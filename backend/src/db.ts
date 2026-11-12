import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '', // si tu root tiene contraseña, ponla aquí
  database: 'padel',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // las fechas llegan como '2026-11-04'
})

export default pool