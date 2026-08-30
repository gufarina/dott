import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { EditorView } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useStore } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { addTagToBody, extractTags, reattachTags, removeTagFromBody, withoutTrailingTagLine } from '../../lib/tags'
import { ImageViewer } from './ImageViewer'
import { LiveMarkdownEditor } from './LiveMarkdownEditor'
import { SelectionToolbar } from './SelectionToolbar'
import { SlashMenu } from './SlashMenu'
import { EditorToolbar } from './EditorToolbar'
import { FolderHintChip } from './FolderHintChip'
import { imageBlocks } from './imageBlocks'
import { pendingImageMarkdown, PENDING_PREFIX } from './imageLine'
import { trackSelection, type SelectionInfo } from './selectionTracking'
import { trackSlashLine, type SlashHitWithCoords } from './slashCommands'
import {
  applyFolderHint, dismissFolderHint, INITIAL_HINT_STATE, isFolderHintDismissed,
  pickFolderCandidate, type FolderHintState,
} from './folderHint'
import { Icon } from '../../components/Icon'
import s from './NoteEditor.module.css'

/** Returns the image URL if the body is image-only markdown, otherwise null.
 *  TASK-364: uma linha dedicada de #etiquetas no fim nao tira a nota do modo
 *  imagem - so o corpo (sem essa linha) precisa ser so a imagem. */
export function parseImageOnly(body: string): string | null {
  const m = withoutTrailingTagLine(body).trim().match(/^!\[[^\]]*\]\(([^)]+)\)$/)
  return m ? m[1] : null
}

/** Despacha so o TRECHO que mudou entre o corpo velho e o novo (prefixo e
 *  sufixo em comum ficam de fora do range). TASK-360: adicionar/remover
 *  #etiqueta reescreve o corpo por fora do CodeMirror (lib/tags.ts) — um
 *  `insert` cru no doc inteiro perderia a posicao do cursor do usuario;
 *  isolar so a diferenca deixa o resto da selecao intacta (no-friction). */
/** Handle de flush exposto pra fora do componente (Titlebar/App chamam
 *  antes de fechar a janela). Mesmo padrao de modulo do Toast.tsx
 *  (addToast) - a instancia viva do NoteEditor se registra aqui.
 *  CORRIGIR item 1 (fechamento duravel): devolve Promise que so resolve
 *  depois do disco confirmar - quem fecha a janela agora pode aguardar. */
let flushPendingSave: () => Promise<void> = () => Promise.resolve()

export function flushNoteEditor(): Promise<void> {
  return flushPendingSave()
}

/** CORRIGIR item 2: remove marcador de imagem PENDENTE do corpo. So usado
 *  quando o teto de espera do fechamento estoura com upload ainda em voo -
 *  a regra do .md sagrado (nunca gravar o marcador) vale tambem aqui. */
function stripPendingImageMarkers(body: string): string {
  const re = new RegExp(`!\\[[^\\]]*\\]\\(${PENDING_PREFIX}[^)]*\\)\\n?`, 'g')
  return body.replace(re, '')
}

function applyBodyToView(view: EditorView, newBody: string) {
  const oldBody = view.state.doc.toString()
  if (oldBody === newBody) return
  const max = Math.min(oldBody.length, newBody.length)
  let start = 0
  while (start < max && oldBody[start] === newBody[start]) start++
  let endOld = oldBody.length
  let endNew = newBody.length
  while (endOld > start && endNew > start && oldBody[endOld - 1] === newBody[endNew - 1]) {
    endOld--; endNew--
  }
  view.dispatch({ changes: { from: start, to: endOld, insert: newBody.slice(start, endNew) } })
}

export function NoteEditor() {
  const note = useStore(st => st.note)
  const category = useStore(st => st.category)
  const notes = useStore(st => st.notes)
  const para = useStore(st => st.para)
  const saveNote = useStore(st => st.saveNote)
  const dropLegacyTag = useStore(st => st.dropLegacyTag)
  const moveNote = useStore(st => st.moveNote)
  const deleteNote = useStore(st => st.deleteNote)
  const navigateBack = useStore(st => st.navigateBack)
  const graph = useStore(st => st.graph)
  const setView = useStore(st => st.setView)

  const current = notes.find(n => n.id === note)
  const [title, setTitle] = useState(current?.title ?? '')
  const [tagInput, setTagInput] = useState('')
  // TASK-351 (28/08/2026, CEO: "botao tag sem proposito ali"): sem nenhuma
  // Etiqueta na nota, o campo tracejado comeca ESCONDIDO — vira o convite
  // discreto .tagAdd (texto puro) ate o clique. Some de novo por nota (ver
  // efeito abaixo) e ao perder foco sem ter digitado nada.
  const [addingTag, setAddingTag] = useState(false)
  const [selInfo, setSelInfo] = useState<SelectionInfo | null>(null)
  const [slashState, setSlashState] = useState<SlashHitWithCoords | null>(null)
  const [hintState, setHintState] = useState<FolderHintState>(INITIAL_HINT_STATE)
  const bodyRef = useRef(current?.body ?? '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** Item 3/4: true so enquanto ha autosave AGENDADO (nao gravado ainda). Sem
   *  isto nao da pra distinguir "timer ja disparou" de "timer ainda pendente"
   *  so olhando `saveTimer.current` (o ref fica preenchido pra sempre). */
  const pendingSave = useRef(false)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImagePos = useRef<number | null>(null)
  /** Quantas imagens estao gravando no disco agora (TASK-333 item 5): o
   *  `.md` do usuario e sagrado, nunca pode ser salvo com o marcador
   *  PENDENTE porque `saveImageFile` passou dos 800ms do autosave. */
  const pendingImages = useRef(0)
  /** View viva do CodeMirror, atualizada pelo `onReady` de LiveMarkdownEditor
   *  (TASK-355: ler `editorRef.current?.view` direto no JSX deixava a barra
   *  de formatacao presa em `null` pra sempre - nada garantia um rerender
   *  depois do editor terminar de montar). EditorToolbar/SelectionToolbar/
   *  SlashMenu agora recebem ESTE estado, nunca o ref cru. */
  const [editorView, setEditorView] = useState<EditorView | null>(null)

  useEffect(() => {
    // Item 3: a nota ANTERIOR pode ter autosave pendente (dentro dos 800ms) -
    // o cleanup roda ANTES do reset abaixo, ainda com o `current`/`title`/
    // `bodyRef` da nota que esta saindo. Sem isto, trocar de nota dentro da
    // janela do debounce descartava as ultimas teclas digitadas.
    return () => { flushIfPending() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note])

  useEffect(() => {
    setTitle(current?.title ?? '')
    bodyRef.current = current?.body ?? ''
    setSelInfo(null)
    setSlashState(null)
    setHintState(INITIAL_HINT_STATE)
    setAddingTag(false)
    setEditorView(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note])

  // Valor inicial estável por nota (evita reset de cursor no autosave)
  const initialBody = useMemo(() => current?.body ?? '', [note])

  // Trata colar/arrastar/escolher imagem no editor vivo (CodeMirror 6). Insere
  // um marcador PENDENTE na hora (o bloco de imagem em imageBlocks.ts mostra
  // o shimmer pra ele) e so troca pela URL real quando o anexo terminar de
  // gravar no disco — nunca trava a digitação esperando o disco.
  const insertImage = useCallback(async (view: EditorView, file: File, pos: number) => {
    const token = Math.random().toString(36).slice(2, 10)
    const placeholder = pendingImageMarkdown(token)
    view.dispatch({ changes: { from: pos, to: pos, insert: `\n${placeholder}\n` } })
    pendingImages.current++
    try {
      const url = await saveImageFile(file)
      // Acha a linha pendente pelo token: se a pessoa editou por cima dela
      // enquanto o anexo salvava, mais seguro desistir do que inserir as cegas.
      const doc = view.state.doc.toString()
      const idx = doc.indexOf(placeholder)
      if (idx === -1) {
        if (!url) showToast('warn', 'Erro', 'Não foi possível salvar a imagem.')
        return
      }
      if (url) {
        view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: `![imagem](${url})` } })
        showToast('info', 'Imagem inserida', 'Salva no seu acervo local.')
      } else {
        view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: '' } })
        showToast('warn', 'Erro', 'Não foi possível salvar a imagem.')
      }
    } finally {
      // So decrementa depois da troca acima: enquanto isto ainda for > 0,
      // o autosave (onChange) e o save do titulo seguram a escrita no disco
      // em vez de gravar o marcador PENDENTE (TASK-333 item 5).
      pendingImages.current--
    }
  }, [])

  /** So roda `run` quando nenhuma imagem estiver em voo; senao tenta de novo
   *  logo depois. O `.md` do usuario e sagrado — nunca grava o marcador
   *  PENDENTE por o autosave (800ms) ter vencido antes do disco. */
  const whenNoImageInFlight = useCallback((run: () => void) => {
    if (pendingImages.current > 0) { setTimeout(() => whenNoImageInFlight(run), 150); return }
    run()
  }, [])

  /** Item 3 (troca de nota) e item 4 (fechar a janela, via flushNoteEditor):
   *  so grava se havia autosave AGENDADO, e passa pelo MESMO guard de imagem
   *  em voo do autosave normal - nunca grava o .md com o marcador PENDENTE. */
  const flushIfPending = () => {
    if (!pendingSave.current || !current) return
    clearTimeout(saveTimer.current)
    pendingSave.current = false
    whenNoImageInFlight(() => saveNote(current.id, title, bodyRef.current))
  }

  /** CORRIGIR item 2: teto de espera por imagem em voo no caminho de
   *  FECHAMENTO - nunca trava o app pra sempre por causa de um anexo preso.
   *  Estourou o teto, tira o marcador PENDENTE do corpo e salva assim
   *  mesmo (a regra do .md sagrado continua valendo: o marcador nunca
   *  chega ao disco, so que aqui a espera desiste em vez de repetir pra
   *  sempre como o whenNoImageInFlight normal). */
  const TETO_ESPERA_IMAGEM_MS = 2000
  const flushForClose = async (): Promise<void> => {
    if (!current) return
    if (!pendingSave.current && pendingImages.current === 0) return
    clearTimeout(saveTimer.current)
    pendingSave.current = false
    const inicio = Date.now()
    while (pendingImages.current > 0 && Date.now() - inicio < TETO_ESPERA_IMAGEM_MS) {
      await new Promise(r => setTimeout(r, 150))
    }
    const corpo = pendingImages.current > 0 ? stripPendingImageMarkers(bodyRef.current) : bodyRef.current
    await saveNote(current.id, title, corpo)
  }

  // Mantem o handle de modulo (flushNoteEditor) sempre com o fechamento mais
  // recente; some quando o NoteEditor desmonta (view sai do editor).
  useEffect(() => {
    flushPendingSave = flushForClose
    return () => { flushPendingSave = () => Promise.resolve() }
  })

  const imagePasteDrop = useMemo(() => EditorView.domEventHandlers({
    paste(event, view) {
      const file = imageFromEvent(event)
      if (!file) return false
      event.preventDefault()
      void insertImage(view, file, view.state.selection.main.from)
      return true
    },
    drop(event, view) {
      const file = imageFromEvent(event)
      if (!file) return false
      event.preventDefault()
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.from
      void insertImage(view, file, pos)
      return true
    },
  }), [insertImage])

  // Barra por selecao (item 2) e menu de "/" (item 2): cada um so um
  // extension que devolve dado pro React — quem desenha e decide e o
  // componente, o CodeMirror so avisa.
  const selectionTracker = useMemo(() => trackSelection(setSelInfo), [])
  const slashTracker = useMemo(() => trackSlashLine(setSlashState), [])
  const extraExtensions = useMemo(
    () => [imagePasteDrop, imageBlocks, selectionTracker, slashTracker],
    [imagePasteDrop, selectionTracker, slashTracker],
  )

  // Ajudante de pasta (item 4): so recalcula depois do silencio — a MESMA
  // janela do autosave, 800ms (regra 2 da proposta). Reusa suggestFolder
  // (lib/interpret.ts), o mesmo motor que ja sugere pasta no Inbox.
  const scheduleHintRecalc = (liveTitle: string, liveBody: string) => {
    if (!current) return
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => {
      const candidate = isFolderHintDismissed(current.id)
        ? null
        : pickFolderCandidate(liveTitle, liveBody, current, para, notes)
      setHintState(st => applyFolderHint(st, candidate))
    }, 800)
  }

  useEffect(() => {
    scheduleHintRecalc(title, bodyRef.current)
    return () => clearTimeout(hintTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, title])

  const onChange = (val: string) => {
    bodyRef.current = val
    if (!current) return
    clearTimeout(saveTimer.current)
    pendingSave.current = true
    saveTimer.current = setTimeout(() => {
      whenNoImageInFlight(() => {
        saveNote(current.id, title, val)
        pendingSave.current = false
        showToast('info', 'Salvo', 'Nota atualizada.')
      })
    }, 800)
    scheduleHintRecalc(title, val)
  }

  const saveTitle = () => {
    if (current && title !== current.title) {
      whenNoImageInFlight(() => saveNote(current.id, title, bodyRef.current))
    }
  }

  /** Etiqueta vive no CORPO (TASK-360, lib/tags.ts): reescreve o corpo,
   *  reflete no editor vivo sem mover o cursor (applyBodyToView) e salva
   *  sem override — tags nascem de volta de extractTags(body) no store. */
  const applyTagChange = (transform: (body: string) => string) => {
    if (!current) return
    const newBody = transform(bodyRef.current)
    if (newBody === bodyRef.current) return
    const view = editorRef.current?.view
    if (view) applyBodyToView(view, newBody)
    bodyRef.current = newBody
    whenNoImageInFlight(() => saveNote(current.id, title, newBody))
  }

  /** Remover pela interface cobre os DOIS lados (TASK-364): etiqueta que
   *  esta no corpo sai por applyTagChange; etiqueta que so existe no campo
   *  antigo do frontmatter (legacyTags) sai por dropLegacyTag - se estiver
   *  nos dois ao mesmo tempo, os dois rodam, senao ela voltaria de um lado
   *  no proximo carregamento. */
  const removeTag = (tag: string) => {
    if (!current) return
    if (extractTags(current.body).includes(tag)) applyTagChange(body => removeTagFromBody(body, tag))
    if (current.legacyTags?.includes(tag)) dropLegacyTag(current.id, tag)
  }

  // "Mover" (regra: aceita com desfazer) e "Agora não" (regra: silencia so
  // NESTA nota, so nesta sessao — nunca trava a nota escolhida na mao).
  // moveNote so troca o folderId da Nota; category/folder de NAVEGACAO
  // (o que "Voltar" usa) so em sincronia se a gente tambem chamar setView
  // aqui - senao Voltar levava pra pasta ANTIGA (TASK-333 item 3).
  const acceptHint = () => {
    if (!current || !hintState.shown) return
    const suggestion = hintState.shown
    const fromFolderId = current.folderId
    const fromCategoryId = category
    moveNote(current.id, suggestion.folderId)
    setView('editor', { category: suggestion.categoryId, folder: suggestion.folderId, note: current.id })
    setHintState(INITIAL_HINT_STATE)
    showToast(
      'info', 'Nota movida', `Agora mora em ${suggestion.folderName}.`,
      fromFolderId ? { label: 'Desfazer', onClick: () => {
        moveNote(current.id, fromFolderId)
        if (fromCategoryId) setView('editor', { category: fromCategoryId, folder: fromFolderId, note: current.id })
      } } : undefined,
    )
  }

  const dismissHint = () => {
    if (!current) return
    dismissFolderHint(current.id)
    setHintState(INITIAL_HINT_STATE)
  }

  // "Imagem" no menu de "/": abre o seletor de arquivo na posicao onde a
  // linha "/" ficava, e reusa o MESMO caminho de anexo do paste/drop.
  const onPickImage = (pos: number) => {
    pendingImagePos.current = pos
    fileInputRef.current?.click()
  }

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const view = editorRef.current?.view
    const pos = pendingImagePos.current
    pendingImagePos.current = null
    if (file && view && pos !== null) void insertImage(view, file, pos)
  }

  if (!current) {
    return <div className={s.empty}><p>Selecione uma nota para editar</p></div>
  }

  // Conexoes vem do motor, com o motivo de cada uma.
  const conexoes = (graph.byNote[current.id] ?? [])
    .map(v => ({ ...v, note: notes.find(n => n.id === v.id) }))
    .filter(v => v.note)

  return (
    <div className={s.wrap} ref={wrapRef}>
      <div className={s.header}>
        <input
          className={s.titleInput}
          placeholder="Título da nota..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
        />
      </div>

      <div className={s.tags}>
        {current.tags.map(t => (
          <span key={t} className={s.tagChip}>
            #{t}
            <span
              className={s.tagRm}
              onClick={() => removeTag(t)}
            >
              <Icon name="fechar" size={10} />
            </span>
          </span>
        ))}
        {current.tags.length === 0 && !addingTag ? (
          <button type="button" className={s.tagAdd} onClick={() => setAddingTag(true)}>
            + etiqueta
          </button>
        ) : (
          <input
            className={s.tagInput}
            autoFocus={addingTag}
            placeholder="etiqueta..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onBlur={() => { if (!tagInput.trim()) setAddingTag(false) }}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                e.preventDefault()
                applyTagChange(body => addTagToBody(body, tagInput))
                setTagInput('')
              }
              if (e.key === 'Escape') { setTagInput(''); setAddingTag(false); e.currentTarget.blur() }
            }}
          />
        )}
      </div>

      {hintState.shown && (
        <div className={s.hintRow}>
          <FolderHintChip suggestion={hintState.shown} onAccept={acceptHint} onDismiss={dismissHint} />
        </div>
      )}

      {parseImageOnly(initialBody) ? (
        <ImageViewer
          noteId={current.id}
          title={title}
          url={parseImageOnly(initialBody)!}
          // TASK-364: reanotar a imagem troca o corpo inteiro pela imagem
          // nova - sem isto, a linha de #etiquetas do corpo velho sumia.
          onSave={(id, t, newBody) => saveNote(id, t, reattachTags(bodyRef.current, newBody))}
        />
      ) : (
        <div className={s.editorWrap}>
          {/* Barra de formatacao - mesma peca do modal do Inbox (TASK-338:
              antes so existia LA, a tela da nota abria sem nenhuma). */}
          <EditorToolbar view={editorView} onPickImage={onPickImage} className={s.toolbar} />
          <LiveMarkdownEditor
            key={note}
            ref={editorRef}
            value={initialBody}
            onChange={onChange}
            onReady={setEditorView}
            placeholder="Comece a escrever. O Dott conecta as notas sozinho."
            extraExtensions={extraExtensions}
          />
          <SelectionToolbar view={editorView} info={selInfo} containerRef={wrapRef} />
          <SlashMenu
            view={editorView}
            state={slashState}
            onClose={() => setSlashState(null)}
            onPickImage={onPickImage}
            containerRef={wrapRef}
          />
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChosen} />
        </div>
      )}

      {conexoes.length > 0 && (
        <div className={s.connections}>
          <span className={s.connLabel}>Conectadas</span>
          <div className={s.connChips}>
            {conexoes.map(v => (
              <button
                key={v.id}
                type="button"
                className={s.chip}
                title={`${v.confidence === 'ACHADA' ? 'Achada' : 'Inferida'} — ${v.why}`}
                onClick={() => setView('editor', { note: v.id })}
              >
                <span
                  className={`${s.chipDot} ${v.confidence === 'ACHADA' ? s.achada : ''}`}
                  aria-hidden="true"
                />
                <span className={s.chipTitle}>{v.note!.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={s.statusBar}>
        <span className={s.saveStatus}>{current.updatedAt && `Salvo ${current.updatedAt}`}</span>
        <span className={s.linkCount}>
          {conexoes.length > 0 && `${conexoes.length} ${conexoes.length > 1 ? 'conexões' : 'conexão'}`}
        </span>
        <button
          className={s.btnDelete}
          onClick={() => {
            deleteNote(current.id)
            showToast('info', 'Nota excluída', `"${current.title}" removida.`)
            navigateBack()
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  )
}
