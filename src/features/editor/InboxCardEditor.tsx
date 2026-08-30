/** InboxCardEditor.tsx — a tela de escrita (proposta aprovada em
 * preview/editor-nota-proposta.html) aberta em MODAL sobre um card do
 * Inbox (TASK-333, ordem urgente do CEO 28/08/2026: "clico na nota na
 * pasta de entrada... vc ate fez uma proposta e nao veio").
 *
 * Decisao de fronteira: um card do Inbox ainda NAO e uma Nota (sem
 * `folderId`, fora de `notes[]`) - reusar `NoteEditor.tsx` inteiro pediria
 * fingir uma pasta que nao existe (breadcrumb, ajudante de pasta, Conexoes
 * dependem de PARA). Em vez de uma SEGUNDA implementacao de editor, este
 * componente reusa as MESMAS pecas profundas que o NoteEditor usa por
 * baixo - `LiveMarkdownEditor`, `SelectionToolbar`, `SlashMenu` - pra editar
 * o TEXTO cru do card.
 *
 * TASK-335 (CEO: "esta muito cru... quero algo WOW, ferramentas de edicao,
 * poder adicionar imagem, e um motor que va identificando em tempo real com
 * qual nota se conecta") fecha as duas dividas que a TASK-333 tinha deixado
 * documentadas:
 *   1. Imagem: colar/arrastar/escolher agora funciona aqui do MESMO jeito
 *      que em NoteEditor.tsx - mesmo `insertImage`, mesmo `imageBlocks`,
 *      mesmo `imageFromEvent`/`saveImageFile` (lib/attachments.ts). O card
 *      ja tem pra onde gravar anexo (o mesmo vault de attachments que as
 *      Notas usam) - a barreira antiga nao existe mais.
 *   2. Conexao em tempo real: o rascunho entra como mais um no no MESMO
 *      motor determinístico (`buildGraph`, lib/graphify.ts) que liga Notas
 *      salvas, descartavel no fim do calculo (id sentinela, nunca gravado
 *      em lugar nenhum). Zero motor novo, zero rede, zero modelo.
 *
 * TASK-335 REABERTA (28/08/2026, CEO viu o app reconstruido: "mentira, ta
 * igual, voce nao ajustou, corrige") - a rodada anterior deixou tudo isso
 * IMPLEMENTADO mas INVISIVEL em repouso: SelectionToolbar so aparece com
 * selecao, SlashMenu so com "/", Conexoes so com `.length > 0`. Com o modal
 * recem-aberto e nada selecionado - exatamente como o CEO abre - a tela
 * era identica a antes. Esta rodada corrige o ESTADO DE REPOUSO, nao o
 * mecanismo (que ja funcionava):
 *   3. Barra de formatacao PERMANENTE (nao mais so-por-selecao) - ver
 *      `.toolbar` abaixo. SelectionToolbar continua existindo pro gesto de
 *      selecionar; a barra fixa e um canal a mais, nao substitui.
 *   4. Regiao de Conexoes SEMPRE presente, com rotulo e estado vazio
 *      honesto ("ainda nao encontrei nada relacionado") quando nao ha
 *      parentesco - nunca escondida atras de `.length > 0`. O motivo
 *      (ACHADA/INFERIDA) agora e texto visivel no proprio chip, nao mais
 *      preso num `title` de tooltip nativo (o mesmo erro de "existe mas
 *      nao se ve" que motivou esta rodada inteira) - mesma receita que
 *      `Constellation.tsx` ja usa pra Conexoes salvas (decisao-chave do
 *      Client: "toda conexao carrega o motivo em portugues, exibido").
 *   5. Linha de contexto (tipo detectado, etiquetas, destino sugerido) -
 *      todo dado que JA existe no modelo (`detectType`, `extractTags`,
 *      `suggestFolder` - os tres ja usados em InboxPanel.tsx pra este
 *      mesmo card, antes de capturar) e ajuda a decisao de destino que
 *      este modal existe pra tomar. "Capturado em" NAO entrou: o
 *      timestamp mora no `InboxCard` que InboxPanel.tsx guarda, e este
 *      componente so recebe `content` (string) - passar o `ts` exigiria
 *      editar InboxPanel.tsx, fora dos arquivos permitidos nesta rodada
 *      (RESTRICOES DURAS). Documentado, nao inventado.
 *
 * O modal "O que fazer com este card" (sugestao de pasta/virar tarefa)
 * NAO morreu - continua no botao "Guardar em uma pasta..." do rodape
 * (decisao registrada, o CEO pediu pra nao jogar fora sem avisar). */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { EditorView } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { ModalPortal } from '../../components/ModalPortal'
import { ModalButton } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { CardTypeIcon } from '../../components/CardTypeIcon'
import { useStore, deriveTitle, type Note, type CardType } from '../../store'
import { showToast } from '../../components/Toast'
import { imageFromEvent, saveImageFile } from '../../lib/attachments'
import { buildGraph, type GraphInput, type Neighbor } from '../../lib/graphify'
import { extractTags } from '../../lib/tags'
import { detectType } from '../../lib/detectType'
import { suggestFolder } from '../../lib/interpret'
import { LiveMarkdownEditor } from './LiveMarkdownEditor'
import { SelectionToolbar } from './SelectionToolbar'
import { SlashMenu } from './SlashMenu'
import { EditorToolbar } from './EditorToolbar'
import { imageBlocks } from './imageBlocks'
import { pendingImageMarkdown } from './imageLine'
import { trackSelection, type SelectionInfo } from './selectionTracking'
import { trackSlashLine, type SlashHitWithCoords } from './slashCommands'
import s from './InboxCardEditor.module.css'

interface Props {
  content: string
  onSave: (text: string) => void
  onClose: () => void
  onChooseDestination: () => void
}

/** Id sentinela do rascunho dentro do motor de conexao - nunca colide com
 *  um id real (`uid()` sempre comeca com prefixo de letra + sufixo aleatorio,
 *  nunca sublinhado duplo). Existe so durante o calculo, nunca e gravado. */
const DRAFT_ID = '__draft__'

/** Espera curta antes de perguntar ao motor "com o que isto conecta?" -
 *  curta o bastante pra parecer ao vivo, longa o bastante pra nunca rodar
 *  o motor a cada tecla (a tecla so atualiza estado local, isso e leve; o
 *  calculo caro fica fora do caminho dela, agendado por este timer). */
const CONN_DEBOUNCE_MS = 350

export function InboxCardEditor({ content, onSave, onClose, onChooseDestination }: Props) {
  const [value, setValue] = useState(content)
  const [selInfo, setSelInfo] = useState<SelectionInfo | null>(null)
  const [slashState, setSlashState] = useState<SlashHitWithCoords | null>(null)
  /** View viva do CodeMirror, atualizada pelo `onReady` de LiveMarkdownEditor
   *  (TASK-355: ler `editorRef.current?.view` direto no JSX podia deixar a
   *  barra de formatacao presa em `null` ate a primeira tecla digitada -
   *  nada garantia um rerender assim que o editor terminasse de montar).
   *  EditorToolbar/SelectionToolbar/SlashMenu agora recebem ESTE estado,
   *  nunca o ref cru. */
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImagePos = useRef<number | null>(null)
  /** Quantas imagens estao gravando no disco agora - "Salvar" espera
   *  terminar em vez de gravar o marcador PENDENTE como texto final do
   *  card (mesmo cuidado do `pendingImages` em NoteEditor.tsx). */
  const pendingImages = useRef(0)

  const notes = useStore(st => st.notes)
  const para = useStore(st => st.para)

  // Conexao em tempo real (item 4 da task): debounce curto, fora do caminho
  // da tecla - digitar so atualiza `value` (estado local, barato); o motor
  // so roda quando a digitacao faz uma pausa de CONN_DEBOUNCE_MS.
  const [debouncedText, setDebouncedText] = useState(content)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(value), CONN_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [value])

  // O rascunho entra como MAIS UM no do mesmo grafo que as Notas salvas
  // usam (graphOf em store.ts monta o mesmo shape) - nunca um motor novo,
  // nunca gravado, descartado a cada recalculo. Silencio honesto (invariante
  // 5 do Client) sai de graca: sem parentesco real, `byNote[DRAFT_ID]` volta
  // vazio e a regiao mostra o estado vazio, nunca uma ligacao inventada.
  const liveConexoes = useMemo(() => {
    const texto = debouncedText.trim()
    if (!texto) return [] as Array<Neighbor & { note?: Note }>
    const input: GraphInput[] = [
      ...notes.map(n => ({ id: n.id, title: n.title, body: n.body, tags: n.tags, folderId: n.folderId })),
      { id: DRAFT_ID, title: deriveTitle(texto), body: texto, tags: extractTags(texto) },
    ]
    const g = buildGraph(input)
    return (g.byNote[DRAFT_ID] ?? []).map(v => ({ ...v, note: notes.find(n => n.id === v.id) }))
  }, [debouncedText, notes])
  const conexoesComNota = liveConexoes.filter((v): v is Neighbor & { note: Note } => !!v.note)

  // Linha de contexto (item 5): mesmos tres motores que InboxPanel.tsx ja
  // usa pra este card ANTES de capturar - aqui rodam DEPOIS, sobre o texto
  // que esta sendo editado agora. Nada de campo novo no modelo de dominio.
  const trimmed = value.trim()
  const deteccao = trimmed ? detectType(trimmed) : null
  const etiquetas = useMemo(() => extractTags(value), [value])
  const destino = useMemo(() => {
    if (!trimmed || trimmed.length < 12 || !deteccao) return null
    return suggestFolder(trimmed, deteccao.type as CardType, para, notes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, deteccao?.type, para, notes])

  const selectionTracker = useMemo(() => trackSelection(setSelInfo), [])
  const slashTracker = useMemo(() => trackSlashLine(setSlashState), [])

  // Mesmo caminho de anexo de NoteEditor.tsx: insere um marcador PENDENTE na
  // hora (imageBlocks.ts mostra o shimmer pra ele) e so troca pela URL real
  // quando o anexo terminar de gravar no disco - nunca trava a digitacao.
  const insertImage = useCallback(async (view: EditorView, file: File, pos: number) => {
    const token = Math.random().toString(36).slice(2, 10)
    const placeholder = pendingImageMarkdown(token)
    view.dispatch({ changes: { from: pos, to: pos, insert: `\n${placeholder}\n` } })
    pendingImages.current++
    try {
      const url = await saveImageFile(file)
      const doc = view.state.doc.toString()
      const idx = doc.indexOf(placeholder)
      if (idx === -1) {
        if (!url) showToast('warn', 'Erro', 'Não foi possível salvar a imagem.')
        return
      }
      if (url) {
        view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: `![imagem](${url})` } })
        showToast('info', 'Imagem inserida', 'Salva no seu acervo local.')
      } else {
        view.dispatch({ changes: { from: idx, to: idx + placeholder.length, insert: '' } })
        showToast('warn', 'Erro', 'Não foi possível salvar a imagem.')
      }
    } finally {
      pendingImages.current--
    }
  }, [])

  const whenNoImageInFlight = useCallback((run: () => void) => {
    if (pendingImages.current > 0) { setTimeout(() => whenNoImageInFlight(run), 150); return }
    run()
  }, [])

  const imagePasteDrop = useMemo(() => EditorView.domEventHandlers({
    paste(event, view) {
      const file = imageFromEvent(event)
      if (!file) return false
      event.preventDefault()
      void insertImage(view, file, view.state.selection.main.from)
      return true
    },
    drop(event, view) {
      const file = imageFromEvent(event)
      if (!file) return false
      event.preventDefault()
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.from
      void insertImage(view, file, pos)
      return true
    },
  }), [insertImage])

  const extraExtensions = useMemo(
    () => [imagePasteDrop, imageBlocks, selectionTracker, slashTracker],
    [imagePasteDrop, selectionTracker, slashTracker],
  )

  // "Imagem" no menu de "/" OU na barra fixa: abre o seletor de arquivo na
  // posicao pedida, e reusa o MESMO caminho de anexo do paste/drop.
  const onPickImage = (pos: number) => {
    pendingImagePos.current = pos
    fileInputRef.current?.click()
  }

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const view = editorRef.current?.view
    const pos = pendingImagePos.current
    pendingImagePos.current = null
    if (file && view && pos !== null) void insertImage(view, file, pos)
  }

  const save = useCallback(() => {
    whenNoImageInFlight(() => { onSave(value); onClose() })
  }, [value, onSave, onClose, whenNoImageInFlight])

  return (
    <ModalPortal>
      <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div className={s.panel} ref={wrapRef} role="dialog" aria-modal="true" aria-label="Editar item">
          <div className={s.header}>
            <span className={s.title}>Editar item</span>
            <button className={s.close} onClick={onClose} title="Fechar" aria-label="Fechar">
              <Icon name="fechar" size={13} />
            </button>
          </div>

          {/* Barra de formatacao - SEMPRE visivel, desde a abertura do modal
              (nao depende de selecionar texto nem de digitar "/"). TASK-338:
              peca unica (EditorToolbar), a MESMA que NoteEditor.tsx usa - o
              modal so declara `--toolbar-px` (16px, o padding do proprio
              header) via `s.toolbar`. */}
          <EditorToolbar view={editorView} onPickImage={onPickImage} className={s.toolbar} />

          {/* Linha de contexto - tipo detectado, etiquetas, destino sugerido.
              So dado que ja existe no modelo, nunca inventado. */}
          {trimmed && (
            <div className={s.meta}>
              <span className={s.metaType}>
                <CardTypeIcon type={(deteccao?.type ?? 'NOTA') as CardType} size={10} />
                {deteccao?.label ?? 'Nota'}
              </span>
              {etiquetas.length > 0 && (
                <span className={s.metaTags}>
                  {etiquetas.map(t => <span key={t} className={s.metaTag}>#{t}</span>)}
                </span>
              )}
              {destino && (
                <span className={s.metaDestino}>
                  <Icon name="sugestao" size={11} />
                  vira nota em <b>{destino.folderName}</b>
                </span>
              )}
            </div>
          )}

          <div className={s.body}>
            <LiveMarkdownEditor
              ref={editorRef}
              value={value}
              onChange={setValue}
              onReady={setEditorView}
              placeholder="Edite o texto..."
              autoFocus
              extraExtensions={extraExtensions}
            />
            <SelectionToolbar view={editorView} info={selInfo} containerRef={wrapRef} />
            <SlashMenu
              view={editorView}
              state={slashState}
              onClose={() => setSlashState(null)}
              onPickImage={onPickImage}
              containerRef={wrapRef}
            />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChosen} />
          </div>

          {/* Conexoes - regiao SEMPRE presente (item 4 da reabertura). Sem
              parentesco real, mostra o silencio honesto por escrito em vez
              de sumir; com parentesco, o motivo (ACHADA/INFERIDA) e texto
              visivel no chip, nunca so um `title` de tooltip. */}
          <div className={s.connections}>
            <span className={s.connLabel}>
              <Icon name="grafo" size={13} />
              Conexões
            </span>
            {conexoesComNota.length > 0 ? (
              <div className={s.connList}>
                {conexoesComNota.map((v, i) => (
                  <div key={v.id} className={s.connItem} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className={s.connItemTop}>
                      <span className={`${s.connMark} ${v.confidence === 'ACHADA' ? s.achada : ''}`}>
                        {v.confidence === 'ACHADA' ? 'achada' : 'inferida'}
                      </span>
                      <span className={s.connItemTitle}>{v.note.title}</span>
                    </div>
                    <div className={s.connItemWhy}>{v.why}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span className={s.connEmpty}>
                {trimmed ? 'ainda não encontrei nada relacionado' : 'escreva para eu procurar conexões'}
              </span>
            )}
          </div>

          <div className={s.footer}>
            <ModalButton variant="ghost" onClick={onChooseDestination}>
              Guardar em uma pasta...
            </ModalButton>
            <ModalButton variant="primary" onClick={save}>
              Salvar
            </ModalButton>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
