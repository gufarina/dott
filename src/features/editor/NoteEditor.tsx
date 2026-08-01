import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SimpleMDE from 'react-simplemde-editor'
import type EasyMDE from 'easymde'
import 'font-awesome/css/font-awesome.min.css'
import 'easymde/dist/easymde.min.css'
import './easymde-dott.css'
import { useStore } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { ImageViewer } from './ImageViewer'
import { MarkdownView } from './MarkdownView'
import s from './NoteEditor.module.css'

/** Returns the image URL if the body is image-only markdown, otherwise null. */
function parseImageOnly(body: string): string | null {
  const m = body.trim().match(/^!\[[^\]]*\]\(([^)]+)\)$/)
  return m ? m[1] : null
}

const TOOLBAR: EasyMDE.Options['toolbar'] = [
  'bold', 'italic', 'heading-1', 'heading-2', '|',
  'quote', 'unordered-list', 'ordered-list', '|',
  'link', 'image', '|',
  'preview', 'side-by-side', 'fullscreen', '|',
  'guide',
]

export function NoteEditor() {
  const note = useStore(st => st.note)
  const notes = useStore(st => st.notes)
  const saveNote = useStore(st => st.saveNote)
  const deleteNote = useStore(st => st.deleteNote)
  const navigateBack = useStore(st => st.navigateBack)

  const current = notes.find(n => n.id === note)
  const [title, setTitle] = useState(current?.title ?? '')
  const [tagInput, setTagInput] = useState('')
  // Modo: nota com conteudo abre em LEITURA (bonito); nota vazia abre em EDICAO.
  const [mode, setMode] = useState<'read' | 'edit'>(current?.body?.trim() ? 'read' : 'edit')
  const bodyRef = useRef(current?.body ?? '')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setTitle(current?.title ?? '')
    bodyRef.current = current?.body ?? ''
    setMode(current?.body?.trim() ? 'read' : 'edit')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note])

  // Valor inicial estável por nota (evita reset de cursor no autosave)
  const initialBody = useMemo(() => current?.body ?? '', [note])

  const options = useMemo<EasyMDE.Options>(() => ({
    spellChecker: false,
    status: false,
    placeholder: 'Comece a escrever… Use [[ para conectar notas.',
    autofocus: false,
    toolbar: TOOLBAR,
    sideBySideFullscreen: false,
    minHeight: '240px',
  }), [])

  // Realça [[wikilinks]] e trata colar/arrastar imagem
  const onInstance = useCallback((instance: EasyMDE) => {
    const cm = instance.codemirror
    cm.addOverlay({
      token(stream: { match: (re: RegExp, consume?: boolean) => boolean; next: () => string | null }) {
        if (stream.match(/\[\[[^\]]*\]\]/)) return 'wikilink'
        while (stream.next() != null && !stream.match(/\[\[/, false)) { /* avança */ }
        return null
      },
    })

    const handleImage = async (e: ClipboardEvent | DragEvent) => {
      const file = imageFromEvent(e)
      if (!file) return
      e.preventDefault()
      const url = await saveImageFile(file)
      if (url) {
        cm.replaceSelection(`\n![imagem](${url})\n`)
        showToast('info', 'Imagem inserida', 'Salva no seu acervo local.')
      }
    }
    const cmAny = cm as unknown as { on: (ev: string, cb: (...args: unknown[]) => void) => void }
    cmAny.on('paste', (..._a: unknown[]) => { void handleImage(_a[1] as ClipboardEvent) })
    cmAny.on('drop', (..._a: unknown[]) => { void handleImage(_a[1] as DragEvent) })
  }, [])

  const onChange = (val: string) => {
    bodyRef.current = val
    if (!current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNote(current.id, title, val, current.tags)
      showToast('info', 'Salvo', 'Nota atualizada.')
    }, 800)
  }

  const saveTitle = () => {
    if (current && title !== current.title) saveNote(current.id, title, bodyRef.current, current.tags)
  }

  const toggleMode = () => {
    // Saindo da edicao: persiste na hora pro modo leitura refletir o ultimo texto.
    if (mode === 'edit' && current) {
      clearTimeout(saveTimer.current)
      saveNote(current.id, title, bodyRef.current, current.tags)
    }
    setMode(m => (m === 'read' ? 'edit' : 'read'))
  }

  if (!current) {
    return <div className={s.empty}><p>Selecione uma nota para editar</p></div>
  }

  const backlinkNotes = current.backlinks
    .map(id => notes.find(n => n.id === id))
    .filter(Boolean) as typeof notes

  return (
    <>
      <div className={s.header}>
        <input
          className={s.titleInput}
          placeholder="Título da nota..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
        />
        {!parseImageOnly(initialBody) && (
          <button className={s.modeToggle} onClick={toggleMode} title={mode === 'read' ? 'Editar (markdown)' : 'Ler (formatado)'}>
            {mode === 'read' ? '✎ Editar' : '👁 Ler'}
          </button>
        )}
      </div>

      <div className={s.tags}>
        {current.tags.map(t => (
          <span key={t} className={s.tagChip}>#{t}<span className={s.tagRm}>×</span></span>
        ))}
        <input
          className={s.tagInput}
          placeholder="+ tag..."
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
              e.preventDefault()
              saveNote(current.id, title, bodyRef.current, [...current.tags, tagInput.trim().replace('#', '')])
              setTagInput('')
            }
          }}
        />
      </div>

      {parseImageOnly(initialBody) ? (
        <ImageViewer
          noteId={current.id}
          title={title}
          url={parseImageOnly(initialBody)!}
          onSave={saveNote}
        />
      ) : mode === 'read' ? (
        <MarkdownView body={bodyRef.current} onEdit={() => setMode('edit')} />
      ) : (
        <div className={s.editorWrap}>
          <SimpleMDE
            key={note}
            value={initialBody}
            onChange={onChange}
            getMdeInstance={onInstance}
            options={options}
          />
        </div>
      )}

      {backlinkNotes.length > 0 && (
        <div className={s.backlinks}>
          <div className={s.backlinksLabel}>MENCIONADO EM</div>
          <div className={s.backlinksList}>
            {backlinkNotes.map(n => (
              <div key={n.id} className={s.backlinkItem}>
                <span className={s.backlinkIcon}>←</span>{n.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={s.statusBar}>
        <span className={s.saveStatus}>{current.updatedAt && `Salvo ${current.updatedAt}`}</span>
        <span className={s.linkCount}>
          {current.links.length > 0 && `${current.links.length} link${current.links.length > 1 ? 's' : ''}`}
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
    </>
  )
}
