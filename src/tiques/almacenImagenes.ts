/** Dónde se guardan las fotos de los tiques. Implementada sobre Supabase Storage por `AlmacenSupabase`. */
export interface AlmacenImagenes {
  /** Guarda la imagen en `ruta`, sustituyendo la que hubiera. */
  subir(ruta: string, imagen: Blob): Promise<void>
  /** Dirección temporal con la que mostrar la imagen. */
  url(ruta: string): Promise<string>
  /** Borra las imágenes indicadas (las que no existan se ignoran). */
  borrar(rutas: string[]): Promise<void>
}

/** Lo que la interfaz necesita para trabajar con fotos: dónde guardarlas y cómo reducirlas antes de subirlas. */
export interface Imagenes {
  almacen: AlmacenImagenes
  reducir: (archivo: Blob) => Promise<Blob>
}

/** Ruta de la foto del tique de un gasto: una carpeta por quedada, que es lo que comprueba la seguridad del bucket. */
export const rutaTique = (quedadaId: string, gastoId: string) => `${quedadaId}/${gastoId}.jpg`
