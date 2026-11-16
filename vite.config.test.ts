import { describe, expect, it } from 'vitest'
import config from './vite.config.ts'

describe('configuración de Vite para GitHub Pages', () => {
  it('sirve la app bajo el nombre del repositorio', () => {
    expect(config.base).toBe('/quedada/')
  })
})
