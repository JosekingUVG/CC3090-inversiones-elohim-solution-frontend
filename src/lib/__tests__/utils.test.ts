import { isDarkBg } from '../utils'
 
describe('utils', () => {
  it('debería tener utilidades disponibles', () => {
    expect(true).toBe(true)
  })

  it('debería identificar fondos oscuros y claros correctamente', () => {
    expect(isDarkBg('#000000')).toBe(true)
    expect(isDarkBg('#0F172A')).toBe(true)
    expect(isDarkBg('#FFFFFF')).toBe(false)
    expect(isDarkBg('#F8FAFC')).toBe(false)
    expect(isDarkBg('')).toBe(false)
    expect(isDarkBg('transparent')).toBe(false)
  })
})

