import { describe, expect, it } from 'vitest'
import { InvitacionesSupabase, type ClienteRpc } from './invitacionesSupabase'

function falso(respuestas: Record<string, unknown>, fallo?: string) {
  const llamadas: { nombre: string; argumentos: Record<string, unknown> }[] = []
  const cliente: ClienteRpc = {
    rpc: async (nombre, argumentos) => {
      llamadas.push({ nombre, argumentos })
      return fallo ? { data: null, error: { message: fallo } } : { data: respuestas[nombre] ?? null, error: null }
    },
  }
  return { llamadas, invitaciones: new InvitacionesSupabase(cliente) }
}

describe('InvitacionesSupabase', () => {
  it('lee el enlace vigente, o null si no hay', async () => {
    expect(await falso({ invitacion_activa: 'abc' }).invitaciones.enlaceActivo('q1')).toBe('abc')
    expect(await falso({}).invitaciones.enlaceActivo('q1')).toBeNull()
  })

  it('crea el enlace llamando a crear_invitacion', async () => {
    const { invitaciones, llamadas } = falso({ crear_invitacion: 'nuevo' })
    expect(await invitaciones.crearEnlace('q1')).toBe('nuevo')
    expect(llamadas).toEqual([{ nombre: 'crear_invitacion', argumentos: { p_quedada_id: 'q1' } }])
  })

  it('desactiva el enlace y retira a un miembro', async () => {
    const { invitaciones, llamadas } = falso({})
    await invitaciones.desactivarEnlace('q1')
    await invitaciones.retirar('q1', 'u1')
    expect(llamadas.map((l) => l.nombre)).toEqual(['desactivar_invitacion', 'retirar_miembro'])
    expect(llamadas[1].argumentos).toEqual({ p_quedada_id: 'q1', p_usuario_id: 'u1' })
  })

  it('lista los miembros con sus nombres', async () => {
    const { invitaciones } = falso({ miembros_de: [{ usuario_id: 'u1', nombre: 'Marta' }] })
    expect(await invitaciones.miembros('q1')).toEqual([{ usuarioId: 'u1', nombre: 'Marta' }])
    expect(await falso({}).invitaciones.miembros('q1')).toEqual([])
  })

  it('consulta el nombre de la quedada del enlace y acepta con el nombre de la cuenta', async () => {
    const { invitaciones, llamadas } = falso({ nombre_invitacion: 'Almunia', aceptar_invitacion: 'q1' })
    expect(await invitaciones.nombreDe('tok')).toBe('Almunia')
    expect(await invitaciones.aceptar('tok', 'Marta')).toBe('q1')
    expect(llamadas[1].argumentos).toEqual({ p_token: 'tok', p_nombre: 'Marta' })
    expect(await falso({}).invitaciones.nombreDe('malo')).toBeNull()
  })

  it('rechaza con el mensaje de la base cuando falla', async () => {
    await expect(falso({}, 'La invitación no es válida').invitaciones.aceptar('x', 'Marta')).rejects.toThrow('La invitación no es válida')
  })
})
