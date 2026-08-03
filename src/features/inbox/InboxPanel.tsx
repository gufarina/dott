import { useEffect, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useStore, CardType } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { detectType } from '../../lib/detectType'
import { suggestTask, suggestFolder } from '../../lib/interpret'
import { Icon } from '../../components/Icon'
import { ModalPortal } from '../../components/ModalPortal'
import { CardTypeIcon } from '../../components/CardTypeIcon'
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

/** Tipos que sao "maquina": endereco, comando, codigo. Nao quebram como prosa
 *  e ficam mais legiveis em monoespacada. */
const TECNICO = new Set<CardType>(['URL', 'LINK', 'CODIGO', 'SHELL'])

const TYPE_CLASS: Record<CardType, string> = {
  NOTA: 'nota', CODIGO: 'codigo', SHELL: 'shell', URL: 'url', IDEIA: 'ideia',
  AUDIO: 'audio', VIDEO: 'video', IMAGEM: 'imagem', ARQUIVO: 'arquivo', LINK: 'link',
  PROMPT: 'prompt', TAREFA: 'tarefa', CONTATO: 'contato',
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
  const [capturaAtiva, setCapturaAtiva] = useState(false)
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const isFull = inbox.length >= 10
  const detection = text.trim() ? detectType(text) : null

  /** Onde isso costuma morar — palpite do motor local, ANTES de capturar.
   *  So aparece com texto que da pra ler (abaixo disso o palpite e chute). */
  const palpiteDestino = text.trim().length >= 12 && detection
    ? suggestFolder(text, detection.type as CardType, para, notes)
    : null

  /** A caixa cresce com o texto — o `height: 38px` fixo cortava ate o
   *  placeholder (medido: precisava de 77px e tinha 38). Teto de 7 linhas
   *  pra captura nao virar editor. */
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [text])

  /** Todo caminho de imagem (botao, arrastar, colar) cai aqui. */
  const capturarImagem = async (file: File) => {
    if (isFull) { showToast('warn', 'Inbox cheio (10/10)', 'Processe alguns cards antes.'); return }
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Nao consegui salvar a imagem.'); return }
    captureCard(url)
    showToast('info', 'Imagem capturada', 'No inbox como acervo visual.')
  }

  const aoSoltarArquivo = async (e: React.DragEvent) => {
    setArrastandoArquivo(false)
    const file = [...(e.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    await capturarImagem(file)
  }

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
          {/* ── Area de captura ──────────────────────────────────────────
              A caixa CRESCE com o texto (antes tinha 38px fixos e cortava ate
              o placeholder). Aceita texto, imagem do disco, arquivo arrastado
              e imagem colada — os quatro caminhos entram no mesmo lugar. */}
          <div
            className={`${s.capture} ${arrastandoArquivo ? s.captureSoltando : ''}`}
            onDragOver={e => { e.preventDefault(); if (!isFull) setArrastandoArquivo(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastandoArquivo(false) }}
            onDrop={aoSoltarArquivo}
          >
            <div className={s.captureMeta}>
              {detection ? (
                <span className={`${s.captureChip} ${s['type-' + TYPE_CLASS[detection.type as CardType]]}`}>
                  <CardTypeIcon type={detection.type as CardType} size={10} />
                  {detection.label}
                </span>
              ) : (
                <span className={s.captureChipNeutral}>Nota</span>
              )}
              <span className={`${s.captureCounter} ${isFull ? s.captureCounterFull : ''}`}>
                {inbox.length}/10
              </span>
            </div>

            <div className={s.captureCaixa}>
              <textarea
                ref={taRef}
                className={s.captureInput}
                placeholder={isFull ? 'Inbox cheio — processe alguns cards' : 'O que está na sua mente?'}
                rows={1}
                value={text}
                disabled={isFull}
                onChange={e => setText(e.target.value)}
                onFocus={() => setCapturaAtiva(true)}
                onBlur={() => setCapturaAtiva(false)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); capture() } }}
                onPaste={async e => {
                  const file = imageFromEvent(e.nativeEvent)
                  if (!file) return
                  e.preventDefault()
                  const url = await saveImageFile(file)
                  if (url) { captureCard(url); showToast('info', 'Imagem capturada', 'No inbox como acervo visual.') }
                }}
              />

              {/* Rodape da caixa: acoes a esquerda, enviar a direita */}
              <div className={s.captureAcoes}>
                <button
                  className={s.captureIconBtn}
                  onClick={() => imgRef.current?.click()}
                  disabled={isFull}
                  title="Imagem do computador"
                  aria-label="Inserir imagem do computador"
                >
                  <Icon name="imagem" size={14} />
                </button>

                {/* A dica so aparece com a caixa em uso — nao polui o repouso. */}
                <span className={`${s.captureDica} ${capturaAtiva && text ? s.captureDicaVisivel : ''}`}>
                  Enter envia · Shift+Enter quebra linha
                </span>

                <button
                  className={`${s.btnCapture} ${isFull ? s.btnCaptureFull : ''}`}
                  onClick={capture}
                  disabled={isFull || !text.trim()}
                  title={isFull ? 'Inbox cheio — processe alguns cards primeiro' : 'Capturar (Enter)'}
                >
                  {isFull ? 'Cheio' : <Icon name="enviar" size={15} />}
                </button>
              </div>
            </div>

            {/* Palpite de destino ANTES de capturar: o motor ja sabe ler o texto,
                entao ele adianta onde isso costuma morar. So palpite, sem acao. */}
            {palpiteDestino && (
              <div className={s.capturePalpite}>
                <Icon name="sugestao" size={12} />
                <span>
                  costuma virar nota em <b>{palpiteDestino.folderName}</b>
                  <span className={s.capturePalpiteQuad}> · {palpiteDestino.categoryLabel}</span>
                </span>
              </div>
            )}

            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) await capturarImagem(file)
              }}
            />

            {arrastandoArquivo && (
              <div className={s.captureSolte}>
                <Icon name="imagem" size={16} /> Solte a imagem aqui
              </div>
            )}
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
                  <span className={`${s.cardType} ${s['type-' + TYPE_CLASS[c.type]]}`}>
                    <CardTypeIcon type={c.type} />{c.type}
                  </span>
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
                  : <div className={`${s.cardContent} ${TECNICO.has(c.type) ? s.cardContentTecnico : ''}`}>{c.content}</div>}
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
          <ModalPortal>
          <div className={s.overlay} onClick={e => e.target === e.currentTarget && setProcessing(null)}>
            <div className={s.processModal}>
              <div className={s.processHeader}>
                <span>O que fazer com este card</span>
                <button className={s.processClose} onClick={() => setProcessing(null)} title="Fechar">
                  <Icon name="fechar" size={13} />
                </button>
              </div>

              {/* Mostra O QUE voce esta processando — antes o modal abria sem contexto. */}
              {card && (
                <div className={s.previewCard}>
                  <span className={`${s.previewTipo} ${s['type-' + TYPE_CLASS[card.type]]}`}>{card.type}</span>
                  <span className={s.previewTexto}>
                    {card.type === 'IMAGEM' ? 'Imagem capturada' : card.content}
                  </span>
                </div>
              )}

              <div className={s.processBody}>
                {/* 1. O palpite do motor: um clique resolve o caso comum. */}
                {sugestao && (
                  <>
                    <div className={s.processGroupLabel}>Sugestão</div>
                    <button
                      className={s.sugestaoPasta}
                      onClick={() => doProcess(processing, sugestao.categoryId, sugestao.folderId)}
                    >
                      <span className={s.sugestaoIcone}><Icon name="sugestao" size={14} /></span>
                      <span className={s.sugestaoTexto}>
                        <span className={s.sugestaoTitulo}>Virar nota em {sugestao.folderName}</span>
                        <span className={s.sugestaoMotivo}>{sugestao.categoryLabel} · {sugestao.reason}</span>
                      </span>
                    </button>
                  </>
                )}

                {/* 2. O outro destino possivel: a lista de tarefas. */}
                <div className={s.processGroupLabel}>Outras ações</div>
                {card && (
                  <button
                    className={s.acaoLinha}
                    onClick={() => { setProcessing(null); abrirTarefa(card.id) }}
                  >
                    <Icon name="tarefa" size={14} />
                    <span className={s.acaoTexto}>
                      <span className={s.acaoTitulo}>Virar tarefa</span>
                      <span className={s.acaoSub}>{suggestTask(card.content, card.type).text}</span>
                    </span>
                  </button>
                )}
                <button
                  className={`${s.acaoLinha} ${s.acaoPerigo}`}
                  onClick={() => { removeCard(processing, true); setProcessing(null); showToast('info', 'Descartado', 'Card removido do inbox.') }}
                >
                  <Icon name="lixo" size={14} />
                  <span className={s.acaoTexto}>
                    <span className={s.acaoTitulo}>Descartar</span>
                    <span className={s.acaoSub}>Sai do inbox sem virar nada</span>
                  </span>
                </button>

                {/* 3. Todas as pastas, pra quando o palpite nao serve. */}
                <div className={s.processGroupLabel}>Virar nota em outra pasta</div>
                {Object.keys(para).map(qid => (
                  <div key={qid} className={s.processGroup}>
                    <div className={s.processQuad}>{para[qid].label}</div>
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
          </ModalPortal>
        )
      })()}

      {virandoTarefa && (
        <ModalPortal>
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
        </ModalPortal>
      )}
    </>
  )
}
