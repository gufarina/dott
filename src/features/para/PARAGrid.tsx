import React, { useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useStore, Folder, Quadrant, SEM_PASTA_ID, notasSemPasta } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import { ModalPortal } from '../../components/ModalPortal'
import { Button, Input } from '../../components/ui'
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade'
import { RenameFolderModal } from './RenameFolderModal'
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
  const [renomeando, setRenomeando] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ dist: number; dur: number } | null>(null)

  // TASK-566: letreiro so quando o nome REALMENTE nao cabe (scrollWidth >
  // clientWidth) - CSS puro nao sabe distinguir "cortado de verdade" de
  // "ellipsis de seguranca". Remedido a cada hover no card (nome pode mudar
  // apos renomear), nunca no mount.
  const checkOverflow = () => {
    const el = nameRef.current
    if (!el) return
    const dist = el.scrollWidth - el.clientWidth
    if (dist > 1) {
      // Duracao proporcional ao quanto falta revelar - letreiro curto lido
      // rapido soa robotico, um nome bem maior que o card precisa de mais
      // tempo. 2 a 4s, clampado (ver [DECISAO PENDENTE] no brief: nao ha
      // token de duracao da casa nessa faixa - tokens.css para em --dur-slow/
      // --dur-long, 300ms, "teto da UI").
      const dur = Math.min(4, Math.max(2, dist / 60 + 1.4))
      setMarquee({ dist, dur })
    } else if (marquee) {
      setMarquee(null)
    }
  }

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
    <div ref={setNodeRef} className={`${s.folderCard} hoverZoom ${isOver ? s.folderOver : ''}`} onClick={onNavigate} onMouseEnter={checkOverflow}>
      {/* Capa SO existe no DOM quando ha imagem real do usuario (correcao
          TASK-566 F3: pasta sem capa era pintada com folder.bg, um banner
          de cor solida - o bug que o CEO reprovou). Quando existe, vira
          fundo do proprio card via CSS (position:absolute, ver .cover). */}
      {folder.cover && (
        <div className={s.cover}>
          <img src={folder.cover} className={s.coverImg} alt="" />
        </div>
      )}
      <Button
        className={s.renameBtn}
        onClick={e => { e.stopPropagation(); setRenomeando(true) }}
        title={`Renomear "${folder.name}"`}
        aria-label={`Renomear "${folder.name}"`}
      >
        <Icon name="lapis" size={13} />
      </Button>
      <Button className={s.coverBtn} onClick={pickCover} title="Definir capa da pasta">
        <Icon name="imagem" size={13} />
      </Button>
      <div className={s.row}>
        <div className={s.name} ref={nameRef} data-marquee={marquee ? 'true' : undefined}>
          <span
            className={s.nameText}
            style={marquee ? { '--marquee-dist': `${marquee.dist}px`, '--marquee-dur': `${marquee.dur}s` } as React.CSSProperties : undefined}
          >
            {folder.name}
          </span>
        </div>
        {/* TASK-368/566: pct so existe quando ha tarefa na pasta (dado real,
            folder.total/tasks vem de recountFolders - nao e chute). Pasta
            sem tarefa nenhuma NAO ganha "0%" forjado - ver nota no brief
            (DECISAO PENDENTE se deve forcar a linha mesmo assim). */}
        {hasTasks && <div className={s.pct} style={{ color: quadrant.color }}>{pct}%</div>}
      </div>
      {hasTasks && (
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ transform: `scaleX(${pct / 100})`, background: quadrant.color }} />
        </div>
      )}
      <div className={s.meta}>{folder.notes} notas{hasTasks ? ` · ${folder.total - folder.tasks} pendentes` : ''}</div>
      <Input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      {/* O modal sai por portal (fora deste card), entao o clique dentro dele
          nunca sobe pro onClick de navegar do card. */}
      {renomeando && (
        <RenameFolderModal
          categoryId={categoryId}
          folderId={folder.id}
          nomeAtual={folder.name}
          onClose={() => setRenomeando(false)}
        />
      )}
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
      <Button as="span" className={s.folderNew} onClick={onCreate}>
        <span className={s.plus}><Icon name="pasta" size={16} /></span>
        <span>Nova pasta</span>
      </Button>
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
          <Button className={s.modalClose} onClick={onClose} title="Fechar">
            <Icon name="fechar" size={13} />
          </Button>
        </div>
        <div className={s.modalBody}>
          <Input
            className={s.modalInput}
            placeholder="Nome da pasta..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
          />
          <div className={s.suggestions}>
            {q.suggestions.map(sug => (
              <Button key={sug} className={s.suggestionChip} onClick={() => setName(sug)}>{sug}</Button>
            ))}
          </div>
        </div>
        <div className={s.modalFooter}>
          <Button className={s.btnCancel} onClick={onClose}>Cancelar</Button>
          <Button className={s.btnPrimary} onClick={submit}>
            <Icon name="pasta" size={13} /> Criar pasta
          </Button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

export function PARAGrid() {
  const { para, setView } = useStore()
  const notes = useStore(st => st.notes)
  const [createIn, setCreateIn] = useState<string | null>(null)
  /** So conta - nunca desenha o balde vazio (mesmo defeito que o CEO
   *  reclamou hoje no painel de Tarefas: grupo fantasma sem item nenhum). */
  const semPasta = notasSemPasta(notes)

  return (
    <>
      {/* TASK-346: a caixa de captura saiu daqui - virou painel IRMAO do
          PARA, renderizado em App.tsx (.captureShell), nao mais filho deste
          grid. O board volta a ser so os 4 quadrantes, fechados na propria
          moldura (.central, em App.module.css). */}

      {/* Balde "Sem pasta": so aparece quando uma pasta excluida deixou
          Nota orfa pra tras (deleteFolder, store.ts). Mesmo conceito do
          balde "Sem pasta" que TasksPanel.tsx ja sustenta pra Tarefa - a
          Nota nao podia ficar so alcancavel pela Busca/Constelacao (o app
          promete "continua existindo"; sumir da navegacao normal quebra
          essa promessa igual apagar quebraria). */}
      {semPasta.length > 0 && (
        <Button
          className={s.semPastaBanner}
          onClick={() => setView('canvas', { category: '', folder: SEM_PASTA_ID })}
          title="Notas que ficaram sem pasta"
        >
          <Icon name="pasta" size={13} />
          <span>Sem pasta</span>
          <span className={s.semPastaCount}>{semPasta.length}</span>
        </Button>
      )}

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
                  <Button
                    as="span"
                    className={s.qInfo}
                    title={`Ver todas as pastas de ${q.label}`}
                    onClick={() => setView('canvas', { category: qid, folder: '' })}
                  >
                    <div className={s.qTitle}>{q.label}</div>
                    <div className={s.qSubtitle}>{Q_SUBTITULO[qid]}</div>
                  </Button>
                  <Button className={s.qAdd} onClick={() => setCreateIn(qid)} title={`Nova pasta em ${q.label}`} aria-label={`Nova pasta em ${q.label}`}>
                    <Icon name="pasta" size={14} />
                  </Button>
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
        <Button className={`${s.catAdd} hoverZoom hoverGlow`} onClick={() => setCriando(true)} title={`Nova pasta em ${q.label}`}>
          <Icon name="pasta" size={14} /> Nova pasta
        </Button>
      </div>

      <div ref={catBodyRef} className={`${s.catBody} scrollFadeBottom`}>
        {q.folders.length === 0 ? (
          <div className={s.catEmpty}>
            <p>Nenhuma pasta em {q.label} ainda.</p>
            <Button className={`${s.catAdd} hoverZoom hoverGlow`} onClick={() => setCriando(true)}>
              <Icon name="pasta" size={14} /> Criar a primeira
            </Button>
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
