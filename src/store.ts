import { create } from 'zustand'
import { extractLinks, extractTags, buildBacklinks, normalizeTitle } from './lib/wiki'
import { loadVault, saveNoteToVault, deleteNoteFromVault } from './lib/notesService'
import { loadInbox, setInbox, addInbox, removeInbox } from './lib/inboxService'
import { loadFolders, saveFolders } from './lib/foldersService'
import { loadTasks as loadTasksFile, saveTasks as saveTasksFile } from './lib/tasksService'
import { removeAttachment } from './lib/attachments'
import { detectType } from './lib/detectType'
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
  /** Títulos normalizados das notas que ESTA nota aponta via [[link]] */
  links: string[]
  /** IDs das notas que apontam PARA esta nota (backlinks) — computado */
  backlinks: string[]
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

  /** Índice invertido: normalizedTitle → [noteId, ...] que têm backlink */
  backlinkIndex: Record<string, string[]>

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
  /** Salva corpo e título, extrai wiki-links, reconstrói backlinks, persiste */
  saveNote: (id: string, title: string, body: string, tags?: string[]) => void
  /** Cria nova nota numa pasta */
  createNote: (folderId: string, title: string) => string
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

function initBacklinks(notes: Note[]): Record<string, string[]> {
  return buildBacklinks(notes.map(n => ({ id: n.id, title: n.title, links: n.links })))
}

const SEED_NOTES: Note[] = [
  {
    id: 'n1', title: 'Bem-vindo ao Dott', date: '10/06/2026', updatedAt: '10/06/2026', img: false, folderId: 'start',
    body: '# Bem-vindo ao Dott\n\nDott é um segundo cérebro 100% offline. Tudo que você pensa, captura e organiza fica só na sua máquina.\n\n## Como funciona\n\n- **Inbox** (painel esquerdo): capture qualquer coisa sem pensar. Textos, links, ideias, imagens.\n- **PARA** (centro): organize em Projetos, Áreas, Recursos e Arquivo.\n- **Notas**: escreva em markdown. Use `[[ ]]` para conectar notas — veja [[Conecte ideias com wiki-links]].\n- **Widget**: pressione `Ctrl+Shift+Space` em qualquer app para capturar algo rapidinho.\n\nComeçe pela pasta **Comece aqui** e explore as outras notas do tutorial.',
    tags: ['tutorial', 'inicio'], links: ['conecte ideias com wiki-links'], backlinks: [],
  },
  {
    id: 'n2', title: 'O método PARA', date: '10/06/2026', updatedAt: '10/06/2026', img: false, folderId: 'start',
    body: '# O método PARA\n\nPARA é um sistema criado por Tiago Forte para organizar qualquer tipo de informação digital.\n\n## Os 4 quadrantes\n\n- **Projetos**: coisas com prazo e resultado esperado. Ex.: "Lançar site até julho".\n- **Áreas**: responsabilidades contínuas sem prazo. Ex.: "Saúde", "Finanças".\n- **Recursos**: referências e materiais que você quer guardar. Ex.: "Leituras", "Modelos".\n- **Arquivo**: tudo que já foi útil mas está inativo. Não jogue fora — arquive.\n\n## Regra de ouro\n\nUm item pertence ao quadrante mais **acionável**. Projeto > Área > Recurso > Arquivo.\n\nVeja também: [[Bem-vindo ao Dott]].',
    tags: ['tutorial', 'para', 'metodo'], links: ['bem-vindo ao dott'], backlinks: [],
  },
  {
    id: 'n3', title: 'Conecte ideias com wiki-links', date: '10/06/2026', updatedAt: '10/06/2026', img: false, folderId: 'start',
    body: '# Conecte ideias com wiki-links\n\nEscreva `[[nome da nota]]` para criar um link entre notas. O Dott constrói um grafo de conexões automaticamente.\n\n## Exemplo\n\nEsta nota aponta para [[O método PARA]] e para [[Bem-vindo ao Dott]].\n\n## Backlinks\n\nQuando você abre uma nota, ela mostra quais outras notas apontam para ela — os **backlinks**. Isso revela conexões que você nem sabia que existiam.\n\n## Dica\n\nDigite `[[` dentro do editor para ver sugestões de notas existentes.',
    tags: ['tutorial', 'wikilinks', 'conexoes'], links: ['o método para', 'bem-vindo ao dott'], backlinks: [],
  },
  {
    id: 'n4', title: 'Captura pelo widget', date: '10/06/2026', updatedAt: '10/06/2026', img: false, folderId: 'start',
    body: '# Captura pelo widget\n\nO widget do Dott é um orb flutuante que fica disponível **em qualquer aplicativo**.\n\n## Como usar\n\n1. Pressione `Ctrl+Shift+Space` em qualquer lugar.\n2. O widget aparece na tela.\n3. Digite sua ideia, cole um link, ou escreva uma tarefa.\n4. Pressione Enter — o card vai direto para o seu Inbox.\n\n## Por que importa\n\nCaptura zero-fricção significa que você não perde nenhuma ideia esperando abrir o app. Capture agora, processe depois.\n\nVeja como processar: [[Processe seu inbox]].',
    tags: ['tutorial', 'widget', 'captura'], links: ['processe seu inbox'], backlinks: [],
  },
  {
    id: 'n5', title: 'Processe seu inbox', date: '10/06/2026', updatedAt: '10/06/2026', img: false, folderId: 'start',
    body: '# Processe seu inbox\n\nO Inbox não é um destino — é uma caixa de entrada temporária. Processe regularmente.\n\n## Como processar um card\n\n**Opção 1 — Arrastar:** arraste o card do Inbox até uma pasta no board. O card vira nota automaticamente.\n\n**Opção 2 — Deletar:** se não serve para nada, delete. Sem culpa.\n\n## Frequência recomendada\n\n- Inbox cheio (10 cards)? Processe antes de capturar mais.\n- Rotina ideal: revise o inbox uma vez por dia, como e-mail.\n\nVeja também: [[Bem-vindo ao Dott]].',
    tags: ['tutorial', 'inbox', 'gtd'], links: ['bem-vindo ao dott'], backlinks: [],
  },
]

const SEED_BACKLINKS = initBacklinks(SEED_NOTES)
const SEED_NOTES_WITH_BL = SEED_NOTES.map(n => ({
  ...n,
  backlinks: SEED_BACKLINKS[normalizeTitle(n.title)] ?? [],
}))

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
    { id: 't4', done: false, text: 'Escrever uma nota com [[ ]] para conectar' },
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
  notes: SEED_NOTES_WITH_BL,
  backlinkIndex: SEED_BACKLINKS,
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

  navigateBack: () => {
    const { view } = get()
    if (view === 'editor') get().setView('canvas')
    else get().setView('board')
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
    const links = extractLinks(body).map(l => l.target)
    const tags = tagsOverride ?? extractTags(body)
    const now = new Date().toLocaleDateString('pt-BR')
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n =>
        n.id === id ? { ...n, title, body, tags, links, updatedAt: now } : n
      )
      const index = buildBacklinks(notes.map(n => ({ id: n.id, title: n.title, links: n.links })))
      const notesWithBl = notes.map(n => ({
        ...n,
        backlinks: index[normalizeTitle(n.title)] ?? [],
      }))
      saved = notesWithBl.find(n => n.id === id)
      return { notes: notesWithBl, backlinkIndex: index }
    })
    // Persiste só o arquivo .md alterado (backlinks são derivados, não gravados).
    if (saved) saveNoteToVault(saved)
  },

  createNote: (folderId, title) => {
    const id = uid('n')
    const now = new Date().toLocaleDateString('pt-BR')
    const note: Note = {
      id, title, date: now, updatedAt: now,
      folderId, img: false, body: '', tags: [], links: [], backlinks: [],
    }
    set(s => ({ notes: [...s.notes, note] }))
    saveNoteToVault(note)
    return id
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
    }
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }))
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
      return
    }
    // Deriva links e backlinks do conteúdo carregado (graphify-style).
    const withLinks = loaded.map(n => ({
      ...n,
      links: extractLinks(n.body).map(l => l.target),
      tags: n.tags.length ? n.tags : extractTags(n.body),
    }))
    const index = buildBacklinks(withLinks.map(n => ({ id: n.id, title: n.title, links: n.links })))
    const withBl = withLinks.map(n => ({
      ...n,
      backlinks: index[normalizeTitle(n.title)] ?? [],
    }))
    set({ notes: withBl, backlinkIndex: index })
  },
}))
