import type { AlmacenImagenes } from './almacenImagenes'

interface ErrorSupabase {
  message: string
}

/** La parte de `SupabaseClient` que usa el almacén, para probarlo con un cliente falso. */
export interface ClienteAlmacen {
  storage: {
    from(bucket: string): {
      upload(ruta: string, cuerpo: Blob, opciones: { contentType: string; upsert: boolean }): PromiseLike<{ error: ErrorSupabase | null }>
      createSignedUrl(ruta: string, segundos: number): PromiseLike<{ data: { signedUrl: string } | null; error: ErrorSupabase | null }>
      remove(rutas: string[]): PromiseLike<{ error: ErrorSupabase | null }>
    }
  }
}

const BUCKET = 'tiques'
const VALIDEZ_SEGUNDOS = 3600

/** Fotos de tiques en el bucket privado `tiques` (`0007_tiques.sql`); quién las ve lo decide la seguridad del bucket. */
export class AlmacenSupabase implements AlmacenImagenes {
  private readonly cliente: ClienteAlmacen

  constructor(cliente: ClienteAlmacen) {
    this.cliente = cliente
  }

  async subir(ruta: string, imagen: Blob): Promise<void> {
    const { error } = await this.cliente.storage
      .from(BUCKET)
      .upload(ruta, imagen, { contentType: imagen.type || 'image/jpeg', upsert: true })
    if (error) throw new Error(error.message)
  }

  async url(ruta: string): Promise<string> {
    const { data, error } = await this.cliente.storage.from(BUCKET).createSignedUrl(ruta, VALIDEZ_SEGUNDOS)
    if (error || !data) throw new Error(error?.message ?? 'No se pudo obtener la imagen')
    return data.signedUrl
  }

  async borrar(rutas: string[]): Promise<void> {
    if (rutas.length === 0) return
    const { error } = await this.cliente.storage.from(BUCKET).remove(rutas)
    if (error) throw new Error(error.message)
  }
}
