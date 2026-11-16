/** Identificadores: cadenas opacas generadas por la app. */
export type Id = string

export interface Participante {
  id: Id
  nombre: string
  /** Porcentaje de la comida que le toca (100 por defecto; 0 o menos para niños). */
  porcentajeComida?: number
  /** Si paga su parte de los gastos de la casa (`true` por defecto; `false` para niños). */
  pagaCasa?: boolean
  /** Cuenta de Google vinculada («este soy yo»), si la hay. */
  cuentaId?: string
}

/** Una comida o bloque de la compra: cena del viernes, desayunos, bebida… */
export interface Grupo {
  id: Id
  nombre: string
  orden: number
  /** `casa`: se reparte a partes iguales entre quienes pagan la casa. `comida` (por defecto): por porcentaje. */
  reparto?: 'casa' | 'comida'
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

/** Una familia (o persona sola) que viene a la quedada. */
export interface Asistente {
  id: Id
  familia: string
  /** Número de personas de la familia (entero, al menos 1). */
  personas: number
  /** Hora de llegada `HH:MM`, o `null` si aún no se sabe. */
  llegada: string | null
}

/** Algo que no se compra para una comida concreta: leche, lavavajillas… Lo trae una familia. */
export interface Basico {
  id: Id
  nombre: string
  /** Familia que lo trae. `null` si queda sin asignar. */
  asistenteId: Id | null
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
  asistentes: Asistente[]
  basicos: Basico[]
}

/** Dinero en céntimos enteros, para que las sumas no arrastren errores de coma flotante. */
export type Centimos = number
