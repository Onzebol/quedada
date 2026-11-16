import type { Persistencia } from './persistencia'

const ALMACEN = 'bases'
const CLAVE = 'quedada'

function abrir(nombre: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(nombre, 1)
    peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN)
    peticion.onsuccess = () => resolve(peticion.result)
    peticion.onerror = () => reject(peticion.error)
  })
}

/** Guarda el fichero SQLite como un blob en IndexedDB. */
export class PersistenciaIndexedDb implements Persistencia {
  private readonly nombre: string

  constructor(nombre = 'quedada') {
    this.nombre = nombre
  }

  async cargar(): Promise<Uint8Array | null> {
    const bd = await abrir(this.nombre)
    return new Promise((resolve, reject) => {
      const peticion = bd.transaction(ALMACEN).objectStore(ALMACEN).get(CLAVE)
      peticion.onsuccess = () => resolve((peticion.result as Uint8Array | undefined) ?? null)
      peticion.onerror = () => reject(peticion.error)
    })
  }

  async guardar(bytes: Uint8Array): Promise<void> {
    const bd = await abrir(this.nombre)
    return new Promise((resolve, reject) => {
      const tx = bd.transaction(ALMACEN, 'readwrite')
      tx.objectStore(ALMACEN).put(bytes, CLAVE)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
