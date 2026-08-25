import { useState } from 'react'
import { useStore } from '../../store'
import { Icon } from '../../components/Icon'
import s from './TasksPanel.module.css'

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
  const addGroup = useStore(st => st.addGroup)
  const deleteGroup = useStore(st => st.deleteGroup)
  const setView = useStore(st => st.setView)
  const para = useStore(st => st.para)

  /** Nome da pasta de uma tarefa, pra mostrar de onde ela veio. */
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
  const [groupDraft, setGroupDraft] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const allTasks = tasks.flatMap(g => g.items)
  const pending = allTasks.filter(t => !t.done).length

  const submitTask = (groupId: string) => {
    if (draft.trim()) addTask(groupId, draft)
    setDraft('')
    // mantém o campo aberto pra adicionar várias seguidas
  }
  const submitGroup = () => {
    if (groupDraft.trim()) addGroup(groupDraft)
    setGroupDraft(''); setAddingGroup(false)
  }
  const startEdit = (id: string, text: string) => { setEditing(id); setEditText(text) }
  const commitEdit = () => { if (editing) editTask(editing, editText); setEditing(null) }

  return (
    <>
      <div className={s.header}>
        <div className={s.title}>
          Tarefas
          {pending > 0 && <span className={s.badge}>{pending}</span>}
        </div>
      </div>

      <div className={s.filter}>
        <button className={`${s.filterToggle} ${filterPrazo ? s.active : ''}`} onClick={() => !filterPrazo && toggleFilter('prazo')} title="Só as tarefas com prazo">
          <Icon name="prazo" size={12} /> PRAZO
        </button>
        <button className={`${s.filterToggle} ${!filterPrazo ? s.active : ''}`} onClick={() => filterPrazo && toggleFilter('prazo')} title="Todas as tarefas">
          <Icon name="grupo" size={12} /> TODOS
        </button>
      </div>

      <div className={s.list}>
        {tasks.length === 0 ? (
          <div className={s.empty}>
            <div className={s.checkIcon}><Icon name="tarefa" size={22} /></div>
            <p>Nenhuma tarefa ainda</p>
          </div>
        ) : (
          <>
            {tasks.map(group => {
              let items = showCompleted ? group.items : group.items.filter(t => !t.done)
              if (filterPrazo) items = items.filter(t => t.deadline)
              const done = group.items.filter(t => t.done).length
              const total = group.items.length
              return (
                <div key={group.id} className={s.group}>
                  <div className={s.groupHeader}>
                    <span className={s.dot} style={{ background: group.color }} />
                    <span className={s.groupName}>{group.name}</span>
                    <span className={s.groupProg}>{done}/{total}</span>
                    <button className={s.groupDel} title="Excluir grupo" onClick={() => deleteGroup(group.id)}>
                      <Icon name="lixo" size={12} />
                    </button>
                  </div>

                  {items.map(task => {
                    const pasta = pastaDe(task.folderId)
                    return (
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
                          {(pasta || task.deadline || task.notes) && (
                            <span className={s.tarefaMeta}>
                              {pasta && (
                                <span className={s.pastaChip}>
                                  <span className={s.pastaPonto} style={{ background: pasta.cor }} />
                                  {pasta.nome}
                                </span>
                              )}
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
                  )})}

                  {/* Adicionar: o "+" ocupa exatamente a posicao da caixa de
                      marcar, entao a linha se le como um lugar vazio esperando
                      virar tarefa. O icone de tarefa (a caixa com check) NAO
                      serve aqui: ele significa ESTADO de tarefa, nao criacao. */}
                  {draftFor === group.id ? (
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
                          if (e.key === 'Enter') submitTask(group.id)
                          if (e.key === 'Escape') { setDraftFor(null); setDraft('') }
                        }}
                      />
                      <kbd className={s.addDica}>Enter</kbd>
                    </div>
                  ) : (
                    <button className={s.addTask} onClick={() => { setDraft(''); setDraftFor(group.id) }}>
                      <span className={s.addMais} aria-hidden="true"><Icon name="mais" size={13} /></span>
                      Adicionar tarefa
                    </button>
                  )}
                </div>
              )
            })}

            {addingGroup ? (
              <input
                className={s.addGroupInput}
                placeholder="Nome do grupo… (Enter)"
                value={groupDraft}
                autoFocus
                onChange={e => setGroupDraft(e.target.value)}
                onBlur={submitGroup}
                onKeyDown={e => { if (e.key === 'Enter') submitGroup(); if (e.key === 'Escape') { setGroupDraft(''); setAddingGroup(false) } }}
              />
            ) : (
              <button className={s.addGroup} onClick={() => { setGroupDraft(''); setAddingGroup(true) }}>
                <Icon name="grupo" size={13} /> Novo grupo
              </button>
            )}

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
