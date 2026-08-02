import React, { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useStore, Folder, Quadrant } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import s from './PARAGrid.module.css'

const Q_ORDER = ['projects', 'areas', 'resources', 'archives']

const Q_ICONS: Record<string, React.ReactElement> = {
  projects: <svg width="18" height="18" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="var(--q-p)"/></svg>,
  areas:    <svg width="18" height="18" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="var(--q-a)"/></svg>,
  resources:<svg width="18" height="18" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="var(--q-r)"/></svg>,
  archives: <svg width="18" height="18" viewBox="0 0 16 16"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--q-ar)" strokeWidth="2.5" strokeLinecap="round"/></svg>,
}

function maxNotes(para: Record<string, Quadrant>) {
  let m = 0
  Object.values(para).forEach(q => q.folders.forEach(f => { if (f.notes > m) m = f.notes }))
  return m || 1
}

function FolderCard({ folder, quadrant, categoryId, onNavigate }: { folder: Folder; quadrant: Quadrant; categoryId: string; onNavigate: () => void }) {
  const mn = maxNotes(useStore.getState().para)
  const hasTasks = folder.total > 0
  const pct = hasTasks ? Math.round(folder.tasks / folder.total * 100) : 0
  const densityPct = Math.max(8, Math.round(folder.notes / mn * 100))
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${categoryId}:${folder.id}` })
  const setFolderCover = useStore(st => st.setFolderCover)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickCover = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não foi possível salvar a imagem.'); return }
    setFolderCover(categoryId, folder.id, url)
    showToast('info', 'Capa definida', `Capa de "${folder.name}" atualizada.`)
  }

  return (
    <div ref={setNodeRef} className={`${s.folderCard} ${isOver ? s.folderOver : ''}`} onClick={onNavigate}>
      <div className={s.cover}>
        {folder.cover
          ? <img src={folder.cover} className={s.coverImg} alt="" />
          : <div className={s.coverInner} style={{ background: folder.bg }} />
        }
        {folder.stagnant && <div className={s.stagnant}>!</div>}
        <button className={s.coverBtn} onClick={pickCover} title="Definir capa da pasta">
          <Icon name="imagem" size={13} />
        </button>
      </div>
      <div className={s.info}>
        <div className={s.name}>{folder.name}</div>
        <div className={s.meta}>{folder.notes} notas{hasTasks ? ` · ${folder.total} tarefas` : ''}</div>
        <div className={s.bottom}>
          {hasTasks ? (
            <>
              <div className={s.progressBar}><div className={s.progressFill} style={{ width: `${pct}%`, background: quadrant.color }} /></div>
              <div className={s.progressLabel}>{pct}% concluído · {folder.total - folder.tasks} pendentes</div>
            </>
          ) : (
            <>
              <div className={s.densityBar}><div className={s.densityFill} style={{ width: `${densityPct}%`, background: quadrant.color }} /></div>
              <div className={s.densityLabel}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--fg3)" strokeWidth="1.2">
                  <path d="M2 2h4.5l1.5 1.5V8H2z"/><line x1="3.5" y1="5" x2="6.5" y2="5"/><line x1="3.5" y1="6.5" x2="5.5" y2="6.5"/>
                </svg>
                acervo
              </div>
            </>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
    </div>
  )
}

function CreateFolderModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { para, createFolder } = useStore()
  const [name, setName] = useState('')
  const q = para[categoryId]

  const submit = () => {
    if (!name.trim()) return
    createFolder(categoryId, name.trim())
    showToast('info', 'Pasta criada', `"${name.trim()}" adicionada.`)
    onClose()
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <h3>Nova pasta em {q.label}</h3>
          <button className={s.modalClose} onClick={onClose} title="Fechar">
            <Icon name="fechar" size={13} />
          </button>
        </div>
        <div className={s.modalBody}>
          <input
            className={s.modalInput}
            placeholder="Nome da pasta..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
          <div className={s.suggestions}>
            {q.suggestions.map(sug => (
              <button key={sug} className={s.suggestionChip} onClick={() => setName(sug)}>{sug}</button>
            ))}
          </div>
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={s.btnPrimary} onClick={submit}>
            <Icon name="pasta" size={13} /> Criar pasta
          </button>
        </div>
      </div>
    </div>
  )
}

export function PARAGrid() {
  const { para, setView } = useStore()
  const [createIn, setCreateIn] = useState<string | null>(null)

  return (
    <>
      <div className={s.grid}>
        {Q_ORDER.map(qid => {
          const q = para[qid]
          return (
            <div key={qid} className={`${s.quadrant} ${s['q-' + qid]}`}>
              <div className={s.qHeader}>
                <div className={s.qIcon}>{Q_ICONS[qid]}</div>
                {/* O cabecalho tinha cursor de mao e nenhum clique — agora abre a
                    primeira pasta do quadrante, que era o que a mao prometia. */}
                <div
                  className={s.qInfo}
                  role={q.folders.length ? 'button' : undefined}
                  title={q.folders.length ? `Abrir ${q.folders[0].name}` : undefined}
                  onClick={() => {
                    const first = q.folders[0]
                    if (first) setView('canvas', { category: qid, folder: first.id })
                  }}
                >
                  <div className={s.qTitle}>{q.label}</div>
                  <div className={s.qSubtitle}>
                    {qid === 'projects' && 'O que você quer ver concluído.'}
                    {qid === 'areas'    && 'O que você cuida sem prazo.'}
                    {qid === 'resources'&& 'O que você quer guardar pra usar um dia.'}
                    {qid === 'archives' && 'O que já serviu, mas não some.'}
                  </div>
                </div>
                <button className={s.qAdd} onClick={() => setCreateIn(qid)} title={`Nova pasta em ${q.label}`} aria-label={`Nova pasta em ${q.label}`}>
                  <Icon name="pasta" size={14} />
                </button>
              </div>
              <div className={s.qCards}>
                {q.folders.map(f => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    quadrant={q}
                    categoryId={qid}
                    onNavigate={() => setView('canvas', { category: qid, folder: f.id })}
                  />
                ))}
                <div className={s.folderNew} onClick={() => setCreateIn(qid)}>
                  <span className={s.plus}><Icon name="pasta" size={16} /></span>
                  <span>Nova pasta</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {createIn && <CreateFolderModal categoryId={createIn} onClose={() => setCreateIn(null)} />}
    </>
  )
}
