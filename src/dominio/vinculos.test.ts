import { describe, expect, it } from 'vitest'
import { quedada } from './fabrica'
import { idsMios, participanteDe, vincularCuenta } from './vinculos'

const base = () =>
  quedada({
    participantes: [
      { id: 'u1', nombre: 'Ana' },
      { id: 'u2', nombre: 'Luis' },
    ],
  })

describe('vincular cuenta con participante', () => {
  it('vincula una cuenta a un participante', () => {
    const q = vincularCuenta(base(), 'u1', 'cuenta-1')
    expect(participanteDe(q, 'cuenta-1')?.nombre).toBe('Ana')
  })

  it('una cuenta solo puede ser un participante: al vincular otro se suelta el anterior', () => {
    let q = vincularCuenta(base(), 'u1', 'cuenta-1')
    q = vincularCuenta(q, 'u2', 'cuenta-1')
    expect(participanteDe(q, 'cuenta-1')?.nombre).toBe('Luis')
    expect(q.participantes[0].cuentaId).toBeUndefined()
  })

  it('un participante no se queda con dos cuentas: la nueva sustituye a la anterior', () => {
    let q = vincularCuenta(base(), 'u1', 'cuenta-1')
    q = vincularCuenta(q, 'u1', 'cuenta-2')
    expect(participanteDe(q, 'cuenta-1')).toBeNull()
    expect(participanteDe(q, 'cuenta-2')?.nombre).toBe('Ana')
  })

  it('con null suelta la cuenta', () => {
    let q = vincularCuenta(base(), 'u1', 'cuenta-1')
    q = vincularCuenta(q, null, 'cuenta-1')
    expect(participanteDe(q, 'cuenta-1')).toBeNull()
  })

  it('ignora un participante que no existe', () => {
    const q = base()
    expect(vincularCuenta(q, 'nadie', 'cuenta-1')).toBe(q)
  })
})

describe('ids míos (yo y mi familia)', () => {
  const q = () =>
    quedada({
      asistentes: [
        { id: 'f1', familia: 'Pérez', personas: 2, llegada: null },
        { id: 'f2', familia: 'Gil', personas: 1, llegada: null },
      ],
      participantes: [
        { id: 'u1', nombre: 'Ana', familiaId: 'f1', cuentaId: 'c1' },
        { id: 'u2', nombre: 'Luis', familiaId: 'f1' },
        { id: 'u3', nombre: 'Eva', familiaId: 'f2' },
        { id: 'u4', nombre: 'Suelto', cuentaId: 'c4' },
      ],
    })

  it('incluye mi persona, mi familia y sus componentes', () => {
    expect([...idsMios(q(), 'c1')].sort()).toEqual(['f1', 'u1', 'u2'])
  })

  it('una persona sin familia solo se incluye a sí misma', () => {
    expect([...idsMios(q(), 'c4')]).toEqual(['u4'])
  })

  it('sin vínculo (o sin cuenta) no hay nada mío', () => {
    expect(idsMios(q(), 'otra').size).toBe(0)
    expect(idsMios(q(), null).size).toBe(0)
  })
})
