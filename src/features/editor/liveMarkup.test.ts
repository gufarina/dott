// @vitest-environment jsdom
/** liveMarkup.test.ts — TDD (TASK-359, CEO no editor de nota: "o item
 * checklist esta estranho, nao parece checklist nada, ta feio e mal
 * feito"). Roda contra uma EditorView de verdade (jsdom), mesmo padrao de
 * EditorToolbar.test.tsx - prova os DOIS defeitos da captura do CEO:
 *   1) a marca `- [ ] ` aparecia CRUA (contrato do editor e "sem marcacao
 *      visivel", TASK-311) - aqui provamos que virou caixa clicavel.
 *   2) clicar na caixa marca/desmarca o item direto no documento, sem o
 *      usuario precisar editar a marcacao a mao. */
import { afterEach, describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { liveMarkdown } from './liveMarkup'

function makeView(doc: string): EditorView {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  return new EditorView({ state: EditorState.create({ doc, extensions: [liveMarkdown] }), parent })
}

function clickCheckbox(view: EditorView) {
  const checkbox = view.dom.querySelector('.cm-livemd-checkbox') as HTMLButtonElement
  checkbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('checklist no editor vivo (TASK-359)', () => {
  let view: EditorView

  afterEach(() => {
    view.destroy()
  })

  it('linha "- [ ] texto" vira caixa clicavel, sem marcacao crua na tela', () => {
    view = makeView('- [ ] lavar louça')
    const checkbox = view.dom.querySelector('.cm-livemd-checkbox') as HTMLButtonElement
    expect(checkbox).not.toBeNull()
    expect(checkbox.classList.contains('cm-livemd-checkbox-done')).toBe(false)
    expect(view.dom.textContent).not.toContain('[ ]')
    expect(view.dom.textContent).not.toContain('- [')
  })

  it('linha "- [x] texto" vira caixa marcada e risca o texto', () => {
    view = makeView('- [x] lavar louça')
    const checkbox = view.dom.querySelector('.cm-livemd-checkbox') as HTMLButtonElement
    expect(checkbox.classList.contains('cm-livemd-checkbox-done')).toBe(true)
    const struck = view.dom.querySelector('.cm-livemd-checklist-strike')
    expect(struck?.textContent).toBe('lavar louça')
  })

  it('clicar na caixa desmarcada MARCA o item ("- [ ] " vira "- [x] " no documento)', () => {
    view = makeView('- [ ] lavar louça')
    clickCheckbox(view)
    expect(view.state.doc.toString()).toBe('- [x] lavar louça')
  })

  it('clicar na caixa marcada DESMARCA o item ("- [x] " volta a "- [ ] " no documento)', () => {
    view = makeView('- [x] lavar louça')
    clickCheckbox(view)
    expect(view.state.doc.toString()).toBe('- [ ] lavar louça')
  })
})
