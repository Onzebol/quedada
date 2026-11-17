import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { producto, quedada } from './dominio/fabrica'
import { quedadaInicial } from './dominio/operaciones'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

function preparar(repositorio = new RepositorioMemoria()) {
  const usuario = userEvent.setup()
  const crearId = contador()
  if (repositorio.quedadas.length === 0) repositorio.quedadas = [quedadaInicial(crearId)]
  abrirPrimera(repositorio)
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

async function abrirPestana(nombre: string) {
  await userEvent.click(await screen.findByRole('tab', { name: nombre }))
}

async function abrirCuentas() {
  await abrirPestana('Resumen')
  return screen.findByRole('region', { name: 'Cuentas' })
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

  it('borra un producto solo tras confirmar en una ventana modal', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')

    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    expect(screen.getByRole('dialog', { name: '¿Borrar «Sidra»?' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()

    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
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

  it('borra una comida y sus productos solo tras confirmar en una ventana modal', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Borrar comida Bebida' }))
    const aviso = screen.getByRole('dialog', { name: '¿Borrar «Bebida»?' })
    expect(aviso).toHaveTextContent('su 1 producto')
    await usuario.click(within(aviso).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Bebida' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Borrar comida Bebida' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
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

afterEach(() => {
  window.location.hash = ''
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

describe('Pestañas', () => {
  it('divide la quedada en La casa, Lista de la compra, Pagos y Resumen, y abre la lista de la compra', async () => {
    preparar()
    await esperarCarga()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['La casa', 'Lista de la compra', 'Pagos', 'Resumen'])
    expect(screen.getByRole('tab', { name: 'Lista de la compra' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('region', { name: 'Asistentes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cuentas' })).not.toBeInTheDocument()
  })

  it('cada pestaña muestra su contenido', async () => {
    preparar()
    await esperarCarga()
    await abrirPestana('La casa')
    expect(screen.getByRole('region', { name: 'Asistentes' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Cena del viernes' })).not.toBeInTheDocument()
    await abrirPestana('Pagos')
    expect(screen.getByRole('tabpanel', { name: 'Pagos' })).toBeInTheDocument()
    await abrirPestana('Resumen')
    expect(screen.getByRole('region', { name: 'Cuentas' })).toBeInTheDocument()
  })
})

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
    const cuentas = await abrirCuentas()
    // comida 16 € a medias (8 + 8); casa 100 € (50 + 50); Ana pagó 116 €
    expect(normalizar(within(cuentas).getByText(/Total de la quedada/).textContent)).toContain('116,00 €')
    expect(normalizar(within(cuentas).getByText(/Ana ha pagado/).textContent)).toContain('116,00 €')
    expect(normalizar(within(cuentas).getByText(/Beto ha pagado/).textContent)).toContain('0,00 €')
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 58,00 € a Ana')
  })

  it('dice que no hay nada que liquidar cuando las cuentas cuadran', async () => {
    preparar(new RepositorioMemoria([quedada({ participantes: [{ id: 'a', nombre: 'Ana' }] })]))
    const cuentas = await abrirCuentas()
    expect(within(cuentas).getByText('No hay nada que liquidar')).toBeInTheDocument()
  })

  /** En «La casa» se ajusta lo que paga cada participante de la casa (%) y de los demás gastos (%). */
  async function ajustar(usuario: ReturnType<typeof userEvent.setup>, nombre: string, campo: 'casa' | 'gastos', valor: string) {
    await abrirPestana('La casa')
    const etiqueta = campo === 'casa' ? `% de la casa de ${nombre}` : `% de los demás gastos de ${nombre}`
    const entrada = await screen.findByRole('spinbutton', { name: etiqueta })
    await usuario.clear(entrada)
    await usuario.type(entrada, valor)
  }

  it('recalcula al cambiar el porcentaje de los demás gastos de un participante', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    await ajustar(usuario, 'Beto', 'gastos', '0')
    const cuentas = await abrirCuentas()
    // comida 16 € solo para Ana; casa 100 € a medias → Beto debe 50 €
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 50,00 € a Ana')
  })

  it('un participante con 0 % de la casa queda fuera de ese reparto', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    await ajustar(usuario, 'Beto', 'casa', '0')
    const cuentas = await abrirCuentas()
    // casa 100 € solo para Ana; comida 8 € de Beto
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 8,00 € a Ana')
  })

  it('el Resumen es de solo lectura: los porcentajes se ajustan en La casa', async () => {
    preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await abrirCuentas()
    expect(within(cuentas).queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(within(cuentas).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('marcar una comida como gasto de la casa cambia cómo se reparte', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    await ajustar(usuario, 'Beto', 'casa', '0')
    await abrirPestana('Lista de la compra')
    await usuario.click(screen.getByRole('switch', { name: 'Gasto de la casa: Alquiler' }))
    const cuentas = await abrirCuentas()
    // el alquiler pasa a ser comida: 116 € por porcentaje, Beto debe 58 € aunque no pague la casa
    expect(normalizar(within(cuentas).getByText(/Beto paga/).textContent)).toBe('Beto paga 58,00 € a Ana')
  })

  it('conserva los porcentajes al recargar', async () => {
    const repositorio = new RepositorioMemoria([quedadaConGastos()])
    const primera = preparar(repositorio)
    await ajustar(primera.usuario, 'Beto', 'gastos', '50')
    primera.vista.unmount()

    preparar(repositorio)
    await abrirPestana('La casa')
    expect(await screen.findByRole('spinbutton', { name: '% de los demás gastos de Beto' })).toHaveValue(50)
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
    await screen.findByLabelText('Archivo de Excel (.xlsx)')

    await userEvent.upload(screen.getByLabelText('Archivo de Excel (.xlsx)'), new File(['x'], 'compras.xlsx'))

    await waitFor(() => expect(repositorio.quedadas).toHaveLength(1))
    expect(repositorio.quedadas.map((q) => q.id)).toContain('cuenta-ana-import-compras-2026')
    expect(repositorio.quedadas.map((q) => q.id)).not.toContain('import-compras-2026')
  })
})

describe('Página inicial', () => {
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

  function abrirInicio(repositorio: RepositorioMemoria) {
    window.location.hash = ''
    const usuario = userEvent.setup()
    render(<App repositorio={repositorio} crearId={contador()} />)
    return usuario
  }

  it('sin enlace de quedada muestra la lista y no crea ninguna', async () => {
    const repositorio = new RepositorioMemoria([conLeche(), conPan()])
    abrirInicio(repositorio)
    expect(await screen.findByRole('button', { name: 'Almunia 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Almunia 2025' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Lista de la compra' })).not.toBeInTheDocument()
  })

  it('sin quedadas no crea ninguna sola: ofrece crearla', async () => {
    const repositorio = new RepositorioMemoria()
    abrirInicio(repositorio)
    expect(await screen.findByText('Todavía no tienes ninguna quedada.')).toBeInTheDocument()
    expect(repositorio.quedadas).toHaveLength(0)
  })

  it('elegir una quedada lleva a su URL y la muestra', async () => {
    const usuario = abrirInicio(new RepositorioMemoria([conLeche(), conPan()]))
    await usuario.click(await screen.findByRole('button', { name: 'Almunia 2025' }))
    expect(await screen.findByText('Pan')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/q2')
  })

  it('crear una quedada la guarda con las comidas habituales y la abre', async () => {
    const repositorio = new RepositorioMemoria()
    const usuario = abrirInicio(repositorio)
    await usuario.type(await screen.findByRole('textbox', { name: 'Nombre de la nueva quedada' }), 'Navidad')
    await usuario.click(screen.getByRole('button', { name: 'Crear quedada' }))
    await esperarCarga()
    expect(repositorio.quedadas).toHaveLength(1)
    expect(repositorio.quedadas[0].nombre).toBe('Navidad')
    expect(window.location.hash).toBe(`#/${repositorio.quedadas[0].id}`)
  })

  it('eliminar pide confirmación, no borra al cancelar y al confirmar la quita de la lista', async () => {
    const repositorio = new RepositorioMemoria([conLeche(), conPan()])
    const usuario = abrirInicio(repositorio)
    await screen.findByRole('button', { name: 'Almunia 2026' })

    await usuario.click(screen.getAllByRole('button', { name: /^Borrar quedada/ })[0])
    const aviso = screen.getByRole('dialog')
    expect(aviso).toHaveTextContent('no se puede deshacer')
    await usuario.click(within(aviso).getByRole('button', { name: 'Cancelar' }))
    expect(repositorio.quedadas).toHaveLength(2)

    await usuario.click(screen.getAllByRole('button', { name: /^Borrar quedada/ })[0])
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    await waitFor(() => expect(repositorio.quedadas).toHaveLength(1))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('si falla el borrado avisa y la quedada sigue ahí', async () => {
    class NoBorra extends RepositorioMemoria {
      override async borrar(): Promise<void> {
        throw new Error('sin permiso')
      }
    }
    const repositorio = new NoBorra([conLeche()])
    const usuario = abrirInicio(repositorio)
    await screen.findByRole('button', { name: 'Almunia 2026' })
    await usuario.click(screen.getByRole('button', { name: /^Borrar quedada/ }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo borrar')
    expect(screen.getByRole('button', { name: 'Almunia 2026' })).toBeInTheDocument()
  })

  it('desde una quedada se vuelve a la página inicial', async () => {
    window.location.hash = '#/q1'
    const usuario = userEvent.setup()
    render(<App repositorio={new RepositorioMemoria([conLeche(), conPan()])} crearId={contador()} />)
    await screen.findByText('Leche')
    await usuario.click(screen.getByRole('button', { name: 'Todas las quedadas' }))
    expect(await screen.findByRole('button', { name: 'Almunia 2025' })).toBeInTheDocument()
    expect(window.location.hash).not.toContain('q1')
  })

  it('un enlace a una quedada desconocida avisa y no muestra otra', async () => {
    window.location.hash = '#/otra'
    render(<App repositorio={new RepositorioMemoria([conLeche()])} crearId={contador()} />)
    expect(await screen.findByText(/No se encontró esta quedada/)).toBeInTheDocument()
    expect(screen.queryByText('Leche')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todas las quedadas' })).toBeInTheDocument()
  })
})
