/* NoteGlyphs.tsx — Pacote de SIMBOLOS da nota.
 *
 * REGRA DURA: todo simbolo aqui representa um TIPO REAL DE NOTA que uma pessoa
 * guarda no Dott. Nada de forma bonita sem significado — a versao anterior tinha
 * "Norte", "Torre", "Prisma", "Malha", que nao queriam dizer nada e so davam
 * trabalho de escolher. Se voce nao consegue completar a frase "esta nota e um(a)
 * ___", o simbolo NAO entra.
 *
 * Nao e emoji do sistema de proposito: emoji muda de desenho em cada maquina e
 * nao combina com o app. Estes usam a mesma gramatica do pacote de icones
 * (circulo, quadrado, losango, linha) e o ponto cheio como assinatura.
 *
 * O simbolo escolhido vive no frontmatter do .md (campo `glyph`), entao viaja
 * junto do arquivo e sobrevive a backup/restauracao.
 */

export type GlyphId =
  | 'projeto' | 'ideia' | 'leitura' | 'reuniao' | 'decisao' | 'pesquisa'
  | 'referencia' | 'rascunho' | 'processo' | 'contato' | 'financeiro'
  | 'saude' | 'viagem' | 'estudo' | 'codigo' | 'design' | 'escrita'
  | 'meta' | 'revisao' | 'pergunta' | 'checklist' | 'arquivo'

/** Ordem do seletor: do mais usado no dia a dia para o mais raro. */
export const GLYPH_ORDER: GlyphId[] = [
  'projeto', 'ideia', 'checklist', 'leitura', 'reuniao', 'decisao',
  'pesquisa', 'referencia', 'rascunho', 'processo', 'contato', 'financeiro',
  'saude', 'viagem', 'estudo', 'codigo', 'design', 'escrita',
  'meta', 'revisao', 'pergunta', 'arquivo',
]

/** O rotulo E a definicao: e o que a nota E. */
export const GLYPH_LABEL: Record<GlyphId, string> = {
  projeto: 'Projeto', ideia: 'Ideia', leitura: 'Leitura', reuniao: 'Reunião',
  decisao: 'Decisão', pesquisa: 'Pesquisa', referencia: 'Referência',
  rascunho: 'Rascunho', processo: 'Processo', contato: 'Contato',
  financeiro: 'Financeiro', saude: 'Saúde', viagem: 'Viagem', estudo: 'Estudo',
  codigo: 'Código', design: 'Design', escrita: 'Escrita', meta: 'Meta',
  revisao: 'Revisão', pergunta: 'Pergunta', checklist: 'Checklist',
  arquivo: 'Arquivo',
}

const G: Record<GlyphId, React.ReactElement> = {
  // Bandeira fincada: coisa com fim previsto
  projeto: <><path d="M6 21V3.4"/><path d="M6 4.2h12.6l-2.9 4.6 2.9 4.6H6" fill="currentColor" stroke="none"/><circle cx="6" cy="21" r="1.5" fill="currentColor" stroke="none"/></>,
  // Faisca: o pensamento solto que ainda nao virou nada
  ideia: <><path d="M12 2.6l2.3 6.6 6.6 2.3-6.6 2.3L12 20.4l-2.3-6.6L3.1 11.5l6.6-2.3z" fill="currentColor" stroke="none"/></>,
  // Livro aberto: artigo, capitulo, algo pra ler
  leitura: <><path d="M12 6.6C10.2 5 7.6 4.4 3.4 4.4v13c4.2 0 6.8.6 8.6 2.2 1.8-1.6 4.4-2.2 8.6-2.2v-13c-4.2 0-6.8.6-8.6 2.2z"/><path d="M12 6.6v13"/></>,
  // Duas pessoas conversando: ata, alinhamento
  reuniao: <><circle cx="8.2" cy="7.6" r="2.9"/><circle cx="16.6" cy="9" r="2.3"/><path d="M2.8 19.4c0-3 2.4-5 5.4-5s5.4 2 5.4 5"/><path d="M15 14.6c3 0 5.2 1.8 5.2 4.8"/></>,
  // Caminho que se divide e um lado escolhido
  decisao: <><path d="M12 21V13"/><path d="M12 13L5.4 6.2M12 13l6.6-6.8"/><circle cx="19.2" cy="4.8" r="2.6" fill="currentColor" stroke="none"/><circle cx="4.8" cy="4.8" r="2.6"/></>,
  // Lupa sobre pontos: investigar um assunto
  pesquisa: <><circle cx="10.4" cy="10.4" r="6.4"/><path d="M15.2 15.2l5 5"/><circle cx="8" cy="10.4" r="1.15" fill="currentColor" stroke="none"/><circle cx="12.8" cy="10.4" r="1.15" fill="currentColor" stroke="none"/></>,
  // Marcador de pagina: material que voce quer achar depois
  referencia: <><path d="M6 3.2h12v17.6L12 16l-6 4.8z" fill="currentColor" stroke="none"/></>,
  // Lapis: texto ainda em construcao
  rascunho: <><path d="M16.8 3.2l4 4-12 12-5.2 1.2 1.2-5.2z"/><path d="M14.2 5.8l4 4"/></>,
  // Passos ligados: como se faz alguma coisa
  processo: <><circle cx="5" cy="6" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="18.4" cy="12" r="2.4" fill="currentColor" stroke="none"/><path d="M7.4 6h4.2a3 3 0 0 1 3 3v.6M7.4 18h4.2a3 3 0 0 0 3-3v-.6"/></>,
  // Pessoa: quem
  contato: <><circle cx="12" cy="7.6" r="4"/><path d="M4 20.4c0-4.2 3.6-6.8 8-6.8s8 2.6 8 6.8"/></>,
  // Moeda: dinheiro, contrato, cobranca
  financeiro: <><circle cx="12" cy="12" r="8.6"/><path d="M12 6.8v10.4"/><path d="M14.8 9.2c-.6-.9-1.7-1.4-2.9-1.4-1.8 0-3 1-3 2.3 0 3 6 1.7 6 4.7 0 1.4-1.3 2.4-3.1 2.4-1.3 0-2.4-.5-3-1.5"/></>,
  // Pulso: exame, consulta, treino
  saude: <><path d="M2.6 12.4h4l2.2-5.6 3.6 11.2L15 12.4h6.4"/><circle cx="21.4" cy="12.4" r="1.6" fill="currentColor" stroke="none"/></>,
  // Alfinete no mapa: lugar, roteiro
  viagem: <><path d="M12 21.4s7-6.4 7-11.4a7 7 0 1 0-14 0c0 5 7 11.4 7 11.4z"/><circle cx="12" cy="10" r="2.7" fill="currentColor" stroke="none"/></>,
  // Livros empilhados: curso, materia
  estudo: <><rect x="3.4" y="15.4" width="17.2" height="5" rx="1.2" fill="currentColor" stroke="none"/><rect x="4.8" y="10" width="14.4" height="5" rx="1.2"/><rect x="6.4" y="4.6" width="11.2" height="5" rx="1.2"/></>,
  // Chaves: trecho de codigo, comando
  codigo: <><path d="M8.6 6.8L3.4 12l5.2 5.2M15.4 6.8L20.6 12l-5.2 5.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  // Formas sobrepostas: layout, identidade, arte
  design: <><circle cx="9.2" cy="9.2" r="5.6"/><rect x="9.6" y="9.6" width="10.8" height="10.8" rx="2" fill="currentColor" stroke="none"/></>,
  // Linhas de texto com o ponto: o que voce escreveu
  escrita: <><path d="M4 6.4h16M4 12h16M4 17.6h9.6"/><circle cx="18.8" cy="17.6" r="1.6" fill="currentColor" stroke="none"/></>,
  // Alvo: onde voce quer chegar
  meta: <><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.9"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/></>,
  // Seta que volta: nota pra reler mais pra frente
  revisao: <><path d="M20.2 12a8.2 8.2 0 1 1-3-6.3"/><path d="M20.8 3.4v4.9h-4.9"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/></>,
  // Interrogacao: o que ainda esta em aberto
  pergunta: <><circle cx="12" cy="12" r="8.6"/><path d="M9.4 9.5a2.7 2.7 0 1 1 3.4 2.6c-.5.2-.8.7-.8 1.3v.7"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor" stroke="none"/></>,
  // Lista marcada: passos que dao pra riscar
  checklist: <><path d="M3.4 6.4l2 2 3.2-3.4M3.4 13l2 2 3.2-3.4M3.4 19.6l2 2 3.2-3.4"/><path d="M12.4 7h8.2M12.4 13.6h8.2M12.4 20.2h5.6"/></>,
  // Caixa fechada: ja serviu, mas nao some
  arquivo: <><rect x="2.8" y="4.4" width="18.4" height="4.6" rx="1.2" fill="currentColor" stroke="none"/><path d="M4.6 9v9.4a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8V9"/><path d="M9.6 13.4h4.8"/></>,
}

export function NoteGlyph({ id, size = 20, className }: { id: GlyphId; size?: number; className?: string }) {
  const shape = G[id]
  if (!shape) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  )
}

export function isGlyphId(v: unknown): v is GlyphId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(G, v)
}
