import { useMemo } from 'react'
import { marked } from 'marked'
import { useStore } from '../../store'
import { normalizeTitle } from '../../lib/wiki'
import './markdown.css'

/** Extensao inline do marked pra [[wikilinks]]. Por ser tokenizer inline, o
 *  marked ja consumiu codespans/blocos antes — entao [[ ]] dentro de crase
 *  fica literal, sem virar link (corrige o vazamento de HTML cru). */
const M = marked as unknown as { __wlReady?: boolean; use: (o: unknown) => void }
if (!M.__wlReady) {
  M.use({
    extensions: [{
      name: 'wikilink',
      level: 'inline',
      start(src: string) { return src.indexOf('[[') },
      tokenizer(src: string) {
        const m = /^\[\[([^\]\n]+)\]\]/.exec(src)
        if (m && m[1].trim()) return { type: 'wikilink', raw: m[0], text: m[1].trim() }
        return undefined
      },
      renderer(token: { text: string }) {
        const t = token.text.replace(/"/g, '&quot;')
        return `<a class="wl" data-t="${t}">${token.text}</a>`
      },
    }],
  })
  M.__wlReady = true
}

/** Modo LEITURA da nota: renderiza o markdown bonito (marked) em vez do codigo.
 *  [[wikilinks]] viram chips clicaveis que navegam pra nota alvo.
 *  Duplo-clique em qualquer lugar (fora de link) entra no modo edicao. */
export function MarkdownView({ body, onEdit }: { body: string; onEdit: () => void }) {
  const notes = useStore(st => st.notes)
  const setView = useStore(st => st.setView)

  const html = useMemo(() => {
    if (!body.trim()) return ''
    return marked.parse(body, { gfm: true, breaks: true }) as string
  }, [body])

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('a.wl') as HTMLElement | null
    if (!el) return
    e.preventDefault()
    const t = el.getAttribute('data-t') ?? ''
    const target = notes.find(n => normalizeTitle(n.title) === normalizeTitle(t))
    if (target) setView('editor', { note: target.id })
  }

  return (
    <div className="md-view" onClick={onClick} onDoubleClick={onEdit} title="Duplo-clique para editar">
      {html
        ? <div className="md-inner" dangerouslySetInnerHTML={{ __html: html }} />
        : <div className="md-inner"><p className="md-empty">Nota vazia. Clique em Editar para começar a escrever.</p></div>}
    </div>
  )
}
