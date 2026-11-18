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
  /** Porcentaje de la casa que le toca (100 por defecto). Si falta, `pagaCasa: false` equivale a 0. */
  porcentajeCasa?: number
  /** `false` para un niño: no puede comprar ni pagar gastos. Adulto por defecto (si falta). */
  adulto?: boolean
  /** Familia (unidad familiar) de la que es componente, si la tiene. */
  familiaId?: Id
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

/** La casa rural: ficha, precio y quién lo ha pagado. */
export interface Casa {
  titulo: string
  /** Texto libre; los enlaces `http(s)://` se muestran como tales. */
  descripcion: string
  direccion: string
  /** Coordenadas del mapa (se obtienen de la dirección). */
  latitud: number | null
  longitud: number | null
  /** Precio total del alquiler. `null` si aún no se sabe. */
  precio: Centimos | null
}

/** Un pago de la casa (reserva, resto…) hecho por una familia. Solo lo pagado entra en las cuentas. */
export interface Pago {
  id: Id
  /** Familia (id de un `Asistente`) que paga. */
  familiaId: Id
  /** Céntimos enteros, siempre positivo. */
  importe: Centimos
  /** Texto libre: «Reserva», «Resto»… */
  concepto: string
}

/** Un gasto real: lo que alguien ha puesto de su bolsillo (compra, gasolina…), esté o no en la lista de la compra. */
export interface Gasto {
  id: Id
  /** Quien ha pagado: participante o familia. */
  pagadorId: Id
  concepto: string
  importe: Centimos
  /** Ruta de la foto del tique en el almacén de imágenes (`<quedada>/<gasto>.jpg`), si la hay. */
  imagen?: string
}

export interface Quedada {
  id: Id
  nombre: string
  /** Fechas ISO (AAAA-MM-DD). */
  inicio: string | null
  fin: string | null
  casa: Casa
  participantes: Participante[]
  grupos: Grupo[]
  productos: Producto[]
  asistentes: Asistente[]
  basicos: Basico[]
  /** Pagos del alquiler de la casa, por familia. */
  pagos: Pago[]
  /** Gastos pagados de verdad; con los pagos de la casa son lo único que cuenta en las cuentas (la lista de la compra es orientativa). */
  gastos: Gasto[]
}

/** Dinero en céntimos enteros, para que las sumas no arrastren errores de coma flotante. */
export type Centimos = number
