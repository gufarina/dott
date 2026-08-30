import { useMemo, useRef, useState } from 'react'
import { useStore, type Note, SEM_PASTA_ID, notasSemPasta } from '../../store'
import { saveImageFile } from '../../lib/attachments'
import { showToast } from '../../components/Toast'
import { Icon } from '../../components/Icon'
import { Modal, ModalHint, ModalField, ModalInput, ModalFooter, ModalButton } from '../../components/Modal'
import { GlyphPicker } from '../../components/GlyphPicker'
import { NoteGlyph } from '../../components/NoteGlyphs'
import { hojeISO, amanhaISO } from '../../lib/localDate'
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade'
// Mesma gramatica que o editor ja usa pro bloco de imagem (imageBlocks.ts) -
// nao inventa um segundo parser so pra esta previa (TASK-362).
import { matchImageLine } from '../editor/imageLine'
import s from './FolderNotesView.module.css'

/** Previa de UMA nota (TASK-362): capa explicita vence; sem capa, a
 *  PRIMEIRA imagem embutida no corpo (mesma linha `![legenda](url)` que o
 *  editor ja reconhece - matchImageLine de imageLine.ts, nao um parser
 *  novo). Upload ainda pendente (`hit.pending`) nunca vira previa - a URL
 *  provisoria nao aponta pra arquivo nenhum no disco. Pura: so olha texto
 *  ja em memoria, nunca le arquivo. Exportada para teste isolado (TDD). */
export function notePreviewUrl(note: Pick<Note, 'cover' | 'body'>): string | null {
  if (note.cover) return note.cover
  for (const line of note.body.split('\n')) {
    const hit = matchImageLine(line)
    if (hit && !hit.pending) return hit.url
  }
  return null
}

export function FolderNotesView() {
  const folder = useStore(st => st.folder)
  const category = useStore(st => st.category)
  const notes = useStore(st => st.notes)
  const graph = useStore(st => st.graph)
  const para = useStore(st => st.para)
  const setView = useStore(st => st.setView)
  const createNote = useStore(st => st.createNote)
  const createFolder = useStore(st => st.createFolder)
  const tasks = useStore(st => st.tasks)
  const addTask = useStore(st => st.addTask)
  const setTaskDeadline = useStore(st => st.setTaskDeadline)
  const toggleTask = useStore(st => st.toggleTask)
  const setFolderCover = useStore(st => st.setFolderCover)
  const setNoteCover = useStore(st => st.setNoteCover)
  const deleteFolder = useStore(st => st.deleteFolder)
  const fileRef = useRef<HTMLInputElement>(null)
  const noteFileRef = useRef<HTMLInputElement>(null)

  /** Nota que esta recebendo capa/simbolo agora. */
  const [alvoNota, setAlvoNota] = useState<string | null>(null)
  const [seletorSimbolo, setSeletorSimbolo] = useState<string | null>(null)
  const [novaPasta, setNovaPasta] = useState(false)
  const [nomePasta, setNomePasta] = useState('')
  const [novaTarefa, setNovaTarefa] = useState(false)
  const [textoTarefa, setTextoTarefa] = useState('')
  /** true abre a confirmacao de excluir a pasta aberta agora. */
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  /** Prazo escolhido AINDA na criacao (YYYY-MM-DD ou null) - antes so dava
   *  pra definir depois, editando a tarefa ja criada. */
  const [prazoTarefa, setPrazoTarefa] = useState<string | null>(null)

  /** Balde virtual "Sem pasta" (folder === SEM_PASTA_ID, entrada no PARAGrid):
   *  nao e uma Pasta de verdade - so agrupa na tela a Nota que ficou orfa
   *  depois de `deleteFolder`. Nunca tem categoria/pasta real, entao nao
   *  ganha capa, nao cria pasta/nota/tarefa dentro dela nem pode ser
   *  "excluida" - so navega. */
  const isSemPasta = folder === SEM_PASTA_ID
  const folderNotes = isSemPasta ? notasSemPasta(notes) : notes.filter(n => n.folderId === folder)

  /** Previa de cada nota desta pasta (TASK-362): a capa explicita (n.cover)
   *  vence; sem capa, usa a PRIMEIRA imagem embutida no corpo (mesma linha
   *  `![legenda](url)` que o editor ja reconhece - nao inventa um criterio
   *  novo). So recalcula quando o vault (`notes`) ou a pasta mudam - nao a
   *  cada digitacao nos modais desta tela. So acha a URL (string ja em
   *  memoria, vault inteiro ja carregado); nenhum arquivo e lido aqui. */
  const notePreviews = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of notes) {
      const pertence = isSemPasta ? !n.folderId : n.folderId === folder
      if (!pertence) continue
      const url = notePreviewUrl(n)
      if (url) map.set(n.id, url)
    }
    return map
  }, [notes, folder, isSemPasta])

  /** URLs de previa que falharam ao carregar (arquivo sumiu do disco) - cai
   *  pro simbolo/estado neutro em vez de icone de imagem quebrada. */
  const [brokenPreviews, setBrokenPreviews] = useState<Set<string>>(new Set())
  const marcarQuebrada = (url: string) =>
    setBrokenPreviews(prev => (prev.has(url) ? prev : new Set(prev).add(url)))
  /** Tarefas desta pasta (TASK-374: sem grupo - a Pasta e a unica hierarquia).
   *  O balde "Sem pasta" de Nota nao repete a Tarefa aqui - a Tarefa sem
   *  pasta ja tem o proprio balde "Sem pasta", sempre visivel em
   *  TasksPanel.tsx (painel fixo, nao precisa de uma segunda porta). */
  const folderTasks = isSemPasta ? [] : tasks.filter(t => t.folderId === folder)
  const tarefasAbertas = folderTasks.filter(t => !t.done).length
  const tarefasFeitas = folderTasks.length - tarefasAbertas
  const folderObj = category && folder
    ? para[category]?.folders.find(f => f.id === folder)
    : undefined
  const bannerName = isSemPasta ? 'Sem pasta' : (folderObj?.name ?? 'Notas')

  /** Fade de rolagem na base (TASK-349) - tarefas e notas da pasta juntas. */
  const bodyRef = useRef<HTMLDivElement>(null)
  useScrollEdgeFade(bodyRef, [folderNotes.length, folderTasks.length])

  const openNote = (id: string) => setView('editor', { note: id })

  const newNote = () => {
    if (!folder || isSemPasta) return
    const id = createNote(folder, 'Nova nota')
    showToast('info', 'Nota criada', 'Escreva do seu jeito. O Dott conecta sozinho.')
    setView('editor', { note: id })
  }

  /** Cria a tarefa JA amarrada nesta pasta (TASK-374: sem grupo - antes
   *  criava/reusava uma "lista" que so copiava o nome da pasta, puro
   *  duplicado ja que a Pasta e a hierarquia real). */
  const criarTarefa = () => {
    const texto = textoTarefa.trim()
    if (!texto || !folder || isSemPasta) return
    const id = addTask(texto, folder)
    if (prazoTarefa) setTaskDeadline(id, prazoTarefa)
    setTextoTarefa('')
    setPrazoTarefa(null)
    showToast('info', 'Tarefa criada', `Em "${folderObj?.name ?? 'Tarefas'}".`)
  }

  const criarPasta = () => {
    const nome = nomePasta.trim()
    if (!nome || !category || isSemPasta) return
    createFolder(category, nome)
    showToast('info', 'Pasta criada', `"${nome}" adicionada em ${para[category]?.label ?? 'PARA'}.`)
    setNomePasta('')
    setNovaPasta(false)
  }

  /** Resumo do conteudo da pasta pra confirmacao de exclusao (ex.: "9 notas
   *  e 1 tarefa"). So entra na frase o que a pasta de fato tem. */
  const resumoConteudo = [
    folderNotes.length > 0 ? `${folderNotes.length} nota${folderNotes.length === 1 ? '' : 's'}` : null,
    folderTasks.length > 0 ? `${folderTasks.length} tarefa${folderTasks.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' e ')

  /** Onde a Nota/Tarefa desta pasta vai continuar visivel depois da
   *  exclusao - a confirmacao precisa dizer a verdade sobre ONDE olhar, nao
   *  so que "continua existindo" (CEO, 30/08/2026: esconder sem avisar
   *  onde procurar destroi a mesma confianca que apagar destruiria). So
   *  entra na frase o que a pasta de fato tem. */
  const explicacaoLocalizacao = [
    folderNotes.length > 0 ? 'as notas vão para "Sem pasta" na tela inicial' : null,
    folderTasks.length > 0 ? 'as tarefas vão para "Sem pasta" na lista de tarefas' : null,
  ].filter(Boolean).join(', e ')

  const excluirPasta = () => {
    if (!category || !folder || isSemPasta) return
    const nome = folderObj?.name ?? 'Pasta'
    deleteFolder(category, folder)
    setConfirmandoExclusao(false)
    showToast('info', 'Pasta excluída', `"${nome}" removida.`)
    setView('canvas', { category, folder: '' })
  }

  const pickCover = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !category || !folder || isSemPasta) return
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não foi possível salvar a imagem.'); return }
    setFolderCover(category, folder, url)
    showToast('info', 'Capa definida', `Capa de "${folderObj?.name ?? 'pasta'}" atualizada.`)
  }

  /** Capa da NOTA (vem do hover no card). */
  const onNoteFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const id = alvoNota
    setAlvoNota(null)
    if (!file || !id) return
    const url = await saveImageFile(file)
    if (!url) { showToast('warn', 'Erro', 'Não foi possível salvar a imagem.'); return }
    setNoteCover(id, url)
    showToast('info', 'Capa da nota', 'Imagem aplicada.')
  }

  return (
    <div className={s.wrap}>
      <div className={s.banner}>
        {folderObj?.cover
          ? <img src={folderObj.cover} className={s.bannerImg} alt="" />
          : <div className={s.bannerBg} style={{ background: folderObj?.bg }} />
        }
        <div className={s.bannerScrim} />
        <span className={s.bannerName}>{bannerName}</span>
        {!isSemPasta && (
          <button className={s.coverBtn} onClick={pickCover} title="Trocar capa da pasta">
            <Icon name="imagem" size={13} />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </div>

      {/* Barra de acoes: UM botao por item, cada um com icone e rotulo.
          A pasta guarda NOTA e TAREFA - por isso os dois nascem aqui.
          O balde "Sem pasta" (isSemPasta) e so navegacao - nao e uma Pasta
          de verdade, entao nao ganha nenhuma acao de criar/excluir aqui. */}
      <div className={s.toolbar}>
        <span className={s.count}>
          {folderNotes.length} nota{folderNotes.length === 1 ? '' : 's'}
          {folderTasks.length > 0 && (
            <> · {tarefasAbertas} de {folderTasks.length} tarefa{folderTasks.length === 1 ? '' : 's'} aberta{tarefasAbertas === 1 ? '' : 's'}</>
          )}
        </span>
        {!isSemPasta && (
          <>
            <button className={`${s.btnNew} hoverZoom hoverGlow`} onClick={newNote} title="Criar uma nota nesta pasta">
              <Icon name="nota" size={14} /> Nova nota
            </button>
            <button className={`${s.btnNewAlt} hoverZoom hoverGlow`} onClick={() => setNovaTarefa(true)} title="Criar uma tarefa nesta pasta">
              <Icon name="tarefa" size={14} /> Nova tarefa
            </button>
            <button className={`${s.btnNewAlt} hoverZoom hoverGlow`} onClick={() => setNovaPasta(true)} title="Criar outra pasta nesta categoria">
              <Icon name="pasta" size={14} /> Nova pasta
            </button>
            <button className={s.btnDelete} onClick={() => setConfirmandoExclusao(true)} title="Excluir esta pasta">
              <Icon name="lixo" size={14} /> Excluir pasta
            </button>
          </>
        )}
      </div>

      {novaTarefa && (
        <Modal title="Nova tarefa" onClose={() => { setNovaTarefa(false); setTextoTarefa(''); setPrazoTarefa(null) }}>
          <ModalField label={`Em ${folderObj?.name ?? 'nesta pasta'}`}>
            <ModalInput
              placeholder="O que precisa ser feito?"
              value={textoTarefa}
              autoFocus
              onChange={e => setTextoTarefa(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarTarefa() }}
            />
          </ModalField>

          {/* Gesto secundario: sem prazo, o Enter no campo acima ja basta.
              Quem quer prazo resolve aqui, sem o modal virar formulario. */}
          <div className={s.novaTarefaPrazo}>
            <label
              className={`${s.novaTarefaPrazoBtn} ${prazoTarefa ? s.novaTarefaPrazoBtnAtivo : ''}`}
              title={prazoTarefa ? `Prazo: ${prazoTarefa}` : 'Definir prazo'}
            >
              <Icon name="prazo" size={13} />
              {prazoTarefa ? prazoTarefa.slice(5).replace('-', '/') : 'Prazo'}
              <input
                type="date"
                className={s.novaTarefaPrazoInput}
                value={prazoTarefa ?? ''}
                onChange={e => setPrazoTarefa(e.target.value || null)}
              />
            </label>
            <button type="button" className={s.novaTarefaPrazoAtalho} onClick={() => setPrazoTarefa(hojeISO())}>
              Hoje
            </button>
            <button type="button" className={s.novaTarefaPrazoAtalho} onClick={() => setPrazoTarefa(amanhaISO())}>
              Amanhã
            </button>
            {prazoTarefa && (
              <button
                type="button"
                className={s.novaTarefaPrazoLimpar}
                onClick={() => setPrazoTarefa(null)}
                title="Tirar o prazo"
                aria-label="Tirar o prazo"
              >
                <Icon name="fechar" size={11} />
              </button>
            )}
          </div>

          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => { setNovaTarefa(false); setTextoTarefa(''); setPrazoTarefa(null) }}>Cancelar</ModalButton>
            <ModalButton variant="primary" onClick={criarTarefa}>
              <Icon name="tarefa" size={13} /> Criar tarefa
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      {novaPasta && (
        <Modal title="Nova pasta" onClose={() => { setNovaPasta(false); setNomePasta('') }}>
          <ModalField label={`Em ${category ? para[category]?.label ?? '' : ''}`}>
            <ModalInput
              placeholder="Nome da pasta"
              value={nomePasta}
              autoFocus
              onChange={e => setNomePasta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarPasta() }}
            />
          </ModalField>
          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => { setNovaPasta(false); setNomePasta('') }}>Cancelar</ModalButton>
            <ModalButton variant="primary" onClick={criarPasta}>
              <Icon name="pasta" size={13} /> Criar pasta
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      {confirmandoExclusao && (
        <Modal title="Excluir pasta" onClose={() => setConfirmandoExclusao(false)}>
          {resumoConteudo ? (
            <>
              <ModalHint>Esta pasta tem {resumoConteudo}.</ModalHint>
              <p className={s.avisoExclusao}>
                A pasta vai sumir. Nada é apagado: {explicacaoLocalizacao}.
              </p>
            </>
          ) : (
            <ModalHint>Esta pasta está vazia. Ela vai sumir.</ModalHint>
          )}
          <ModalFooter>
            <ModalButton variant="ghost" onClick={() => setConfirmandoExclusao(false)}>Cancelar</ModalButton>
            <ModalButton variant="ghost" onClick={excluirPasta}>
              <Icon name="lixo" size={13} /> Excluir pasta
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}

      <div ref={bodyRef} className={`${s.body} scrollFadeBottom`}>
        {/* As tarefas da pasta vem ANTES das notas: sao o que tem prazo. */}
        {folderTasks.length > 0 && (
          <section className={s.secaoTarefas}>
            <div className={s.secaoTitulo}>
              <Icon name="tarefa" size={13} />
              Tarefas desta pasta
              <span className={s.secaoContagem}>{tarefasFeitas}/{folderTasks.length}</span>
            </div>
            <div className={s.listaTarefas}>
              {folderTasks.map(t => (
                <div key={t.id} className={s.linhaTarefa}>
                  <button
                    className={`${s.tarefaCheck} ${t.done ? s.tarefaFeita : ''}`}
                    onClick={() => toggleTask(t.id)}
                    title={t.done ? 'Reabrir' : 'Concluir'}
                    aria-label={t.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  />
                  <button
                    className={s.tarefaCorpo}
                    onClick={() => setView('task', { task: t.id })}
                    title="Abrir a tarefa"
                  >
                    <span className={`${s.tarefaTexto} ${t.done ? s.tarefaTextoFeito : ''}`}>{t.text}</span>
                    {t.deadline && (
                      <span className={s.tarefaMeta}>
                        <span className={`${s.tarefaPrazo} ${t.over ? s.prazoAtrasado : t.urgent ? s.prazoHoje : ''}`}>
                          {t.over ? 'atrasado' : t.urgent ? 'hoje' : t.deadline.slice(5).replace('-', '/')}
                        </span>
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {folderNotes.length === 0 ? (
          <div className={s.empty}>
            <p>{isSemPasta ? 'Nenhuma nota sem pasta agora.' : folderTasks.length > 0 ? 'Nenhuma nota nesta pasta ainda.' : 'Esta pasta está vazia.'}</p>
            {!isSemPasta && (
              <div className={s.emptyAcoes}>
                <button className={`${s.btnNewBig} hoverZoom hoverGlow`} onClick={newNote}>
                  <Icon name="nota" size={15} /> Criar primeira nota
                </button>
                {folderTasks.length === 0 && (
                  <button className={`${s.btnNewBigAlt} hoverZoom hoverGlow`} onClick={() => setNovaTarefa(true)}>
                    <Icon name="tarefa" size={15} /> Criar primeira tarefa
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={s.grid}>
            {folderNotes.map(n => {
              const preview = notePreviews.get(n.id)
              const previewOk = preview && !brokenPreviews.has(preview)
              return (
              <div key={n.id} className={`${s.card} hoverZoom`} onClick={() => openNote(n.id)}>
                <div className={s.thumb}>
                  {previewOk
                    ? <img
                        src={preview}
                        className={s.thumbImg}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() => marcarQuebrada(preview)}
                      />
                    : n.glyph
                      ? <span className={s.thumbGlyph}><NoteGlyph id={n.glyph} size={34} /></span>
                      : null}
                  {(graph.byNote[n.id]?.length ?? 0) > 0 && (
                    <span className={s.badge} title="Conexões que o Dott achou sozinho">
                      {graph.byNote[n.id].length} ligada{graph.byNote[n.id].length > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* So aparece no hover: dar capa ou simbolo a nota. */}
                  <div className={s.hoverBar} onClick={e => e.stopPropagation()}>
                    <button
                      className={s.hoverBtn}
                      title="Usar imagem do computador"
                      onClick={() => { setAlvoNota(n.id); noteFileRef.current?.click() }}
                    >
                      <Icon name="imagem" size={13} />
                    </button>
                    <button
                      className={s.hoverBtn}
                      title="Escolher um símbolo do Dott"
                      onClick={() => setSeletorSimbolo(n.id)}
                    >
                      <Icon name="simbolo" size={13} />
                    </button>
                    {(n.cover || n.glyph) && (
                      <button
                        className={s.hoverBtn}
                        title="Tirar capa/símbolo"
                        onClick={() => {
                          if (n.cover) setNoteCover(n.id, '')
                          if (n.glyph) useStore.getState().setNoteGlyph(n.id, undefined)
                        }}
                      >
                        <Icon name="fechar" size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTitle}>{n.title}</div>
                  <div className={s.cardDate}>{n.updatedAt || n.date}</div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      <input ref={noteFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onNoteFile} />

      {seletorSimbolo && (
        <GlyphPicker
          atual={notes.find(n => n.id === seletorSimbolo)?.glyph}
          onEscolher={g => {
            useStore.getState().setNoteGlyph(seletorSimbolo, g)
            setSeletorSimbolo(null)
          }}
          onFechar={() => setSeletorSimbolo(null)}
        />
      )}
    </div>
  )
}
