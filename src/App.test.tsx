import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { producto, quedada } from './dominio/fabrica'
import { quedadaInicial } from './dominio/operaciones'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

function preparar(repositorio = new RepositorioMemoria()) {
  const usuario = userEvent.setup()
  const crearId = contador()
  const vista = render(<App repositorio={repositorio} crearId={crearId} />)
  return { usuario, repositorio, vista, crearId }
}

async function esperarCarga() {
  await screen.findByRole('heading', { level: 3, name: 'Cena del viernes' })
}

async function anadirProducto(
  usuario: ReturnType<typeof userEvent.setup>,
  grupo: string,
  nombre: string,
) {
  const formulario = screen.getByRole('form', { name: `Añadir producto a ${grupo}` })
  await usuario.type(within(formulario).getByRole('textbox', { name: 'Producto' }), nombre)
  await usuario.click(within(formulario).getByRole('button', { name: 'Añadir' }))
}

async function anadirParticipante(usuario: ReturnType<typeof userEvent.setup>, nombre: string) {
  await usuario.type(screen.getByRole('textbox', { name: 'Nombre del participante' }), nombre)
  await usuario.click(screen.getByRole('button', { name: 'Añadir participante' }))
}

describe('Lista de la compra', () => {
  it('muestra el título y las comidas habituales agrupadas', async () => {
    preparar()
    expect(screen.getByRole('heading', { level: 1, name: 'Quedada' })).toBeInTheDocument()
    await esperarCarga()
    const grupos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(grupos).toEqual([
      'Cena del viernes',
      'Comida del sábado (asado)',
      'Cena del sábado (sopa)',
      'Comida del domingo (pasta)',
      'Desayunos',
      'Picoteos y varios',
      'Bebida',
    ])
  })

  it('añade un producto a una comida', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Cena del viernes', 'Pizza BBQ')
    expect(screen.getByRole('checkbox', { name: 'Pizza BBQ' })).not.toBeChecked()
  })

  it('vacía el campo tras añadir y no añade productos sin nombre', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    const formulario = screen.getByRole('form', { name: 'Añadir producto a Bebida' })
    expect(within(formulario).getByRole('textbox', { name: 'Producto' })).toHaveValue('')
    await usuario.click(within(formulario).getByRole('button', { name: 'Añadir' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('marca un producto como comprado', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeChecked()
  })

  it('asigna un comprador a un producto', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirParticipante(usuario, 'Josu')
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    expect(screen.getByRole('option', { name: 'Josu', selected: true })).toBeInTheDocument()
  })

  it('avisa de cuántos productos no tienen comprador', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    expect(screen.getByRole('status')).toHaveTextContent('No hay productos todavía')
    await anadirParticipante(usuario, 'Josu')
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    expect(screen.getByRole('status')).toHaveTextContent('1 producto sin comprador')
    await anadirProducto(usuario, 'Bebida', 'Vino')
    expect(screen.getByRole('status')).toHaveTextContent('2 productos sin comprador')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Vino' }), 'Josu')
    expect(screen.getByRole('status')).toHaveTextContent('Todos los productos tienen comprador')
  })

  it('edita cantidad, unidad y observaciones y las muestra en la fila', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Cena del viernes', 'Alitas de pollo')
    await usuario.click(screen.getByRole('button', { name: 'Editar Alitas de pollo' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Cantidad' }), '2,3')
    await usuario.type(screen.getByRole('textbox', { name: 'Unidad' }), 'kg')
    await usuario.type(screen.getByRole('textbox', { name: 'Observaciones' }), 'Se comió una bandeja')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('2,3 kg')).toBeInTheDocument()
    expect(screen.getByText('Se comió una bandeja')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('cambia el nombre de un producto al editarlo', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidr')
    await usuario.click(screen.getByRole('button', { name: 'Editar Sidr' }))
    const nombre = screen.getByRole('textbox', { name: 'Nombre' })
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()
  })

  it('cancela la edición sin guardar cambios', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Editar Sidra' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Observaciones' }), 'borrador')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('borrador')).not.toBeInTheDocument()
  })

  it('borra un producto', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    expect(screen.queryByRole('checkbox', { name: 'Sidra' })).not.toBeInTheDocument()
  })

  it('añade una comida nueva', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre de la comida' }), 'Merienda')
    await usuario.click(screen.getByRole('button', { name: 'Añadir comida' }))
    const grupos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(grupos.at(-1)).toBe('Merienda')
  })

  it('renombra una comida', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await usuario.click(screen.getByRole('button', { name: 'Renombrar Bebida' }))
    const campo = screen.getByRole('textbox', { name: 'Nuevo nombre de Bebida' })
    await usuario.clear(campo)
    await usuario.type(campo, 'Bebidas')
    await usuario.click(screen.getByRole('button', { name: 'Guardar nombre' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Bebidas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Bebida' })).not.toBeInTheDocument()
  })

  it('borra una comida y sus productos solo tras confirmar', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Borrar comida Bebida' }))
    expect(screen.getByText('¿Borrar Bebida y su 1 producto?')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar borrado' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Bebida' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Borrar comida Bebida' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar borrado' }))
    expect(screen.queryByRole('heading', { level: 3, name: 'Bebida' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Sidra' })).not.toBeInTheDocument()
  })

  it('filtra por sin asignar, pendientes y comprador', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirParticipante(usuario, 'Josu')
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Bebida', 'Vino')
    await anadirProducto(usuario, 'Desayunos', 'Café')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))

    const filtro = screen.getByRole('combobox', { name: 'Mostrar' })

    await usuario.selectOptions(filtro, 'Sin asignar')
    expect(screen.queryByRole('checkbox', { name: 'Sidra' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Vino' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Café' })).toBeInTheDocument()

    await usuario.selectOptions(filtro, 'Pendientes')
    expect(screen.queryByRole('checkbox', { name: 'Sidra' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)

    await usuario.selectOptions(filtro, 'Compra Josu')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()

    await usuario.selectOptions(filtro, 'Todos')
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('oculta las comidas vacías cuando hay un filtro activo', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Pendientes')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Bebida' })).toBeInTheDocument()
  })

  it('conserva los datos al recargar (nueva instancia con el mismo repositorio)', async () => {
    const primera = preparar()
    await esperarCarga()
    await anadirParticipante(primera.usuario, 'Josu')
    await anadirProducto(primera.usuario, 'Bebida', 'Sidra')
    await primera.usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    await primera.usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Comprador de Sidra' }),
      'Josu',
    )
    primera.vista.unmount()

    preparar(primera.repositorio)
    await screen.findByRole('checkbox', { name: 'Sidra' })
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeChecked()
    expect(screen.getByRole('option', { name: 'Josu', selected: true })).toBeInTheDocument()
    expect(primera.repositorio.quedadas).toHaveLength(1)
  })

  it('avisa si no se pueden cargar los datos en vez de quedarse cargando', async () => {
    const repositorio = new RepositorioMemoria()
    repositorio.listar = () => Promise.reject(new Error('almacenamiento bloqueado'))
    preparar(repositorio)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los datos')
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('avisa si no se puede guardar un cambio, sin perder lo que se ve', async () => {
    const repositorio = new RepositorioMemoria()
    const { usuario } = preparar(repositorio)
    await esperarCarga()
    repositorio.guardar = () => Promise.reject(new Error('cuota llena'))
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el último cambio')
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()
  })

  it('carga la quedada ya guardada en vez de crear otra', async () => {
    const guardada = quedadaInicial(contador(), 'Almunia 2026')
    const repositorio = new RepositorioMemoria([guardada])
    preparar(repositorio)
    await esperarCarga()
    expect(repositorio.quedadas).toHaveLength(1)
    expect(repositorio.quedadas[0].nombre).toBe('Almunia 2026')
  })
})

function normalizar(texto: string | null) {
  return (texto ?? '').replace(/\s/g, ' ')
}

function quedadaConGastos() {
  return quedada({
    participantes: [
      { id: 'ana', nombre: 'Ana' },
      { id: 'beto', nombre: 'Beto' },
    ],
    grupos: [
      { id: 'cena', nombre: 'Cena del viernes', orden: 0 },
      { id: 'alquiler', nombre: 'Alquiler', orden: 1, reparto: 'casa' },
    ],
    productos: [
      producto({ id: 'p1', grupoId: 'cena', nombre: 'Pizza', compradorId: 'ana', cantidad: 2, precioUnidad: 10, descuento: -4 }),
      producto({ id: 'p2', grupoId: 'alquiler', nombre: 'Casa', compradorId: 'ana', cantidad: 1, precioUnidad: 100 }),
    ],
  })
}

describe('Gastos y liquidación', () => {
  it('guarda precio por unidad y descuento y muestra el total de la línea', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Editar Sidra' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Cantidad' }), '3')
    await usuario.type(screen.getByRole('textbox', { name: 'Precio por unidad (€)' }), '2,5')
    await usuario.type(screen.getByRole('textbox', { name: 'Descuento (€)' }), '-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('6,50 €', { exact: false })).toBeInTheDocument()
  })

  it('muestra lo pagado por persona, el total y quién debe a quién', async () => {
    preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    // comida 16 € a medias (8 + 8); casa 100 € (50 + 50); Ana pagó 116 €
    expect(normalizar(within(cuentas).getByText(/Total de la quedada/).textContent)).toContain('116,00 €')
    expect(normalizar(within(cuentas).getByText(/Ana ha pagado/).textContent)).toContain('116,00 €')
    expect(normalizar(within(cuentas).getByText(/Beto ha pagado/).textContent)).toContain('0,00 €')
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 58,00 € a Ana')
  })

  it('dice que no hay nada que liquidar cuando las cuentas cuadran', async () => {
    preparar(new RepositorioMemoria([quedada({ participantes: [{ id: 'a', nombre: 'Ana' }] })]))
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    expect(within(cuentas).getByText('No hay nada que liquidar')).toBeInTheDocument()
  })

  it('recalcula al cambiar el porcentaje de comida de un participante', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    const porcentaje = within(cuentas).getByRole('spinbutton', { name: 'Porcentaje de comida de Beto' })
    await usuario.clear(porcentaje)
    await usuario.type(porcentaje, '0')
    // comida 16 € solo para Ana; casa 100 € a medias → Beto debe 50 €
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 50,00 € a Ana')
  })

  it('un participante que no paga la casa queda fuera de ese reparto', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    await usuario.click(within(cuentas).getByRole('switch', { name: 'Beto paga la casa' }))
    // casa 100 € solo para Ana; comida 8 € de Beto
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 8,00 € a Ana')
  })

  it('marcar una comida como gasto de la casa cambia cómo se reparte', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    await usuario.click(within(cuentas).getByRole('switch', { name: 'Beto paga la casa' }))
    await usuario.click(screen.getByRole('switch', { name: 'Gasto de la casa: Alquiler' }))
    // el alquiler pasa a ser comida: 116 € por porcentaje, Beto debe 58 € aunque no pague la casa
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 58,00 € a Ana')
  })

  it('conserva los porcentajes al recargar', async () => {
    const repositorio = new RepositorioMemoria([quedadaConGastos()])
    const primera = preparar(repositorio)
    const cuentas = await screen.findByRole('region', { name: 'Cuentas' })
    const porcentaje = within(cuentas).getByRole('spinbutton', { name: 'Porcentaje de comida de Beto' })
    await primera.usuario.clear(porcentaje)
    await primera.usuario.type(porcentaje, '50')
    primera.vista.unmount()

    preparar(repositorio)
    expect(await screen.findByRole('spinbutton', { name: 'Porcentaje de comida de Beto' })).toHaveValue(50)
  })
})

describe('Importar el Excel con sesión', () => {
  it('guarda la quedada con el id de la cuenta para no chocar con otras cuentas', async () => {
    const repositorio = new RepositorioMemoria()
    const ana = { id: 'cuenta-ana', nombre: 'Ana', foto: null }
    const leerExcel = async () => ({
      importadas: [{ hoja: 'Compras 2026', quedada: quedada({ id: 'import-compras-2026', nombre: 'Quedada 2026' }), avisos: [] }],
      ignoradas: [],
    })
    render(<App repositorio={repositorio} crearId={contador()} leerExcel={leerExcel} autenticacion={new AutenticacionMemoria(ana, ana)} />)
    await esperarCarga()

    await userEvent.upload(screen.getByLabelText('Archivo de Excel (.xlsx)'), new File(['x'], 'compras.xlsx'))

    await screen.findByText(/importada/i)
    expect(repositorio.quedadas.map((q) => q.id)).toContain('cuenta-ana-import-compras-2026')
    expect(repositorio.quedadas.map((q) => q.id)).not.toContain('import-compras-2026')
  })
})

describe('Eliminar una quedada', () => {
  const conLeche = () =>
    quedada({
      id: 'q1',
      nombre: 'Almunia 2026',
      grupos: [{ id: 'g1', nombre: 'Cena del viernes', orden: 0 }],
      productos: [producto({ id: 'p1', grupoId: 'g1', nombre: 'Leche' })],
    })
  const conPan = () =>
    quedada({
      id: 'q2',
      nombre: 'Almunia 2025',
      grupos: [{ id: 'g1', nombre: 'Cena del viernes', orden: 0 }],
      productos: [producto({ id: 'p2', grupoId: 'g1', nombre: 'Pan' })],
    })

  afterEach(() => {
    window.location.hash = ''
  })

  it('pide confirmación con el nombre y Cancelar no borra nada', async () => {
    const { usuario, repositorio } = preparar(new RepositorioMemoria([conLeche(), conPan()]))
    await screen.findByText('Leche')

    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    const aviso = screen.getByRole('group', { name: 'Confirmar eliminación' })
    expect(aviso).toHaveTextContent('¿Eliminar «Almunia 2026»?')
    expect(aviso).toHaveTextContent('no se puede deshacer')

    await usuario.click(within(aviso).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('group', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    expect(repositorio.quedadas.map((q) => q.id).sort()).toEqual(['q1', 'q2'])
    expect(screen.getByText('Leche')).toBeInTheDocument()
  })

  it('al confirmar la borra del repositorio y muestra otra quedada', async () => {
    const { usuario, repositorio } = preparar(new RepositorioMemoria([conLeche(), conPan()]))
    await screen.findByText('Leche')

    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Pan')).toBeInTheDocument()
    expect(screen.queryByText('Leche')).not.toBeInTheDocument()
    expect(repositorio.quedadas.map((q) => q.id)).toEqual(['q2'])
    expect(screen.queryByRole('combobox', { name: 'Quedada' })).not.toBeInTheDocument()
  })

  it('si era la única, crea una nueva con las comidas habituales', async () => {
    const { usuario, repositorio } = preparar(new RepositorioMemoria([conLeche()]))
    await screen.findByText('Leche')

    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }))

    await waitFor(() => expect(screen.queryByText('Leche')).not.toBeInTheDocument())
    await esperarCarga()
    await waitFor(() => expect(repositorio.quedadas).toHaveLength(1))
    expect(repositorio.quedadas[0].id).not.toBe('q1')
  })

  it('si falla el borrado avisa y la quedada sigue ahí', async () => {
    class NoBorra extends RepositorioMemoria {
      override async borrar(): Promise<void> {
        throw new Error('sin permiso')
      }
    }
    const { usuario, repositorio } = preparar(new NoBorra([conLeche(), conPan()]))
    await screen.findByText('Leche')

    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo eliminar la quedada')
    expect(repositorio.quedadas).toHaveLength(2)
    expect(screen.getByText('Leche')).toBeInTheDocument()
  })

  it('el enlace de la página no queda apuntando a la quedada borrada', async () => {
    window.location.hash = '#/quedada/q2'
    const { usuario } = preparar(new RepositorioMemoria([conLeche(), conPan()]))
    await screen.findByText('Pan')

    await usuario.click(screen.getByRole('button', { name: 'Eliminar quedada' }))
    await usuario.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }))

    await screen.findByText('Leche')
    expect(window.location.hash).not.toContain('q2')
  })
})
