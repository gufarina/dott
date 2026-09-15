/** Field.foco.test.ts — guarda do CONTRATO DE FOCO (TASK-566, 15/09/2026).
 * 3 campos do app (`.search` em Titlebar, `.convoBox` em CaptureBox, `.addRow`
 * em TasksPanel) moram dentro de um wrapper que pinta o proprio anel via
 * `:focus-within` - regra "um foco por conjunto" (DESIGN.md, secao Input): so
 * UM anel acende, nunca dois. Antes disso a regra vivia SO em comentario e em
 * copia local (`<classe>:focus-visible { outline: none }`) em cada consumidor.
 * 1 dos 3 (`.searchInput`) esqueceu a copia, empatou em especificidade com o
 * `:focus-visible` global de reset.css e perdeu a ordem do bundle - dois
 * aneis acesos, um colado no texto (TASK-566/347/308/339). O conserto foi
 * criar a variante canonica `Field` (`variante="conjunto"`), que fecha o
 * `outline: none` UMA vez em `.conjunto:focus-visible` e os 3 consumidores so
 * consomem. Este teste le CSS/TSX como texto e trava a fonte unica: se
 * alguem reintroduzir a copia local ou algum dos 3 parar de usar a variante,
 * o teste quebra ANTES do anel duplo voltar. Nao apague achando bobagem -
 * ele existe porque a regra ja foi esquecida uma vez sem ele.
 *
 * Nota sobre o caso 2 (varredura): a combinacao `:focus-visible{outline:none}`
 * TAMBEM existe hoje, legitimamente, em `NoteEditor.module.css`
 * (`.titleInput`, `.tagInput`) - e o contrato `bare` descrito no comentario
 * de `.conjunto` acima (campo com pele e anel PROPRIOS, sem wrapper). Um
 * check cego por essa combinacao reprovaria contra codigo ja aprovado. Por
 * isso o caso 2 so acusa a combinacao quando o MESMO arquivo tambem tem
 * `:focus-within` - a forma exata da copia local que causou o TASK-566
 * (wrapper que avisa foco + campo que tenta apagar o proprio anel na mao).
 * Se um caso legitimo precisar dessa combinacao completa (wrapper +
 * outline:none local) no futuro, a saida certa e usar `Field
 * variante="conjunto"`, NUNCA adicionar excecao/allowlist aqui. */
import { describe, expect, it } from 'vitest'
// @ts-expect-error node:fs/node:path/node:url - o projeto nao tem @types/node
// instalado (mesmo padrao ja usado em vite.config.ts para "process").
import { readFileSync, readdirSync } from 'node:fs'
// @ts-expect-error idem
import { fileURLToPath } from 'node:url'
// @ts-expect-error idem
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = join(__dirname, '..', '..')
const fieldCssPath = join(__dirname, 'Field.module.css')
const fieldCss = readFileSync(fieldCssPath, 'utf-8') as string

function listarModuleCss(dir: string): string[] {
  const arquivos: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      arquivos.push(...listarModuleCss(caminho))
    } else if (entrada.name.endsWith('.module.css')) {
      arquivos.push(caminho)
    }
  }
  return arquivos
}

// Recria a cópia local do TASK-566: um wrapper `:focus-within` no mesmo
// arquivo de uma regra `:focus-visible { outline: none }` - a forma exata
// que deveria ter sido substituida por `Field variante="conjunto"`.
function recriaCopiaLocal(css: string): boolean {
  if (!css.includes(':focus-within')) return false
  const blocoRegex = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = blocoRegex.exec(css))) {
    const [, seletor, corpo] = m
    if (seletor.includes(':focus-visible') && /outline:\s*none/.test(corpo)) {
      return true
    }
  }
  return false
}

describe('Field.module.css — contrato de foco (TASK-566)', () => {
  it('.conjunto tem outline: none dentro de :focus-visible', () => {
    const inicio = fieldCss.indexOf('.conjunto:focus-visible')
    expect(inicio).toBeGreaterThan(-1)
    const bloco = fieldCss.slice(inicio, fieldCss.indexOf('}', inicio))
    expect(bloco).toContain('outline: none')
  })

  it('nenhum outro .module.css recria a copia local (:focus-within + :focus-visible{outline:none} no mesmo arquivo)', () => {
    const candidatos = [
      ...listarModuleCss(join(srcDir, 'features')),
      ...listarModuleCss(join(srcDir, 'components')),
    ].filter((caminho) => caminho !== fieldCssPath)

    const ofensores = candidatos.filter((caminho) =>
      recriaCopiaLocal(readFileSync(caminho, 'utf-8') as string)
    )
    expect(ofensores).toEqual([])
  })

  it('os 3 consumidores (Titlebar, CaptureBox, TasksPanel) usam variante="conjunto"', () => {
    const consumidores = [
      join(srcDir, 'components', 'Titlebar.tsx'),
      join(srcDir, 'features', 'capture', 'CaptureBox.tsx'),
      join(srcDir, 'features', 'tasks', 'TasksPanel.tsx'),
    ]
    for (const caminho of consumidores) {
      const tsx = readFileSync(caminho, 'utf-8') as string
      expect(tsx).toContain('variante="conjunto"')
    }
  })
})
