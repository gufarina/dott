import { useMemo } from 'react'
import { marked } from 'marked'
import './markdown.css'

/** Notas antigas podem ter a marcacao [[assim]] de quando o link era manual.
 *  Ela morreu: mostramos so o texto de dentro, sem os colchetes. Quem liga as
 *  notas agora e o motor de conexao (lib/graphify.ts), sozinho. */
function semColchetes(body: string): string {
  return body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_m, alvo, alias) => alias || alvo)
}

/** Modo LEITURA da nota: renderiza o markdown bonito (marked) em vez do codigo.
 *  Duplo-clique em qualquer lugar entra no modo edicao. */
export function MarkdownView({ body, onEdit }: { body: string; onEdit: () => void }) {
  const html = useMemo(() => {
    if (!body.trim()) return ''
    return marked.parse(semColchetes(body), { gfm: true, breaks: true }) as string
  }, [body])

  return (
    <div className="md-view" onDoubleClick={onEdit} title="Duplo-clique para editar">
      {html
        ? <div className="md-inner" dangerouslySetInnerHTML={{ __html: html }} />
        : <div className="md-inner"><p className="md-empty">Nota vazia. Clique em Editar para começar a escrever.</p></div>}
    </div>
  )
}
