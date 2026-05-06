import React from 'react'

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || ''
  if (s === 'aprovado' || s === 'validado') {
    return (
      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        Aprovado
      </span>
    )
  }
  if (s === 'reprovado') {
    return (
      <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
        Reprovado
      </span>
    )
  }
  return (
    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
      Pendente
    </span>
  )
}
