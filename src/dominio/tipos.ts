/** Identificadores: cadenas opacas generadas por la app. */
export type Id = string

export interface Participante {
  id: Id
  nombre: string
}

/** Una comida o bloque de la compra: cena del viernes, desayunos, bebida… */
export interface Grupo {
  id: Id
  nombre: string
  orden: number
}

export interface Producto {
  id: Id
  grupoId: Id
  nombre: string
  /** Admite decimales (2,254 kg). `null` si aún no se ha decidido. */
  cantidad: number | null
  unidad: string
  /** Quién lo compra. `null` si está sin asignar. */
  compradorId: Id | null
  comprado: boolean
  /** Euros por unidad. `null` si aún no hay precio. */
  precioUnidad: number | null
  /** Euros; negativo si es un descuento (como en el Excel). */
  descuento: number
  observaciones: string
}

export interface Quedada {
  id: Id
  nombre: string
  /** Fechas ISO (AAAA-MM-DD). */
  inicio: string | null
  fin: string | null
  participantes: Participante[]
  grupos: Grupo[]
  productos: Producto[]
}

/** Dinero en céntimos enteros, para que las sumas no arrastren errores de coma flotante. */
export type Centimos = number
