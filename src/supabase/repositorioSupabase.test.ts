import { describe, expect, it, vi } from 'vitest'
import { producto, quedada } from '../dominio/fabrica'
import type { Quedada } from '../dominio/tipos'
import { BackendSupabaseFalso } from '../test/backendSupabaseFalso'
import { RepositorioSupabase } from './repositorioSupabase'

function nuevo() {
  const backend = new BackendSupabaseFalso()
  return { backend, repo: () => new RepositorioSupabase(backend.cliente()) }
}

const cuatroProductos = () =>
  [1, 2, 3, 4].map((n) => producto({ id: `pr${n}`, nombre: `Producto ${n}` }))

const marcar = (q: Quedada, id: string): Quedada => ({
  ...q,
  productos: q.productos.map((p) => (p.id === id ? { ...p, comprado: true } : p)),
})

describe('RepositorioSupabase', () => {
  it('empieza sin quedadas', async () => {
    expect(await nuevo().repo().listar()).toEqual([])
  })

  it('guarda y recupera una quedada completa, con sus opcionales', async () => {
    const { repo } = nuevo()
    const q = quedada({
      id: 'q1',
      nombre: 'Almunia 2026',
      inicio: '2026-12-04',
      participantes: [
        { id: 'a', nombre: 'Ana', porcentajeComida: 100, pagaCasa: true, cuentaId: 'u1' },
        { id: 'b', nombre: 'Peque' },
      ],
      grupos: [
        { id: 'g1', nombre: 'Cena', orden: 0, reparto: 'comida' },
        { id: 'g2', nombre: 'Bebida', orden: 1 },
      ],
      productos: [producto({ id: 'pr1', cantidad: null, precioUnidad: 1.5, compradorId: 'a', comprado: true, descuento: -0.2 })],
      asistentes: [{ id: 's1', familia: 'Pérez', personas: 3, llegada: '18:30' }],
      basicos: [{ id: 'k1', nombre: 'Leche', asistenteId: null }],
    })
    await repo().guardar(q)
    expect(await repo().obtener('q1')).toEqual(q)
  })

  it('guarda la casa y la familia de cada participante, y solo envía lo que cambia', async () => {
    const { repo, backend } = nuevo()
    const q = quedada({
      id: 'q1',
      participantes: [{ id: 'a', nombre: 'Ana', porcentajeCasa: 50, familiaId: 's1' }],
      asistentes: [{ id: 's1', familia: 'Pérez', personas: 1, llegada: null }],
      casa: { titulo: 'Casa', descripcion: 'https://x.es', direccion: 'Calle 1', latitud: 41.6, longitud: -1.2, precio: 90050 },
      pagos: [{ id: 'g1', familiaId: 's1', importe: 20000, concepto: 'Reserva' }],
    })
    const r = repo()
    await r.guardar(q)
    expect(await repo().obtener('q1')).toEqual(q)

    backend.escrituras.length = 0
    await r.guardar({ ...q, casa: { ...q.casa, precio: 100000 } })
    expect(backend.escrituras).toHaveLength(1)
    expect(backend.escrituras[0]).toMatchObject({ operacion: 'update', tabla: 'quedadas', valores: { casa_precio: 100000 } })
  })

  it('devuelve las listas en el orden en que se guardaron', async () => {
    const { repo } = nuevo()
    const q = quedada({ productos: [producto({ id: 'z' }), producto({ id: 'a' }), producto({ id: 'm' })] })
    await repo().guardar(q)
    expect((await repo().obtener('q1'))!.productos.map((p) => p.id)).toEqual(['z', 'a', 'm'])
  })

  it('lista todas las quedadas', async () => {
    const { repo } = nuevo()
    await repo().guardar(quedada({ id: 'q1' }))
    await repo().guardar(quedada({ id: 'q2' }))
    expect((await repo().listar()).map((q) => q.id)).toEqual(['q1', 'q2'])
  })

  it('obtener devuelve null si no existe', async () => {
    expect(await nuevo().repo().obtener('nada')).toBeNull()
  })

  it('guardar con un id existente la reemplaza en vez de duplicarla', async () => {
    const { repo } = nuevo()
    await repo().guardar(quedada({ id: 'q1', nombre: 'Antes', productos: [producto({ id: 'x' })] }))
    await repo().guardar(quedada({ id: 'q1', nombre: 'Después' }))
    const todas = await repo().listar()
    expect(todas).toHaveLength(1)
    expect(todas[0].nombre).toBe('Después')
    expect(todas[0].productos).toEqual([])
  })

  it('borra una quedada con todo lo suyo y deja las demás', async () => {
    const { repo, backend } = nuevo()
    await repo().guardar(quedada({ id: 'q1', productos: [producto({ id: 'x' })] }))
    await repo().guardar(quedada({ id: 'q2', productos: [producto({ id: 'y' })] }))
    await repo().borrar('q1')
    expect((await repo().listar()).map((q) => q.id)).toEqual(['q2'])
    expect(backend.tablas.productos.map((p) => p.quedada_id)).toEqual(['q2'])
  })

  it('borrar algo que no existe no falla', async () => {
    await expect(nuevo().repo().borrar('nada')).resolves.toBeUndefined()
  })

  it('ignora quedadas con datos que no tienen sentido', async () => {
    const { repo, backend } = nuevo()
    await repo().guardar(quedada({ id: 'q1' }))
    backend.tablas.quedadas.push({ id: 'rota' })
    expect((await repo().listar()).map((q) => q.id)).toEqual(['q1'])
  })

  describe('guardado por diferencias', () => {
    it('sin cambios no escribe nada', async () => {
      const { repo, backend } = nuevo()
      const r = repo()
      const q = quedada({ productos: cuatroProductos() })
      await r.guardar(q)
      backend.escrituras = []
      await r.guardar(q)
      expect(backend.escrituras).toEqual([])
    })

    it('al marcar un producto solo envía la columna que cambia', async () => {
      const { repo, backend } = nuevo()
      const r = repo()
      const q = quedada({ productos: cuatroProductos() })
      await r.guardar(q)
      backend.escrituras = []
      await r.guardar(marcar(q, 'pr2'))
      expect(backend.escrituras).toEqual([
        {
          operacion: 'update',
          tabla: 'productos',
          valores: { comprado: true },
          filtros: [['quedada_id', 'q1'], ['id', 'pr2']],
        },
      ])
    })

    it('dos personas marcan productos distintos y se conservan las dos marcas', async () => {
      const { repo } = nuevo()
      await repo().guardar(quedada({ productos: cuatroProductos() }))
      const ana = repo()
      const luis = repo()
      const deAna = (await ana.obtener('q1'))!
      const deLuis = (await luis.obtener('q1'))!

      await ana.guardar(marcar(deAna, 'pr1'))
      await luis.guardar(marcar(deLuis, 'pr2'))

      const final = (await repo().obtener('q1'))!
      expect(final.productos.map((p) => [p.id, p.comprado])).toEqual([
        ['pr1', true],
        ['pr2', true],
        ['pr3', false],
        ['pr4', false],
      ])
    })

    it('si una persona borra el primer producto, no se pierde la marca que otra puso en el cuarto', async () => {
      const { repo } = nuevo()
      await repo().guardar(quedada({ productos: cuatroProductos() }))
      const ana = repo()
      const luis = repo()
      const deAna = (await ana.obtener('q1'))!
      const deLuis = (await luis.obtener('q1'))!

      await ana.guardar({ ...deAna, productos: deAna.productos.filter((p) => p.id !== 'pr1') })
      await luis.guardar(marcar(deLuis, 'pr4'))

      const final = (await repo().obtener('q1'))!
      expect(final.productos.map((p) => [p.id, p.comprado])).toEqual([
        ['pr2', false],
        ['pr3', false],
        ['pr4', true],
      ])
    })

    it('un producto añadido por otra persona no se borra al guardar otro cambio', async () => {
      const { repo } = nuevo()
      await repo().guardar(quedada({ productos: cuatroProductos() }))
      const ana = repo()
      const luis = repo()
      const deAna = (await ana.obtener('q1'))!
      const deLuis = (await luis.obtener('q1'))!

      await ana.guardar({ ...deAna, productos: [...deAna.productos, producto({ id: 'nuevo', nombre: 'Vino' })] })
      await luis.guardar(marcar(deLuis, 'pr1'))

      const ids = (await repo().obtener('q1'))!.productos.map((p) => p.id)
      expect(ids).toContain('nuevo')
    })

    it('un fallo a mitad de guardado no da por guardado lo pendiente y el reintento lo deja bien', async () => {
      const { repo, backend } = nuevo()
      const r = repo()
      await r.guardar(quedada({ productos: cuatroProductos(), grupos: [{ id: 'g1', nombre: 'Cena', orden: 0 }] }))

      const cambiada: Quedada = {
        ...marcar(quedada({ productos: cuatroProductos(), grupos: [{ id: 'g1', nombre: 'Cena', orden: 0 }] }), 'pr1'),
        nombre: 'Renombrada',
        grupos: [{ id: 'g1', nombre: 'Cena grande', orden: 0 }, { id: 'g2', nombre: 'Desayuno', orden: 1 }],
        productos: marcar(quedada({ productos: cuatroProductos() }), 'pr1').productos.filter((p) => p.id !== 'pr4'),
      }

      backend.fallarEscrituraNumero(2)
      await expect(r.guardar(cambiada)).rejects.toThrow('fallo de red simulado')

      await r.guardar(cambiada)
      expect(await repo().obtener('q1')).toEqual(cambiada)
    })

    it('propaga el error si falla la lectura o la primera escritura', async () => {
      const { repo, backend } = nuevo()
      backend.fallarEscrituraNumero(1)
      await expect(repo().guardar(quedada({ id: 'q1' }))).rejects.toThrow('fallo de red simulado')
    })
  })
  describe('suscribir (tiempo real)', () => {
    const esperar = () => new Promise((r) => setTimeout(r, 0))

    it('abre el canal privado de la quedada, autenticando antes de suscribir', async () => {
      const { repo, backend } = nuevo()
      repo().suscribir('q1', () => {})
      await vi.waitFor(() => expect(backend.canales).toHaveLength(1))
      expect(backend.canales[0]).toMatchObject({ nombre: 'quedada:q1', privado: true })
      await vi.waitFor(() => expect(backend.bitacora).toEqual(['setAuth', 'subscribe']))
    })

    it('avisa cada vez que cambia algo en la quedada', async () => {
      const { repo, backend } = nuevo()
      const alCambiar = vi.fn()
      repo().suscribir('q1', alCambiar)
      await vi.waitFor(() => expect(backend.bitacora).toContain('subscribe'))
      await esperar()
      alCambiar.mockClear()
      backend.emitir('q1', 'INSERT')
      backend.emitir('q1', 'DELETE')
      expect(alCambiar).toHaveBeenCalledTimes(2)
    })

    it('avisa al quedar suscrito, para recoger lo ocurrido antes y tras una reconexión', async () => {
      const { repo, backend } = nuevo()
      const alCambiar = vi.fn()
      repo().suscribir('q1', alCambiar)
      await vi.waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1))
      backend.canales[0].alEstado?.('SUBSCRIBED')
      expect(alCambiar).toHaveBeenCalledTimes(2)
    })

    it('no avisa por otros estados del canal', async () => {
      const { repo, backend } = nuevo()
      const alCambiar = vi.fn()
      repo().suscribir('q1', alCambiar)
      await vi.waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1))
      backend.canales[0].alEstado?.('CHANNEL_ERROR')
      backend.canales[0].alEstado?.('CLOSED')
      expect(alCambiar).toHaveBeenCalledTimes(1)
    })

    it('al cancelar quita el canal y deja de avisar', async () => {
      const { repo, backend } = nuevo()
      const alCambiar = vi.fn()
      const cancelar = repo().suscribir('q1', alCambiar)
      await vi.waitFor(() => expect(backend.bitacora).toContain('subscribe'))
      await esperar()
      cancelar()
      await vi.waitFor(() => expect(backend.canales[0].quitado).toBe(true))
      alCambiar.mockClear()
      backend.canales[0].alMensaje?.({ event: 'UPDATE' })
      expect(alCambiar).not.toHaveBeenCalled()
    })

    it('si se cancela antes de terminar de abrirse, no deja el canal abierto', async () => {
      const { repo, backend } = nuevo()
      const cancelar = repo().suscribir('q1', () => {})
      cancelar()
      await esperar()
      await esperar()
      expect(backend.canales.every((c) => c.quitado || !c.suscrito)).toBe(true)
    })
  })
})
