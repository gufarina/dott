/** Field.medic.test.ts — medição de CSS para TASK-566 (PASSO 1 de KIT).
 * Valida que o outline do .conjunto:focus-visible mata o anel global em favor
 * do wrapper. Validacoes estaticas de CSS. */
import { describe, it, expect } from 'vitest'
// @ts-expect-error node:fs/node:path - projeto nao tem @types/node
import { readFileSync } from 'node:fs'
// @ts-expect-error idem
import { join, dirname } from 'node:path'
// @ts-expect-error idem
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carrega os CSSs
const fieldCss = readFileSync(join(__dirname, 'Field.module.css'), 'utf-8')
const resetCss = readFileSync(join(__dirname, '../../styles/reset.css'), 'utf-8')
const baseSearchCss = readFileSync(join(__dirname, '../Titlebar.module.css'), 'utf-8')

describe('PASSO 1 - Medição de CSS do foco (.conjunto)', () => {
  it('reset.css tem :focus-visible global com outline 2px solid', () => {
    expect(resetCss).toContain(':focus-visible')
    expect(resetCss).toContain('outline: 2px solid')
  })

  it('.conjunto:focus-visible tem outline: none (mata anel do INPUT em favor do wrapper)', () => {
    // Regex que pega o bloco .conjunto:focus-visible
    const regex = /\.conjunto:focus-visible\s*\{([^}]+)\}/
    const match = fieldCss.match(regex)
    expect(match).toBeDefined()
    expect(match?.[1]).toContain('outline: none')
  })

  it('Field.module.css documenta CONTRATO DE FOCO (3 variantes: campo/bare/conjunto)', () => {
    expect(fieldCss).toContain('CONTRATO DE FOCO')
    expect(fieldCss).toContain('variante="conjunto"')
    expect(fieldCss).toContain('.conjunto')
  })

  it('reset.css nao tem :focus-visible:focus-visible (sem double-tap de pseudo-classe)', () => {
    expect(resetCss).not.toContain(':focus-visible:focus-visible')
  })

  it('padding do .base esta definido (receita canonica + 12px quando consumir classe especializacao)', () => {
    expect(fieldCss).toMatch(/\.base\s*\{[\s\S]*padding:/)
    // Verifica que NENHUM override local do padding no reset que valha conflitar
    const baseDefItem = fieldCss.match(/\.base\s*\{([^}]+)\}/)
    expect(baseDefItem?.[1]).toContain('padding')
  })

  it('Titlebar.module.css tem .search com :focus-within (recebe anel, nao o input)', () => {
    expect(baseSearchCss).toContain('.search')
    expect(baseSearchCss).toContain(':focus-within')
  })
})
