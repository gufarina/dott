import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { Icon } from '../../components/Icon'
import { showToast } from '../../components/Toast'
import s from './TaskDetail.module.css'

/** Tela da tarefa. A lista da direita mostra o titulo; aqui mora o resto:
 *  prazo, pasta do PARA, grupo e a anotacao que nao cabe numa linha.
 *
 *  Ate 25/08/2026 a tarefa nao tinha "dentro": clicar nela so editava o texto
 *  no lugar. Como tarefa agora pertence a uma pasta, ela precisava de um lugar
 *  proprio pra mostrar essa relacao. */
export function TaskDetail() {
  const taskId = useStore(st => st.task)
  const tasks = useStore(st => st.tasks)
  const para = useStore(st => st.para)
  const notes = useStore(st => st.notes)
  const setView = useStore(st => st.setView)
  const toggleTask = useStore(st => st.toggleTask)
  const editTask = useStore(st => st.editTask)
  const deleteTask = useStore(st => st.deleteTask)
  const setTaskDeadline = useStore(st => st.setTaskDeadline)
  const setTaskFolder = useStore(st => st.setTaskFolder)
  const setTaskNotes = useStore(st => st.setTaskNotes)
  const setTaskGroup = useStore(st => st.setTaskGroup)

  const grupo = tasks.find(g => g.items.some(t => t.id === taskId))
  const task = grupo?.items.find(t => t.id === taskId)

  const [titulo, setTitulo] = useState(task?.text ?? '')
  const [anotacao, setAnotacao] = useState(task?.notes ?? '')
  const salvar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setTitulo(task?.text ?? '')
    setAnotacao(task?.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  if (!task || !grupo) {
    return (
      <div className={s.wrap}>
        <div className={s.vazio}>
          <p>Esta tarefa não existe mais.</p>
          <button className={s.btnVoltar} onClick={() => setView('board')}>Voltar ao quadro</button>
        </div>
      </div>
    )
  }

  /** Pasta atual + a categoria dela, pra mostrar o caminho inteiro. */
  const pasta = task.folderId
    ? Object.values(para).flatMap(q => q.folders.map(f => ({ ...f, quad: q })))
        .find(f => f.id === task.folderId)
    : undefined

  const notasDaPasta = task.folderId ? notes.filter(n => n.folderId === task.folderId) : []

  const salvarTitulo = () => {
    const t = titulo.trim()
    if (t && t !== task.text) editTask(task.id, t)
    else if (!t) setTitulo(task.text)
  }

  const escreverAnotacao = (v: string) => {
    setAnotacao(v)
    clearTimeout(salvar.current)
    salvar.current = setTimeout(() => setTaskNotes(task.id, v), 600)
  }

  const excluir = () => {
    deleteTask(task.id)
    showToast('info', 'Tarefa excluída', `"${task.text}" saiu da lista.`)
    setView(pasta ? 'canvas' : 'board', pasta ? { category: pasta.quad.id, folder: pasta.id } : {})
  }

  const estado = task.done ? 'concluída' : task.over ? 'atrasada' : task.urgent ? 'para hoje' : 'aberta'

  return (
    <div className={s.wrap}>
      {/* Cabecalho: o estado da tarefa e a primeira coisa que se le. */}
      <div className={`${s.topo} ${task.done ? s.topoFeito : ''}`}>
        <button
          className={`${s.check} ${task.done ? s.checkFeito : ''}`}
          onClick={() => toggleTask(task.id)}
          title={task.done ? 'Marcar como aberta' : 'Marcar como concluída'}
          aria-label={task.done ? 'Marcar como aberta' : 'Marcar como concluída'}
        />
        <textarea
          className={`${s.titulo} ${task.done ? s.tituloFeito : ''}`}
          value={titulo}
          rows={1}
          onChange={e => setTitulo(e.target.value)}
          onBlur={salvarTitulo}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() }
            if (e.key === 'Escape') setTitulo(task.text)
          }}
          placeholder="O que precisa ser feito?"
        />
        <span className={`${s.estado} ${s['estado-' + (task.done ? 'feito' : task.over ? 'atrasado' : task.urgent ? 'hoje' : 'aberto')]}`}>
          {estado}
        </span>
      </div>

      <div className={s.corpo}>
        {/* Os tres campos que dao contexto: quando, onde, em que lista. */}
        <div className={s.campos}>
          <label className={s.campo}>
            <span className={s.campoRotulo}><Icon name="prazo" size={13} /> Prazo</span>
            <div className={s.campoControle}>
              <input
                type="date"
                className={s.dataInput}
                value={task.deadline ?? ''}
                onChange={e => setTaskDeadline(task.id, e.target.value || null)}
              />
              {task.deadline && (
                <button className={s.limpar} onClick={() => setTaskDeadline(task.id, null)} title="Tirar o prazo">
                  <Icon name="fechar" size={12} />
                </button>
              )}
            </div>
          </label>

          <label className={s.campo}>
            <span className={s.campoRotulo}><Icon name="pasta" size={13} /> Pasta</span>
            <div className={s.campoControle}>
              <select
                className={s.select}
                value={task.folderId ?? ''}
                onChange={e => setTaskFolder(task.id, e.target.value || null)}
              >
                <option value="">Sem pasta</option>
                {Object.values(para).map(q => (
                  <optgroup key={q.id} label={q.label}>
                    {q.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </label>

          <label className={s.campo}>
            <span className={s.campoRotulo}><Icon name="grupo" size={13} /> Lista</span>
            <div className={s.campoControle}>
              <select
                className={s.select}
                value={grupo.id}
                onChange={e => setTaskGroup(task.id, e.target.value)}
              >
                {tasks.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </label>
        </div>

        {/* Atalho pra pasta: a tarefa mora num lugar, e da pra ir la. */}
        {pasta && (
          <button
            className={s.atalhoPasta}
            onClick={() => setView('canvas', { category: pasta.quad.id, folder: pasta.id })}
          >
            <span className={s.atalhoBolinha} style={{ background: pasta.quad.color }} />
            <span className={s.atalhoTexto}>
              <span className={s.atalhoNome}>{pasta.name}</span>
              <span className={s.atalhoMeta}>
                {pasta.quad.label} · {notasDaPasta.length} {notasDaPasta.length === 1 ? 'nota' : 'notas'} · {pasta.total} {pasta.total === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </span>
            <Icon name="voltar" size={13} className={s.atalhoSeta} />
          </button>
        )}

        <div className={s.bloco}>
          <div className={s.blocoRotulo}>Anotação</div>
          <textarea
            className={s.anotacao}
            value={anotacao}
            placeholder="O detalhe que não cabe no título: o combinado, o número, o link, o porquê."
            onChange={e => escreverAnotacao(e.target.value)}
          />
        </div>

        <div className={s.rodape}>
          <button className={s.excluir} onClick={excluir}>
            <Icon name="lixo" size={13} /> Excluir tarefa
          </button>
        </div>
      </div>
    </div>
  )
}
