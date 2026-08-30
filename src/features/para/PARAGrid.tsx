import React, { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useStore, Folder, Quadrant } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import { ModalPortal } from '../../components/ModalPortal'
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade'
import s from './PARAGrid.module.css'

const Q_ORDER = ['projects', 'areas', 'resources', 'archives']

const Q_ICONS: Record<string, React.ReactElement> = {
  projects: <svg width="18" height="18" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="var(--q-p)"/></svg>,
  areas:    <svg width="18" height="18" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="var(--q-a)"/></svg>,
  resources:<svg width="18" height="18" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="var(--q-r)"/></svg>,
  archives: <svg width="18" height="18" viewBox="0 0 16 16"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--q-ar)" strokeWidth="2.5" strokeLinecap="round"/></svg>,
}

const Q_SUBTITULO: Record<string, string> = {
  projects: 'O que você quer ver concluído.',
  areas: 'O que você cuida sem prazo.',
  resources: 'O que você quer guardar pra usar um dia.',
  archives: 'O que já serviu, mas não some.',
}

function FolderCard({ folder, quadrant, categoryId, onNavigate }: { folder: Folder; quadrant: Quadrant; categoryId: string; onNavigate: () => void }) {
  const hasTasks = folder.total > 0
  const pct = hasTasks ? Math.round(folder.tasks / folder.total * 100) : 0
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
    <div ref={setNodeRef} className={`${s.folderCard} hoverZoom ${isOver ? s.folderOver : ''}`} onClick={onNavigate}>
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
        {/* TASK-368: o rodape so aparece quando ha tarefa - e o UNICO dado
            que o .meta acima nao mostra sozinho (sem tarefa, .meta ja se
            diferencia por OMISSAO do "X tarefas"). A barra de densidade que
            existia aqui pra pasta sem tarefa foi CORTADA: comparava a pasta
            contra o maximo de notas do PARA inteiro, uma info que so faz
            sentido vendo TODAS as pastas lado a lado (nao decidivel a partir
            de UM card so), e o rotulo "acervo" nao era exclusivo do
            quadrante Arquivo - qualquer pasta sem tarefa em Projetos/Areas/
            Recursos tambem caia nele, rotulo errado repetido, nao so
            redundante. */}
        {hasTasks && (
          <div className={s.bottom}>
            <div className={s.progressBar}><div className={s.progressFill} style={{ transform: `scaleX(${pct / 100})`, background: quadrant.color }} /></div>
            <div className={s.progressLabel}>{pct}% concluído · {folder.total - folder.tasks} pendentes</div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
    </div>
  )
}

/** Grade de pastas de UM quadrante, com o fade de rolagem na base (TASK-349).
 *  Componente proprio so pra dar a cada quadrante o SEU ref/estado de
 *  rolagem - os 4 quadrantes rolam de forma independente. */
function QuadrantCards({ qid, q, onNavigate, onCreate }: {
  qid: string
  q: Quadrant
  onNavigate: (folderId: string) => void
  onCreate: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(ref, [q.folders.length])

  return (
    <div ref={ref} className={`${s.qCards} scrollFadeBottom`}>
      {q.folders.map(f => (
        <FolderCard
          key={f.id}
          folder={f}
          quadrant={q}
          categoryId={qid}
          onNavigate={() => onNavigate(f.id)}
        />
      ))}
      <div className={s.folderNew} onClick={onCreate}>
        <span className={s.plus}><Icon name="pasta" size={16} /></span>
        <span>Nova pasta</span>
      </div>
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
    <ModalPortal>
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
    </ModalPortal>
  )
}

export function PARAGrid() {
  const { para, setView } = useStore()
  const [createIn, setCreateIn] = useState<string | null>(null)

  return (
    <>
      {/* TASK-346: a caixa de captura saiu daqui - virou painel IRMAO do
          PARA, renderizado em App.tsx (.captureShell), nao mais filho deste
          grid. O board volta a ser so os 4 quadrantes, fechados na propria
          moldura (.central, em App.module.css). */}
      <div className={s.grid}>
        {Q_ORDER.map(qid => {
            const q = para[qid]
            return (
              <div key={qid} className={`${s.quadrant} ${s['q-' + qid]}`}>
                <div className={s.qHeader}>
                  <div className={s.qIcon}>{Q_ICONS[qid]}</div>
                  {/* Abre a CATEGORIA (todas as pastas dela), nunca uma pasta
                      especifica: pular direto pra primeira pasta rouba do usuario
                      a escolha e some com as outras. */}
                  <div
                    className={s.qInfo}
                    role="button"
                    title={`Ver todas as pastas de ${q.label}`}
                    onClick={() => setView('canvas', { category: qid, folder: '' })}
                  >
                    <div className={s.qTitle}>{q.label}</div>
                    <div className={s.qSubtitle}>{Q_SUBTITULO[qid]}</div>
                  </div>
                  <button className={s.qAdd} onClick={() => setCreateIn(qid)} title={`Nova pasta em ${q.label}`} aria-label={`Nova pasta em ${q.label}`}>
                    <Icon name="pasta" size={14} />
                  </button>
                </div>
                <QuadrantCards
                  qid={qid}
                  q={q}
                  onNavigate={folderId => setView('canvas', { category: qid, folder: folderId })}
                  onCreate={() => setCreateIn(qid)}
                />
              </div>
            )
          })}
      </div>

      {createIn && <CreateFolderModal categoryId={createIn} onClose={() => setCreateIn(null)} />}
    </>
  )
}

/**
 * Tela de UMA categoria do PARA, com TODAS as pastas dela.
 *
 * Faltava: clicar em "Areas" no board nao tinha pra onde ir, e a tentativa
 * anterior mandava direto pra primeira pasta — o usuario perdia a visao do
 * conjunto. O breadcrumb ja previa este nivel (ele trata "categoria sem pasta"),
 * so nao existia tela. As pastas aqui sao os MESMOS cards do board, entao
 * arrastar card do inbox pra ca continua funcionando.
 */
export function CategoryView() {
  const para = useStore(st => st.para)
  const category = useStore(st => st.category)
  const setView = useStore(st => st.setView)
  const [criando, setCriando] = useState(false)

  const q = category ? para[category] : null
  const catBodyRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(catBodyRef, [q?.folders.length ?? 0])

  if (!q || !category) return null

  return (
    <div className={s.catWrap}>
      <div className={s.catHeader}>
        <div className={s.qIcon}>{Q_ICONS[category]}</div>
        <div className={s.catInfo}>
          <div className={s.catTitle}>{q.label}</div>
          <div className={s.catSubtitle}>{Q_SUBTITULO[category]}</div>
        </div>
        <span className={s.catCount}>
          {q.folders.length} pasta{q.folders.length === 1 ? '' : 's'}
        </span>
        <button className={`${s.catAdd} hoverZoom hoverGlow`} onClick={() => setCriando(true)} title={`Nova pasta em ${q.label}`}>
          <Icon name="pasta" size={14} /> Nova pasta
        </button>
      </div>

      <div ref={catBodyRef} className={`${s.catBody} scrollFadeBottom`}>
        {q.folders.length === 0 ? (
          <div className={s.catEmpty}>
            <p>Nenhuma pasta em {q.label} ainda.</p>
            <button className={`${s.catAdd} hoverZoom hoverGlow`} onClick={() => setCriando(true)}>
              <Icon name="pasta" size={14} /> Criar a primeira
            </button>
          </div>
        ) : (
          <div className={`${s.catCards} ${s['q-' + category]}`}>
            {q.folders.map(f => (
              <FolderCard
                key={f.id}
                folder={f}
                quadrant={q}
                categoryId={category}
                onNavigate={() => setView('canvas', { category, folder: f.id })}
              />
            ))}
          </div>
        )}
      </div>

      {criando && <CreateFolderModal categoryId={category} onClose={() => setCriando(false)} />}
    </div>
  )
}
