/** localDate.test.ts — TDD (Kent Beck: teste antes do codigo).
 * O prazo e uma DATA (YYYY-MM-DD), nunca um instante. O bug classico deste
 * campo e usar toISOString(), que converte pra UTC e pode jogar a data pro
 * dia errado perto da meia-noite dependendo do fuso. Estes testes fixam o
 * comportamento local-first com Date(y,m,d,h,mi), que e deterministico
 * independente do fuso da maquina que roda o teste. */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { toLocalISODate, hojeISO, amanhaISO } from './localDate'

describe('toLocalISODate', () => {
  afterEach(() => vi.useRealTimers())

  it('formata ano-mes-dia com zero a esquerda', () => {
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('nao joga a data pro dia seguinte perto da meia-noite (o bug que essa funcao evita)', () => {
    // 23:30 do dia local 27/08/2026 - se alguem trocasse por toISOString()
    // isso poderia virar 28/08 dependendo do fuso da maquina.
    const quaseMeiaNoite = new Date(2026, 7, 27, 23, 30)
    expect(toLocalISODate(quaseMeiaNoite)).toBe('2026-08-27')
  })

  it('nao joga a data pro dia anterior logo apos a meia-noite', () => {
    const logoAposMeiaNoite = new Date(2026, 7, 27, 0, 5)
    expect(toLocalISODate(logoAposMeiaNoite)).toBe('2026-08-27')
  })
})

describe('hojeISO / amanhaISO', () => {
  afterEach(() => vi.useRealTimers())

  it('hoje e amanha respeitam o relogio local, mesmo virando mes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 31, 10, 0)) // 31/08/2026 10h local
    expect(hojeISO()).toBe('2026-08-31')
    expect(amanhaISO()).toBe('2026-09-01')
  })

  it('amanha vira o ano corretamente', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59))
    expect(amanhaISO()).toBe('2027-01-01')
  })
})
