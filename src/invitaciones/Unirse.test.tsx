import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InvitacionesMemoria } from '../test/invitacionesMemoria'
import { Unirse } from './Unirse'

function preparar(token: string, invitaciones = new InvitacionesMemoria({ destinos: { buena: ['q1', 'Almunia 2026'] } })) {
  const alUnirse = vi.fn()
  const alCancelar = vi.fn()
  render(<Unirse token={token} nombre="Marta" invitaciones={invitaciones} alUnirse={alUnirse} alCancelar={alCancelar} />)
  return { usuario: userEvent.setup(), invitaciones, alUnirse, alCancelar }
}

describe('Unirse', () => {
  it('muestra a qué quedada te han invitado y entra al pulsar «Unirme»', async () => {
    const { usuario, invitaciones, alUnirse } = preparar('buena')
    expect(await screen.findByRole('heading', { name: 'Te han invitado a «Almunia 2026»' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Unirme' }))
    await waitFor(() => expect(alUnirse).toHaveBeenCalledWith('q1'))
    expect(invitaciones.aceptados).toEqual([{ token: 'buena', nombre: 'Marta' }])
  })

  it('con un enlace que no vale avisa y no ofrece unirse', async () => {
    const { alUnirse } = preparar('mala')
    expect(await screen.findByRole('alert')).toHaveTextContent('La invitación no es válida o ha caducado')
    expect(screen.queryByRole('button', { name: 'Unirme' })).not.toBeInTheDocument()
    expect(alUnirse).not.toHaveBeenCalled()
  })

  it('«Ahora no» cancela', async () => {
    const { usuario, alCancelar } = preparar('buena')
    await usuario.click(await screen.findByRole('button', { name: 'Ahora no' }))
    expect(alCancelar).toHaveBeenCalled()
  })

  it('si al unirse falla lo avisa y deja reintentar', async () => {
    const invitaciones = new InvitacionesMemoria({ destinos: { buena: ['q1', 'Almunia 2026'] } })
    const { usuario, alUnirse } = preparar('buena', invitaciones)
    await screen.findByRole('button', { name: 'Unirme' })
    invitaciones.falla = true
    await usuario.click(screen.getByRole('button', { name: 'Unirme' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo entrar')
    expect(alUnirse).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Unirme' })).toBeEnabled()
  })
})
