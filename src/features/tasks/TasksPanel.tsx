import { useState } from 'react'
import { useStore } from '../../store'
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
        <button className={`${s.filterToggle} ${filterPrazo ? s.active : ''}`} onClick={() => !filterPrazo && toggleFilter('prazo')}>PRAZO</button>
        <button className={`${s.filterToggle} ${!filterPrazo ? s.active : ''}`} onClick={() => filterPrazo && toggleFilter('prazo')}>TODOS</button>
      </div>

      <div className={s.list}>
        {tasks.length === 0 ? (
          <div className={s.empty}>
            <div className={s.checkIcon}>✓</div>
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
                    <button className={s.groupDel} title="Excluir grupo" onClick={() => deleteGroup(group.id)}>×</button>
                  </div>

                  {items.map(task => (
                    <div key={task.id} className={s.item}>
                      <div className={`${s.check} ${task.done ? s.done : ''}`} onClick={() => toggleTask(task.id)} />
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
                        <span className={`${s.text} ${task.done ? s.done : ''}`} onDoubleClick={() => startEdit(task.id, task.text)} title="Duplo-clique para editar">
                          {task.text}
                        </span>
                      )}
                      {task.deadline && (
                        <span className={`${s.deadline} ${task.over ? s.over : task.urgent ? s.urgent : ''}`}>
                          {task.over ? 'atrasado' : task.urgent ? 'hoje' : task.deadline.slice(5).replace('-', '/')}
                        </span>
                      )}
                      <label className={s.dateBtn} title="Definir prazo">
                        📅
                        <input
                          type="date"
                          className={s.dateInput}
                          value={task.deadline ?? ''}
                          onChange={e => setTaskDeadline(task.id, e.target.value || null)}
                        />
                      </label>
                      <button className={s.taskDel} title="Excluir" onClick={() => deleteTask(task.id)}>×</button>
                    </div>
                  ))}

                  {draftFor === group.id ? (
                    <input
                      className={s.addInput}
                      placeholder="Nova tarefa… (Enter)"
                      value={draft}
                      autoFocus
                      onChange={e => setDraft(e.target.value)}
                      onBlur={() => { setDraftFor(null); setDraft('') }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitTask(group.id)
                        if (e.key === 'Escape') { setDraftFor(null); setDraft('') }
                      }}
                    />
                  ) : (
                    <button className={s.addTask} onClick={() => { setDraft(''); setDraftFor(group.id) }}>+ tarefa</button>
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
              <button className={s.addGroup} onClick={() => { setGroupDraft(''); setAddingGroup(true) }}>+ Novo grupo</button>
            )}

            <div className={s.completedToggle} onClick={() => toggleFilter('completed')}>
              {showCompleted ? '▾ Ocultar concluídas' : '▸ Ver concluídas'}
            </div>
          </>
        )}
      </div>
    </>
  )
}
