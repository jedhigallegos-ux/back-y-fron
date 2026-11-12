import express from 'express'
import session from 'express-session'
import bcrypt from 'bcryptjs'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import pool from './db.js'

declare module 'express-session' {
  interface SessionData {
    userId: number
  }
}

interface UserRow extends RowDataPacket {
  id: number
  email: string
  passwordHash: string
  name: string
}

const app = express()
app.use(express.json())
app.use(
  session({
    secret: 'secreto-solo-para-desarrollo-local',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }),
)

const requireAuth: express.RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Debes iniciar sesión para continuar' })
    return
  }
  next()
}

function serverError(res: express.Response, error: unknown) {
  console.error(error)
  res.status(500).json({ message: 'Ocurrió un error, intenta de nuevo' })
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body ?? {}
  const isValid =
    typeof email === 'string' && email.includes('@') &&
    typeof password === 'string' && password.length >= 6 &&
    typeof name === 'string' && name.trim().length > 0

  if (!isValid) {
    res.status(400).json({ message: 'Revisa los datos ingresados' })
    return
  }

  try {
    const cleanEmail = email.toLowerCase()
    const [exists] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [cleanEmail],
    )
    if (exists.length > 0) {
      res.status(409).json({ message: 'Ese correo ya está registrado' })
      return
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (email, passwordHash, name) VALUES (?, ?, ?)',
      [cleanEmail, passwordHash, name.trim()],
    )

    req.session.userId = result.insertId
    res.status(201).json({ id: result.insertId, name: name.trim() })
  } catch (error) {
    serverError(res, error)
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ message: 'Revisa los datos ingresados' })
    return
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()],
    )
    const user = rows[0]

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ message: 'Correo o contraseña incorrectos' })
      return
    }

    req.session.userId = user.id
    res.status(200).json({ id: user.id, name: user.name })
  } catch (error) {
    serverError(res, error)
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: 'Sesión cerrada' })
  })
})

app.get('/api/courts', requireAuth, async (_req, res) => {
  try {
    const [courts] = await pool.query<RowDataPacket[]>(
      'SELECT id, name FROM courts ORDER BY id',
    )
    res.status(200).json(courts)
  } catch (error) {
    serverError(res, error)
  }
})

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

function isPastSlot(date: string, startHour: number): boolean {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  return new Date(year, month - 1, day, startHour).getTime() < Date.now()
}

app.get('/api/reservations', requireAuth, async (req, res) => {
  const date = req.query.date
  if (typeof date !== 'string' || !isValidDate(date)) {
    res.status(400).json({ message: 'Revisa los datos ingresados' })
    return
  }

  try {
    const [taken] = await pool.query<RowDataPacket[]>(
      'SELECT courtId, startHour FROM reservations WHERE date = ?',
      [date],
    )
    res.status(200).json(taken)
  } catch (error) {
    serverError(res, error)
  }
})

app.post('/api/reservations', requireAuth, async (req, res) => {
  const { courtId, date, startHour } = req.body ?? {}

  const isValid =
    Number.isInteger(courtId) &&
    typeof date === 'string' && isValidDate(date) &&
    Number.isInteger(startHour) && startHour >= 0 && startHour <= 23

  if (!isValid || isPastSlot(date, startHour)) {
    res.status(400).json({ message: 'Revisa los datos ingresados' })
    return
  }

  try {
    const [courts] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM courts WHERE id = ?',
      [courtId],
    )
    if (courts.length === 0) {
      res.status(400).json({ message: 'Revisa los datos ingresados' })
      return
    }

    // Regla crítica: validar que la cancha esté libre ANTES de escribir
    const [busy] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM reservations WHERE courtId = ? AND date = ? AND startHour = ?',
      [courtId, date, startHour],
    )
    if (busy.length > 0) {
      res.status(409).json({ message: 'La cancha ya fue reservada en este horario' })
      return
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO reservations (userId, courtId, date, startHour) VALUES (?, ?, ?, ?)',
      [req.session.userId, courtId, date, startHour],
    )
    res.status(201).json({ id: result.insertId, courtId, date, startHour })
  } catch (error) {
    // Segunda barrera: la restricción UNIQUE de la base de datos
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'La cancha ya fue reservada en este horario' })
      return
    }
    serverError(res, error)
  }
})

app.get('/api/reservations/mine', requireAuth, async (req, res) => {
  try {
    const [mine] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, c.name AS courtName, r.date, r.startHour
       FROM reservations r
       JOIN courts c ON c.id = r.courtId
       WHERE r.userId = ?
       ORDER BY r.date, r.startHour`,
      [req.session.userId],
    )
    res.status(200).json(mine)
  } catch (error) {
    serverError(res, error)
  }
})

app.delete('/api/reservations/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: 'Revisa los datos ingresados' })
    return
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM reservations WHERE id = ? AND userId = ?',
      [id, req.session.userId],
    )

    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'No se encontró la reserva' })
      return
    }
    res.status(200).json({ message: 'Reserva cancelada' })
  } catch (error) {
    serverError(res, error)
  }
})

const port = 3000
app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`)
})