import { create } from 'zustand'
import { extractTags, mergeTags } from './lib/tags'
import { SEED_NOTES } from './lib/seedNotes'
import { INITIAL_PARA, INITIAL_INBOX, SEED_TASKS, planExampleCleanup, type ExamplePlan } from './lib/exampleContent'
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

/** Deriva um titulo limpo do conteudo de um card (1a linha, sem markdown/aspas).
 *  Exportada (TASK-335): InboxCardEditor reusa pra dar titulo ao rascunho
 *  antes dele virar Nota, na mesma forma que ele vai ganhar quando processado. */
export function deriveTitle(content: string): string {
  const first = (content.split('\n').find(l => l.trim()) ?? content).trim()
  const clean = first
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*>]\s*/, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim()
  return clean.length > 60 ? clean.slice(0, 58).trim() + '…' : (clean || 'Sem título')
}

export type View = 'board' | 'canvas' | 'editor' | 'graph' | 'task'
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
  /** Tarefas CONCLUIDAS nesta pasta. Derivado, nunca escrito a mao. */
  tasks: number
  /** Tarefas TOTAIS nesta pasta. Derivado, nunca escrito a mao. */
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
  /** Pasta do PARA a que esta tarefa pertence. Sem pasta = tarefa solta. */
  folderId?: string
  /** Anotacao livre da tarefa: o detalhe que nao cabe no titulo. */
  notes?: string
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
  /** TASK-364: etiqueta que so existe no campo separado do frontmatter (dado
   *  anterior a TASK-360, nunca escrita no corpo). `tags` acima ja e a UNIAO
   *  com o que `extractTags(body)` acha - nada se perde na leitura. Este
   *  campo existe so pra saber o que ainda falta convergir pro corpo e pra
   *  remover pela interface sem o dado renascer no proximo carregamento. */
  legacyTags?: string[]
  /** Simbolo do pacote proprio (NoteGlyphs). Vive no frontmatter do .md. */
  glyph?: GlyphId
  /** Capa da nota: url de imagem em attachments. Vive no frontmatter do .md. */
  cover?: string
}

/** ID fixo do balde virtual "Sem pasta" pra Nota, na tela inicial (PARAGrid) -
 *  mesmo conceito que `agruparPorPasta` (TasksPanel.tsx) ja usa pra Tarefa.
 *  Excluir uma pasta nunca destroi o que estava nela (Invariante:
 *  Durabilidade), mas escondida da navegacao normal quebra a mesma
 *  confianca que apagar quebraria (CEO, 30/08/2026) - por isso a Nota
 *  orfa precisa de um lugar clicavel a partir do board, sem busca. Nunca
 *  gravado como folderId de verdade - so uma chave de agrupamento na tela. */
export const SEM_PASTA_ID = 'sem-pasta'

/** Notas sem pasta (folderId indefinido) - exatamente o que o balde "Sem
 *  pasta" da tela inicial mostra. Pura, extraida pra TDD: prova que a Nota
 *  orfa de uma pasta apagada continua no estado que a tela consome (nunca
 *  fica so alcancavel pela Busca/Constelacao). */
export function notasSemPasta(notes: Note[]): Note[] {
  return notes.filter(n => !n.folderId)
}

interface AppState {
  view: View
  category: string | null
  folder: string | null
  note: string | null
  /** Tarefa aberta na tela de detalhe (view 'task'). */
  task: string | null
  theme: Theme
  filterPrazo: boolean
  showCompleted: boolean
  leftTab: 'inbox' | 'tags'
  para: Record<string, Quadrant>
  inbox: InboxCard[]
  tasks: TaskItem[]
  tags: Tag[]
  notes: Note[]

  /** Grafo de conexoes, recalculado sozinho a cada mudanca nas notas. */
  graph: DottGraph

  /** true durante o boot (carregando o vault); controla a tela de loading */
  booting: boolean

  setView: (view: View, data?: { category?: string; folder?: string; note?: string; task?: string }) => void
  navigateBack: () => void
  toggleTheme: () => void
  toggleFilter: (type?: 'prazo' | 'completed') => void
  setLeftTab: (tab: 'inbox' | 'tags') => void
  captureCard: (content: string) => void
  toggleTask: (id: string) => void
  /** Cria uma tarefa, opcionalmente ja amarrada a uma pasta (TASK-374: o
   *  "grupo" morreu - toda tarefa vive numa lista unica, organizada por
   *  Pasta na tela, nunca por uma segunda hierarquia). */
  addTask: (text: string, folderId?: string) => string
  /** Edita o texto de uma tarefa */
  editTask: (id: string, text: string) => void
  /** Remove uma tarefa */
  deleteTask: (id: string) => void
  /** Define/limpa o prazo (YYYY-MM-DD) de uma tarefa */
  setTaskDeadline: (id: string, deadline: string | null) => void
  /** Amarra (ou solta, com null) a tarefa numa pasta do PARA */
  setTaskFolder: (id: string, folderId: string | null) => void
  /** Anotacao livre da tarefa */
  setTaskNotes: (id: string, notes: string) => void
  createFolder: (categoryId: string, name: string) => void
  /** Define (ou remove, se cover='') a imagem de capa de uma pasta */
  setFolderCover: (categoryId: string, folderId: string, cover: string) => void
  /** Apaga uma pasta. Nota e tarefa sao arquivo do usuario (Invariante:
   *  Durabilidade) - nunca somem junto: so perdem o folderId e continuam
   *  existindo, sem pasta. Sem exclusao em cascata de proposito - quem quer
   *  apagar o conteudo apaga nota por nota (ja existe). */
  deleteFolder: (categoryId: string, folderId: string) => void
  /** Salva corpo e título, refaz o grafo, persiste. Etiqueta nova nasce SO
   *  no CORPO (TASK-360). `tags` visivel e a UNIAO de extractTags(body) com
   *  o que ainda restar em legacyTags (TASK-364: dado anterior a esta task,
   *  gravado so no frontmatter - nunca migrado, nunca perdido).
   *  CORRIGIR item 1 (fechamento duravel): devolve a Promise da escrita em
   *  disco (antes era void/fire-and-forget) - void->Promise<void> e
   *  compativel com todo chamador existente que nao usa o retorno. */
  saveNote: (id: string, title: string, body: string) => Promise<void>
  /** Apaga uma Etiqueta que so existe no campo separado do frontmatter
   *  (legacyTags) - nao mexe no corpo. Ver saveNote. */
  dropLegacyTag: (id: string, tag: string) => void
  /** Cria nova nota numa pasta. body opcional (TASK-corrigir): quando o
   *  chamador ja sabe o conteudo final (ex.: processCard), evita nascer com
   *  o .md vazio e precisar de um segundo salvamento pro conteudo real. */
  createNote: (folderId: string, title: string, body?: string) => string
  /** Move uma nota existente pra outra pasta (o "Mover" do ajudante de pasta) */
  moveNote: (id: string, folderId: string) => void
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
  /** Calcula o que ainda e conteudo de exemplo, sem mexer em nada — a tela
   *  usa isso pra mostrar a contagem antes de perguntar (TASK-367). */
  previewExampleCleanup: () => ExamplePlan
  /** Apaga SO o que ainda e exemplo puro (nunca o que a pessoa escreveu ou
   *  editou). Ver lib/exampleContent.ts pra como a decisao e tomada. */
  clearExamples: () => void
}

/** Reconstroi o grafo inteiro a partir das notas. Deterministico e local. */
function graphOf(notes: Note[]): DottGraph {
  return buildGraph(notes.map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, folderId: n.folderId,
  })))
}

/** Agenda a reconstrucao do grafo (estado DERIVADO) fora do caminho sincrono
 *  de escrita: salvar/mover/apagar nota nao pode esperar buildGraph() (O(N^2))
 *  pra terminar. Chamadas seguidas no mesmo tick colapsam numa reconstrucao
 *  so, sempre com as notas mais recentes no momento em que ela roda - nenhum
 *  pedido se perde, so o ultimo agendado e o que efetivamente executa. */
let graphRebuildTimer: ReturnType<typeof setTimeout> | null = null
function scheduleGraphRebuild(): void {
  if (graphRebuildTimer !== null) clearTimeout(graphRebuildTimer)
  graphRebuildTimer = setTimeout(() => {
    graphRebuildTimer = null
    useStore.setState({ graph: graphOf(useStore.getState().notes) })
  }, 0)
}

/** Uma imagem do vault so pode ser apagada do disco quando NENHUMA nota
 *  (nem no corpo, nem como capa) ainda referencia a mesma url - senao a
 *  faxina de uma nota apaga um anexo que outra nota ainda usa. */
function isAttachmentOrfao(url: string, notes: Note[]): boolean {
  return !notes.some(n => n.cover === url || n.body.includes(url))
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
/** Reconta o que cada pasta tem: notas E tarefas.
 *
 *  Ate 25/08/2026 esta funcao so recontava NOTAS, mas o card da pasta ja
 *  desenhava "3 tarefas" e uma barra de progresso - numeros que vinham do seed
 *  e nunca mudavam. Era um numero que mentia. Agora os tres sao derivados do
 *  estado real, entao envelhecer virou impossivel. */
function recountFolders(
  para: Record<string, Quadrant>,
  notes: Note[],
  tasks: TaskItem[] = [],
): Record<string, Quadrant> {
  const notasPor = new Map<string, number>()
  for (const n of notes) if (n.folderId) notasPor.set(n.folderId, (notasPor.get(n.folderId) ?? 0) + 1)

  const totalPor = new Map<string, number>()
  const feitasPor = new Map<string, number>()
  for (const t of tasks) {
    if (!t.folderId) continue
    totalPor.set(t.folderId, (totalPor.get(t.folderId) ?? 0) + 1)
    if (t.done) feitasPor.set(t.folderId, (feitasPor.get(t.folderId) ?? 0) + 1)
  }

  const next: Record<string, Quadrant> = {}
  for (const [qid, q] of Object.entries(para)) {
    next[qid] = {
      ...q,
      folders: q.folders.map(f => ({
        ...f,
        notes: notasPor.get(f.id) ?? 0,
        tasks: feitasPor.get(f.id) ?? 0,
        total: totalPor.get(f.id) ?? 0,
      })),
    }
  }
  return next
}

/** Recontagem para uso nas acoes: mesma conta do recountFolders, sem gravar.
 *  Os contadores de pasta sao DERIVADOS - gravar seria criar a chance deles
 *  envelhecerem, que e exatamente o defeito que estavamos consertando. */
function comContagem(
  para: Record<string, Quadrant>,
  notes: Note[],
  tasks: TaskItem[],
): Record<string, Quadrant> {
  return recountFolders(para, notes, tasks)
}

/** As notas de exemplo declaram `tags` mas nenhuma tem `#etiqueta` escrita no
 *  corpo ainda - sem marcar como legacyTags, o primeiro salvamento (TASK-360)
 *  apagaria essas etiquetas no primeiro uso do app, igual apagaria numa nota
 *  antiga de verdade sem este cuidado (TASK-364). */
const SEED_NOTES_WITH_LEGACY: Note[] = SEED_NOTES.map(n => ({
  ...n,
  legacyTags: n.tags.filter(t => !extractTags(n.body).includes(t)),
}))
const SEED_GRAPH = graphOf(SEED_NOTES_WITH_LEGACY)

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('dott:theme')
    return t === 'light' ? 'light' : 'dark'
  } catch { return 'dark' }
}

/** Recalcula urgent/over de uma tarefa a partir do prazo (YYYY-MM-DD). */
function withDeadlineFlags(t: TaskItem): TaskItem {
  if (!t.deadline) return { ...t, urgent: false, over: false }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(t.deadline + 'T00:00:00')
  return { ...t, over: due < today, urgent: due.getTime() === today.getTime() }
}

/** Formato antigo de tarefa no disco (TASK-374, removido): tarefas viviam
 *  dentro de um "grupo" (nome + cor + items) - uma segunda hierarquia que
 *  competia com a Pasta. O grupo em si nunca guardava nada que a Pasta nao
 *  guarde melhor; so as tarefas dentro dele importam. */
interface LegacyTaskGroup {
  id: string
  name: string
  color: string
  items: TaskItem[]
}

/** Migra o formato antigo (grupos) pro novo (lista unica achatada), sem
 *  perder NENHUM campo de tarefa nenhuma - id, texto, concluida, prazo,
 *  pasta e anotacao sobrevivem intactos. So o wrapper (nome/cor do grupo)
 *  some, porque ele so espelhava a Pasta ou era gerado automaticamente (ver
 *  FolderNotesView e InboxPanel antes da TASK-374) - nunca informacao do
 *  usuario. Tarefa que ja morava fora de qualquer pasta continua fora de
 *  qualquer pasta (a tela agrupa essas visualmente num balde "Sem pasta",
 *  nunca escrito no disco). Aceita `unknown[]` porque o arquivo em disco
 *  pode estar no formato antigo OU no novo - cada entrada e testada por si. */
export function flattenLegacyTasks(saved: unknown[]): TaskItem[] {
  const out: TaskItem[] = []
  for (const entry of saved as (TaskItem | LegacyTaskGroup)[]) {
    if (entry && Array.isArray((entry as LegacyTaskGroup).items)) out.push(...(entry as LegacyTaskGroup).items)
    else if (entry) out.push(entry as TaskItem)
  }
  return out
}

/** true se o array salvo ainda esta no formato antigo (grupos) - usado so
 *  pra decidir se vale gravar de volta o formato novo depois de migrar
 *  (nao ha necessidade de reescrever o arquivo se ele ja e o formato novo). */
export function isLegacyTaskShape(saved: unknown[]): boolean {
  return saved.some(entry => entry && typeof entry === 'object' && Array.isArray((entry as LegacyTaskGroup).items))
}

export const useStore = create<AppState>((set, get) => ({
  view: 'board',
  category: null,
  folder: null,
  note: null,
  task: null,
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
  notes: SEED_NOTES_WITH_LEGACY,
  graph: SEED_GRAPH,
  booting: true,

  setView: (view, data = {}) => set(s => {
    // When going to board, clear all context to avoid stale breadcrumb state
    if (view === 'board') return { view, category: null, folder: null, note: null, task: null }
    // When going to canvas, clear note but keep category/folder from data or previous
    if (view === 'canvas') return {
      view,
      category: data.category !== undefined ? data.category! : s.category,
      folder: data.folder !== undefined ? data.folder! : s.folder,
      note: null,
      task: null,
    }
    return {
      view,
      category: data.category !== undefined ? data.category! : s.category,
      folder: data.folder !== undefined ? data.folder! : s.folder,
      note: data.note !== undefined ? data.note! : s.note,
      task: data.task !== undefined ? data.task! : s.task,
    }
  }),

  /** Volta UM degrau: editor -> pasta -> categoria -> board. */
  navigateBack: () => {
    const { view, folder, category } = get()
    // Tarefa aberta: volta pra pasta dela quando tem pasta, senao pro board.
    if (view === 'task') {
      if (folder && category) get().setView('canvas', { category, folder })
      else get().setView('board')
      return
    }
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
    // Uma unica escrita no disco: a nota ja nasce com o body final (senao
    // createNote + saveNote disparavam dois vault_save concorrentes pro
    // mesmo id, e o vazio podia resolver por ultimo - nota nascia em branco).
    const id = get().createNote(folderId, title, body)
    get().removeCard(cardId) // mantém a imagem: agora a nota a usa
    return id
  },

  toggleTask: (id) => set(s => {
    const tasks = s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    saveTasksFile(tasks)
    return { tasks, para: comContagem(s.para, s.notes, tasks) }
  }),

  addTask: (text, folderId) => {
    const t = text.trim()
    if (!t) return ''
    const id = uid('t')
    set(s => {
      const tasks = [...s.tasks, { id, done: false, text: t, folderId }]
      saveTasksFile(tasks)
      return { tasks, para: comContagem(s.para, s.notes, tasks) }
    })
    return id
  },

  editTask: (id, text) => set(s => {
    const t = text.trim()
    const tasks = s.tasks.map(it => it.id === id ? { ...it, text: t || it.text } : it)
    saveTasksFile(tasks)
    return { tasks }
  }),

  deleteTask: (id) => set(s => {
    const tasks = s.tasks.filter(it => it.id !== id)
    saveTasksFile(tasks)
    return { tasks, para: comContagem(s.para, s.notes, tasks) }
  }),

  setTaskDeadline: (id, deadline) => set(s => {
    const tasks = s.tasks.map(it => it.id === id ? withDeadlineFlags({ ...it, deadline }) : it)
    saveTasksFile(tasks)
    return { tasks }
  }),

  setTaskFolder: (id, folderId) => set(s => {
    const tasks = s.tasks.map(it => it.id === id ? { ...it, folderId: folderId ?? undefined } : it)
    saveTasksFile(tasks)
    return { tasks, para: comContagem(s.para, s.notes, tasks) }
  }),

  setTaskNotes: (id, notes) => set(s => {
    const tasks = s.tasks.map(it => it.id === id ? { ...it, notes } : it)
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

  /** Ver doc em AppState.deleteFolder. */
  deleteFolder: (categoryId, folderId) => {
    if (!get().para[categoryId]) return
    const orphanNoteIds = get().notes.filter(n => n.folderId === folderId).map(n => n.id)
    const hadTasks = get().tasks.some(t => t.folderId === folderId)
    let notesAfter: Note[] = get().notes
    let tasksAfter: TaskItem[] = get().tasks
    set(s => {
      const q = s.para[categoryId]
      if (!q) return s
      const notes = orphanNoteIds.length
        ? s.notes.map(n => (n.folderId === folderId ? { ...n, folderId: undefined } : n))
        : s.notes
      const tasks = hadTasks
        ? s.tasks.map(t => (t.folderId === folderId ? { ...t, folderId: undefined } : t))
        : s.tasks
      notesAfter = notes
      tasksAfter = tasks
      const next = {
        ...s.para,
        [categoryId]: { ...q, folders: q.folders.filter(f => f.id !== folderId) },
      }
      const para = recountFolders(next, notes, tasks)
      saveFolders(para)
      return { notes, tasks, para }
    })
    if (orphanNoteIds.length) {
      scheduleGraphRebuild()
      for (const id of orphanNoteIds) {
        const saved = notesAfter.find(n => n.id === id)
        if (saved) saveNoteToVault(saved)
      }
    }
    if (hadTasks) saveTasksFile(tasksAfter)
  },

  saveNote: (id, title, body) => {
    const bodyTags = extractTags(body)
    const now = new Date().toLocaleDateString('pt-BR')
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n => {
        if (n.id !== id) return n
        // Convergencia (TASK-364): etiqueta antiga que passou a existir
        // tambem no corpo nao precisa mais do campo separado do frontmatter.
        const legacyTags = (n.legacyTags ?? []).filter(t => !bodyTags.includes(t))
        return { ...n, title, body, tags: mergeTags(bodyTags, legacyTags), legacyTags, updatedAt: now }
      })
      saved = notes.find(n => n.id === id)
      return { notes, tags: deriveTags(notes) }
    })
    // O grafo e derivado: refaz fora do caminho sincrono, nunca fica velho.
    scheduleGraphRebuild()
    // Persiste só o arquivo .md alterado (as conexoes sao derivadas, nao
    // gravadas). Item 1: devolve a Promise em vez de disparar e esquecer -
    // saveNoteToVault ja nunca rejeita (proprio try/catch, mostra toast),
    // entao so estamos expondo o "quando terminou", nao criando risco novo.
    return saved ? saveNoteToVault(saved) : Promise.resolve()
  },

  /** Apaga uma Etiqueta que so existe no campo separado do frontmatter (dado
   *  anterior a TASK-360, nunca escrita no corpo). So mexe nesse campo -
   *  nunca reescreve o corpo do usuario. Clicar em "remover" numa etiqueta
   *  do corpo passa por saveNote (removeTagFromBody); esta acao cobre so o
   *  outro lado, senao a etiqueta "antiga" voltava no proximo carregamento. */
  dropLegacyTag: (id, tag) => {
    const norm = tag.trim().replace(/^#/, '').toLowerCase()
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n => {
        if (n.id !== id) return n
        const legacyTags = (n.legacyTags ?? []).filter(t => t !== norm)
        return { ...n, legacyTags, tags: mergeTags(extractTags(n.body), legacyTags) }
      })
      saved = notes.find(n => n.id === id)
      return { notes, tags: deriveTags(notes) }
    })
    scheduleGraphRebuild()
    if (saved) saveNoteToVault(saved)
  },

  createNote: (folderId, title, body = '') => {
    const id = uid('n')
    const now = new Date().toLocaleDateString('pt-BR')
    const note: Note = {
      id, title, date: now, updatedAt: now,
      folderId, img: false, body, tags: extractTags(body),
    }
    set(s => {
      const notes = [...s.notes, note]
      const para = recountFolders(s.para, notes, s.tasks)
      saveFolders(para)
      return { notes, para, tags: deriveTags(notes) }
    })
    scheduleGraphRebuild()
    saveNoteToVault(note)
    return id
  },

  moveNote: (id, folderId) => {
    let saved: Note | undefined
    set(s => {
      const notes = s.notes.map(n => (n.id === id ? { ...n, folderId } : n))
      saved = notes.find(n => n.id === id)
      const para = recountFolders(s.para, notes, s.tasks)
      return { notes, para }
    })
    scheduleGraphRebuild()
    if (saved) saveNoteToVault(saved)
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
    let notesAfter: Note[] = []
    set(s => {
      anterior = s.notes.find(n => n.id === id)?.cover
      const notes = s.notes.map(n => (n.id === id ? { ...n, cover: cover || undefined } : n))
      saved = notes.find(n => n.id === id)
      notesAfter = notes
      return { notes }
    })
    // Trocar/limpar a capa so apaga a imagem antiga do disco quando nenhuma
    // nota (nem esta, no corpo) ainda referencia a mesma url.
    if (anterior && anterior !== cover && isAttachmentOrfao(anterior, notesAfter)) removeAttachment(anterior)
    if (saved) saveNoteToVault(saved)
  },

  searchNoteTitles: (query) => {
    const q = query.toLowerCase()
    return get().notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 8)
  },

  deleteNote: (id) => {
    const note = get().notes.find(n => n.id === id)
    const imgs = note ? [...note.body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]) : []
    let notesAfter: Note[] = []
    set(s => {
      const notes = s.notes.filter(n => n.id !== id)
      notesAfter = notes
      const para = recountFolders(s.para, notes, s.tasks)
      saveFolders(para)
      return { notes, para, tags: deriveTags(notes) }
    })
    scheduleGraphRebuild()
    // Faxina: apaga do disco so as imagens que NENHUMA outra nota ainda usa.
    for (const url of imgs) if (isAttachmentOrfao(url, notesAfter)) removeAttachment(url)
    if (note?.cover && isAttachmentOrfao(note.cover, notesAfter)) removeAttachment(note.cover)
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
    // TASK-374: quem ja usava o app pode ter o arquivo no formato antigo
    // (grupos) - flattenLegacyTasks le os dois formatos e devolve so a
    // lista achatada, sem perder tarefa nenhuma; migracao automatica e
    // silenciosa (grava o formato novo so se achou o antigo).
    const savedTasks = await loadTasksFile()
    if (savedTasks && savedTasks.length) {
      const legacy = isLegacyTaskShape(savedTasks)
      const tasks = flattenLegacyTasks(savedTasks).map(withDeadlineFlags)
      set({ tasks })
      if (legacy) saveTasksFile(tasks)
    } else {
      await saveTasksFile(get().tasks)
    }

    const loaded = await loadVault()
    if (!loaded || loaded.length === 0) {
      // Primeiro uso: grava os exemplos no vault nativo.
      for (const n of get().notes) await saveNoteToVault(n)
      const seeded = recountFolders(get().para, get().notes, get().tasks)
      set({ para: seeded, tags: deriveTags(get().notes) })
      scheduleGraphRebuild()
      saveFolders(seeded)
      return
    }
    // Etiqueta (TASK-364): `loadVault` (notesService.ts, toNote) ja devolve
    // `tags` como a UNIAO do corpo com o campo separado do frontmatter -
    // nada se perde aqui, sem migrar nem reescrever arquivo nenhum.
    // Pastas e tags sao DERIVADAS das notas reais — nunca do que estava salvo,
    // senao o numero da pasta e a lista de tags envelhecem e mentem.
    const para = recountFolders(get().para, loaded, get().tasks)
    // O grafo nasce aqui, do acervo REAL do usuario, sem nenhuma marcacao manual.
    set({ notes: loaded, para, tags: deriveTags(loaded) })
    scheduleGraphRebuild()
    saveFolders(para)
  },

  previewExampleCleanup: () => planExampleCleanup(get().notes, get().para, get().tasks, get().inbox),

  clearExamples: () => {
    const plan = planExampleCleanup(get().notes, get().para, get().tasks, get().inbox)
    // Reusa as acoes que ja existem — cada uma ja cuida de disco, grafo,
    // tags e contagem de pasta sozinha. A unica coisa nova aqui e soltar as
    // pastas de exemplo que ficaram vazias.
    for (const id of plan.noteIds) get().deleteNote(id)
    for (const id of plan.inboxIds) get().removeCard(id)
    for (const id of plan.taskIds) get().deleteTask(id)
    if (plan.folders.length) {
      set(s => {
        let next = s.para
        for (const { categoryId, folderId } of plan.folders) {
          const q = next[categoryId]
          if (!q) continue
          next = { ...next, [categoryId]: { ...q, folders: q.folders.filter(f => f.id !== folderId) } }
        }
        saveFolders(next)
        return { para: next }
      })
    }
  },
}))

/** DEFEITO 2 (CEO ja reclamou 3x: "cliquei em apagar e continuam pastas...
 *  o numero de notas por pasta esta GRAVADO no folders.json e esta
 *  desatualizado - a tela mostra 'X notas' porque le esse numero salvo, nao
 *  porque contou"). `folder.notes`/`.tasks`/`.total` (Folder, em `para`) sao
 *  campos DERIVADOS - ate aqui, cada acao que mexia em nota ou tarefa tinha
 *  que lembrar de chamar `recountFolders` ANTES de salvar. Bastou UMA nao
 *  lembrar (era exatamente `clearExamples`, que antes do conserto de
 *  identidade acima nunca apagava nada de verdade) pra tela ficar mostrando
 *  um numero que nunca foi contado. Esta assinatura fecha a classe inteira
 *  do defeito: toda vez que `notes` ou `tasks` mudam - por QUALQUER acao,
 *  presente ou futura, mesmo uma que esqueca de recontar sozinha - os
 *  contadores de pasta sao recalculados a partir da verdade e regravados.
 *  Guard por referencia (arrays imutaveis: todo update troca a referencia)
 *  evita loop - setar `para` aqui nao muda `notes`/`tasks`, entao a proxima
 *  notificacao nao reentra neste bloco. So regrava quando um numero de
 *  verdade mudou (`countsChanged`) - editar titulo/corpo de uma nota sem
 *  mover ela de pasta nao altera contagem nenhuma, entao nao gera escrita
 *  em disco a mais (o disco so muda quando a CONTAGEM muda de verdade). */
function countsChanged(a: Record<string, Quadrant>, b: Record<string, Quadrant>): boolean {
  for (const qid of Object.keys(a)) {
    const fa = a[qid]?.folders ?? []
    const fb = b[qid]?.folders ?? []
    if (fa.length !== fb.length) return true
    for (let i = 0; i < fa.length; i++) {
      if (fa[i].notes !== fb[i].notes || fa[i].tasks !== fb[i].tasks || fa[i].total !== fb[i].total) return true
    }
  }
  return false
}
let lastNotesRef = useStore.getState().notes
let lastTasksRef = useStore.getState().tasks
useStore.subscribe(s => {
  if (s.notes === lastNotesRef && s.tasks === lastTasksRef) return
  lastNotesRef = s.notes
  lastTasksRef = s.tasks
  const fresh = recountFolders(s.para, s.notes, s.tasks)
  if (!countsChanged(fresh, s.para)) return
  useStore.setState({ para: fresh })
  saveFolders(fresh)
})
