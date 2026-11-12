import pool from './db.js'

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL
  ) ENGINE=InnoDB
`)

await pool.query(`
  CREATE TABLE IF NOT EXISTS courts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
  ) ENGINE=InnoDB
`)

await pool.query(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    courtId INT NOT NULL,
    date DATE NOT NULL,
    startHour INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_hour CHECK (startHour BETWEEN 0 AND 23),
    UNIQUE KEY unique_slot (courtId, date, startHour),
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (courtId) REFERENCES courts(id)
  ) ENGINE=InnoDB
`)

const courtNames = [
  'Cancha Laureles',
  'Cancha El Poblado',
  'Cancha Belén',
  'Cancha Robledo',
  'Cancha Envigado',
]
for (const name of courtNames) {
  await pool.query('INSERT IGNORE INTO courts (name) VALUES (?)', [name])
}

const [courts] = await pool.query('SELECT * FROM courts')
console.log('Base de datos lista:', courts)
await pool.end()