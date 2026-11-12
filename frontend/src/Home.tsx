import { useState } from 'react'
import { apiRequest } from './api'
import type { User } from './api'
import Reserve from './Reserve'
import MyReservations from './MyReservations'

interface HomeProps {
  user: User
  onLogout: () => void
}

export default function Home({ user, onLogout }: HomeProps) {
  const [tab, setTab] = useState<'reserve' | 'mine'>('reserve')

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', 'POST')
    } finally {
      onLogout()
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold ${
      active ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-500">Hola, {user.name}</h1>
          <button className="text-sm text-slate-400 hover:text-white" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </header>

        <nav className="flex gap-2">
          <button className={tabClass(tab === 'reserve')} onClick={() => setTab('reserve')}>
            Reservar
          </button>
          <button className={tabClass(tab === 'mine')} onClick={() => setTab('mine')}>
            Mis reservas
          </button>
        </nav>

        {tab === 'reserve' ? <Reserve /> : <MyReservations />}
      </div>
    </div>
  )
}