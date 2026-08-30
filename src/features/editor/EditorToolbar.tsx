/** EditorToolbar.tsx — TASK-338 (CEO, 28/08/2026): a barra de formatacao
 * fixa so existia IMPLEMENTADA DENTRO de InboxCardEditor.tsx (o modal) - a
 * tela da nota (NoteEditor.tsx, o "coracao do app" nas palavras do CEO)
 * abria sem nenhuma formatacao visivel. Mesmo defeito ja aberto duas vezes
 * antes (TASK-314, TASK-327): a mesma acao reimplementada num so lugar,
 * nada reusavel. Esta peca e a extracao: burra de proposito, nao sabe se
 * mora num modal ou numa pagina - so despacha os comandos de
 * `markdownCommands.ts` na `view` que recebe.
 *
 * As nove acoes (Titulo, Negrito, Italico, Lista, Checklist, Citacao,
 * Codigo, Link, Imagem) sao as MESMAS de antes - nenhum comando novo,
 * nenhum icone novo (Icon.tsx ja tinha os nove). */
import type { EditorView } from '@codemirror/view'
import { Icon } from '../../components/Icon'
import { toggleWrap, toggleLinePrefix, toggleChecklist, insertLink } from './markdownCommands'
import s from './EditorToolbar.module.css'

interface Props {
  /** View viva do CodeMirror desta tela - null antes do editor montar. A
   *  peca so despacha comandos nela, nunca guarda estado proprio de editor.
   *  TASK-355 (CEO: "botoes de edicao sem funcionalidade"): quem chama NAO
   *  pode ler isto de `editorRef.current?.view ?? null` direto no JSX - o
   *  mount do CodeMirror nao avisa o pai, entao a leitura ficava presa em
   *  `null` pra sempre em varios casos reais. O padrao certo (NoteEditor,
   *  InboxCardEditor) e um `useState<EditorView | null>` atualizado pelo
   *  `onReady` de LiveMarkdownEditor - o mesmo estado alimenta esta peca,
   *  SelectionToolbar e SlashMenu. */
  view: EditorView | null
  /** Acao de imagem: abre o seletor de arquivo na posicao do cursor. Quem
   *  chama decide o que fazer com o arquivo escolhido (InboxCardEditor e
   *  NoteEditor tem o MESMO caminho por baixo - insertImage/saveImageFile -
   *  a peca so avisa ONDE o cursor estava, nunca grava nada sozinha). */
  onPickImage: (pos: number) => void
  /** Classe extra do chamador - hoje usada so pra declarar `--toolbar-px`
   *  (o padding horizontal muda por CONTEXTO: alinhado ao modal ou ao
   *  cabecalho da tela de nota). Nunca um segundo componente pra isso. */
  className?: string
}

export function EditorToolbar({ view, onPickImage, className }: Props) {
  const runCmd = (fn: (v: EditorView) => void) => {
    if (!view) return
    fn(view)
    view.focus()
  }
  const pickImageAtCursor = () => onPickImage(view ? view.state.selection.main.from : 0)

  return (
    <div className={className ? `${s.bar} ${className}` : s.bar}>
      <button type="button" className={s.btn} title="Título" aria-label="Título"
        onClick={() => runCmd(v => v.dispatch(toggleLinePrefix(v.state, '# ', ['## ', '### '])))}>
        <Icon name="titulo" size={14} />
      </button>
      <button type="button" className={s.btn} title="Negrito (Ctrl+B)" aria-label="Negrito"
        onClick={() => runCmd(v => v.dispatch(toggleWrap(v.state, '**')))}>
        <Icon name="negrito" size={14} />
      </button>
      <button type="button" className={s.btn} title="Itálico (Ctrl+I)" aria-label="Itálico"
        onClick={() => runCmd(v => v.dispatch(toggleWrap(v.state, '_')))}>
        <Icon name="italico" size={14} />
      </button>
      <span className={s.sep} />
      <button type="button" className={s.btn} title="Lista" aria-label="Lista"
        onClick={() => runCmd(v => v.dispatch(toggleLinePrefix(v.state, '- ', ['* ', '+ '])))}>
        <Icon name="listaPontos" size={14} />
      </button>
      <button type="button" className={s.btn} title="Checklist" aria-label="Checklist"
        onClick={() => runCmd(v => v.dispatch(toggleChecklist(v.state)))}>
        <Icon name="tarefa" size={14} />
      </button>
      <button type="button" className={s.btn} title="Citação" aria-label="Citação"
        onClick={() => runCmd(v => v.dispatch(toggleLinePrefix(v.state, '> ', [])))}>
        <Icon name="citacao" size={14} />
      </button>
      <span className={s.sep} />
      <button type="button" className={s.btn} title="Código" aria-label="Código"
        onClick={() => runCmd(v => v.dispatch(toggleWrap(v.state, '`')))}>
        <Icon name="codigo" size={14} />
      </button>
      <button type="button" className={s.btn} title="Link" aria-label="Link"
        onClick={() => runCmd(v => v.dispatch(insertLink(v.state, false)))}>
        <Icon name="link" size={14} />
      </button>
      <span className={s.sep} />
      <button type="button" className={s.btn} title="Imagem" aria-label="Imagem" onClick={pickImageAtCursor}>
        <Icon name="imagem" size={14} />
      </button>
    </div>
  )
}
