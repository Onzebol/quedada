import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import type { Usuario } from './autenticacion/tipos'
import { quedada } from './dominio/fabrica'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

const ana: Usuario = { id: 'g-ana', nombre: 'Ana Pérez', foto: 'https://fotos/ana.png' }

const q1 = () =>
  quedada({
    id: 'q1',
    nombre: 'Quedada 2026',
    participantes: [
      { id: 'u1', nombre: 'Ana' },
      { id: 'u2', nombre: 'Luis' },
    ],
    grupos: [{ id: 'g1', nombre: 'Cena', orden: 0 }],
  })

async function preparar(
  auth: AutenticacionMemoria,
  quedadas = [q1()],
  urlPagina = 'https://onzebol.github.io/quedada/',
  alSalir?: () => void,
) {
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria(quedadas)
  abrirPrimera(repositorio)
  render(<App repositorio={repositorio} autenticacion={auth} urlPagina={urlPagina} crearId={() => 'x'} alSalir={alSalir} />)
  await screen.findByRole('heading', { level: 2, name: 'Lista de la compra' })
  return { usuario, repositorio }
}

afterEach(() => {
  window.location.hash = ''
})

describe('Sesión con Google', () => {
  it('sin sesión ofrece entrar; al entrar muestra nombre y foto y permite salir', async () => {
    const { usuario } = await preparar(new AutenticacionMemoria(ana))
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Entrar con Google' }))
    const boton = await screen.findByRole('button', { name: 'Ana Pérez' })
    expect(boton.textContent).toBe('Ana Pérez')
    expect(boton.lastElementChild).toHaveAttribute('src', 'https://fotos/ana.png')
    expect(screen.queryByRole('menuitem', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Ana Pérez' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()
  })

  it('el menú del usuario se abre al pulsar y se cierra con Escape o al pulsar fuera', async () => {
    const { usuario } = await preparar(new AutenticacionMemoria(ana, ana))
    const boton = screen.getByRole('button', { name: 'Ana Pérez' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await usuario.click(boton)
    await usuario.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('al cerrar sesión avisa para volver a la pantalla de entrada', async () => {
    let avisos = 0
    const { usuario } = await preparar(new AutenticacionMemoria(ana, ana), [q1()], undefined, () => {
      avisos++
    })
    await usuario.click(screen.getByRole('button', { name: 'Ana Pérez' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(avisos).toBe(1))
  })

  it('muestra el nombre completo de la cuenta en el menú de usuario', async () => {
    const luis = { ...ana, nombre: 'Luis Miguel Arpón Izquierdo' }
    await preparar(new AutenticacionMemoria(luis, luis))
    expect(screen.getByRole('button', { name: 'Luis Miguel Arpón Izquierdo' })).toBeInTheDocument()
  })

  it('mantiene la sesión que ya existía al cargar la página', async () => {
    await preparar(new AutenticacionMemoria(ana, ana))
    expect(screen.getByRole('button', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar con Google' })).not.toBeInTheDocument()
  })

  it('avisa si no se pudo entrar y sigue sin sesión', async () => {
    const { usuario } = await preparar(new AutenticacionMemoria(null))
    await usuario.click(screen.getByRole('button', { name: 'Entrar con Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar sesión')
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
  })

  it('si el inicio de sesión no está configurado, no ofrece entrar y la app sigue en modo local', async () => {
    await preparar(new AutenticacionMemoria(ana, null, false))
    expect(screen.queryByRole('button', { name: 'Entrar con Google' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Lista de la compra' })).toBeInTheDocument()
  })
})

describe('Este soy yo', () => {
  it('no se ofrece sin sesión', async () => {
    await preparar(new AutenticacionMemoria(ana))
    expect(screen.queryByRole('combobox', { name: 'Este soy yo' })).not.toBeInTheDocument()
  })

  it('vincula la cuenta con un participante, lo guarda y lo recuerda al recargar', async () => {
    const { usuario, repositorio } = await preparar(new AutenticacionMemoria(ana, ana))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Este soy yo' }), 'Luis')
    expect((await repositorio.obtener('q1'))?.participantes.find((p) => p.id === 'u2')?.cuentaId).toBe('g-ana')
    expect(screen.getByText('Eres Luis en esta quedada')).toBeInTheDocument()
  })

  it('muestra el vínculo ya guardado y permite soltarlo', async () => {
    const vinculada = q1()
    vinculada.participantes[0].cuentaId = 'g-ana'
    const { usuario, repositorio } = await preparar(new AutenticacionMemoria(ana, ana), [vinculada])
    expect(screen.getByRole('combobox', { name: 'Este soy yo' })).toHaveValue('u1')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Este soy yo' }), 'Nadie')
    expect((await repositorio.obtener('q1'))?.participantes[0].cuentaId).toBeUndefined()
  })
})

describe('Enlace de la quedada', () => {
  it('copia el enlace con la ruta de hash de la quedada', async () => {
    const { usuario } = await preparar(new AutenticacionMemoria(ana))
    await usuario.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(await navigator.clipboard.readText()).toBe('https://onzebol.github.io/quedada/#/q1')
    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument()
  })

  it('abrir #/<id> muestra esa quedada', async () => {
    window.location.hash = '#/q2'
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    expect(await screen.findByRole('heading', { level: 3, name: 'Merienda' })).toBeInTheDocument()
  })

  it('un enlace antiguo #/quedada/<id> sigue mostrando esa quedada', async () => {
    window.location.hash = '#/quedada/q2'
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    expect(await screen.findByRole('heading', { level: 3, name: 'Merienda' })).toBeInTheDocument()
  })

  it('reacciona a un cambio de hash con la página abierta', async () => {
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    window.location.hash = '#/q2'
    expect(await screen.findByRole('heading', { level: 3, name: 'Merienda' })).toBeInTheDocument()
  })

  it('avisa si la quedada del enlace no existe o no es accesible', async () => {
    window.location.hash = '#/otra'
    render(<App repositorio={new RepositorioMemoria([q1()])} autenticacion={new AutenticacionMemoria(ana)} crearId={() => 'x'} />)
    expect(await screen.findByText(/No se encontró esta quedada/)).toBeInTheDocument()
  })
})
