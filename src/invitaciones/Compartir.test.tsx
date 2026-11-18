import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InvitacionesMemoria } from '../test/invitacionesMemoria'
import { Compartir } from './Compartir'

const PAGINA = 'https://onzebol.github.io/quedada/'

function preparar(invitaciones = new InvitacionesMemoria()) {
  render(<Compartir quedadaId="q1" invitaciones={invitaciones} urlPagina={PAGINA} />)
  return { usuario: userEvent.setup(), invitaciones }
}

async function abrir(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Invitar' }))
  return screen.findByRole('region', { name: 'Invitar a la quedada' })
}

describe('Compartir', () => {
  it('está cerrado hasta pulsar «Invitar»', () => {
    preparar()
    expect(screen.queryByRole('region', { name: 'Invitar a la quedada' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invitar' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('sin enlace ofrece crearlo y muestra la dirección con el token', async () => {
    const { usuario } = preparar()
    const panel = await abrir(usuario)
    expect(within(panel).getByText('No hay ningún enlace activo.')).toBeInTheDocument()
    await usuario.click(within(panel).getByRole('button', { name: 'Crear enlace' }))
    expect(await within(panel).findByRole('textbox', { name: 'Enlace de invitación' })).toHaveValue(`${PAGINA}#/unirse/token1`)
  })

  it('con enlace lo muestra y lo copia', async () => {
    const { usuario } = preparar(new InvitacionesMemoria({ enlace: 'abc' }))
    const panel = await abrir(usuario)
    expect(await within(panel).findByRole('textbox', { name: 'Enlace de invitación' })).toHaveValue(`${PAGINA}#/unirse/abc`)
    const escribir = vi.spyOn(navigator.clipboard, 'writeText')
    await usuario.click(within(panel).getByRole('button', { name: 'Copiar enlace' }))
    expect(escribir).toHaveBeenCalledWith(`${PAGINA}#/unirse/abc`)
    expect(await within(panel).findByRole('status')).toHaveTextContent('Enlace copiado')
  })

  it('crear un enlace nuevo sustituye al anterior', async () => {
    const { usuario } = preparar(new InvitacionesMemoria({ enlace: 'abc' }))
    const panel = await abrir(usuario)
    await usuario.click(await within(panel).findByRole('button', { name: 'Crear enlace nuevo' }))
    await waitFor(() => expect(within(panel).getByRole('textbox', { name: 'Enlace de invitación' })).toHaveValue(`${PAGINA}#/unirse/token1`))
  })

  it('desactivar el enlace deja de mostrarlo', async () => {
    const { usuario, invitaciones } = preparar(new InvitacionesMemoria({ enlace: 'abc' }))
    const panel = await abrir(usuario)
    await usuario.click(await within(panel).findByRole('button', { name: 'Desactivar enlace' }))
    expect(await within(panel).findByText('No hay ningún enlace activo.')).toBeInTheDocument()
    expect(invitaciones.enlace).toBeNull()
  })

  it('lista los miembros y retira a uno tras confirmar', async () => {
    const { usuario, invitaciones } = preparar(
      new InvitacionesMemoria({ miembros: [{ usuarioId: 'u1', nombre: 'Marta' }, { usuarioId: 'u2', nombre: 'Pedro' }] }),
    )
    const panel = await abrir(usuario)
    expect(await within(panel).findByText('Marta')).toBeInTheDocument()
    await usuario.click(within(panel).getByRole('button', { name: 'Retirar a Marta' }))
    const aviso = screen.getByRole('dialog')
    expect(invitaciones.miembrosActuales).toHaveLength(2)
    await usuario.click(within(aviso).getByRole('button', { name: 'Sí, retirar' }))
    await waitFor(() => expect(within(panel).queryByText('Marta')).not.toBeInTheDocument())
    expect(within(panel).getByText('Pedro')).toBeInTheDocument()
    expect(invitaciones.miembrosActuales).toEqual([{ usuarioId: 'u2', nombre: 'Pedro' }])
  })

  it('sin miembros lo dice', async () => {
    const { usuario } = preparar()
    const panel = await abrir(usuario)
    expect(await within(panel).findByText('Todavía no ha entrado nadie.')).toBeInTheDocument()
  })

  it('si falla algo lo avisa', async () => {
    const invitaciones = new InvitacionesMemoria()
    invitaciones.falla = true
    const { usuario } = preparar(invitaciones)
    const panel = await abrir(usuario)
    expect(await within(panel).findByRole('alert')).toHaveTextContent('No se pudo')
  })

  it('«Invitar» vuelve a cerrar el panel', async () => {
    const { usuario } = preparar()
    await abrir(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Invitar' }))
    expect(screen.queryByRole('region', { name: 'Invitar a la quedada' })).not.toBeInTheDocument()
  })
})
