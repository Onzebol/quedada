/**
 * Nombre de pila a partir del nombre completo de la cuenta. Google (vía Supabase) no da el nombre de
 * pila por separado, así que se supone «nombre(s) + dos apellidos»: con 4 palabras o más se quitan
 * los dos últimos; con menos, se deja la primera.
 */
export function nombreCorto(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/)
  return palabras.length >= 4 ? palabras.slice(0, -2).join(' ') : palabras[0]
}
