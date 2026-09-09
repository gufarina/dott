/** markdownCommands.ts — modulo profundo: interface estreita (uma funcao por
 * acao da toolbar), complexidade de toggle/undo por dentro. Cada funcao le o
 * `EditorState` e devolve o `TransactionSpec` que o chamador despacha na
 * `EditorView` — nao toca DOM, por isso e testavel sem navegador (ver
 * markdownCommands.test.ts).
 *
 * Regra de negrito/italico: aplicar a marca sobre um trecho ja marcado
 * DESFAZ (nunca empilha `****`) — vale selecionando so o texto de dentro ou
 * o trecho inteiro com as marcas.
 *
 * Regra de bloco (TASK-359, CEO: "o item checklist esta estranho... nao
 * parece checklist nada"). MEDIDO antes do conserto: titulo, lista,
 * checklist e citacao so conheciam o PROPRIO prefixo (e os altPrefixes da
 * propria familia, ex: h1<->h2) — aplicar um sobre linha de OUTRO tipo
 * apenas PREPENDIA, nunca trocava (a sopa `[ ] > sdsadsa- dsa` da captura do
 * CEO e exatamente isso, tres marcas empilhadas na mesma linha). Pior: como
 * o marcador de checklist (`- [ ] `) comeca com os MESMOS dois caracteres do
 * marcador de lista (`- `), o botao Lista aplicado numa linha de checklist
 * enxergava "ja tem prefixo de lista" e cortava so 2 caracteres, deixando
 * `[ ] texto` orfao. `detectBlockPrefix` abaixo e a fonte unica de verdade
 * de "que marca de bloco esta na linha agora"; os quatro comandos usam ela
 * pra SUBSTITUIR o prefixo estranho em vez de somar. */
import type { EditorState, TransactionSpec } from '@codemirror/state'

const CHECKLIST_RE = /^-\s\[[ xX]\]\s/
const HEADING_PREFIX_RE = /^#{1,3}\s+/
const QUOTE_PREFIX_RE = /^>\s+/
const LIST_PREFIX_RE = /^[-*+]\s+/

/** Acha o prefixo de bloco (de QUALQUER um dos quatro comandos) presente no
 *  INICIO da linha, ou null se a linha e texto normal. Ordem importa: o
 *  marcador de checklist e checado primeiro porque tambem bate no regex de
 *  lista (`- [ ] texto` comeca com `- `). */
function detectBlockPrefix(text: string): string | null {
  const checklist = CHECKLIST_RE.exec(text)
  if (checklist) return checklist[0]
  const heading = HEADING_PREFIX_RE.exec(text)
  if (heading) return heading[0]
  const quote = QUOTE_PREFIX_RE.exec(text)
  if (quote) return quote[0]
  const list = LIST_PREFIX_RE.exec(text)
  if (list) return list[0]
  return null
}

/** `text` comeca com o `prefix` do PROPRIO comando (nao com o prefixo de um
 *  comando diferente que por acaso colide em texto). So existe uma colisao
 *  real hoje: prefixo de lista (`- `, `* `, `+ `) contra checklist (`- [ ] `,
 *  que tambem comeca com `- `) — por isso o guard abaixo. */
function startsWithOwnPrefix(text: string, prefix: string): boolean {
  if (!text.startsWith(prefix)) return false
  if (LIST_PREFIX_RE.test(prefix) && CHECKLIST_RE.test(text)) return false
  return true
}

/** bold (**) / italic (_): envolve a selecao com `marker`; alterna pra
 * desfazer se o trecho ja estiver marcado. Sem selecao, insere a marca
 * dupla e deixa o cursor no meio. */
export function toggleWrap(state: EditorState, marker: string): TransactionSpec {
  const { from, to } = state.selection.main
  const len = marker.length
  const doc = state.doc
  const selText = doc.sliceString(from, to)

  // Caso 1: a selecao inclui as proprias marcas ("**mundo**" selecionado inteiro).
  if (selText.length >= len * 2 && selText.startsWith(marker) && selText.endsWith(marker)) {
    const inner = selText.slice(len, selText.length - len)
    return {
      changes: { from, to, insert: inner },
      selection: { anchor: from, head: from + inner.length },
    }
  }

  // Caso 2: as marcas estao logo fora da selecao ("mundo" selecionado, "**" dos dois lados).
  const before = doc.sliceString(Math.max(0, from - len), from)
  const after = doc.sliceString(to, Math.min(doc.length, to + len))
  if (before === marker && after === marker) {
    return {
      changes: [
        { from: from - len, to: from, insert: '' },
        { from: to, to: to + len, insert: '' },
      ],
      selection: { anchor: from - len, head: to - len },
    }
  }

  // Caso 3: nao ha marca — envolve.
  const insert = marker + selText + marker
  return {
    changes: { from, to, insert },
    selection: from === to
      ? { anchor: from + len }
      : { anchor: from + len, head: to + len },
  }
}

/** heading / quote / lista com marcador: aplica `prefix` em cada linha da
 * selecao; alterna pra remover se todas ja tiverem EXATAMENTE esse prefixo.
 * `altPrefixes` faz h1<->h2 trocar a marca em vez de acumular (mesma
 * familia do comando). Se a linha tiver o prefixo de um comando de bloco
 * DIFERENTE (lista, checklist, citacao, titulo) ele e SUBSTITUIDO, nunca
 * somado — TASK-359, ver `detectBlockPrefix` no topo do arquivo. */
export function toggleLinePrefix(state: EditorState, prefix: string, altPrefixes: string[]): TransactionSpec {
  const { from, to } = state.selection.main
  const startLine = state.doc.lineAt(from).number
  const endLine = state.doc.lineAt(to).number

  let allHavePrefix = true
  for (let n = startLine; n <= endLine; n++) {
    if (!startsWithOwnPrefix(state.doc.line(n).text, prefix)) {
      allHavePrefix = false
      break
    }
  }

  const changes = []
  for (let n = startLine; n <= endLine; n++) {
    const line = state.doc.line(n)
    if (allHavePrefix) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
      continue
    }
    const ownAlt = altPrefixes.find(p => startsWithOwnPrefix(line.text, p))
    const existing = ownAlt ?? detectBlockPrefix(line.text)
    if (existing) {
      changes.push({ from: line.from, to: line.from + existing.length, insert: prefix })
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
  }
  return { changes }
}

const ORDERED_RE = /^\d+\.\s/

/** lista ordenada: numera cada linha da selecao em sequencia (1., 2., ...);
 * alterna pra remover se todas ja estiverem numeradas. */
export function toggleOrderedList(state: EditorState): TransactionSpec {
  const { from, to } = state.selection.main
  const startLine = state.doc.lineAt(from).number
  const endLine = state.doc.lineAt(to).number

  let allNumbered = true
  for (let n = startLine; n <= endLine; n++) {
    if (!ORDERED_RE.test(state.doc.line(n).text)) {
      allNumbered = false
      break
    }
  }

  const changes = []
  let i = 1
  for (let n = startLine; n <= endLine; n++) {
    const line = state.doc.line(n)
    const match = ORDERED_RE.exec(line.text)
    if (allNumbered) {
      changes.push({ from: line.from, to: line.from + match![0].length, insert: '' })
      continue
    }
    const prefix = `${i}. `
    i++
    if (match) {
      changes.push({ from: line.from, to: line.from + match[0].length, insert: prefix })
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
  }
  return { changes }
}

/** checklist: alterna "- [ ] " no INICIO de cada linha selecionada (TASK-335,
 *  barra de formatacao permanente do editor de card). Mesma familia de
 *  toggleOrderedList acima - trata a linha ja marcada (com "[ ]" ou "[x]")
 *  como "ja tem", removendo pra desfazer; nunca duplica o marcador. Se a
 *  linha for titulo/lista/citacao, o prefixo estranho e SUBSTITUIDO, nunca
 *  somado (TASK-359). */
export function toggleChecklist(state: EditorState): TransactionSpec {
  const { from, to } = state.selection.main
  const startLine = state.doc.lineAt(from).number
  const endLine = state.doc.lineAt(to).number

  let allChecked = true
  for (let n = startLine; n <= endLine; n++) {
    if (!CHECKLIST_RE.test(state.doc.line(n).text)) { allChecked = false; break }
  }

  const changes = []
  for (let n = startLine; n <= endLine; n++) {
    const line = state.doc.line(n)
    if (allChecked) {
      const match = CHECKLIST_RE.exec(line.text)!
      changes.push({ from: line.from, to: line.from + match[0].length, insert: '' })
      continue
    }
    const existing = detectBlockPrefix(line.text)
    if (existing) {
      changes.push({ from: line.from, to: line.from + existing.length, insert: '- [ ] ' })
    } else {
      changes.push({ from: line.from, to: line.from, insert: '- [ ] ' })
    }
  }
  return { changes }
}

/** link / imagem: com selecao, ela vira o label e o placeholder "url" fica
 * selecionado (pronto pra colar o destino). Sem selecao, insere o
 * placeholder de label selecionado (pronto pra digitar por cima). */
export function insertLink(state: EditorState, isImage: boolean): TransactionSpec {
  const { from, to } = state.selection.main
  const bang = isImage ? '!' : ''
  const selText = state.doc.sliceString(from, to)

  if (selText) {
    const insert = `${bang}[${selText}](url)`
    const urlStart = from + bang.length + 1 + selText.length + 2
    return {
      changes: { from, to, insert },
      selection: { anchor: urlStart, head: urlStart + 3 },
    }
  }

  const label = isImage ? 'descrição' : 'texto do link'
  const insert = `${bang}[${label}](url)`
  const labelStart = from + bang.length + 1
  return {
    changes: { from, to, insert },
    selection: { anchor: labelStart, head: labelStart + label.length },
  }
}
