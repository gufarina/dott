/** PARAGrid.altura.test.ts — guarda de regressao (TASK-566, 15/09).
 * A altura do .folderCard ja voltou a esmagar 3 VEZES nesta mesma Task porque
 * a formula da altura vivia calculada em DOIS lugares (implicita no
 * .folderCard, explicita num calc() duplicado no .folderNew) e as duas
 * copias desalinhavam sempre que alguem mexia em fonte/gap sem lembrar da
 * outra ponta. O conserto foi criar UMA fonte (--folder-card-h em
 * tokens.css) e fazer os dois seletores consumirem so ela. Este teste nao
 * mede layout (nao ha motor de layout no vitest) - ele le o CSS como texto e
 * trava a fonte unica: se alguem reintroduzir um calc() duplicado aqui, ou
 * fizer .folderCard/.folderNew pararem de usar o token, o teste quebra ANTES
 * do card voltar a cortar a linha "X notas". Nao apague achando bobagem -
 * ele existe porque a regressao voltou tres vezes sem ele. */
import { describe, expect, it } from 'vitest'
// @ts-expect-error node:fs/node:path/node:url - o projeto nao tem @types/node
// instalado (mesmo padrao ja usado em vite.config.ts para "process").
import { readFileSync } from 'node:fs'
// @ts-expect-error idem
import { fileURLToPath } from 'node:url'
// @ts-expect-error idem
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(__dirname, 'PARAGrid.module.css'), 'utf-8') as string

describe('PARAGrid.module.css — fonte unica da altura do card de pasta', () => {
  it('.folderCard usa var(--folder-card-h)', () => {
    const inicio = css.indexOf('.folderCard {')
    const bloco = css.slice(inicio, css.indexOf('}', inicio))
    expect(bloco).toContain('min-height: var(--folder-card-h)')
  })

  it('.folderNew usa var(--folder-card-h)', () => {
    const inicio = css.indexOf('.folderNew {')
    const bloco = css.slice(inicio, css.indexOf('}', inicio))
    expect(bloco).toContain('min-height: var(--folder-card-h)')
  })

  it('nao existe copia da formula (nenhum min-height: calc( no arquivo)', () => {
    expect(css).not.toMatch(/min-height:\s*calc\(/)
  })
})
