import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useStore, CardType } from '../../store'
import { showToast } from '../../components/Toast'
import { setInbox } from '../../lib/inboxService'
import { suggestTask, suggestFolder } from '../../lib/interpret'
import { TYPE_CLASS, TYPE_ACCENT_FIX } from '../../lib/cardTypeClass'
import { Icon } from '../../components/Icon'
import { ModalPortal } from '../../components/ModalPortal'
import { Modal, ModalHint, ModalField, ModalInput, ModalFooter, ModalButton } from '../../components/Modal'
import { CardTypeIcon } from '../../components/CardTypeIcon'
import { TabBar } from '../../components/TabBar'
import { InboxCardEditor } from '../editor/InboxCardEditor'
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade'
import s from './InboxPanel.module.css'

function DraggableCard({
  id, onClick, children, title = 'Arraste para uma pasta — ou clique para editar',
}: { id: string; onClick: () => void; children: React.ReactNode; title?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card:${id}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${s.card} hoverZoom ${isDragging ? s.cardDragging : ''}`}
      onClick={onClick}
      title={title}
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

export function InboxPanel() {
  const inbox = useStore(st => st.inbox)
  const tags = useStore(st => st.tags)
  const leftTab = useStore(st => st.leftTab)
  const para = useStore(st => st.para)
  const setLeftTab = useStore(st => st.setLeftTab)
  const processCard = useStore(st => st.processCard)
  const removeCard = useStore(st => st.removeCard)
  const setView = useStore(st => st.setView)

  const notes = useStore(st => st.notes)
  const addTask = useStore(st => st.addTask)

  const [processing, setProcessing] = useState<string | null>(null)
  /** Card aberto na tela de escrita (TASK-333 urgente: clicar num card do
   *  Inbox abre a proposta aprovada, nao mais direto o modal de destino). */
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState('')
  /** Card que esta virando tarefa + o texto sugerido (editavel antes de criar). */
  const [virandoTarefa, setVirandoTarefa] = useState<{ cardId: string; texto: string } | null>(null)

  /** Fade de rolagem na base (TASK-349) - cada lista rola independente. */
  const listRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(listRef, [inbox.length])
  const tagsRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(tagsRef, [tags.length, tagFilter])

  /** Grava o texto editado de volta no card (ainda no Inbox, nao virou
   *  Nota) — mesma ponte que o widget usa (`inbox_set`), so que chamada
   *  daqui em vez de esperar o backend Rust re-emitir a lista inteira. */
  const saveCardText = (cardId: string, texto: string) => {
    const next = useStore.getState().inbox.map(c => (c.id === cardId ? { ...c, content: texto } : c))
    useStore.setState({ inbox: next })
    void setInbox(next)
    showToast('info', 'Salvo', 'Card atualizado.')
  }

  const doProcess = (cardId: string, categoryId: string, folderId: string) => {
    const noteId = processCard(cardId, folderId)
    setProcessing(null)
    if (noteId) {
      showToast('info', 'Processado', 'Card virou nota na pasta.')
      setView('editor', { category: categoryId, folder: folderId, note: noteId })
    } else {
      showToast('warn', 'Não consegui processar', 'O card não foi encontrado no inbox.')
    }
  }

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()))

  /** Abre a sugestao de tarefa (verbo + objeto + contexto) pro card. */
  const abrirTarefa = (cardId: string) => {
    const card = inbox.find(c => c.id === cardId)
    if (!card) return
    setVirandoTarefa({ cardId, texto: suggestTask(card.content, card.type).text })
  }

  /** Cria a tarefa sem pasta (TASK-374: antes caia no primeiro "grupo" que
   *  existisse, as vezes um que nao tinha nada a ver - bug real, chip errado
   *  na tela da Pasta. O grupo morreu; a tela de Tarefas agora agrupa isso
   *  sozinha no balde "Sem pasta"). */
  const confirmarTarefa = () => {
    if (!virandoTarefa) return
    const texto = virandoTarefa.texto.trim()
    if (!texto) return
    addTask(texto)
    removeCard(virandoTarefa.cardId)
    setVirandoTarefa(null)
    showToast('info', 'Virou tarefa', 'Card saiu do inbox e entrou na lista.')
  }

  return (
    <>
      <TabBar
        activeKey={leftTab}
        onChange={key => setLeftTab(key as 'inbox' | 'tags')}
        indicatorColor="var(--dott-gradient-linear)"
        items={[
          { key: 'inbox', label: 'INBOX', icon: 'inbox', count: inbox.length },
          { key: 'tags', label: 'TAGS', icon: 'tag', count: tags.length },
        ]}
      />

      {leftTab === 'inbox' && (
        <div className={`${s.inboxContent} tabContent`} style={{ '--content-dir': -1 } as React.CSSProperties}>
          {/* TASK-343: a caixa de captura saiu daqui - agora mora no painel
              central, abaixo dos 4 quadrantes do PARA (ver CaptureBox.tsx).
              Este painel volta a ser so a fila de itens do Inbox. */}
          <div ref={listRef} className={`${s.list} scrollFadeBottom`}>
            {inbox.length === 0 ? (
              <div className={s.empty}>
                <div className={s.pulseRing} />
                <p>Sua mente está limpa</p>
              </div>
            ) : inbox.map(c => (
              <DraggableCard
                key={c.id}
                id={c.id}
                onClick={() => (c.type === 'IMAGEM' ? setProcessing(c.id) : setEditingCard(c.id))}
                title={c.type === 'IMAGEM' ? 'Arraste para uma pasta — ou clique para escolher' : undefined}
              >
                <div className={s.cardHeader}>
                  <span className={`${s.cardType} ${s['type-' + TYPE_CLASS[c.type]]}`}>
                    <CardTypeIcon type={c.type} size={9} />{(TYPE_ACCENT_FIX[c.type] ?? c.type).toUpperCase()}
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
        <div ref={tagsRef} className={`${s.tagsContent} tabContent scrollFadeBottom`} style={{ '--content-dir': 1 } as React.CSSProperties}>
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
                  <span className={`${s.previewTipo} ${s['type-' + TYPE_CLASS[card.type]]}`}>
                    <CardTypeIcon type={card.type} size={9} />
                    {(TYPE_ACCENT_FIX[card.type] ?? card.type).toUpperCase()}
                  </span>
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
        <Modal title="Virar tarefa" onClose={() => setVirandoTarefa(null)}>
          <ModalHint>Li o card e montei a tarefa. Ajuste como quiser antes de criar.</ModalHint>
          <ModalField label="Tarefa">
            <ModalInput
              value={virandoTarefa.texto}
              autoFocus
              onChange={e => setVirandoTarefa({ ...virandoTarefa, texto: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmarTarefa()
                if (e.key === 'Escape') setVirandoTarefa(null)
              }}
            />
          </ModalField>
          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => setVirandoTarefa(null)}>Cancelar</ModalButton>
            <ModalButton variant="primary" onClick={confirmarTarefa}>
              <Icon name="tarefa" size={13} /> Criar tarefa
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      {editingCard && (() => {
        const card = inbox.find(c => c.id === editingCard)
        if (!card) return null
        return (
          <InboxCardEditor
            content={card.content}
            onSave={texto => saveCardText(card.id, texto)}
            onClose={() => setEditingCard(null)}
            onChooseDestination={() => { setEditingCard(null); setProcessing(card.id) }}
          />
        )
      })()}
    </>
  )
}
