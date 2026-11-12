import { useState } from 'react'
import AuthForm from './AuthForm'
import Home from './Home'
import type { User } from './api'

export default function App() {
  const [user, setUser] = useState<User | null>(null)

  if (!user) {
    return <AuthForm onAuthenticated={setUser} />
  }
  return <Home user={user} onLogout={() => setUser(null)} />
}