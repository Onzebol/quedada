import type { RepositorioMemoria } from './repositorioMemoria'

/** Apunta la URL a la primera quedada del repositorio (si la URL no apunta ya a una): así App no abre la página inicial. */
export function abrirPrimera(repositorio: RepositorioMemoria): void {
  if (window.location.hash === '' && repositorio.quedadas[0] !== undefined) {
    window.location.hash = `#/${encodeURIComponent(repositorio.quedadas[0].id)}`
  }
}
