'use client'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
}

export function Toast({ message, type = 'success' }: ToastProps) {
  const styles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  }

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}
    >
      {message}
    </div>
  )
}
