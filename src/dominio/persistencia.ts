/** Dónde se guarda el fichero de la base SQLite entre sesiones. */
export interface Persistencia {
  cargar(): Promise<Uint8Array | null>
  guardar(bytes: Uint8Array): Promise<void>
}
