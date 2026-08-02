import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useStore, CardType } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { detectType } from '../../lib/detectType'
import { suggestTask, suggestFolder } from '../../lib/interpret'
import { Icon } from '../../components/Icon'
import s from './InboxPanel.module.css'

function DraggableCard({ id, onClick, children }: { id: string; onClick: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card:${id}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${s.card} ${isDragging ? s.cardDragging : ''}`}
      onClick={onClick}
      title="Arraste para uma pasta — ou clique para escolher"
    >
      {children}
    </div>
  )
}

/** Tempo relativo curto a partir do epoch ms. Cai no fallback se não houver ts. */
function relTime(ts: number | undefined, fallback: string): string {
  if (!ts) return fallback
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return 'agora'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const TYPE_CLASS: Record<CardType, string> = {
  NOTA: 'nota', CODIGO: 'codigo', SHELL: 'shell', URL: 'url', IDEIA: 'ideia',
  AUDIO: 'audio', VIDEO: 'video', IMAGEM: 'imagem', ARQUIVO: 'arquivo', LINK: 'link',
  PROMPT: 'prompt', TAREFA: 'tarefa', CONTATO: 'contato',
}

const TYPE_ICONS: Record<CardType, string> = {
  NOTA:    '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M0 0h9l3 12H3z" fill="currentColor"/></svg>',
  CODIGO:  '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 0l5.2 3v6L6 12 .8 9V3z" fill="currentColor"/></svg>',
  SHELL:   '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M1 0l10 6-10 6z" fill="currentColor"/></svg>',
  URL:     '<svg width="11" height="11" viewBox="0 0 12 12"><circle cx="4" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="6" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  IDEIA:   '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 0l1.5 4.5H12L8.3 7.3l1.5 4.5L6 9.2 2.2 11.8l1.5-4.5L0 4.5h4.5z" fill="currentColor"/></svg>',
  AUDIO:   '<svg width="11" height="11" viewBox="0 0 12 12"><rect x="1" y="5" width="2.5" height="6" rx=".5" fill="currentColor"/><rect x="4.8" y="1" width="2.5" height="10" rx=".5" fill="currentColor"/><rect x="8.5" y="3" width="2.5" height="8" rx=".5" fill="currentColor"/></svg>',
  VIDEO:   '<svg width="11" height="11" viewBox="0 0 12 12"><rect x=".5" y=".5" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 3.5l5 2.5-5 2.5z" fill="currentColor"/></svg>',
  IMAGEM:  '<svg width="11" height="11" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="6" r="2" fill="currentColor"/></svg>',
  ARQUIVO: '<svg width="11" height="11" viewBox="0 0 12 12"><rect x="2" y="4.5" width="10" height="7" rx="1" fill="currentColor" opacity=".38"/><rect x="1" y="3" width="10" height="7" rx="1" fill="currentColor" opacity=".65"/><rect x="0" y="1.5" width="10" height="7" rx="1" fill="currentColor"/></svg>',
  LINK:    '<svg width="11" height="11" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="4" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
  PROMPT:  '<svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 0l1.3 4.7 4.7 1.3-4.7 1.3L6 12l-1.3-4.7L0 6l4.7-1.3z" fill="currentColor"/></svg>',
  TAREFA:  '<svg width="11" height="11" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 6l2 2 3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  CONTATO: '<svg width="11" height="11" viewBox="0 0 12 12"><circle cx="6" cy="4" r="2.5" fill="currentColor"/><path d="M1 10c0-2.5 2.2-4 5-4s5 1.5 5 4" fill="currentColor"/></svg>',
}

export function InboxPanel() {
  const inbox = useStore(st => st.inbox)
  const tags = useStore(st => st.tags)
  const leftTab = useStore(st => st.leftTab)
  const para = useStore(st => st.para)
  const setLeftTab = useStore(st => st.setLeftTab)
  const captureCard = useStore(st => st.captureCard)
  const processCard = useStore(st => st.processCard)
  const removeCard = useStore(st => st.removeCard)
  const setView = useStore(st => st.setView)

  const notes = useStore(st => st.notes)
  const tasks = useStore(st => st.tasks)
  const addTask = useStore(st => st.addTask)

  const [text, setText] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState('')
  /** Card que esta virando tarefa + o texto sugerido (editavel antes de criar). */
  const [virandoTarefa, setVirandoTarefa] = useState<{ cardId: string; texto: string } | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const isFull = inbox.length >= 10
  const detection = text.trim() ? detectType(text) : null

  const capture = () => {
    if (isFull) return
    const val = text.trim()
    if (!val) return
    captureCard(val)
    setText('')
    showToast('info', 'Card capturado', 'Movido para o inbox.')
  }

  const doProcess = (cardId: string, categoryId: string, folderId: string) => {
    const noteId = processCard(cardId, folderId)
    setProcessing(null)
    if (noteId) {
      showToast('info', 'Processado', 'Card virou nota na pasta.')
      setView('editor', { category: categoryId, folder: folderId, note: noteId })
    } else {
      showToast('warn', 'Nao consegui processar', 'O card nao foi encontrado no inbox.')
    }
  }

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()))

  /** Abre a sugestao de tarefa (verbo + objeto + contexto) pro card. */
  const abrirTarefa = (cardId: string) => {
    const card = inbox.find(c => c.id === cardId)
    if (!card) return
    setVirandoTarefa({ cardId, texto: suggestTask(card.content, card.type).text })
  }

  /** Cria a tarefa no primeiro grupo (ou num grupo novo se nao houver nenhum). */
  const confirmarTarefa = () => {
    if (!virandoTarefa) return
    const texto = virandoTarefa.texto.trim()
    if (!texto) return
    let grupoId = tasks[0]?.id
    if (!grupoId) {
      useStore.getState().addGroup('Do inbox')
      grupoId = useStore.getState().tasks[0]?.id
    }
    if (!grupoId) return
    addTask(grupoId, texto)
    removeCard(virandoTarefa.cardId)
    setVirandoTarefa(null)
    showToast('info', 'Virou tarefa', 'Card saiu do inbox e entrou na lista.')
  }

  return (
    <>
      <div className={s.tabs}>
        <button className={`${s.tab} ${leftTab === 'inbox' ? s.active : ''}`} onClick={() => setLeftTab('inbox')}>
          <Icon name="inbox" size={13} /> INBOX <span className={s.badge}>{inbox.length}</span>
        </button>
        <button className={`${s.tab} ${leftTab === 'tags' ? s.active : ''}`} onClick={() => setLeftTab('tags')}>
          <Icon name="tag" size={13} /> TAGS <span className={s.badge}>{tags.length}</span>
        </button>
      </div>

      {leftTab === 'inbox' && (
        <div className={s.inboxContent}>
          <div className={s.capture}>
            {/* Linha meta: chip de tipo em tempo real + contador */}
            <div className={s.captureMeta}>
              {detection ? (
                <span className={`${s.captureChip} ${s['type-' + TYPE_CLASS[detection.type as CardType]]}`}>
                  {detection.label}
                </span>
              ) : (
                <span className={s.captureChipNeutral}>Nota</span>
              )}
              <span className={`${s.captureCounter} ${isFull ? s.captureCounterFull : ''}`}>
                {inbox.length}/10
              </span>
            </div>
            <div className={s.captureRow}>
              <textarea
                ref={taRef}
                className={s.captureInput}
                placeholder="Pensamento, link, código… (cole imagem também)"
                rows={1}
                value={text}
                disabled={isFull}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); capture() } }}
                onPaste={async e => {
                  const file = imageFromEvent(e.nativeEvent)
                  if (!file) return
                  e.preventDefault()
                  const url = await saveImageFile(file)
                  if (url) { captureCard(url); showToast('info', 'Imagem capturada', 'No inbox como acervo visual.') }
                }}
              />
              <button
                className={`${s.btnCapture} ${isFull ? s.btnCaptureFull : ''}`}
                onClick={capture}
                disabled={isFull}
                title={isFull ? 'Inbox cheio — processe alguns cards primeiro' : undefined}
              >
                {isFull ? 'Cheio' : <Icon name="enviar" size={15} />}
              </button>
            </div>
          </div>
          <div className={s.list}>
            {inbox.length === 0 ? (
              <div className={s.empty}>
                <div className={s.pulseRing} />
                <p>Sua mente está limpa</p>
              </div>
            ) : inbox.map(c => (
              <DraggableCard key={c.id} id={c.id} onClick={() => setProcessing(c.id)}>
                <div className={s.cardHeader}>
                  <span
                    className={`${s.cardType} ${s['type-' + TYPE_CLASS[c.type]]}`}
                    dangerouslySetInnerHTML={{ __html: (TYPE_ICONS[c.type] || '') + c.type }}
                  />
                  <span className={s.cardTime}>{relTime(c.ts, c.time)}</span>
                  <button
                    className={s.cardAction}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); abrirTarefa(c.id) }}
                    title="Virar tarefa"
                    aria-label="Virar tarefa"
                  ><Icon name="tarefa" size={12} /></button>
                  <button
                    className={s.cardRemove}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); removeCard(c.id, true) }}
                    title="Descartar"
                    aria-label="Descartar"
                  ><Icon name="fechar" size={12} /></button>
                </div>
                {c.type === 'IMAGEM'
                  ? <img className={s.cardImage} src={c.content} alt="imagem capturada" draggable={false} />
                  : <div className={s.cardContent}>{c.content}</div>}
              </DraggableCard>
            ))}
          </div>
        </div>
      )}

      {leftTab === 'tags' && (
        <div className={s.tagsContent}>
          <div className={s.tagSearch}>
            <input
              placeholder="Filtrar tags..."
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
            />
          </div>
          {filteredTags.map(t => (
            <div key={t.name} className={s.tagItem}>
              <span className={s.tagDot} style={{ background: t.color }} />
              <span className={s.tagName}>#{t.name}</span>
              <span className={s.tagCount}>{t.count}</span>
            </div>
          ))}
        </div>
      )}

      {processing && (() => {
        const card = inbox.find(c => c.id === processing)
        const sugestao = card ? suggestFolder(card.content, card.type, para, notes) : null
        return (
          <div className={s.overlay} onClick={e => e.target === e.currentTarget && setProcessing(null)}>
            <div className={s.processModal}>
              <div className={s.processHeader}>
                <span>Processar para…</span>
                <button className={s.processClose} onClick={() => setProcessing(null)} title="Fechar">
                  <Icon name="fechar" size={13} />
                </button>
              </div>

              {/* Palpite do motor local — destacado, mas so um palpite. */}
              {sugestao && (
                <button
                  className={s.sugestaoPasta}
                  onClick={() => doProcess(processing, sugestao.categoryId, sugestao.folderId)}
                >
                  <span className={s.sugestaoIcone}><Icon name="sugestao" size={14} /></span>
                  <span className={s.sugestaoTexto}>
                    <span className={s.sugestaoTitulo}>{sugestao.folderName}</span>
                    <span className={s.sugestaoMotivo}>{sugestao.categoryLabel} · {sugestao.reason}</span>
                  </span>
                  <span className={s.sugestaoTag}>sugerida</span>
                </button>
              )}

              <div className={s.processBody}>
                {Object.keys(para).map(qid => (
                  <div key={qid} className={s.processGroup}>
                    <div className={s.processGroupLabel}>{para[qid].label}</div>
                    {para[qid].folders.map(f => (
                      <button
                        key={f.id}
                        className={s.processFolder}
                        onClick={() => doProcess(processing, qid, f.id)}
                      >
                        <Icon name="pasta" size={13} />
                        {f.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {virandoTarefa && (
        <div className={s.overlay} onClick={e => e.target === e.currentTarget && setVirandoTarefa(null)}>
          <div className={s.taskModal}>
            <div className={s.processHeader}>
              <span>Virar tarefa</span>
              <button className={s.processClose} onClick={() => setVirandoTarefa(null)} title="Fechar">
                <Icon name="fechar" size={13} />
              </button>
            </div>
            <p className={s.taskHint}>
              Li o card e montei a tarefa. Ajuste como quiser antes de criar.
            </p>
            <div className={s.taskField}>
              <Icon name="tarefa" size={14} className={s.taskFieldIcon} />
              <input
                className={s.taskInput}
                value={virandoTarefa.texto}
                autoFocus
                onChange={e => setVirandoTarefa({ ...virandoTarefa, texto: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmarTarefa()
                  if (e.key === 'Escape') setVirandoTarefa(null)
                }}
              />
            </div>
            <div className={s.taskFooter}>
              <button className={s.taskCancel} onClick={() => setVirandoTarefa(null)}>Cancelar</button>
              <button className={s.taskOk} onClick={confirmarTarefa}>
                <Icon name="tarefa" size={13} /> Criar tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
