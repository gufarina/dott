/* exampleContent.ts - TASK-367.
 *
 * O Dott instala com conteudo pronto pra aprender: notas de boas-vindas,
 * pastas do PARA, tarefas do tutorial e cards no inbox. Depois que a pessoa
 * aprendeu, ela quer comecar do zero - hoje isso e apagar item por item.
 *
 * Identidade (como sabemos o que e exemplo): todo item de exemplo nasce com
 * um ID fixo, escrito aqui mesmo (n1..n5, start/primeiro/habitos/..., g1/g2,
 * t1..t6, i1..i4). O gerador de ID do app inteiro (uid() em store.ts) usa
 * crypto.randomUUID e NUNCA produz esses IDs de novo - colisao e
 * praticamente impossivel (12 caracteres hex aleatorios). Entao "isso e
 * exemplo?" e so olhar o ID: nenhuma marca nova precisou entrar no arquivo
 * do usuario nem no disco, nada pra migrar em quem ja tem o app instalado.
 *
 * Preservacao (a REGRA ABSOLUTA - nunca apagar o que a pessoa escreveu):
 * um item de exemplo que a pessoa EDITOU deixa de contar como exemplo na
 * hora de limpar. "Editado" e comparado direto contra o texto ORIGINAL
 * destas mesmas constantes (a fonte que semeou o item na primeira vez) -
 * sem precisar guardar historico nem hash em lugar nenhum. Ver
 * isUnchangedExampleNote / isUnchangedExampleTask.
 */
import type { Folder, InboxCard, Note, Quadrant, TaskItem } from '../store'
import { SEED_NOTES } from './seedNotes'

export const INITIAL_PARA: Record<string, Quadrant> = {
  projects: {
    id: 'projects', label: 'Projetos', color: 'var(--q-p)',
    suggestions: ['Trabalho', 'Pessoal', 'Produto', 'Lançamento', 'Migração'],
    folders: [
      { id: 'start', name: 'Comece aqui', bg: 'oklch(24% 0.08 20)', notes: 0, tasks: 0, total: 0, stagnant: false },
      { id: 'primeiro', name: 'Meu primeiro projeto', bg: 'oklch(22% 0.07 295)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  areas: {
    id: 'areas', label: 'Áreas', color: 'var(--q-a)',
    suggestions: ['Desenvolvimento', 'Saúde', 'Finanças', 'Família', 'Carreira'],
    folders: [
      { id: 'habitos', name: 'Hábitos', bg: 'oklch(20% 0.08 258)', notes: 0, tasks: 0, total: 0, stagnant: false },
      { id: 'saude', name: 'Saúde', bg: 'oklch(20% 0.07 145)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  resources: {
    id: 'resources', label: 'Recursos', color: 'var(--q-r)',
    suggestions: ['Design', 'Desenvolvimento', 'Leituras', 'Referências', 'Cursos'],
    folders: [
      { id: 'modelos', name: 'Modelos', bg: 'oklch(18% 0.08 295)', notes: 0, tasks: 0, total: 0, stagnant: false },
      { id: 'leituras', name: 'Leituras', bg: 'oklch(18% 0.05 60)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
  archives: {
    id: 'archives', label: 'Arquivo', color: 'var(--q-ar)',
    suggestions: ['Antigo', 'Concluído', 'Pausado'],
    folders: [
      { id: 'concluidos', name: 'Concluídos', bg: 'oklch(16% 0.02 260)', notes: 0, tasks: 0, total: 0, stagnant: false },
    ]
  },
}

export const INITIAL_INBOX: InboxCard[] = [
  { id: 'i1', type: 'IDEIA', content: 'E se eu capturasse todos os meus pensamentos num só lugar?', time: '2m' },
  { id: 'i2', type: 'URL', content: 'https://fortelabs.com/blog/para', time: '15m' },
  { id: 'i3', type: 'NOTA', content: 'Ler a nota "Bem-vindo ao Dott" na pasta Comece aqui', time: '1h' },
  { id: 'i4', type: 'TAREFA', content: 'Criar minha primeira pasta no quadrante Projetos', time: '3h' },
]

/** TASK-374: ate aqui as 6 tarefas do tutorial viviam dentro de 2 "grupos"
 *  (g1/g2) - o grupo "Comece aqui" so copiava o nome da pasta 'start', puro
 *  duplicado; "Explorar o Dott" existia so pra dar um lar as tarefas sem
 *  pasta. O conceito morreu (CEO, 29/08/2026): agora e uma lista unica, e
 *  as tarefas sem pasta caem no balde "Sem pasta" (derivado na tela, nunca
 *  gravado). Os ids das tarefas (t1..t6) continuam os mesmos - a deteccao
 *  de "isso e exemplo?" depende deles, nao do grupo que sumiu. */
export const SEED_TASKS: TaskItem[] = [
  { id: 't1', done: false, text: 'Ler a nota de boas-vindas', folderId: 'start' },
  { id: 't2', done: false, text: 'Capturar 3 pensamentos pelo widget', folderId: 'start' },
  { id: 't3', done: false, text: 'Criar sua primeira pasta', folderId: 'start' },
  { id: 't4', done: false, text: 'Abrir a Constelação e ver suas notas ligadas' },
  { id: 't5', done: false, text: 'Arrastar um card do inbox para uma pasta' },
  { id: 't6', done: false, text: 'Usar Ctrl+K para buscar uma nota' },
]

const EXAMPLE_NOTE_IDS = new Set(SEED_NOTES.map(n => n.id))
const EXAMPLE_FOLDER_IDS = new Set(Object.values(INITIAL_PARA).flatMap(q => q.folders.map((f: Folder) => f.id)))
const EXAMPLE_TASK_TEXT = new Map(SEED_TASKS.map(t => [t.id, t.text] as const))
const EXAMPLE_INBOX_IDS = new Set(INITIAL_INBOX.map(c => c.id))
const seedNoteById = new Map(SEED_NOTES.map(n => [n.id, n]))
const seedInboxById = new Map(INITIAL_INBOX.map(c => [c.id, c]))

/** Uma nota de exemplo so continua exemplo se ninguem mexeu em titulo, corpo,
 *  simbolo ou capa dela - qualquer um desses e a pessoa tomando posse dela. */
function isUnchangedExampleNote(n: Note): boolean {
  const seed = seedNoteById.get(n.id)
  if (!seed) return false
  return n.title === seed.title && n.body === seed.body && !n.glyph && !n.cover
}

/** Uma tarefa de exemplo so continua exemplo se o texto e igual ao original
 *  e a pessoa nao anexou prazo nem anotacao - o seed nao tem nenhum dos
 *  dois, entao a presenca de qualquer um e a pessoa usando a tarefa de
 *  verdade, nao so seguindo o tutorial. */
function isUnchangedExampleTask(t: TaskItem): boolean {
  const original = EXAMPLE_TASK_TEXT.get(t.id)
  if (original === undefined) return false
  return t.text === original && !t.deadline && !t.notes
}

/** Um card de inbox de exemplo so continua exemplo se ninguem editou o
 *  conteudo - mesma logica de isUnchangedExampleNote/Task, aplicada ao card. */
function isUnchangedExampleInboxCard(c: InboxCard): boolean {
  const seed = seedInboxById.get(c.id)
  if (!seed) return false
  return c.content === seed.content
}

export interface ExamplePlan {
  noteIds: string[]
  folders: { categoryId: string; folderId: string }[]
  taskIds: string[]
  inboxIds: string[]
}

/** Decide o que ainda e exemplo puro e monta o plano de limpeza. Funcao
 *  pura: nao mexe em disco nem em estado - so calcula o que sairia, pra
 *  tela mostrar a contagem ANTES de qualquer coisa sumir (confirmacao a
 *  altura do risco). Uma pasta de exemplo so entra no plano se, depois da
 *  limpeza, nao sobrar nenhuma nota nem tarefa dentro dela - senao ela vira
 *  pasta fantasma ou nota orfa. */
export function planExampleCleanup(
  notes: Note[],
  para: Record<string, Quadrant>,
  tasks: TaskItem[],
  inbox: InboxCard[],
): ExamplePlan {
  const noteIds = notes.filter(n => EXAMPLE_NOTE_IDS.has(n.id) && isUnchangedExampleNote(n)).map(n => n.id)
  const noteIdSet = new Set(noteIds)

  const taskIds = tasks.filter(t => EXAMPLE_TASK_TEXT.has(t.id) && isUnchangedExampleTask(t)).map(t => t.id)
  const taskIdSet = new Set(taskIds)

  const inboxIds = inbox.filter(c => EXAMPLE_INBOX_IDS.has(c.id) && isUnchangedExampleInboxCard(c)).map(c => c.id)

  const folders: { categoryId: string; folderId: string }[] = []
  for (const [categoryId, q] of Object.entries(para)) {
    for (const f of q.folders) {
      if (!EXAMPLE_FOLDER_IDS.has(f.id) || f.cover) continue
      const temNotaViva = notes.some(n => n.folderId === f.id && !noteIdSet.has(n.id))
      const temTarefaViva = tasks.some(t => t.folderId === f.id && !taskIdSet.has(t.id))
      if (!temNotaViva && !temTarefaViva) folders.push({ categoryId, folderId: f.id })
    }
  }

  return { noteIds, folders, taskIds, inboxIds }
}
