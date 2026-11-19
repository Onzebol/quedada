import type { ProveedorIdGoogle } from '../supabase/autenticacionSupabase'

const SCRIPT = 'https://accounts.google.com/gsi/client'

interface GoogleId {
  initialize(c: { client_id: string; callback: (r: { credential?: string }) => void; nonce: string }): void
  renderButton(el: HTMLElement, o: Record<string, unknown>): void
}
interface GoogleGlobal {
  accounts: { id?: GoogleId }
}

function google(): GoogleGlobal | undefined {
  return (window as unknown as { google?: GoogleGlobal }).google
}

function cargarScript(): Promise<void> {
  if (google()?.accounts.id) return Promise.resolve()
  return new Promise((resolver, rechazar) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolver()
    s.onerror = () => rechazar(new Error('No se pudo cargar Google'))
    document.head.appendChild(s)
  })
}

/**
 * Botón de Google Identity Services (#148): devuelve un ID token sin redirigir a Supabase, así la
 * ventana de Google no enseña la URL de `supabase.co`. `clientId` debe figurar entre los Client ID
 * permitidos del proveedor Google de Supabase.
 */
export function proveedorGoogleId(clientId: string): ProveedorIdGoogle {
  return async (contenedor, nonceHash, alToken) => {
    await cargarScript()
    const id = google()!.accounts.id!
    id.initialize({ client_id: clientId, nonce: nonceHash, callback: (r) => r.credential && alToken(r.credential) })
    id.renderButton(contenedor, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'es' })
  }
}
