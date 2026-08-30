import { useRef, useState } from 'react'
import { useStore, type Quadrant, type TaskItem } from '../../store'
import { Icon } from '../../components/Icon'
import { TabBar } from '../../components/TabBar'
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade'
import s from './TasksPanel.module.css'

/** Decide quais tarefas de uma secao aparecem na lista, dados os dois
 *  filtros independentes: showCompleted ("Ver concluidas", link no rodape) e
 *  filterPrazo (aba PRAZO/A Fazer). Extraida pra TDD (TASK-373): prova que a
 *  aba sem prazo, no estado padrao (showCompleted=false, o que a pessoa ve
 *  ao abrir o app), mostra SO tarefas em aberto - por isso o rotulo honesto
 *  e "A Fazer", nunca "Tudo" (medido: essa mesma linha ja existia, so nao
 *  tinha nome que contasse a verdade). */
export function visibleTasks(items: TaskItem[], filterPrazo: boolean, showCompleted: boolean): TaskItem[] {
  let out = showCompleted ? items : items.filter(t => !t.done)
  if (filterPrazo) out = out.filter(t => t.deadline)
  return out
}

/** Contador da aba "A Fazer": quantas tarefas estao abertas (nao concluidas),
 *  em toda a lista - mesma forma de contador do INBOX/TAGS (TASK-373). */
export function contarAbertas(allTasks: TaskItem[]): number {
  return allTasks.filter(t => !t.done).length
}

/** Contador da aba "PRAZO": das abertas, quantas tem prazo marcado. */
export function contarAbertasComPrazo(allTasks: TaskItem[]): number {
  return allTasks.filter(t => !t.done && t.deadline).length
}

export interface SecaoTarefas {
  /** folderId da Pasta, ou 'sem-pasta' pro balde das tarefas soltas. */
  chave: string
  nome: string
  cor: string
  /** undefined no balde "Sem pasta" - nao ha Pasta pra amarrar a tarefa nova. */
  folderId?: string
  items: TaskItem[]
}

/** Agrupa as tarefas por Pasta - a UNICA hierarquia que sobrou depois do
 *  "grupo" morrer (TASK-374, decisao do CEO em 29/08/2026: uma segunda
 *  hierarquia paralela a Pasta nao faz sentido). Tarefa sem Pasta cai no
 *  balde fixo "Sem pasta" - derivado aqui, nunca escrito em disco, sem nome
 *  escolhido a mao (a capacidade de nomear uma lista solta foi rejeitada de
 *  proposito: seria o conceito de grupo voltando com outro nome).
 *  O balde "Sem pasta" aparece sempre que ha ALGUMA tarefa no app, mesmo
 *  vazio - e o lugar pra capturar uma tarefa que ainda nao tem Pasta. */
export function agruparPorPasta(tasks: TaskItem[], para: Record<string, Quadrant>): SecaoTarefas[] {
  const porFolder = new Map<string, TaskItem[]>()
  const semPasta: TaskItem[] = []
  for (const t of tasks) {
    if (!t.folderId) { semPasta.push(t); continue }
    const arr = porFolder.get(t.folderId) ?? []
    arr.push(t)
    porFolder.set(t.folderId, arr)
  }

  const secoes: SecaoTarefas[] = []
  for (const q of Object.values(para)) {
    for (const f of q.folders) {
      const items = porFolder.get(f.id)
      if (items?.length) secoes.push({ chave: f.id, nome: f.name, cor: q.color, folderId: f.id, items })
    }
  }
  secoes.push({ chave: 'sem-pasta', nome: 'Sem pasta', cor: 'var(--fg3)', items: semPasta })
  return secoes
}

export function TasksPanel() {
  const tasks = useStore(st => st.tasks)
  const filterPrazo = useStore(st => st.filterPrazo)
  const showCompleted = useStore(st => st.showCompleted)
  const toggleTask = useStore(st => st.toggleTask)
  const toggleFilter = useStore(st => st.toggleFilter)
  const addTask = useStore(st => st.addTask)
  const editTask = useStore(st => st.editTask)
  const deleteTask = useStore(st => st.deleteTask)
  const setTaskDeadline = useStore(st => st.setTaskDeadline)
  const setView = useStore(st => st.setView)
  const para = useStore(st => st.para)

  /** Nome da pasta de uma tarefa, pra abrir a tarefa com o caminho certo. */
  const pastaDe = (folderId?: string) => {
    if (!folderId) return null
    for (const q of Object.values(para)) {
      const f = q.folders.find(x => x.id === folderId)
      if (f) return { nome: f.name, cor: q.color, categoria: q.id }
    }
    return null
  }
  /** Abrir a tarefa leva junto a pasta dela, pra o caminho no topo dizer a
   *  verdade (PARA > Areas > Habitos > a tarefa) em vez de mostrar a ultima
   *  pasta que por acaso estava aberta. */
  const abrirTarefa = (id: string, folderId?: string) => {
    const p = pastaDe(folderId)
    setView('task', p ? { task: id, category: p.categoria, folder: folderId! } : { task: id, category: '', folder: '' })
  }

  const [draftFor, setDraftFor] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const pending = contarAbertas(tasks)
  const comPrazo = contarAbertasComPrazo(tasks)
  const secoes = agruparPorPasta(tasks, para)

  /** Fade de rolagem na base (TASK-349). */
  const listRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(listRef, [tasks, filterPrazo, showCompleted])

  const submitTask = (secao: SecaoTarefas) => {
    if (draft.trim()) addTask(draft, secao.folderId)
    setDraft('')
    // mantém o campo aberto pra adicionar várias seguidas
  }
  const startEdit = (id: string, text: string) => { setEditing(id); setEditText(text) }
  const commitEdit = () => { if (editing) editTask(editing, editText); setEditing(null) }

  return (
    <>
      <TabBar
        indicatorColor="var(--dott-gradient-linear)"
        activeKey={filterPrazo ? 'prazo' : 'afazer'}
        onChange={key => { if (key !== (filterPrazo ? 'prazo' : 'afazer')) toggleFilter('prazo') }}
        items={[
          { key: 'prazo', label: 'PRAZO', icon: 'prazo', count: comPrazo, title: 'Só as tarefas com prazo' },
          { key: 'afazer', label: 'A Fazer', icon: 'grupo', count: pending, title: 'Tarefas em aberto' },
        ]}
      />

      <div
        ref={listRef}
        key={filterPrazo ? 'prazo' : 'afazer'}
        className={`${s.list} tabContent scrollFadeBottom`}
        style={{ '--content-dir': filterPrazo ? -1 : 1 } as React.CSSProperties}
      >
        {tasks.length === 0 ? (
          <div className={s.empty}>
            <div className={s.checkIcon}><Icon name="tarefa" size={22} /></div>
            <p>Nenhuma tarefa ainda</p>
          </div>
        ) : (
          <>
            {secoes.map(secao => {
              const items = visibleTasks(secao.items, filterPrazo, showCompleted)
              const done = secao.items.filter(t => t.done).length
              const total = secao.items.length
              return (
                <div key={secao.chave} className={s.group}>
                  <div className={s.groupHeader}>
                    <span className={s.dot} style={{ background: secao.cor }} />
                    <span className={s.groupName}>{secao.nome}</span>
                    <span className={s.groupProg}>{done}/{total}</span>
                  </div>

                  {items.map(task => (
                    <div key={task.id} className={s.item}>
                      <button
                        className={`${s.check} ${task.done ? s.done : ''}`}
                        onClick={() => toggleTask(task.id)}
                        title={task.done ? 'Reabrir' : 'Concluir'}
                        aria-label={task.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                      />

                      {editing === task.id ? (
                        <input
                          className={s.editInput}
                          value={editText}
                          autoFocus
                          onChange={e => setEditText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                        />
                      ) : (
                        <button
                          className={s.corpoTarefa}
                          onClick={() => abrirTarefa(task.id, task.folderId)}
                          onDoubleClick={e => { e.stopPropagation(); startEdit(task.id, task.text) }}
                          title="Abrir a tarefa"
                        >
                          <span className={`${s.text} ${task.done ? s.done : ''}`}>{task.text}</span>
                          {(task.deadline || task.notes) && (
                            <span className={s.tarefaMeta}>
                              {task.deadline && (
                                <span className={`${s.deadline} ${task.over ? s.over : task.urgent ? s.urgent : ''}`}>
                                  {task.over ? 'atrasado' : task.urgent ? 'hoje' : task.deadline.slice(5).replace('-', '/')}
                                </span>
                              )}
                              {task.notes && <span className={s.temNota} title="Tem anotação"><Icon name="nota" size={11} /></span>}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Acoes rapidas: mesmo tamanho, mesma caixa, cada uma com
                          a cor do que faz. Antes o prazo era um icone solto sem
                          area de clique e o excluir era um botao menor - dois
                          pesos diferentes na mesma linha. */}
                      <div className={s.acoes}>
                        <label
                          className={`${s.acaoBtn} ${task.deadline ? s.acaoAtiva : ''}`}
                          title={task.deadline ? `Prazo: ${task.deadline}` : 'Definir prazo'}
                        >
                          <Icon name="prazo" size={13} />
                          <input
                            type="date"
                            className={s.dateInput}
                            value={task.deadline ?? ''}
                            onChange={e => setTaskDeadline(task.id, e.target.value || null)}
                          />
                        </label>
                        <button
                          className={`${s.acaoBtn} ${s.acaoPerigo}`}
                          title="Excluir tarefa"
                          aria-label="Excluir tarefa"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Icon name="lixo" size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Adicionar: o "+" ocupa exatamente a posicao da caixa de
                      marcar, entao a linha se le como um lugar vazio esperando
                      virar tarefa. O icone de tarefa (a caixa com check) NAO
                      serve aqui: ele significa ESTADO de tarefa, nao criacao. */}
                  {draftFor === secao.chave ? (
                    <div className={s.addRow}>
                      <span className={s.addMais} aria-hidden="true"><Icon name="mais" size={13} /></span>
                      <input
                        className={s.addInput}
                        placeholder="O que precisa ser feito?"
                        value={draft}
                        autoFocus
                        onChange={e => setDraft(e.target.value)}
                        onBlur={() => { setDraftFor(null); setDraft('') }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitTask(secao)
                          if (e.key === 'Escape') { setDraftFor(null); setDraft('') }
                        }}
                      />
                      <kbd className={s.addDica}>Enter</kbd>
                    </div>
                  ) : (
                    <button className={s.addTask} onClick={() => { setDraft(''); setDraftFor(secao.chave) }}>
                      <span className={s.addMais} aria-hidden="true"><Icon name="mais" size={13} /></span>
                      Adicionar tarefa
                    </button>
                  )}
                </div>
              )
            })}

            <div
              className={`${s.completedToggle} ${showCompleted ? s.completedAberto : ''}`}
              onClick={() => toggleFilter('completed')}
            >
              <span className={s.completedSeta} />
              {showCompleted ? 'Ocultar concluídas' : 'Ver concluídas'}
            </div>
          </>
        )}
      </div>
    </>
  )
}
