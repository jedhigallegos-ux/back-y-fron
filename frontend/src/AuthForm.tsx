import { useState } from 'react'
import { apiRequest } from './api'
import type { User } from './api'

interface AuthFormProps {
  onAuthenticated: (user: User) => void
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    setErrorMessage('')
    setIsLoading(true)
    try {
      const path = isRegister ? '/auth/register' : '/auth/login'
      const payload = isRegister ? { name, email, password } : { email, password }
      const user = await apiRequest<User>(path, 'POST', payload)
      onAuthenticated(user)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ocurrió un error, intenta de nuevo')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white outline-none focus:border-green-500'

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-slate-800/50 p-6">
        <h1 className="text-3xl font-bold text-green-500 text-center">Pádel</h1>
        <h2 className="text-center text-slate-300">
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>

        {isRegister && (
          <input
            className={inputClass}
            placeholder="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
        <input
          className={inputClass}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button
          className="w-full rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Cargando...' : isRegister ? 'Registrarme' : 'Entrar'}
        </button>

        <button
          className="w-full text-sm text-slate-400 hover:text-white"
          onClick={() => {
            setIsRegister(!isRegister)
            setErrorMessage('')
          }}
        >
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}