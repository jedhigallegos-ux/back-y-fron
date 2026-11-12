import { useEffect, useState } from 'react'
import { apiRequest } from './api'
import type { MyReservation } from './api'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error, intenta de nuevo'
}

export default function MyReservations() {
  const [reservations, setReservations] = useState<MyReservation[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  async function loadReservations() {
    try {
      setReservations(await apiRequest<MyReservation[]>('/reservations/mine'))
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  useEffect(() => {
    loadReservations()
  }, [])

  async function handleCancel(id: number) {
    setErrorMessage('')
    try {
      await apiRequest(`/reservations/${id}`, 'DELETE')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
    await loadReservations()
  }

  return (
    <div className="space-y-3">
      {errorMessage && <p className="text-red-400">{errorMessage}</p>}

      {reservations.length === 0 && !errorMessage && (
        <p className="text-slate-400">Aún no tienes reservas.</p>
      )}

      {reservations.map((reservation) => (
        <div
          key={reservation.id}
          className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
        >
          <div>
            <p className="font-semibold">{reservation.courtName}</p>
            <p className="text-sm text-slate-400">
              {reservation.date} · {String(reservation.startHour).padStart(2, '0')}:00
            </p>
          </div>
          <button
            className="text-sm text-red-400 hover:text-red-300"
            onClick={() => handleCancel(reservation.id)}
          >
            Cancelar
          </button>
        </div>
      ))}
    </div>
  )
}