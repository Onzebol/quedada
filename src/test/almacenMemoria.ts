import type { AlmacenImagenes, Imagenes } from '../tiques/almacenImagenes'

/** Almacén de imágenes en memoria para los tests de interfaz. */
export class AlmacenMemoria implements AlmacenImagenes {
  imagenes = new Map<string, Blob>()
  fallarAlSubir = false

  async subir(ruta: string, imagen: Blob): Promise<void> {
    if (this.fallarAlSubir) throw new Error('sin conexión')
    this.imagenes.set(ruta, imagen)
  }

  async url(ruta: string): Promise<string> {
    return `https://imagenes.test/${ruta}`
  }

  async borrar(rutas: string[]): Promise<void> {
    for (const r of rutas) this.imagenes.delete(r)
  }
}

/** Imágenes para los tests: almacén en memoria y «reducción» que devuelve el mismo archivo. */
export function imagenesDePrueba(almacen = new AlmacenMemoria()): Imagenes & { almacen: AlmacenMemoria } {
  return { almacen, reducir: async (archivo) => archivo }
}
