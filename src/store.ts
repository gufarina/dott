import { create } from 'zustand'
import { extractTags } from './lib/tags'
import { SEED_NOTES } from './lib/seedNotes'
import { buildGraph, type DottGraph } from './lib/graphify'
import { loadVault, saveNoteToVault, deleteNoteFromVault } from './lib/notesService'
import { loadInbox, setInbox, addInbox, removeInbox } from './lib/inboxService'
import { loadFolders, saveFolders } from './lib/foldersService'
import { loadTasks as loadTasksFile, saveTasks as saveTasksFile } from './lib/tasksService'
import { removeAttachment } from './lib/attachments'
import { detectType } from './lib/detectType'
import type { GlyphId } from './components/NoteGlyphs'
import { showToast } from './components/Toast'

/** ID unico — evita a colisao do Date.now() em milissegundos. */
const uid = (prefix: string): string =>
  prefix + (globalThis.crypto?.randomUUID?.().slice(0, 12) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

/** Deriva um titulo limpo do conteudo de um card (1a linha, sem markdown/aspas). */
function deriveTitle(content: string): string {
  const first = (content.split('\n').find(l => l.trim()) ?? content).trim()
  const clean = first
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*>]\s*/, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim()
  return clean.length > 60 ? clean.slice(0, 58).trim() + '…' : (clean || 'Sem título')
}

export type View = 'board' | 'canvas' | 'editor' | 'graph'
export type Theme = 'dark' | 'light'
export type CardType = 'NOTA' | 'CODIGO' | 'SHELL' | 'URL' | 'IDEIA' | 'AUDIO' | 'VIDEO' | 'IMAGEM' | 'ARQUIVO' | 'LINK' | 'PROMPT' | 'TAREFA' | 'CONTATO'

export interface InboxCard {
  id: string
  type: CardType
  content: string
  time: string
  /** Epoch ms da captura (cards novos). Antigos não têm; UI cai no `time`. */
  ts?: number
}

export interface Folder {
  id: string
  name: string
  bg: string
  notes: number
  tasks: number
  total: number
  stagnant: boolean
  cover?: string
}

export interface Quadrant {
  id: string
  label: string
  color: string
  suggestions: string[]
  folders: Folder[]
}

export interface TaskItem {
  id: string
  done: boolean
  text: string
  deadline?: string | null
  over?: boolean
  urgent?: boolean
}

export interface TaskGroup {
  id: string
  name: string
  color: string
  items: TaskItem[]
}

export interface Tag {
  name: string
  color: string
  count: number
}

export interface Note {
  id: string
  title: string
  date: string
  updatedAt: string
  folderId?: string
  img: boolean
  body: string
  tags: string[]
  /** Simbolo do pacote proprio (NoteGlyphs). Vive no frontmatter do .md. */
  glyph?: GlyphId
  /** Capa da nota: url de imagem em attachments. Vive no frontmatter do .md. */
  cover?: string
}

interface AppState {
  view: View
  category: string | null
  folder: string | null
  note: string | null
  theme: Theme
  filterPrazo: boolean
  showCompleted: boolean
  leftTab: 'inbox' | 'tags'
  para: Record<string, Quadrant>
  inbox: InboxCard[]
  tasks: TaskGroup[]
  tags: Tag[]
  notes: Note[]

  /** Grafo de conexoes, recalculado sozinho a cada mudanca nas notas. */
  graph: DottGraph

  /** true durante o boot (carregando o vault); controla a tela de loading */
  booting: boolean

  setView: (view: View, data?: { category?: string; folder?: string; note?: string }) => void
  navigateBack: () => void
  toggleTheme: () => void
  toggleFilter: (type?: 'prazo' | 'completed') => void
  setLeftTab: (tab: 'inbox' | 'tags') => void
  captureCard: (content: string) => void
  toggleTask: (id: string) => void
  /** Cria uma tarefa num grupo */
  addTask: (groupId: string, text: string) => void
  /** Edita o texto de uma tarefa */
  editTask: (id: string, text: string) => void
  /** Remove uma tarefa */
  deleteTask: (id: string) => void
  /** Define/limpa o prazo (YYYY-MM-DD) de uma tarefa */
  setTaskDeadline: (id: string, deadline: string | null) => void
  /** Cria um grupo de tarefas */
  addGroup: (name: string) => void
  /** Remove um grupo de tarefas (e suas tarefas) */
  deleteGroup: (id: string) => void
  createFolder: (categoryId: string, name: string) => void
  /** Define (ou remove, se cover='') a imagem de capa de uma pasta */
  setFolderCover: (categoryId: string, folderId: string, cover: string) => void
  /** Salva corpo e título, extrai etiquetas, refaz o grafo, persiste */
  saveNote: (id: string, title: string, body: string, tags?: string[]) => void
  /** Cria nova nota numa pasta */
  createNote: (folderId: string, title: string) => string
  /** Define o simbolo do pacote proprio da nota (undefined limpa) */
  setNoteGlyph: (id: string, glyph?: GlyphId) => void
  /** Define a capa da nota (string vazia limpa) */
  setNoteCover: (id: string, cover: string) => void
  /** Retorna lista de notas que combinam com o query de wiki-link */
  searchNoteTitles: (query: string) => Note[]
  /** Deleta uma nota do vault e do estado */
  deleteNote: (id: string) => void
  /** Remove um card do inbox. discardAttachment=true apaga a imagem órfã. */
  removeCard: (id: string, discardAttachment?: boolean) => void
  /** Processa um card: vira nota numa pasta e sai do inbox */
  processCard: (cardId: string, folderId: string) => string | null
  /** Recarrega o inbox do backend (chamado quando o widget captura algo) */
  reloadInbox: () => Promise<void>
  /** Carrega o vault nativo no boot; semeia exemplos no primeiro uso */
  hydrate: () => Promise<void>
}

const INITIAL_PARA: Record<string, Quadrant> = {
  projects: {
    id: 'projects', label: 'Projetos', color: 'var(--q-p)',
    suggestions: ['Trabalho', 'Pessoal', 'Produto', 'Lancamento', 'Migracao'],
    folders: [
      { id: 'start', name: 'Comece aqui', bg: 'oklch(24% 0.08 20)', notes: 5, tasks: 3, total: 3, stagnant: false },
      { id: 'primeiro', name: 'Meu primeiro projeto', bg: 'oklch(22% 0.07 295)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  areas: {
    id: 'areas', label: 'Areas', color: 'var(--q-a)',
    suggestions: ['Desenvolvimento', 'Saude', 'Financas', 'Familia', 'Carreira'],
    folders: [
      { id: 'habitos', name: 'Habitos', bg: 'oklch(20% 0.08 258)', notes: 0, tasks: 0, total: 0, stagnant: false },
      { id: 'saude', name: 'Saude', bg: 'oklch(20% 0.07 145)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  resources: {
    id: 'resources', label: 'Recursos', color: 'var(--q-r)',
    suggestions: ['Design', 'Desenvolvimento', 'Leituras', 'Referencias', 'Cursos'],
    folders: [
      { id: 'modelos', name: 'Modelos', bg: 'oklch(18% 0.08 295)', notes: 0, tasks: 0, total: 0, stagnant: false },
      { id: 'leituras', name: 'Leituras', bg: 'oklch(18% 0.05 60)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  archives: {
    id: 'archives', label: 'Arquivo', color: 'var(--q-ar)',
    suggestions: ['Antigo', 'Concluido', 'Pausado'],
    folders: [
      { id: 'concluidos', name: 'Concluidos', bg: 'oklch(16% 0.02 260)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
}

const INITIAL_INBOX: InboxCard[] = [
  { id: 'i1', type: 'IDEIA', content: 'E se eu capturasse todos os meus pensamentos num só lugar?', time: '2m' },
  { id: 'i2', type: 'URL', content: 'https://fortelabs.com/blog/para', time: '15m' },
  { id: 'i3', type: 'NOTA', content: 'Ler a nota "Bem-vindo ao Dott" na pasta Comece aqui', time: '1h' },
  { id: 'i4', type: 'TAREFA', content: 'Criar minha primeira pasta no quadrante Projetos', time: '3h' },
]

/** Reconstroi o grafo inteiro a partir das notas. Deterministico e local. */
function graphOf(notes: Note[]): DottGraph {
  return buildGraph(notes.map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, folderId: n.folderId,
  })))
}

/** Paleta fixa das tags — a cor sai do nome, entao nao dança entre sessoes. */
const TAG_COLORS = ['#e05a38', '#4a8fd9', '#9b6cdb', '#3db37a', '#d98c3a', '#3db3b3', '#e05aa0', '#b4966e']
function tagColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TAG_COLORS[h % TAG_COLORS.length]
}

/** Tags reais derivadas das notas (a lista fixa do seed mentia depois do 1o uso). */
function deriveTags(notes: Note[]): Tag[] {
  const count = new Map<string, number>()
  for (const n of notes) for (const t of n.tags) count.set(t, (count.get(t) ?? 0) + 1)
  return [...count.entries()]
    .map(([name, c]) => ({ name, color: tagColor(name), count: c }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Contagem de notas por pasta, derivada das notas reais.
 *  Sem isso a pasta guardava o numero do seed pra sempre — e o card que voce
 *  acabou de soltar nela nao aparecia em lugar nenhum, parecendo que o drop falhou. */
function recountFolders(
  para: Record<string, Quadrant>,
  notes: Note[],
): Record<string, Quadrant> {
  const perFolder = new Map<string, number>()
  for (const n of notes) if (n.folderId) perFolder.set(n.folderId, (perFolder.get(n.folderId) ?? 0) + 1)
  const next: Record<string, Quadrant> = {}
  for (const [qid, q] of Object.entries(para)) {
    next[qid] = { ...q, folders: q.folders.map(f => ({ ...f, notes: perFolder.get(f.id) ?? 0 })) }
  }
  return next
}

const SEED_GRAPH = graphOf(SEED_NOTES)

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('dott:theme')
    return t === 'light' ? 'light' : 'dark'
  } catch { return 'dark' }
}

const SEED_TASKS: TaskGroup[] = [
  { id: 'g1', name: 'Comece aqui', color: '#e05a38', items: [
    { id: 't1', done: false, text: 'Ler a nota de boas-vindas' },
    { id: 't2', done: false, text: 'Capturar 3 pensamentos pelo widget' },
    { id: 't3', done: false, text: 'Criar sua primeira pasta' },
  ]},
  { id: 'g2', name: 'Explorar o Dott', color: '#4a8fd9', items: [
    { id: 't4', done: false, text: 'Abrir a Constelação e ver suas notas ligadas' },
    { id: 't5', done: false, text: 'Arrastar um card do inbox para uma pasta' },
    { id: 't6', done: false, text: 'Usar Ctrl+K para buscar uma nota' },
  ]},
]

/** Recalcula urgent/over de uma tarefa a partir do prazo (YYYY-MM-DD). */
function withDeadlineFlags(t: TaskItem): TaskItem {
  if (!t.deadline) return { ...t, urgent: false, over: false }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(t.deadline + 'T00:00:00')
  return { ...t, over: due < today, urgent: due.getTime() === today.getTime() }
}

export const useStore = create<AppState>((set, get) => ({
  view: 'board',
  category: null,
  folder: null,
  note: null,
  theme: loadTheme(),
  filterPrazo: false,
  showCompleted: false,
  leftTab: 'inbox',
  para: INITIAL_PARA,
  inbox: INITIAL_INBOX,
  tags: [
    { name: 'tutorial', color: '#e05a38', count: 5 },
    { name: 'inicio', color: '#4a8fd9', count: 1 },
    { name: 'para', color: '#9b6cdb', count: 1 },
    { name: 'wikilinks', color: '#3db37a', count: 1 },
    { name: 'captura', color: '#d98c3a', count: 1 },
    { name: 'inbox', color: '#3db3b3', count: 1 },
  ],
  tasks: SEED_TASKS,
  notes: SEED_NOTES,
  graph: SEED_GRAPH,
  booting: true,

  setView: (view, data = {}) => set(s => {
    // When going to board, clear all context to avoid stale breadcrumb state
    if (view === 'board') return { view, category: null, folder: null, note: null }
    // When going to canvas, clear note but keep category/folder from data or previous
    if (view === 'canvas') return {
      view,
      category: data.category !== undefined ? data.category! : s.category,
      folder: data.folder !== undefined ? data.folder! : s.folder,
      note: null,
    }
    return {
      view,
      category: data.category !== undefined ? data.category! : s.category,
      folder: data.folder !== undefined ? data.folder! : s.folder,
      note: data.note !== undefined ? data.note! : s.note,
    }
  }),

  /** Volta UM degrau: editor -> pasta -> categoria -> board. */
  navigateBack: () => {
    const { view, folder, category } = get()
    if (view === 'editor') { get().setView('canvas'); return }
    // Dentro de uma pasta, o degrau de cima e a categoria (nao o board).
    if (view === 'canvas' && folder && category) {
      get().setView('canvas', { category, folder: '' })
      return
    }
    get().setView('board')
  },

  toggleTheme: () => set(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('dott:theme', next) } catch {}
    return { theme: next }
  }),

  toggleFilter: (type = 'prazo') => set(s =>
    type === 'completed' ? { showCompleted: !s.showCompleted } : { filterPrazo: !s.filterPrazo }
  ),
  setLeftTab: (tab) => set({ leftTab: tab }),

  captureCard: (content) => {
    // Tipo detectado pelo motor (frontend) + persiste; bloqueia se cheio.
    const kind = detectType(content).type
    addInbox(content, kind).then(res => {
      if (res === 'FULL') {
        showToast('warn', 'Inbox cheio (10/10)', 'Processe alguns cards antes de capturar mais.')
        return
      }
      loadInbox().then(cards => { if (cards) set({ inbox: cards }) })
    })
  },

  reloadInbox: async () => {
    const cards = await loadInbox()
    if (cards) set({ inbox: cards })
  },

  removeCard: (id, discardAttachment = false) => {
    // Descartar (não processar) um card de imagem apaga a imagem órfã do disco.
    if (discardAttachment) {
      const card = get().inbox.find(c => c.id === id)
      if (card?.type === 'IMAGEM') removeAttachment(card.content)
    }
    set(s => ({ inbox: s.inbox.filter(c => c.id !== id) }))
    removeInbox(id)
  },

  processCard: (cardId, folderId) => {
    const card = get().inbox.find(c => c.id === cardId)
    if (!card) return null
    let title: string
    let body: string
    if (card.type === 'IMAGEM') {
      title = 'Imagem'
      body = `![imagem](${card.content})`
    } else {
      title = deriveTitle(card.content)
      body = card.content
    }
    const id = get().createNote(folderId, title)
    get().saveNote(id, title, body)
    get().removeCard(cardId) // mantém a imagem: agora a nota a usa
    return id
  },

  toggleTask: (id) => set(s => {
    const tasks = s.tasks.map(g => ({
      ...g,
      items: g.items.map(t => t.id === id ? { ...t, done: !t.done } : t)
    }))
    saveTasksFile(tasks)
    return { tasks }
  }),

  addTask: (groupId, text) => set(s => {
    const t = text.trim()
    if (!t) return s
    const tasks = s.tasks.map(g => g.id === groupId
      ? { ...g, items: [...g.items, { id: uid('t'), done: false, text: t }] }
      : g)
    saveTasksFile(tasks)
    return { tasks }
  }),

  editTask: (id, text) => set(s => {
    const t = text.trim()
    const tasks = s.tasks.map(g => ({
      ...g,
      items: g.items.map(it => it.id === id ? { ...it, text: t || it.text } : it),
    }))
    saveTasksFile(tasks)
    return { tasks }
  }),

  deleteTask: (id) => set(s => {
    const tasks = s.tasks.map(g => ({ ...g, items: g.items.filter(it => it.id !== id) }))
    saveTasksFile(tasks)
    return { tasks }
  }),

  setTaskDeadline: (id, deadline) => set(s => {
    const tasks = s.tasks.map(g => ({
      ...g,
      items: g.items.map(it => it.id === id ? withDeadlineFlags({ ...it, deadline }) : it),
    }))
    saveTasksFile(tasks)
    return { tasks }
  }),

  addGroup: (name) => set(s => {
    const n = name.trim()
    if (!n) return s
    const colors = ['#e05a38', '#4a8fd9', '#9b6cdb', '#3db37a', '#d98c3a', '#3db3b3']
    const tasks = [...s.tasks, { id: uid('g'), name: n, color: colors[s.tasks.length % colors.length], items: [] }]
    saveTasksFile(tasks)
    return { tasks }
  }),

  deleteGroup: (id) => set(s => {
    const tasks = s.tasks.filter(g => g.id !== id)
    saveTasksFile(tasks)
    return { tasks }
  }),

  createFolder: (categoryId, name) => {
    const bgs = ['oklch(24% 0.07 20)', 'oklch(22% 0.07 258)', 'oklch(22% 0.07 145)', 'oklch(22% 0.07 295)']
    set(s => {
      const q = s.para[categoryId]
      const next = {
        ...s.para,
        [categoryId]: {
          ...q,
          folders: [...q.folders, {
            id: uid('f'), name, bg: bgs[q.folders.length % 4],
            notes: 0, tasks: 0, total: 0, stagnant: false,
          }]
        }
      }
      saveFolders(next)
      return { para: next }
    })
  },

  setFolderCover: (categoryId, folderId, cover) => {
    set(s => {
      const q = s.para[categoryId]
      if (!q) return s
      const next = {
        ...s.para,
        [categoryId]: {
          ...q,
          folders: q.folders.map(f =>
            f.id === folderId
              ? { ...f, cover: cover || undefined }
              : f
          )
        }
      }
      saveFolders(next)
      return { para: next }
    })
  },

  saveNote: (id, title, body, tagsOverride) => {
    const tags = tagsOverride ?? extractTags(body)
    const now = new Date().toLocaleDateString('pt-BR')
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n =>
        n.id === id ? { ...n, title, body, tags, updatedAt: now } : n
      )
      saved = notes.find(n => n.id === id)
      // O grafo e derivado: refaz inteiro a cada salvamento, nunca fica velho.
      return { notes, graph: graphOf(notes), tags: deriveTags(notes) }
    })
    // Persiste só o arquivo .md alterado (as conexoes sao derivadas, nao gravadas).
    if (saved) saveNoteToVault(saved)
  },

  createNote: (folderId, title) => {
    const id = uid('n')
    const now = new Date().toLocaleDateString('pt-BR')
    const note: Note = {
      id, title, date: now, updatedAt: now,
      folderId, img: false, body: '', tags: [],
    }
    set(s => {
      const notes = [...s.notes, note]
      const para = recountFolders(s.para, notes)
      saveFolders(para)
      return { notes, para }
    })
    saveNoteToVault(note)
    return id
  },

  setNoteGlyph: (id, glyph) => {
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n => (n.id === id ? { ...n, glyph } : n))
      saved = notes.find(n => n.id === id)
      return { notes }
    })
    if (saved) saveNoteToVault(saved)
  },

  setNoteCover: (id, cover) => {
    let saved: Note | undefined
    let anterior: string | undefined
    set(s => {
      anterior = s.notes.find(n => n.id === id)?.cover
      const notes = s.notes.map(n => (n.id === id ? { ...n, cover: cover || undefined } : n))
      saved = notes.find(n => n.id === id)
      return { notes }
    })
    // Trocar/limpar a capa apaga a imagem antiga: senao vira lixo orfao no disco.
    if (anterior && anterior !== cover) removeAttachment(anterior)
    if (saved) saveNoteToVault(saved)
  },

  searchNoteTitles: (query) => {
    const q = query.toLowerCase()
    return get().notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 8)
  },

  deleteNote: (id) => {
    // Faxina: apaga do disco as imagens que só esta nota usava.
    const note = get().notes.find(n => n.id === id)
    if (note) {
      const imgs = [...note.body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1])
      for (const url of imgs) removeAttachment(url)
      if (note.cover) removeAttachment(note.cover)
    }
    set(s => {
      const notes = s.notes.filter(n => n.id !== id)
      const para = recountFolders(s.para, notes)
      saveFolders(para)
      return { notes, para, graph: graphOf(notes), tags: deriveTags(notes) }
    })
    deleteNoteFromVault(id)
  },

  hydrate: async () => {
    // Pastas: carrega do backend; primeiro uso semeia com INITIAL_PARA e persiste.
    const savedFolders = await loadFolders()
    if (savedFolders) {
      set({ para: savedFolders })
    } else {
      await saveFolders(get().para)
    }

    // Inbox: carrega do backend; no primeiro uso, semeia com os exemplos.
    const cards = await loadInbox()
    if (!cards || cards.length === 0) await setInbox(get().inbox)
    else set({ inbox: cards })

    // Tarefas: carrega do disco; no primeiro uso, semeia com os exemplos.
    const savedTasks = await loadTasksFile()
    if (savedTasks && savedTasks.length) set({ tasks: savedTasks.map(g => ({ ...g, items: g.items.map(withDeadlineFlags) })) })
    else await saveTasksFile(get().tasks)

    const loaded = await loadVault()
    if (!loaded || loaded.length === 0) {
      // Primeiro uso: grava os exemplos no vault nativo.
      for (const n of get().notes) await saveNoteToVault(n)
      const seeded = recountFolders(get().para, get().notes)
      set({ para: seeded, graph: graphOf(get().notes), tags: deriveTags(get().notes) })
      saveFolders(seeded)
      return
    }
    // Etiquetas vem do frontmatter; se a nota nao tiver, sai do corpo (#tag).
    const withBl = loaded.map(n => ({
      ...n,
      tags: n.tags.length ? n.tags : extractTags(n.body),
    }))
    // Pastas e tags sao DERIVADAS das notas reais — nunca do que estava salvo,
    // senao o numero da pasta e a lista de tags envelhecem e mentem.
    const para = recountFolders(get().para, withBl)
    // O grafo nasce aqui, do acervo REAL do usuario, sem nenhuma marcacao manual.
    set({ notes: withBl, graph: graphOf(withBl), para, tags: deriveTags(withBl) })
    saveFolders(para)
  },
}))
