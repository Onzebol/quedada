import type { Repositorio } from './repositorio'
import type { Id, Quedada } from './tipos'

export class RepositorioLocalStorage implements Repositorio {
  private readonly almacen: Storage
  private readonly clave: string

  constructor(almacen: Storage = localStorage, clave = 'quedada:quedadas') {
    this.almacen = almacen
    this.clave = clave
  }

  async listar(): Promise<Quedada[]> {
    return this.leer()
  }

  async obtener(id: Id): Promise<Quedada | null> {
    return this.leer().find((q) => q.id === id) ?? null
  }

  async guardar(quedada: Quedada): Promise<void> {
    const resto = this.leer().filter((q) => q.id !== quedada.id)
    this.escribir([...resto, quedada])
  }

  async borrar(id: Id): Promise<void> {
    this.escribir(this.leer().filter((q) => q.id !== id))
  }

  private leer(): Quedada[] {
    const texto = this.almacen.getItem(this.clave)
    if (texto === null) return []
    try {
      const datos: unknown = JSON.parse(texto)
      return Array.isArray(datos) ? (datos as Quedada[]) : []
    } catch {
      return []
    }
  }

  private escribir(quedadas: Quedada[]): void {
    this.almacen.setItem(this.clave, JSON.stringify(quedadas))
  }
}
