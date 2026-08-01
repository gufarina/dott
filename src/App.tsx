import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useStore, type InboxCard } from './store'
import { showToast } from './components/Toast'
import { imageFromEvent, saveImageFile } from './lib/attachments'
import { invoke } from '@tauri-apps/api/core'
import { Titlebar } from './components/Titlebar'
import { BootLoader } from './components/BootLoader'
import { ToastArea } from './components/Toast'
import { SearchModal } from './components/SearchModal'
import { Settings } from './components/Settings'
import { Breadcrumb } from './components/Breadcrumb'
import { InboxPanel } from './features/inbox/InboxPanel'
import { PARAGrid } from './features/para/PARAGrid'
import { TasksPanel } from './features/tasks/TasksPanel'
import { NoteEditor } from './features/editor/NoteEditor'
import { FolderNotesView } from './features/folder/FolderNotesView'
import { Constellation } from './features/graph/Constellation'
import { Onboarding } from './features/onboarding/Onboarding'
import s from './App.module.css'

export default function App() {
  const view = useStore(st => st.view)
  const booting = useStore(st => st.booting)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragging, setDragging] = useState<InboxCard | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const dragDepth = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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
    await invoke('inbox_add', { content: url, kind: 'IMAGEM' })
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
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('inbox-changed', () => useStore.getState().reloadInbox()))
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

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : ''
    if (activeId.startsWith('card:') && overId.startsWith('folder:')) {
      const cardId = activeId.slice(5)
      const [, categoryId, folderId] = overId.split(':')
      const noteId = useStore.getState().processCard(cardId, folderId)
      showToast('info', 'Processado', 'Card virou nota na pasta.')
      if (noteId) useStore.getState().setView('editor', { category: categoryId, folder: folderId, note: noteId })
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

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className={s.body}>
          <div className={s.panelLeft}>
            <InboxPanel />
          </div>

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
                  {view === 'canvas' && <FolderNotesView />}
                  {view === 'editor' && <div className={s.canvasLayout}><NoteEditor /></div>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className={s.panelRight}>
            <TasksPanel />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2,0,0,1)' }}>
          {dragging && (
            <div className={s.dragGhost}>
              <span className={s.dragGhostType}>{dragging.type}</span>
              <span className={s.dragGhostText}>{dragging.content}</span>
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
