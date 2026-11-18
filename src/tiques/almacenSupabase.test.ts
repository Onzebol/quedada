import { describe, expect, it } from 'vitest'
import { AlmacenSupabase, type ClienteAlmacen } from './almacenSupabase'

function clienteFalso(opciones: { fallar?: boolean } = {}) {
  const llamadas: unknown[][] = []
  const error = opciones.fallar ? { message: 'sin permiso' } : null
  const cliente: ClienteAlmacen = {
    storage: {
      from: (bucket) => ({
        upload: async (ruta, cuerpo, op) => {
          llamadas.push(['upload', bucket, ruta, cuerpo, op])
          return { error }
        },
        createSignedUrl: async (ruta, segundos) => {
          llamadas.push(['firmar', bucket, ruta, segundos])
          return { data: error ? null : { signedUrl: `https://x.test/${ruta}?token=1` }, error }
        },
        remove: async (rutas) => {
          llamadas.push(['borrar', bucket, rutas])
          return { error }
        },
      }),
    },
  }
  return { cliente, llamadas }
}

describe('AlmacenSupabase', () => {
  it('sube la imagen al bucket privado «tiques» sustituyendo la anterior', async () => {
    const { cliente, llamadas } = clienteFalso()
    const imagen = new Blob(['x'], { type: 'image/jpeg' })
    await new AlmacenSupabase(cliente).subir('q1/g1.jpg', imagen)
    expect(llamadas).toEqual([['upload', 'tiques', 'q1/g1.jpg', imagen, { contentType: 'image/jpeg', upsert: true }]])
  })

  it('pide una dirección firmada y temporal para verla', async () => {
    const { cliente, llamadas } = clienteFalso()
    expect(await new AlmacenSupabase(cliente).url('q1/g1.jpg')).toBe('https://x.test/q1/g1.jpg?token=1')
    expect(llamadas[0]).toEqual(['firmar', 'tiques', 'q1/g1.jpg', 3600])
  })

  it('borra las imágenes indicadas y no llama si no hay ninguna', async () => {
    const { cliente, llamadas } = clienteFalso()
    const almacen = new AlmacenSupabase(cliente)
    await almacen.borrar([])
    await almacen.borrar(['q1/g1.jpg'])
    expect(llamadas).toEqual([['borrar', 'tiques', ['q1/g1.jpg']]])
  })

  it('convierte los errores del servidor en excepciones', async () => {
    const { cliente } = clienteFalso({ fallar: true })
    const almacen = new AlmacenSupabase(cliente)
    await expect(almacen.subir('q1/g1.jpg', new Blob(['x']))).rejects.toThrow('sin permiso')
    await expect(almacen.url('q1/g1.jpg')).rejects.toThrow('sin permiso')
    await expect(almacen.borrar(['q1/g1.jpg'])).rejects.toThrow('sin permiso')
  })
})
