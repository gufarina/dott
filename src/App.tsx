import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, rectIntersection, closestCenter,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useStore, type InboxCard } from './store'
import { showToast } from './components/Toast'
import { imageFromEvent, saveImageFile } from './lib/attachments'
import { addInbox } from './lib/inboxService'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Titlebar, closeMainWindow } from './components/Titlebar'
import { BootLoader } from './components/BootLoader'
import { ToastArea } from './components/Toast'
import { SearchModal } from './components/SearchModal'
import { Settings } from './components/Settings'
import { Breadcrumb } from './components/Breadcrumb'
import { InboxPanel } from './features/inbox/InboxPanel'
import { PARAGrid, CategoryView } from './features/para/PARAGrid'
import { CaptureBox } from './features/capture/CaptureBox'
import { TasksPanel } from './features/tasks/TasksPanel'
import { TaskDetail } from './features/tasks/TaskDetail'
import { NoteEditor } from './features/editor/NoteEditor'
import { FolderNotesView } from './features/folder/FolderNotesView'
import { Constellation } from './features/graph/Constellation'
import { Onboarding } from './features/onboarding/Onboarding'
import { useHoverGlowCursor } from './hooks/useHoverGlowCursor'
import s from './App.module.css'

export default function App() {
  // TASK-319: um unico laco pra todos os botoes `.hoverGlow` desta janela
  // (FolderNotesView, Modal, Onboarding, InboxPanel) - ver o hook.
  useHoverGlowCursor()
  const view = useStore(st => st.view)
  const folder = useStore(st => st.folder)
  const booting = useStore(st => st.booting)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragging, setDragging] = useState<InboxCard | null>(null)
  /** Nome da pasta que vai receber o card se voce soltar agora (feedback do ima). */
  const [alvo, setAlvo] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  /**
   * Deteccao de alvo em 3 camadas — "ima" estilo Apple.
   *
   * Por que nao so a padrao: a padrao exige que os retangulos se cruzem de fato.
   * Se as coordenadas do ponteiro e as medidas de layout discordarem um pouco
   * (acontece no WebView2 dependendo da escala de tela), NADA e detectado e o
   * card simplesmente nunca cai — foi o que travou o app.
   *
   * Agora: 1) ponteiro dentro da pasta (preciso) → 2) retangulos se cruzando →
   * 3) pasta MAIS PROXIMA dentro de um raio de alcance. Com a camada 3 o card
   * gruda na pasta vizinha em vez de cair no vazio; longe de tudo, nao gruda em
   * nada (soltar longe = cancelar, de proposito).
   */
  const ALCANCE_IMA = 260
  const detectarAlvo: CollisionDetection = args => {
    const precisos = pointerWithin(args)
    if (precisos.length) return precisos

    const cruzando = rectIntersection(args)
    if (cruzando.length) return cruzando

    const proximos = closestCenter(args)
    if (!proximos.length) return proximos

    // So aceita o mais proximo se estiver ao alcance — senao, soltar longe cancela.
    const ponteiro = args.pointerCoordinates
    const alvoMaisProximo = proximos[0]
    const rect = args.droppableRects.get(alvoMaisProximo.id)
    if (!ponteiro || !rect) return proximos

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(ponteiro.x - cx, ponteiro.y - cy)
    return dist <= ALCANCE_IMA ? [alvoMaisProximo] : []
  }

  const onWindowDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      dragDepth.current += 1
      setDropActive(true)
    }
  }

  const onWindowDragLeave = () => {
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDropActive(false)
    }
  }

  const onWindowDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault()
  }

  const onWindowDrop = async (e: React.DragEvent) => {
    dragDepth.current = 0
    setDropActive(false)
    const file = imageFromEvent(e.nativeEvent)
    if (!file) return
    e.preventDefault()
    const inbox = useStore.getState().inbox
    if (inbox.length >= 10) {
      showToast('warn', 'Inbox cheio (10/10)', 'Processe alguns cards antes.')
      return
    }
    const url = await saveImageFile(file)
    if (!url) {
      showToast('warn', 'Erro', 'Não foi possível salvar a imagem.')
      return
    }
    const result = await addInbox(url, 'IMAGEM')
    if (result === 'FULL') {
      showToast('warn', 'Inbox cheio (10/10)', 'Processe alguns cards antes.')
      return
    }
    if (!result) {
      showToast('warn', 'Erro', 'Não foi possível guardar a imagem no inbox.')
      return
    }
    await useStore.getState().reloadInbox()
    showToast('info', 'Imagem capturada', 'Card adicionado ao inbox.')
  }

  useEffect(() => {
    // Mantém o loader no ar por no mínimo ~800ms pra a animação respirar,
    // mesmo quando o vault carrega instantaneamente.
    const t0 = Date.now()
    useStore.getState().hydrate().finally(() => {
      const wait = Math.max(0, 800 - (Date.now() - t0))
      setTimeout(() => useStore.setState({ booting: false }), wait)
    })
    let unlistenInbox: (() => void) | undefined
    let unlistenAtalho: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('inbox-changed', () => useStore.getState().reloadInbox())
        .then(fn => { unlistenInbox = fn })
        .catch(() => {})
      // AVISO DE ATALHO: o lado Rust tenta registrar Ctrl+Shift+Space no
      // boot e emite este evento quando outro programa ja tomou o atalho -
      // sem isto o usuario so descobria que a captura rapida nao funciona
      // sozinho, sem entender por que. O payload e a mensagem de erro
      // tecnica: fica so no console, nunca aparece na tela.
      listen<string>('shortcut-register-failed', e => {
        console.error('[shortcut-register-failed]', e.payload)
        showToast(
          'warn', 'Atalho de captura ocupado',
          'O atalho Ctrl+Shift+Space já está em uso por outro programa no seu computador. Você ainda pode capturar clicando na bolinha flutuante do Dott.',
        )
      })
        .then(fn => { unlistenAtalho = fn })
        .catch(() => {})
    }).catch(() => {})
    return () => { unlistenInbox?.(); unlistenAtalho?.() }
  }, [])

  // CORRIGIR item 3: Alt+F4 e o menu da barra de tarefas fecham a janela
  // principal sem passar pelo botao da Titlebar - sem isto, nenhum desses
  // caminhos dava flush no autosave pendente. onCloseRequested previne o
  // fechamento padrao e reusa o MESMO closeMainWindow do botao (que faz o
  // flush e so entao chama destroy(), que nao reemite este evento).
  useEffect(() => {
    // Fora do app nativo (navegador comum, ex.: servidor de dev usado pra
    // conferencia visual do squad) a ponte window.__TAURI_INTERNALS__ nao
    // existe - getCurrentWindow() le essa ponte NA HORA (fora de qualquer
    // Promise) e lancava sincronamente, derrubando a arvore inteira
    // (capturado pelo ErrorBoundary). So registra quando a ponte existe de
    // verdade; no app NATIVO o comportamento e IDENTICO - fechar pela
    // Titlebar, por Alt+F4 ou pela barra de tarefas continua dando flush
    // do autosave pendente antes de fechar, nada mudou nesse caminho.
    if (!('__TAURI_INTERNALS__' in window)) return
    let unlisten: (() => void) | undefined
    getCurrentWindow()
      .onCloseRequested(event => {
        event.preventDefault()
        void closeMainWindow()
      })
      .then(fn => { unlisten = fn })
      .catch(() => {})
    return () => { unlisten?.() }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith('card:')) {
      const card = useStore.getState().inbox.find(c => c.id === id.slice(5))
      setDragging(card ?? null)
    }
  }

  /** Mantem o nome da pasta-alvo na ponta do cursor enquanto arrasta. */
  const onDragOver = (e: DragOverEvent) => {
    const overId = e.over ? String(e.over.id) : ''
    if (!overId.startsWith('folder:')) { setAlvo(null); return }
    const [, categoryId, folderId] = overId.split(':')
    const nome = useStore.getState().para[categoryId]?.folders.find(f => f.id === folderId)?.name
    setAlvo(nome ?? null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    setAlvo(null)
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : ''
    if (activeId.startsWith('card:') && overId.startsWith('folder:')) {
      const cardId = activeId.slice(5)
      const [, categoryId, folderId] = overId.split(':')
      const noteId = useStore.getState().processCard(cardId, folderId)
      // So avisa sucesso se de fato virou nota — antes o aviso saia sempre.
      if (noteId) {
        showToast('info', 'Processado', 'Card virou nota na pasta.')
        useStore.getState().setView('editor', { category: categoryId, folder: folderId, note: noteId })
      } else {
        showToast('warn', 'Não consegui processar', 'O card não foi encontrado no inbox.')
      }
    }
  }

  return (
    <div
      className={s.app}
      onDragEnter={onWindowDragEnter}
      onDragLeave={onWindowDragLeave}
      onDragOver={onWindowDragOver}
      onDrop={onWindowDrop}
    >
      {dropActive && <div className={s.dropOverlay}><span className={s.dropOverlayLabel}>Solte a imagem aqui</span></div>}
      <Titlebar onSearch={() => setSearchOpen(true)} onSettings={() => setSettingsOpen(true)} />

      <DndContext
        sensors={sensors}
        collisionDetection={detectarAlvo}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setDragging(null); setAlvo(null) }}
      >
        <div className={s.body}>
          <div className={s.panelLeft}>
            <InboxPanel />
          </div>

          {/* TASK-346: a caixa de captura deixou de ser filha do painel do
              PARA (.central) e virou IRMA dele - moldura, fundo e cantos
              proprios, mesma receita de .panelLeft/.panelRight (ver
              .captureShell em App.module.css). .centralColumn so existe pra
              dar aos dois painel o mesmo pai flex-column com respiro real
              (gap) entre eles - .central volta a fechar sozinho ao redor do
              que ela hospeda em cada view. */}
          <div className={s.centralColumn}>
            <div className={s.central}>
              {view !== 'board' && view !== 'graph' && <Breadcrumb />}

              <div className={s.viewArea}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    className={s.viewMotion}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {view === 'board' && <PARAGrid />}
                    {view === 'graph' && <Constellation />}
                    {/* canvas com pasta = notas da pasta; sem pasta = a categoria inteira */}
                    {view === 'canvas' && (folder ? <FolderNotesView /> : <CategoryView />)}
                    {view === 'editor' && <div className={s.canvasLayout}><NoteEditor /></div>}
                    {view === 'task' && <TaskDetail />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {view === 'board' && (
              <div className={s.captureShell}>
                <CaptureBox />
              </div>
            )}
          </div>

          <div className={s.panelRight}>
            <TasksPanel />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2,0,0,1)' }}>
          {dragging && (
            <div className={`${s.dragGhost} ${alvo ? s.dragGhostArmado : ''}`}>
              <span className={s.dragGhostType}>{dragging.type}</span>
              <span className={s.dragGhostText}>{dragging.content}</span>
              {/* Diz o destino ANTES de soltar — sem adivinhacao. */}
              <span className={s.dragGhostAlvo}>
                {alvo ? `Soltar em ${alvo}` : 'Arraste até uma pasta'}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ToastArea />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <AnimatePresence>
        {booting && <BootLoader key="boot" />}
      </AnimatePresence>

      {!booting && <Onboarding />}
    </div>
  )
}
