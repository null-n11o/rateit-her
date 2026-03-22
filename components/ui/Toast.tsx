'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bg = type === 'success' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-2 rounded shadow-lg z-50`}>
      {message}
    </div>
  )
}
