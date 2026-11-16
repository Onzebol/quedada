import type { Persistencia } from '../dominio/persistencia'

/** Persistencia en memoria para tests. */
export class PersistenciaMemoria implements Persistencia {
  bytes: Uint8Array | null = null

  async cargar(): Promise<Uint8Array | null> {
    return this.bytes
  }

  async guardar(bytes: Uint8Array): Promise<void> {
    this.bytes = bytes
  }
}
