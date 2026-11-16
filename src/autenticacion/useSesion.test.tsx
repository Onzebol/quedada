import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AutenticacionMemoria } from '../test/autenticacionMemoria'
import { useSesion } from './useSesion'

describe('useSesion', () => {
  it('empieza sin sesión y refleja entrar y salir', async () => {
    const auth = new AutenticacionMemoria({ id: 'g1', nombre: 'Ana', foto: null })
    const { result } = renderHook(() => useSesion(auth))
    expect(result.current.usuario).toBeNull()
    await act(() => result.current.entrar())
    expect(result.current.usuario?.nombre).toBe('Ana')
    await act(() => result.current.salir())
    expect(result.current.usuario).toBeNull()
  })

  it('recupera la sesión existente al montar (persistencia)', () => {
    const auth = new AutenticacionMemoria({ id: 'g1', nombre: 'Ana', foto: null }, { id: 'g1', nombre: 'Ana', foto: null })
    const { result } = renderHook(() => useSesion(auth))
    expect(result.current.usuario?.nombre).toBe('Ana')
  })

  it('comunica el error si entrar falla', async () => {
    const auth = new AutenticacionMemoria(null)
    const { result } = renderHook(() => useSesion(auth))
    await act(() => result.current.entrar())
    expect(result.current.error).toBe('entrada')
    expect(result.current.usuario).toBeNull()
  })
})
