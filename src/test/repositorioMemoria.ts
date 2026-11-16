import type { Repositorio } from '../dominio/repositorio'
import type { Id, Quedada } from '../dominio/tipos'

/** Repositorio en memoria para tests de interfaz. */
export class RepositorioMemoria implements Repositorio {
  quedadas: Quedada[]

  constructor(quedadas: Quedada[] = []) {
    this.quedadas = quedadas
  }

  async listar(): Promise<Quedada[]> {
    return this.quedadas
  }

  async obtener(id: Id): Promise<Quedada | null> {
    return this.quedadas.find((q) => q.id === id) ?? null
  }

  async guardar(quedada: Quedada): Promise<void> {
    this.quedadas = [...this.quedadas.filter((q) => q.id !== quedada.id), quedada]
  }

  async borrar(id: Id): Promise<void> {
    this.quedadas = this.quedadas.filter((q) => q.id !== id)
  }
}
