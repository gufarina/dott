/** LiveMarkdownEditor.tsx — modulo profundo: interface estreita (value,
 * onChange, placeholder), decoration viva + extensoes CodeMirror por dentro.
 * O arquivo `.md` no disco continua o markdown cru que o usuario digitou —
 * isto e so a CAMADA VISUAL (decorations), nunca um round-trip HTML. */
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, keymap } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { forwardRef, useMemo } from 'react'
import { liveMarkdown } from './liveMarkup'
import { toggleWrap } from './markdownCommands'
import './liveMarkup.css'

/** Atalhos de formatacao (Ctrl+B / Ctrl+I) — mesmo par que o EasyMDE tinha.
 * Fica aqui dentro (nao na toolbar) porque e comportamento do EDITOR, nao
 * da barra: continua funcionando mesmo se a toolbar nunca for tocada. */
const formatShortcuts = keymap.of([
  { key: 'Mod-b', run: view => { view.dispatch(toggleWrap(view.state, '**')); return true } },
  { key: 'Mod-i', run: view => { view.dispatch(toggleWrap(view.state, '_')); return true } },
])

export const LiveMarkdownEditor = forwardRef<
  ReactCodeMirrorRef,
  {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    autoFocus?: boolean
    /** Extensoes extras que o chamador precisa (ex: paste/drop de imagem). */
    extraExtensions?: Extension[]
    /** Avisa o chamador com a EditorView assim que o CodeMirror termina de
     *  montar (TASK-355: a barra de formatacao ficava presa segurando
     *  `null` porque `editorRef.current?.view` so populava DEPOIS da
     *  primeira renderizacao, e nada garantia um novo render pra
     *  reler o ref. `onCreateEditor` e o proprio aviso que o
     *  `@uiw/react-codemirror` ja oferece pra isto - so faltava expor. */
    onReady?: (view: EditorView) => void
  }
>(function LiveMarkdownEditor({ value, onChange, placeholder, autoFocus, extraExtensions, onReady }, ref) {
  const extensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, liveMarkdown, formatShortcuts, ...(extraExtensions ?? [])],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  return (
    <CodeMirror
      ref={ref}
      value={value}
      onChange={onChange}
      onCreateEditor={onReady}
      extensions={extensions}
      placeholder={placeholder}
      autoFocus={autoFocus}
      theme="none"
      className="cm-dott"
      height="100%"
      /* Sizing puro (sem cor/fonte — isso e territorio do CANVAS agora):
         a barra de acao virou uma segunda linha dentro de .editorWrap, e o
         wrapper que o CodeMirror monta aqui precisa disputar espaco com ela
         em vez de crescer pelo conteudo (o que a barra nova deixaria claro). */
      style={{ flex: 1, minHeight: 0 }}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
    />
  )
})
