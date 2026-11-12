import { useEffect, useState } from 'react'
import { apiRequest } from './api'
import type { Court, TakenSlot } from './api'

const hours = Array.from({ length: 24 }, (_, hour) => hour)

function getTodayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function isPastSlot(date: string, hour: number): boolean {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  return new Date(year, month - 1, day, hour).getTime() < Date.now()
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error, intenta de nuevo'
}

interface Feedback {
  type: 'ok' | 'error'
  text: string
}

export default function Reserve() {
  const [date, setDate] = useState(getTodayString())
  const [courts, setCourts] = useState<Court[]>([])
  const [taken, setTaken] = useState<TakenSlot[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  async function loadTaken(selectedDate: string) {
    try {
      const slots = await apiRequest<TakenSlot[]>(`/reservations?date=${selectedDate}`)
      setTaken(slots)
    } catch (error) {
      setFeedback({ type: 'error', text: getErrorMessage(error) })
    }
  }

  useEffect(() => {
    apiRequest<Court[]>('/courts')
      .then(setCourts)
      .catch((error) => setFeedback({ type: 'error', text: getErrorMessage(error) }))
  }, [])

  useEffect(() => {
    if (date) loadTaken(date)
  }, [date])

  async function handleReserve(courtId: number, startHour: number) {
    setFeedback(null)
    try {
      await apiRequest('/reservations', 'POST', { courtId, date, startHour })
      setFeedback({ type: 'ok', text: '¡Reserva confirmada!' })
    } catch (error) {
      setFeedback({ type: 'error', text: getErrorMessage(error) })
    }
    await loadTaken(date)
  }

  function isTaken(courtId: number, hour: number): boolean {
    return taken.some((slot) => slot.courtId === courtId && slot.startHour === hour)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-slate-300" htmlFor="date">
          Fecha
        </label>
        <input
          id="date"
          type="date"
          min={getTodayString()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
        />
      </div>

      {feedback && (
        <p className={feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}>
          {feedback.text}
        </p>
      )}

      {courts.map((court) => (
        <section key={court.id} className="space-y-2 rounded-xl bg-slate-800/50 p-4">
          <h2 className="font-semibold text-green-500">{court.name}</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {hours.map((hour) => {
              const busy = isTaken(court.id, hour)
              const past = date !== '' && isPastSlot(date, hour)
              const disabled = busy || past || date === ''
              const style = busy
                ? 'bg-red-900/60 text-red-300'
                : past || date === ''
                  ? 'bg-slate-800 text-slate-600'
                  : 'bg-green-700 text-white hover:bg-green-600'

              return (
                <button
                  key={hour}
                  disabled={disabled}
                  onClick={() => handleReserve(court.id, hour)}
                  className={`rounded-md px-2 py-1 text-sm disabled:cursor-not-allowed ${style}`}
                >
                  {String(hour).padStart(2, '0')}:00
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}