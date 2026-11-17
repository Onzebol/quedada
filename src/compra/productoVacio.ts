export interface ValoresProducto {
  nombre: string
  cantidad: number | null
  unidad: string
  precioUnidad: number | null
  observaciones: string
}

export const PRODUCTO_VACIO: ValoresProducto = {
  nombre: '',
  cantidad: null,
  unidad: '',
  precioUnidad: null,
  observaciones: '',
}
