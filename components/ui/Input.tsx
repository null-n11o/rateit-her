import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-gray-600">{label}</label>}
      <input
        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${className}`}
        {...props}
      />
    </div>
  )
}
