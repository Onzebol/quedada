import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { quedada } from '../dominio/fabrica'
import { Inicio } from './Inicio'

const lista = () => [quedada({ id: 'a', nombre: 'Almunia 2026' }), quedada({ id: 'b', nombre: 'Almunia 2025' })]

function preparar(quedadas = lista(), puedeEliminar?: (id: string) => boolean) {
  const alElegir = vi.fn()
  const alCrear = vi.fn()
  const alEliminar = vi.fn().mockResolvedValue(undefined)
  const alDuplicar = vi.fn()
  const alEditar = vi.fn()
  render(
    <Inicio quedadas={quedadas} alElegir={alElegir} alCrear={alCrear} alEliminar={alEliminar} alEditar={alEditar} alDuplicar={alDuplicar} puedeEliminar={puedeEliminar} />,
  )
  return { usuario: userEvent.setup(), alElegir, alCrear, alEliminar, alEditar, alDuplicar }
}

describe('Inicio', () => {
  it('lista las quedadas por fecha de inicio y nombre, y avisa si no hay ninguna', () => {
    preparar([
      quedada({ id: 'a', nombre: 'Sin fecha' }),
      quedada({ id: 'b', nombre: 'Navidad', inicio: '2026-12-24' }),
      quedada({ id: 'c', nombre: 'Almunia 2026', inicio: '2026-12-04' }),
      quedada({ id: 'd', nombre: 'Aniversario', inicio: '2026-12-04' }),
    ])
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Navidad'),
      expect.stringContaining('Almunia 2026'),
      expect.stringContaining('Aniversario'),
      expect.stringContaining('Sin fecha'),
    ])
  })

  it('muestra las fechas de cada quedada', () => {
    preparar([quedada({ id: 'a', nombre: 'Almunia', inicio: '2026-12-04', fin: '2026-12-06' }), quedada({ id: 'b', nombre: 'Otra' })])
    const [con, sin] = screen.getAllByRole('listitem')
    expect(con).toHaveTextContent(/4 dic 2026\s*–\s*6 dic 2026/)
    expect(sin).not.toHaveTextContent('–')
  })

  it('las muestra por orden alfabético del nombre, sin importar cómo lleguen (#151)', () => {
    preparar([
      quedada({ id: 'c', nombre: 'Navidad' }),
      quedada({ id: 'a', nombre: 'álamo' }),
      quedada({ id: 'b', nombre: 'Almunia' }),
    ])
    expect(screen.getAllByRole('button', { name: /^(Navidad|álamo|Almunia)$/ }).map((b) => b.textContent)).toEqual(['álamo', 'Almunia', 'Navidad'])
  })

  it('sin quedadas muestra un aviso', () => {
    preparar([])
    expect(screen.getByText('Todavía no tienes ninguna quedada.')).toBeInTheDocument()
  })

  it('elegir una quedada la abre', async () => {
    const { usuario, alElegir } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Almunia 2025' }))
    expect(alElegir).toHaveBeenCalledWith('b')
  })

  it('«Añadir quedada» abre una ventana modal y crea con el nombre escrito', async () => {
    const { usuario, alCrear } = preparar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), '  Navidad  ')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).toHaveBeenCalledWith({ nombre: 'Navidad', inicio: null, fin: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('crea con fecha de inicio y de fin', async () => {
    const { usuario, alCrear } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), 'Navidad')
    await usuario.type(within(ventana).getByLabelText('Inicio'), '2026-12-24')
    await usuario.type(within(ventana).getByLabelText('Fin'), '2026-12-26')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).toHaveBeenCalledWith({ nombre: 'Navidad', inicio: '2026-12-24', fin: '2026-12-26' })
  })

  it('la fecha de fin no puede ser anterior a la de inicio', async () => {
    const { usuario, alCrear } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    const ventana = screen.getByRole('dialog')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), 'Navidad')
    await usuario.type(within(ventana).getByLabelText('Fin'), '2026-12-26')
    await usuario.type(within(ventana).getByLabelText('Inicio'), '2026-12-30')
    expect(within(ventana).getByLabelText('Fin')).toHaveValue('2026-12-30')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).toHaveBeenCalledWith({ nombre: 'Navidad', inicio: '2026-12-30', fin: '2026-12-30' })
  })

  it('«Editar» muestra las fechas actuales y permite cambiarlas', async () => {
    const { usuario, alEditar } = preparar([quedada({ id: 'a', nombre: 'Almunia', inicio: '2026-12-04', fin: '2026-12-06' })])
    await usuario.click(screen.getByRole('button', { name: 'Editar Almunia' }))
    const ventana = screen.getByRole('dialog')
    expect(within(ventana).getByLabelText('Inicio')).toHaveValue('2026-12-04')
    expect(within(ventana).getByLabelText('Fin')).toHaveValue('2026-12-06')
    await usuario.clear(within(ventana).getByLabelText('Fin'))
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(alEditar).toHaveBeenCalledWith('a', { nombre: 'Almunia', inicio: '2026-12-04', fin: null })
  })

  it('no crea una quedada sin nombre', async () => {
    const { usuario, alCrear } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Añadir quedada' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Añadir' }))
    expect(alCrear).not.toHaveBeenCalled()
  })

  it('«Duplicar» duplica solo esa quedada', async () => {
    const { usuario, alDuplicar } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Duplicar Almunia 2025' }))
    expect(alDuplicar).toHaveBeenCalledWith('b')
  })

  it('«Editar» abre una ventana modal con el nombre y renombra solo esa quedada', async () => {
    const { usuario, alEditar } = preparar()
    await usuario.click(screen.getByRole('button', { name: 'Editar Almunia 2025' }))
    const ventana = screen.getByRole('dialog')
    const campo = within(ventana).getByRole('textbox', { name: 'Nombre' })
    expect(campo).toHaveValue('Almunia 2025')
    await usuario.clear(campo)
    await usuario.type(campo, 'Almunia 2027')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(alEditar).toHaveBeenCalledWith('b', { nombre: 'Almunia 2027', inicio: null, fin: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('elimina con confirmación y solo la quedada elegida', async () => {
    const { usuario, alEliminar } = preparar()
    await usuario.click(screen.getByRole('button', { name: /^Borrar quedada Almunia 2025/ }))
    const aviso = screen.getByRole('dialog')
    expect(aviso).toHaveTextContent('«Almunia 2025»')
    expect(alEliminar).not.toHaveBeenCalled()
    await usuario.click(within(aviso).getByRole('button', { name: 'Sí, borrar' }))
    expect(alEliminar).toHaveBeenCalledWith('b')
  })

  it('solo ofrece borrar las quedadas que la cuenta puede borrar (las compartidas no)', () => {
    preparar(lista(), (id) => id === 'a')
    expect(screen.getAllByRole('button', { name: /^Borrar quedada/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^Borrar quedada Almunia 2026/ })).toBeInTheDocument()
  })
})
