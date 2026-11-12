export interface User {
  id: number
  name: string
}

export interface Court {
  id: number
  name: string
}

export interface TakenSlot {
  courtId: number
  startHour: number
}

export interface MyReservation {
  id: number
  courtName: string
  date: string
  startHour: number
}

export async function apiRequest<T>(
  path: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? 'Ocurrió un error, intenta de nuevo')
  }
  return data as T
}