import { useState } from 'react'

interface Props {
  valor: number
  onCambiar: (porcentaje: number) => void
}

/** Número 0–100 que admite estar vacío mientras se escribe: solo comunica valores válidos. */
export function CampoPorcentaje({ valor, onCambiar }: Props) {
  const [texto, setTexto] = useState(String(valor))
  return (
    <input
      type="number"
      min={0}
      max={100}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        const n = e.target.valueAsNumber
        if (!Number.isNaN(n)) onCambiar(n)
      }}
      onBlur={() => setTexto(String(valor))}
    />
  )
}
