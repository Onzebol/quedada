import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { producto, quedada } from './dominio/fabrica'
import { anadirAsistente } from './dominio/asistentes'
import { anadirParticipante, quedadaInicial } from './dominio/operaciones'
import { AutenticacionMemoria } from './test/autenticacionMemoria'
import { InvitacionesMemoria } from './test/invitacionesMemoria'
import { abrirPrimera } from './test/abrirPrimera'
import { RepositorioMemoria } from './test/repositorioMemoria'

function contador() {
  let n = 0
  return () => `id${++n}`
}

// `participantes`: los que ya se habrían definido en «La casa»; la lista de la compra no los crea.
function preparar(repositorio = new RepositorioMemoria(), participantes: string[] = []) {
  const usuario = userEvent.setup()
  const crearId = contador()
  if (repositorio.quedadas.length === 0) {
    repositorio.quedadas = [
      participantes.reduce((q, nombre) => anadirParticipante(q, { id: `p-${nombre}`, nombre }), quedadaInicial(crearId)),
    ]
  }
  abrirPrimera(repositorio)
  const vista = render(<App repositorio={repositorio} crearId={crearId} />)
  return { usuario, repositorio, vista, crearId }
}

// La quedada se abre en «La casa»: pasa a la lista de la compra.
async function esperarCarga() {
  await userEvent.click(await screen.findByRole('tab', { name: 'Lista de la compra' }))
  await screen.findByRole('heading', { level: 3, name: 'Cena del viernes' })
}

// Las secciones empiezan contraídas, como las familias de «La casa».
async function abrirSeccion(grupo: string) {
  const alternar = screen.getByRole('button', { name: grupo })
  if (alternar.getAttribute('aria-expanded') === 'false') await userEvent.click(alternar)
}

async function anadirProducto(
  usuario: ReturnType<typeof userEvent.setup>,
  grupo: string,
  nombre: string,
) {
  await abrirSeccion(grupo)
  await usuario.click(screen.getByRole('button', { name: `Añadir algo para comprar a ${grupo}` }))
  const ventana = screen.getByRole('dialog', { name: 'Nuevo producto' })
  await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), nombre)
  await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
}

async function abrirPestana(nombre: string) {
  await userEvent.click(await screen.findByRole('tab', { name: nombre }))
}

async function abrirCuentas() {
  await abrirPestana('Resumen')
  return screen.findByRole('region', { name: 'Cuentas' })
}

describe('Lista de la compra', () => {
  it('muestra el título y las comidas habituales agrupadas', async () => {
    preparar()
    expect(screen.getByRole('heading', { level: 1, name: 'Quedada' })).toBeInTheDocument()
    await esperarCarga()
    const grupos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(grupos).toEqual([
      'Bebida',
      'Cena del sábado (sopa)',
      'Cena del viernes',
      'Comida del domingo (pasta)',
      'Comida del sábado (asado)',
      'Desayunos',
      'Picoteos y varios',
    ])
  })

  it('añade un producto a una comida', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Cena del viernes', 'Pizza BBQ')
    expect(screen.getByRole('checkbox', { name: 'Pizza BBQ' })).not.toBeChecked()
  })

  it('añadir algo para comprar abre una ventana modal y no añade productos sin nombre', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Añadir algo para comprar a Bebida' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Añadir' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('añadir usa el mismo formulario que editar y el botón solo dice «Añadir»', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await abrirSeccion('Bebida')
    const boton = screen.getByRole('button', { name: 'Añadir algo para comprar a Bebida' })
    expect(boton).toHaveTextContent(/^Añadir$/)
    await usuario.click(boton)
    const ventana = screen.getByRole('dialog', { name: 'Nuevo producto' })
    for (const campo of ['Nombre', 'Cantidad', 'Unidad', 'Precio por unidad (€)', 'Observaciones']) {
      expect(within(ventana).getByRole('textbox', { name: campo })).toBeInTheDocument()
    }
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), 'Carne')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Cantidad' }), '2')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Unidad' }), 'kg')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Precio por unidad (€)' }), '8')
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Observaciones' }), 'del carnicero')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(screen.getByRole('checkbox', { name: 'Carne' })).toBeInTheDocument()
    expect(screen.getByText('2 kg')).toBeInTheDocument()
    expect(screen.getByText('16,00 €', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('del carnicero')).toBeInTheDocument()
  })

  it('las secciones empiezan contraídas y se despliegan al pulsar su nombre', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    const alternar = screen.getByRole('button', { name: 'Bebida' })
    expect(alternar).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Añadir algo para comprar a Bebida' })).not.toBeInTheDocument()
    await usuario.click(alternar)
    expect(alternar).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Añadir algo para comprar a Bebida' })).toBeInTheDocument()
    await usuario.click(alternar)
    expect(alternar).toHaveAttribute('aria-expanded', 'false')
  })

  it('cada sección indica cuántos productos faltan por comprar, sin abrirla', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    const seccion = () => screen.getByRole('region', { name: 'Bebida' })
    expect(within(seccion()).queryByText(/por comprar/)).not.toBeInTheDocument()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Bebida', 'Vino')
    expect(within(seccion()).getByText('2 por comprar')).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    expect(within(seccion()).getByText('1 por comprar')).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Vino' }))
    expect(within(seccion()).queryByText(/por comprar/)).not.toBeInTheDocument()
  })

  it('junto a «Mostrar» salen los totales de la lista, como en cada sección', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    const totales = () => screen.getByLabelText('Totales de la lista')
    expect(within(totales()).getByText('0 productos')).toBeInTheDocument()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Desayunos', 'Café')
    expect(within(totales()).getByText('2 productos')).toBeInTheDocument()
    expect(within(totales()).getByText('2 por comprar')).toBeInTheDocument()
    expect(within(totales()).getByText('2 sin comprador')).toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    expect(within(totales()).getByText('1 por comprar')).toBeInTheDocument()
  })

  it('los desplegables de personas van por orden alfabético, con la opción especial primero', async () => {
    const { usuario } = preparar(undefined, ['Zoe', 'Ana', 'Marta'])
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    const comprador = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Comprador de Sidra' })
    expect(Array.from(comprador.options).map((o) => o.textContent)).toEqual(['Sin asignar', 'Ana', 'Marta', 'Zoe'])
  })

  it('«Mostrar» solo ofrece a las personas que tienen algo asignado, por orden alfabético', async () => {
    const { usuario } = preparar(undefined, ['Zoe', 'Ana', 'Marta'])
    await esperarCarga()
    const filtro = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Mostrar' })
    const opciones = () => Array.from(filtro.options).map((o) => o.textContent)
    expect(opciones()).toEqual(['Todos', 'Sin asignar', 'Pendientes'])
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Bebida', 'Vino')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Zoe')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Vino' }), 'Ana')
    expect(opciones()).toEqual(['Todos', 'Sin asignar', 'Pendientes', 'Compra Ana', 'Compra Zoe'])
    await usuario.selectOptions(filtro, 'Compra Zoe')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    // si Zoe se queda sin nada, el filtro vuelve a «Todos» en vez de dejar un valor que ya no existe
    await usuario.selectOptions(filtro, 'Todos')
    await abrirSeccion('Bebida')
    await usuario.click(screen.getByRole('button', { name: 'Borrar Sidra' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect(filtro).toHaveValue('todos')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('con un filtro activo en «Mostrar» no hay botones de añadir, renombrar, editar ni borrar', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    const botones = () =>
      screen.queryAllByRole('button', { name: /^(Añadir|Renombrar|Editar|Borrar)/ }).map((b) => b.getAttribute('aria-label') ?? b.textContent)
    expect(botones()).toEqual(expect.arrayContaining(['Añadir sección', 'Renombrar Bebida', 'Editar Sidra', 'Borrar Sidra']))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Sin asignar')
    expect(botones()).toEqual([])
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Todos')
    await abrirSeccion('Bebida')
    expect(botones()).toContain('Editar Sidra')
  })
  it('filtrando, los totales cuentan solo lo filtrado y no dicen «sin comprador»', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Bebida', 'Vino')
    await anadirProducto(usuario, 'Desayunos', 'Café')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Vino' }), 'Josu')
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    const totales = () => screen.getByLabelText('Totales de la lista')
    expect(within(totales()).getByText('2 por comprar')).toBeInTheDocument()
    expect(within(totales()).getByText('1 sin comprador')).toBeInTheDocument()

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Compra Josu')
    expect(within(totales()).getByText('2 de 3 productos')).toBeInTheDocument()
    expect(within(totales()).getByText('1 por comprar')).toBeInTheDocument()
    expect(within(totales()).queryByText(/sin comprador/)).not.toBeInTheDocument()
  })

  it('marca un producto como comprado', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeChecked()
  })

  it('no ofrece añadir participantes: se definen en «La casa»', async () => {
    preparar()
    await esperarCarga()
    expect(screen.queryByRole('form', { name: 'Participantes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir participante' })).not.toBeInTheDocument()
  })

  it('las secciones no tienen interruptor «Gasto de la casa»', async () => {
    preparar()
    await esperarCarga()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText('Gasto de la casa')).not.toBeInTheDocument()
  })

  it('asigna un comprador a un producto', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    expect(screen.getByRole('option', { name: 'Josu', selected: true })).toBeInTheDocument()
  })

  it('se puede asignar una compra a una familia que no tiene personas, y filtrar por ella', async () => {
    const q = anadirAsistente(quedadaInicial(contador()), { id: 'f1', familia: 'Gómez', personas: 3, llegada: null })
    const { usuario } = preparar(new RepositorioMemoria([q]))
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Gómez')
    expect(screen.getByRole('option', { name: 'Gómez', selected: true })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Compra Gómez')
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()
  })

  it('indica junto a «Mostrar» cuántos productos no tienen comprador, sin párrafos sueltos encima', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
    const totales = () => screen.getByLabelText('Totales de la lista')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Vienen \d+ personas?$/)).not.toBeInTheDocument()
    expect(within(totales()).getByText('0 productos')).toBeInTheDocument()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    expect(within(totales()).getByText('1 sin comprador')).toBeInTheDocument()
    await anadirProducto(usuario, 'Bebida', 'Vino')
    expect(within(totales()).getByText('2 sin comprador')).toBeInTheDocument()
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Vino' }), 'Josu')
    expect(within(totales()).queryByText(/sin comprador/)).not.toBeInTheDocument()
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

  it('añade una sección nueva con «Añadir sección», que abre una ventana como «Añadir familia»', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    expect(screen.queryByRole('button', { name: 'Añadir comida' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Añadir sección' }))
    const ventana = screen.getByRole('dialog', { name: 'Nueva sección' })
    await usuario.type(within(ventana).getByRole('textbox', { name: 'Nombre' }), 'Merienda')
    await usuario.click(within(ventana).getByRole('button', { name: 'Añadir' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const grupos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(grupos).toEqual([...grupos].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
    expect(grupos).toContain('Merienda')
  })

  it('ordena alfabéticamente los productos de cada sección', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Vino')
    await anadirProducto(usuario, 'Bebida', 'Agua')
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    const lista = within(screen.getByRole('region', { name: 'Bebida' }))
    const nombres = lista.getAllByRole('checkbox').map((c) => (c as HTMLInputElement).labels?.[0]?.textContent)
    expect(nombres).toEqual(['Agua', 'Sidra', 'Vino'])
  })

  it('renombra una comida', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await usuario.click(screen.getByRole('button', { name: 'Renombrar Bebida' }))
    const ventana = screen.getByRole('dialog', { name: 'Renombrar sección' })
    const campo = within(ventana).getByRole('textbox', { name: 'Nombre' })
    await usuario.clear(campo)
    await usuario.type(campo, 'Bebidas')
    await usuario.click(within(ventana).getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Bebidas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Bebida' })).not.toBeInTheDocument()
  })

  it('borra una comida y sus productos solo tras confirmar en una ventana modal', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Borrar sección Bebida' }))
    const aviso = screen.getByRole('dialog', { name: '¿Borrar «Bebida»?' })
    expect(aviso).toHaveTextContent('su 1 producto')
    await usuario.click(within(aviso).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Bebida' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Borrar sección Bebida' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }))
    expect(screen.queryByRole('heading', { level: 3, name: 'Bebida' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Sidra' })).not.toBeInTheDocument()
  })

  it('filtra por sin asignar, pendientes y comprador', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
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
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    // filtrando por una persona, el desplegable de asignar sobra: todos son suyos
    expect(screen.queryByRole('combobox', { name: 'Comprador de Sidra' })).not.toBeInTheDocument()
    // arriba, el total de la lista; en la sección, los suyos
    expect(screen.getByText('1 de 3 productos')).toBeInTheDocument()
    expect(screen.getByText('1 de 2 productos')).toBeInTheDocument()
    // Bebida está comprada entera (solo Sidra, ya comprada): sale contraída
    await abrirSeccion('Bebida')
    expect(screen.getByRole('checkbox', { name: 'Sidra' })).toBeInTheDocument()

    await usuario.selectOptions(filtro, 'Todos')
    await abrirSeccion('Bebida')
    await abrirSeccion('Desayunos')
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('combobox', { name: 'Comprador de Sidra' })).toBeInTheDocument()
    expect(screen.queryByText(/ de \d+ productos/)).not.toBeInTheDocument()
  })

  it('con filtro las secciones salen desplegadas salvo las compradas enteras, y se pueden plegar y desplegar', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await anadirProducto(usuario, 'Desayunos', 'Café')
    await anadirProducto(usuario, 'Desayunos', 'Pan')
    for (const n of ['Sidra', 'Café', 'Pan']) {
      await usuario.selectOptions(screen.getByRole('combobox', { name: `Comprador de ${n}` }), 'Josu')
    }
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Café' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Compra Josu')
    const bebida = screen.getByRole('button', { name: 'Bebida' })
    const desayunos = screen.getByRole('button', { name: 'Desayunos' })
    expect(bebida).toHaveAttribute('aria-expanded', 'false')
    expect(desayunos).toHaveAttribute('aria-expanded', 'true')
    // al comprar lo último la sección no se pliega sola
    await usuario.click(screen.getByRole('checkbox', { name: 'Pan' }))
    expect(desayunos).toHaveAttribute('aria-expanded', 'true')
    await usuario.click(desayunos)
    expect(desayunos).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(bebida)
    expect(bebida).toHaveAttribute('aria-expanded', 'true')
    // cada vez que se filtra se decide de nuevo, aunque sea el mismo filtro
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Todos')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Mostrar' }), 'Compra Josu')
    expect(screen.getByRole('button', { name: 'Bebida' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Desayunos' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('«Sin asignar» y «Pendientes» abren todas las secciones; volver a «Todos» las contrae', async () => {
    const { usuario } = preparar(undefined, ['Josu'])
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Comprador de Sidra' }), 'Josu')
    await anadirProducto(usuario, 'Desayunos', 'Café')
    await usuario.click(screen.getByRole('checkbox', { name: 'Café' }))
    const filtro = screen.getByRole('combobox', { name: 'Mostrar' })
    await usuario.selectOptions(filtro, 'Sin asignar')
    expect(screen.getByRole('button', { name: 'Desayunos' })).toHaveAttribute('aria-expanded', 'true')
    await usuario.selectOptions(filtro, 'Todos')
    expect(screen.getByRole('button', { name: 'Desayunos' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Bebida' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('las secciones compradas enteras lo indican con «Todo comprado»', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    const seccion = () => screen.getByRole('region', { name: 'Bebida' })
    expect(within(seccion()).queryByText('Todo comprado')).not.toBeInTheDocument()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    expect(within(seccion()).queryByText('Todo comprado')).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    expect(within(seccion()).getByText('Todo comprado')).toBeInTheDocument()
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
    const primera = preparar(undefined, ['Josu'])
    await esperarCarga()
    await anadirProducto(primera.usuario, 'Bebida', 'Sidra')
    await primera.usuario.click(screen.getByRole('checkbox', { name: 'Sidra' }))
    await primera.usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Comprador de Sidra' }),
      'Josu',
    )
    primera.vista.unmount()

    preparar(primera.repositorio)
    await esperarCarga()
    await abrirSeccion('Bebida')
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

/** Texto de la fila de «Quién paga a quién» que coincide (las partes van en elementos distintos). */
function filaPago(cuentas: HTMLElement, patron: RegExp) {
  const fila = within(cuentas)
    .getAllByRole('listitem')
    .find((li) => li.closest('ul')?.getAttribute('aria-label') === 'Quién paga a quién' && patron.test(li.textContent ?? ''))
  if (!fila) throw new Error(`No hay fila que coincida con ${patron}`)
  return fila.textContent
}

function normalizar(texto: string | null) {
  return (texto ?? '').replace(/\s/g, ' ')
}

function quedadaConGastos() {
  return quedada({
    // Los productos son orientativos: las cuentas salen de los gastos y de los pagos de la casa.
    participantes: [
      { id: 'ana', nombre: 'Ana', familiaId: 'fa' },
      { id: 'beto', nombre: 'Beto' },
    ],
    asistentes: [{ id: 'fa', familia: 'Ana', personas: 1, llegada: null }],
    grupos: [{ id: 'cena', nombre: 'Cena del viernes', orden: 0 }],
    productos: [producto({ id: 'p1', grupoId: 'cena', nombre: 'Pizza', compradorId: 'beto', cantidad: 2, precioUnidad: 500 })],
    gastos: [{ id: 'g1', pagadorId: 'ana', concepto: 'Compra', importe: 1600 }],
    casa: { ...quedada().casa, precio: 10000 },
    pagos: [{ id: 'pg1', familiaId: 'fa', importe: 10000, concepto: 'Alquiler', pagado: true }],
  })
}

describe('Pestañas', () => {
  it('divide la quedada en La casa, Lista de la compra, Pagos y Resumen, y abre La casa', async () => {
    preparar()
    await screen.findByRole('tab', { name: 'La casa' })
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['La casa', 'Lista de la compra', 'Pagos', 'Resumen'])
    expect(screen.getByRole('tab', { name: 'La casa' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'Asistentes' })).toBeInTheDocument()
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
  it('guarda cantidad y precio por unidad, sin campo de descuento, y muestra el total de la línea', async () => {
    const { usuario } = preparar()
    await esperarCarga()
    await anadirProducto(usuario, 'Bebida', 'Sidra')
    await usuario.click(screen.getByRole('button', { name: 'Editar Sidra' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Cantidad' }), '3')
    await usuario.type(screen.getByRole('textbox', { name: 'Precio por unidad (€)' }), '2,5')
    expect(screen.queryByRole('textbox', { name: /Descuento/ })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText('7,50 €', { exact: false })).toBeInTheDocument()
  })

  it('muestra lo pagado por persona, el total y quién debe a quién', async () => {
    preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await abrirCuentas()
    // comida 16 € a medias (8 + 8); casa 100 € (50 + 50); Ana pagó 116 €
    expect(normalizar(within(within(cuentas).getByRole('list', { name: 'Totales' })).getByText('Total pagado').nextElementSibling?.textContent ?? null)).toBe('116,00 €')
    expect(normalizar(within(cuentas).getByRole('heading', { level: 4, name: 'Ana' }).closest('li')?.textContent ?? null)).toContain('Total pagado116,00 €')
    expect(normalizar(within(cuentas).getByRole('heading', { level: 4, name: 'Beto' }).closest('li')?.textContent ?? null)).toContain('Total pagado0,00 €')
    expect(normalizar(filaPago(cuentas, /Beto paga/))).toBe('Beto paga 58,00 € a Ana')
  })

  it('dice que no hay nada que liquidar cuando las cuentas cuadran', async () => {
    preparar(new RepositorioMemoria([quedada({ participantes: [{ id: 'a', nombre: 'Ana' }] })]))
    const cuentas = await abrirCuentas()
    expect(within(cuentas).getByText('No hay nada que liquidar')).toBeInTheDocument()
  })

  /** En «La casa» se ajusta lo que paga cada participante de la casa (%) y de los demás gastos (%). */
  async function ajustar(usuario: ReturnType<typeof userEvent.setup>, nombre: string, campo: 'casa' | 'gastos', valor: string) {
    await abrirPestana('La casa')
    await usuario.click(await screen.findByRole('button', { name: `Editar persona ${nombre}` }))
    const d = within(screen.getByRole('dialog', { name: 'Editar persona' }))
    const entrada = d.getByRole('spinbutton', { name: campo === 'casa' ? '% casa' : '% demás gastos' })
    await usuario.clear(entrada)
    await usuario.type(entrada, valor)
    await usuario.click(d.getByRole('button', { name: 'Guardar' }))
  }

  it('recalcula al cambiar el porcentaje de los demás gastos de un participante', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    await ajustar(usuario, 'Beto', 'gastos', '0')
    const cuentas = await abrirCuentas()
    // comida 16 € solo para Ana; casa 100 € a medias → Beto debe 50 €
    expect(normalizar(filaPago(cuentas, /Beto paga/))).toBe('Beto paga 50,00 € a Ana')
  })

  it('un participante con 0 % de la casa queda fuera de ese reparto', async () => {
    const { usuario } = preparar(new RepositorioMemoria([quedadaConGastos()]))
    await ajustar(usuario, 'Beto', 'casa', '0')
    const cuentas = await abrirCuentas()
    // casa 100 € solo para Ana; comida 8 € de Beto
    expect(normalizar(filaPago(cuentas, /Beto paga/))).toBe('Beto paga 8,00 € a Ana')
  })

  it('el Resumen es de solo lectura: los porcentajes se ajustan en La casa', async () => {
    preparar(new RepositorioMemoria([quedadaConGastos()]))
    const cuentas = await abrirCuentas()
    expect(within(cuentas).queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(within(cuentas).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('el Resumen cuenta lo que ha pagado una familia sin personas', async () => {
    const q = quedada({
      asistentes: [{ id: 'f1', familia: 'Gómez', personas: 3, llegada: null }],
      participantes: [{ id: 'ana', nombre: 'Ana' }],
      gastos: [{ id: 'g1', pagadorId: 'f1', concepto: 'Pizza', importe: 1000 }],
    })
    preparar(new RepositorioMemoria([q]))
    const cuentas = await abrirCuentas()
    expect(normalizar(within(cuentas).getByRole('heading', { level: 4, name: 'Gómez' }).closest('li')?.textContent ?? null)).toContain('Total pagado10,00 €')
    expect(normalizar(filaPago(cuentas, /Ana paga/))).toBe('Ana paga 10,00 € a Gómez')
  })

  it('conserva los porcentajes al recargar', async () => {
    const repositorio = new RepositorioMemoria([quedadaConGastos()])
    const primera = preparar(repositorio)
    await ajustar(primera.usuario, 'Beto', 'gastos', '50')
    primera.vista.unmount()

    preparar(repositorio)
    await abrirPestana('La casa')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar persona Beto' }))
    expect(await screen.findByRole('spinbutton', { name: '% demás gastos' })).toHaveValue(50)
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

  it('la página inicial va centrada y la vista de una quedada no (#111)', async () => {
    const usuario = abrirInicio(new RepositorioMemoria([conLeche()]))
    await usuario.click(await screen.findByRole('button', { name: 'Almunia 2026' }))
    await screen.findByRole('tab', { name: 'La casa' })
    expect(screen.getByRole('main')).not.toHaveClass('pagina--inicio')
    await usuario.click(screen.getByRole('button', { name: 'Quedada' }))
    await screen.findByRole('heading', { level: 2, name: 'Tus quedadas' })
    expect(screen.getByRole('main')).toHaveClass('pagina--inicio')
  })

  it('elegir una quedada lleva a su URL y la muestra', async () => {
    const usuario = abrirInicio(new RepositorioMemoria([conLeche(), conPan()]))
    await usuario.click(await screen.findByRole('button', { name: 'Almunia 2025' }))
    await usuario.click(await screen.findByRole('tab', { name: 'Lista de la compra' }))
    await screen.findByRole('heading', { level: 3, name: 'Cena del viernes' })
    await abrirSeccion('Cena del viernes')
    expect(await screen.findByText('Pan')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/q2')
  })

  it('editar una quedada desde la home la renombra y la guarda', async () => {
    const repositorio = new RepositorioMemoria([conLeche()])
    const usuario = abrirInicio(repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Editar Almunia 2026' }))
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    await usuario.clear(campo)
    await usuario.type(campo, 'Almunia 2027')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('button', { name: 'Almunia 2027' })).toBeInTheDocument()
    expect(repositorio.quedadas[0].nombre).toBe('Almunia 2027')
  })

  it('crear una quedada la guarda con las comidas habituales y la abre', async () => {
    const repositorio = new RepositorioMemoria()
    const usuario = abrirInicio(repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Añadir quedada' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Navidad')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Añadir' }))
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

  it('muestra el nombre de la quedada dentro de ella', async () => {
    window.location.hash = '#/q1'
    render(<App repositorio={new RepositorioMemoria([conLeche(), conPan()])} crearId={contador()} />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Almunia 2026' })).toBeInTheDocument()
  })

  it('al pulsar el título «Quedada» se vuelve a la página inicial', async () => {
    window.location.hash = '#/q1'
    const usuario = userEvent.setup()
    render(<App repositorio={new RepositorioMemoria([conLeche(), conPan()])} crearId={contador()} />)
    await usuario.click(await screen.findByRole('tab', { name: 'Lista de la compra' }))
    await screen.findByRole('heading', { level: 3, name: 'Cena del viernes' })
    await abrirSeccion('Cena del viernes')
    expect(screen.getByText('Leche')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Quedada' }))
    expect(await screen.findByRole('button', { name: 'Almunia 2025' })).toBeInTheDocument()
    expect(window.location.hash).not.toContain('q1')
  })

  it('un enlace a una quedada desconocida avisa y no muestra otra', async () => {
    window.location.hash = '#/otra'
    render(<App repositorio={new RepositorioMemoria([conLeche()])} crearId={contador()} />)
    expect(await screen.findByText(/No se encontró esta quedada/)).toBeInTheDocument()
    expect(screen.queryByText('Leche')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Todas las quedadas' })).not.toBeInTheDocument()
  })
})

describe('Las cuentas ignoran los precios de la lista (#95)', () => {
  it('un producto con precio y comprador no cambia las cuentas', async () => {
    const q = quedada({
      participantes: [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }],
      grupos: [{ id: 'g', nombre: 'Cena', orden: 0 }],
      productos: [producto({ id: 'p', grupoId: 'g', compradorId: 'a', cantidad: 1, precioUnidad: 80 })],
    })
    preparar(new RepositorioMemoria([q]))
    const cuentas = await abrirCuentas()
    expect(within(cuentas).getByText('No hay nada que liquidar')).toBeInTheDocument()
    expect(normalizar(within(within(cuentas).getByRole('list', { name: 'Totales' })).getByText('Total pagado').nextElementSibling?.textContent ?? null)).toBe('0,00 €')
  })
})

describe('Invitar por enlace (#136)', () => {
  const marta = { id: 'cuenta-marta', nombre: 'Marta', foto: null }

  it('el propietario ve «Invitar» dentro de la quedada', async () => {
    const repositorio = new RepositorioMemoria([quedada({ id: 'q1', nombre: 'Almunia' })])
    window.location.hash = '#/q1'
    render(<App repositorio={repositorio} crearId={contador()} invitaciones={new InvitacionesMemoria()} />)
    expect(await screen.findByRole('button', { name: 'Invitar' })).toBeInTheDocument()
  })

  it('quien entró con un enlace (no es el propietario) no ve «Invitar»', async () => {
    const repositorio = new RepositorioMemoria([quedada({ id: 'q1', nombre: 'Almunia' })])
    repositorio.puedeBorrar = () => false
    window.location.hash = '#/q1'
    render(<App repositorio={repositorio} crearId={contador()} invitaciones={new InvitacionesMemoria()} />)
    await screen.findByRole('heading', { name: 'Almunia' })
    expect(screen.queryByRole('button', { name: 'Invitar' })).not.toBeInTheDocument()
  })

  it('sin invitaciones (modo local) no se ofrece «Invitar»', async () => {
    const repositorio = new RepositorioMemoria([quedada({ id: 'q1', nombre: 'Almunia' })])
    window.location.hash = '#/q1'
    render(<App repositorio={repositorio} crearId={contador()} />)
    await screen.findByRole('heading', { name: 'Almunia' })
    expect(screen.queryByRole('button', { name: 'Invitar' })).not.toBeInTheDocument()
  })

  it('abrir #/unirse/<token> ofrece unirse y, al hacerlo, abre la quedada', async () => {
    const repositorio = new RepositorioMemoria([quedada({ id: 'q1', nombre: 'Almunia' })])
    const invitaciones = new InvitacionesMemoria({ destinos: { buena: ['q1', 'Almunia'] } })
    window.location.hash = '#/unirse/buena'
    render(<App repositorio={repositorio} crearId={contador()} invitaciones={invitaciones} autenticacion={new AutenticacionMemoria(marta, marta)} />)
    expect(await screen.findByRole('heading', { name: 'Te han invitado a «Almunia»' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Unirme' }))
    expect(await screen.findByRole('heading', { name: 'Almunia' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/q1')
    expect(invitaciones.aceptados).toEqual([{ token: 'buena', nombre: 'Marta' }])
  })

  it('«Ahora no» lleva a la página inicial', async () => {
    const invitaciones = new InvitacionesMemoria({ destinos: { buena: ['q1', 'Almunia'] } })
    window.location.hash = '#/unirse/buena'
    render(<App repositorio={new RepositorioMemoria()} crearId={contador()} invitaciones={invitaciones} autenticacion={new AutenticacionMemoria(marta, marta)} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }))
    expect(await screen.findByRole('heading', { name: 'Tus quedadas' })).toBeInTheDocument()
    expect(window.location.hash).not.toContain('unirse')
  })
})
