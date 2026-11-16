import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import type { Usuario } from './autenticacion/tipos'
import { quedada } from './dominio/fabrica'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
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

async function preparar(auth: AutenticacionMemoria, quedadas = [q1()], urlPagina = 'https://onzebol.github.io/quedada/') {
  const usuario = userEvent.setup()
  const repositorio = new RepositorioMemoria(quedadas)
  render(<App repositorio={repositorio} autenticacion={auth} urlPagina={urlPagina} crearId={() => 'x'} />)
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
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de Ana Pérez' })).toHaveAttribute('src', 'https://fotos/ana.png')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()
  })

  it('mantiene la sesión que ya existía al cargar la página', async () => {
    await preparar(new AutenticacionMemoria(ana, ana))
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
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
    expect(await navigator.clipboard.readText()).toBe('https://onzebol.github.io/quedada/#/quedada/q1')
    expect(await screen.findByText('Enlace copiado')).toBeInTheDocument()
  })

  it('abrir #/quedada/<id> muestra esa quedada', async () => {
    window.location.hash = '#/quedada/q2'
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    expect(await screen.findByRole('heading', { level: 3, name: 'Merienda' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Quedada' })).toHaveValue('q2')
  })

  it('cambiar de quedada actualiza el enlace de la página', async () => {
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    const { usuario } = await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Quedada' }), 'q2')
    expect(window.location.hash).toBe('#/quedada/q2')
  })

  it('reacciona a un cambio de hash con la página abierta', async () => {
    const q2 = quedada({ id: 'q2', nombre: 'Quedada 2025', grupos: [{ id: 'g2', nombre: 'Merienda', orden: 0 }] })
    await preparar(new AutenticacionMemoria(ana), [q1(), q2])
    window.location.hash = '#/quedada/q2'
    expect(await screen.findByRole('heading', { level: 3, name: 'Merienda' })).toBeInTheDocument()
  })

  it('avisa si la quedada del enlace no está en este navegador', async () => {
    window.location.hash = '#/quedada/otra'
    await preparar(new AutenticacionMemoria(ana))
    await waitFor(() =>
      expect(screen.getByText(/Esta quedada no está guardada en este navegador/)).toBeInTheDocument(),
    )
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 2, name: 'Lista de la compra' })).toBeInTheDocument()
  })
})
