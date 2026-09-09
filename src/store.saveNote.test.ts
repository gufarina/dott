// @vitest-environment jsdom
/** store.saveNote.test.ts — TDD (TASK-360 + TASK-364).
 *
 * TASK-360: `saveNote` deixou de aceitar um array de tags por fora
 * (`tagsOverride`) — Etiqueta NOVA so nasce escrita no CORPO (lib/tags.ts).
 *
 * TASK-364 (CEO: "perda silenciosa de dado do usuario nao passa no meu
 * crivo"): dado ANTIGO (Etiqueta que so existia no campo separado do
 * frontmatter, de antes da TASK-360) nao pode sumir no primeiro salvamento.
 * `saveNote` agora preserva `legacyTags` atraves de qualquer salvamento que
 * nao mexa em Etiqueta, e so deixa convergir pro corpo quando a MESMA
 * etiqueta passa a existir la tambem. `dropLegacyTag` cobre a remocao do
 * lado antigo sem tocar no corpo do usuario. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addTagToBody, removeTagFromBody } from './lib/tags'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

import { invoke } from '@tauri-apps/api/core'
import { useStore } from './store'

const NOTE_ID = 'n1'

describe('saveNote (corpo como fonte unica da Etiqueta NOVA)', () => {
  beforeEach(() => {
    useStore.setState(s => ({
      notes: s.notes.map(n => (n.id === NOTE_ID ? { ...n, body: 'Corpo de teste.', tags: [], legacyTags: [] } : n)),
    }))
  })

  it('etiqueta adicionada pela interface sobrevive a um salvamento seguinte', () => {
    const { saveNote } = useStore.getState()
    const before = useStore.getState().notes.find(n => n.id === NOTE_ID)!

    saveNote(NOTE_ID, before.title, addTagToBody(before.body, 'urgente'))

    // Segundo salvamento normal (autosave depois de continuar digitando) —
    // sem passar tags por fora. Se o bug original voltasse, sumiria aqui.
    const afterFirstSave = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    saveNote(NOTE_ID, afterFirstSave.title, afterFirstSave.body)

    const finalNote = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(finalNote.tags).toEqual(['urgente'])
    expect(finalNote.body).toContain('#urgente')
  })

  it('remover etiqueta pela interface tira a marcacao do corpo', () => {
    const { saveNote } = useStore.getState()
    const before = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    saveNote(NOTE_ID, before.title, addTagToBody(before.body, 'foco'))

    const withTag = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(withTag.tags).toContain('foco')

    saveNote(NOTE_ID, withTag.title, removeTagFromBody(withTag.body, 'foco'))

    const after = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(after.tags).not.toContain('foco')
    expect(after.body).not.toContain('#foco')
  })
})

describe('legacyTags (TASK-364: etiqueta antiga, so no campo separado do frontmatter)', () => {
  beforeEach(() => {
    // Simula uma nota real de ANTES da TASK-360: a Etiqueta so existe no
    // campo separado (legacyTags), nunca escrita como #tag no corpo — o
    // exato formato em que toda nota do beta estava gravada em disco.
    useStore.setState(s => ({
      notes: s.notes.map(n => (n.id === NOTE_ID
        ? { ...n, body: 'Corpo sem nenhuma marcacao.', tags: ['antiga'], legacyTags: ['antiga'] }
        : n)),
    }))
  })

  it('etiqueta antiga sobrevive a um salvamento que nao mexe em Etiqueta nenhuma', () => {
    const { saveNote } = useStore.getState()
    const before = useStore.getState().notes.find(n => n.id === NOTE_ID)!

    // Edicao de titulo, ou autosave do corpo — nenhum dos dois fala de tag.
    saveNote(NOTE_ID, 'Titulo novo', before.body)

    const after = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(after.tags).toContain('antiga')
    expect(after.legacyTags).toContain('antiga')
  })

  it('a mesma etiqueta escrita no corpo por qualquer caminho converge: some do campo separado', () => {
    const { saveNote } = useStore.getState()
    const before = useStore.getState().notes.find(n => n.id === NOTE_ID)!

    saveNote(NOTE_ID, before.title, addTagToBody(before.body, 'antiga'))

    const after = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(after.tags).toEqual(['antiga'])
    expect(after.legacyTags).toEqual([])
    expect(after.body).toContain('#antiga')
  })

  it('dropLegacyTag remove do lado antigo e ela nao volta num salvamento seguinte', () => {
    const { dropLegacyTag, saveNote } = useStore.getState()

    dropLegacyTag(NOTE_ID, 'antiga')
    let after = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(after.tags).not.toContain('antiga')
    expect(after.legacyTags).not.toContain('antiga')

    // Um salvamento comum depois nao ressuscita o que foi removido.
    saveNote(NOTE_ID, after.title, after.body)
    after = useStore.getState().notes.find(n => n.id === NOTE_ID)!
    expect(after.tags).not.toContain('antiga')
  })
})

describe('saveNote devolve Promise da escrita em disco (fechamento duravel)', () => {
  beforeEach(() => {
    useStore.setState(s => ({
      notes: s.notes.map(n => (n.id === NOTE_ID ? { ...n, body: 'Corpo de teste.', tags: [], legacyTags: [] } : n)),
    }))
  })

  it('a Promise de saveNote so resolve depois do invoke de vault_save terminar', async () => {
    let resolveInvoke: () => void = () => {}
    const pendente = new Promise<void>(res => { resolveInvoke = res })
    vi.mocked(invoke).mockReturnValueOnce(pendente as unknown as Promise<unknown>)

    const { saveNote } = useStore.getState()
    const before = useStore.getState().notes.find(n => n.id === NOTE_ID)!

    let resolvido = false
    const salvo = saveNote(NOTE_ID, before.title, before.body + ' mudou').then(() => { resolvido = true })

    // Deixa a fila de microtasks correr - o invoke ainda esta preso (nao
    // resolvemos `pendente`), entao saveNote nao pode ter terminado. Se
    // saveNote voltasse a ser fire-and-forget (void), este assert nao
    // provaria nada porque a Promise nem existiria - e exatamente o que
    // o "fechamento durável" (item 1) existe pra impedir.
    await Promise.resolve()
    await Promise.resolve()
    expect(resolvido).toBe(false)

    resolveInvoke()
    await salvo
    expect(resolvido).toBe(true)
  })
})
