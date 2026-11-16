import { useState } from 'react'

interface Props {
  valor: number
  onCambiar: (n: number) => void
  'aria-label'?: string
}

/** Entero ≥ 1 que admite estar vacío mientras se escribe: solo comunica valores válidos. */
export function CampoEntero({ valor, onCambiar, ...resto }: Props) {
  const [texto, setTexto] = useState(String(valor))
  return (
    <input
      {...resto}
      type="number"
      min={1}
      step={1}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        const n = e.target.valueAsNumber
        if (Number.isInteger(n) && n >= 1) onCambiar(n)
      }}
      onBlur={() => setTexto(String(valor))}
    />
  )
}
