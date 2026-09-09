/* interpret.ts — Motor de interpretacao textual do Dott.
 *
 * Le um card cru e responde duas perguntas, SEM IA e SEM REDE (lei do produto):
 *   1. suggestTask()   → que tarefa isso vira? (verbo + objeto + contexto)
 *   2. suggestFolder() → em que pasta isso parece caber melhor?
 *
 * E heuristica determinista, na mesma familia do detectType.ts: roda em
 * microssegundos, nao depende de modelo, e erra pra menos (quando nao tem
 * confianca, devolve confidence baixa e a UI trata como palpite, nao verdade).
 */

import type { CardType, Note, Quadrant } from '../store'
import { TYPE_ACCENT_FIX } from './cardTypeClass'

/* ─────────────────────────── Tarefa sugerida ─────────────────────────── */

export interface TaskSuggestion {
  /** Frase pronta: "Ler o artigo sobre PARA (fortelabs.com)" */
  text: string
  verb: string
  object: string
  context: string
  confidence: number
}

/** Verbos de acao no infinitivo que a gente reconhece se ja vierem escritos. */
const KNOWN_VERBS = [
  'ler', 'reler', 'revisar', 'criar', 'enviar', 'mandar', 'comprar', 'ligar',
  'marcar', 'agendar', 'terminar', 'finalizar', 'implementar', 'corrigir',
  'responder', 'pagar', 'contratar', 'estudar', 'escrever', 'organizar',
  'arrumar', 'testar', 'avaliar', 'planejar', 'definir', 'publicar', 'subir',
  'instalar', 'configurar', 'validar', 'conferir', 'assistir', 'anotar',
  'pesquisar', 'comparar', 'decidir', 'montar', 'refazer', 'apagar', 'separar',
]

/** Verbo padrao por tipo de card, quando o texto nao traz um. */
const VERB_BY_TYPE: Partial<Record<CardType, string>> = {
  URL: 'Ler', LINK: 'Ler', CODIGO: 'Revisar', SHELL: 'Rodar', PROMPT: 'Testar',
  IDEIA: 'Avaliar', CONTATO: 'Falar com', IMAGEM: 'Revisar', ARQUIVO: 'Revisar',
  VIDEO: 'Assistir', AUDIO: 'Ouvir', TAREFA: 'Fazer', NOTA: 'Revisar',
}

/** Palavras que nao ajudam a identificar assunto. */
const STOP = new Set([
  'a','o','as','os','um','uma','uns','umas','de','do','da','dos','das','e','ou',
  'que','com','sem','por','para','pra','pro','no','na','nos','nas','em','ao','aos',
  'se','eu','meu','minha','meus','minhas','isso','isto','esse','essa','este','esta',
  'todos','todas','todo','toda','mais','muito','ja','so','the','of','and','to','in',
  'my','i','it','is','are','on','at','be','this','that','com','www','http','https',
])

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** "Reunião de alinhamento" → "reunião de alinhamento" (pra colar depois do verbo).
 *  So mexe se a palavra for comum (nao SIGLA, nao Nome Proprio no meio). */
function descapitalizar(s: string): string {
  const first = s.split(/\s+/)[0] ?? ''
  if (first.length < 4) return s
  if (first === first.toUpperCase()) return s        // SIGLA
  if (/[A-Z]/.test(first.slice(1))) return s          // camelCase/NomeProprio
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/** Irregulares que a regra de terminacao nao pega. */
const IRREGULARES: Record<string, string> = {
  fosse: 'ser', tivesse: 'ter', pudesse: 'poder', fizesse: 'fazer',
  desse: 'dar', visse: 'ver', viesse: 'vir', quisesse: 'querer',
  soubesse: 'saber', houvesse: 'haver', estivesse: 'estar',
}

/** "capturasse" → "capturar": tira o subjuntivo que sobra depois de "e se".
 *  Sem isso a sugestao sai em portugues quebrado ("Avaliar eu capturasse..."). */
function paraInfinitivo(s: string): string {
  // "fosse melhor refazer X" → "refazer X": o verbo util e o que vem depois.
  const melhor = s.match(/^(?:fosse|seria|era)\s+melhor\s+(.+)$/i)
  if (melhor) return melhor[1]

  const primeira = s.split(/\s+/)[0]?.toLowerCase() ?? ''
  if (IRREGULARES[primeira]) return IRREGULARES[primeira] + s.slice(primeira.length)

  return s.replace(
    /^(\p{L}+?)(asse|esse|isse|ássemos|essemos|issemos)\b/iu,
    (_m, raiz: string, term: string) => {
      const t = term.toLowerCase()
      if (t.startsWith('a') || t.startsWith('á')) return `${raiz}ar`
      if (t.startsWith('e')) return `${raiz}er`
      return `${raiz}ir`
    },
  )
}

function firstLine(raw: string): string {
  return (raw.split('\n').find(l => l.trim()) ?? '').trim()
}

/** Corta na primeira fronteira boa pra nao gerar tarefa quilometrica. */
function clip(s: string, max = 58): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim() + '…'
}

function hostOf(raw: string): string {
  const m = raw.match(/https?:\/\/([^/\s]+)/i) ?? raw.match(/^([\w-]+(?:\.[\w-]+)+)/)
  if (!m) return ''
  return m[1].replace(/^www\./i, '')
}

/** Ultimo pedaco legivel do caminho da URL — vira o "objeto". */
function pathSubjectOf(raw: string): string {
  const m = raw.match(/https?:\/\/[^/\s]+\/([^\s?#]+)/i)
  if (!m) return ''
  const parts = m[1].split('/').filter(Boolean)
  const last = parts.reverse().find(p => /[a-z]{3}/i.test(p) && !/^\d+$/.test(p))
  if (!last) return ''
  return last.replace(/[-_+]+/g, ' ').replace(/\.(html?|php|aspx?|md)$/i, '').trim()
}

/** Palavras-chave do texto, em ordem de aparicao, sem ruido. */
export function keywords(raw: string, limit = 6): string[] {
  const words = raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
  return [...new Set(words)].slice(0, limit)
}

export function suggestTask(content: string, type: CardType): TaskSuggestion {
  const line = firstLine(content)
  const lower = line.toLowerCase()

  // 1. O texto ja comeca com um verbo de acao? Entao respeita o que foi escrito.
  const firstWord = lower.split(/\s+/)[0]?.replace(/[^\p{L}]/gu, '') ?? ''
  const wroteVerb = KNOWN_VERBS.includes(firstWord)

  if (wroteVerb) {
    const rest = line.slice(line.toLowerCase().indexOf(firstWord) + firstWord.length).trim()
    const host = hostOf(content)
    return {
      verb: cap(firstWord),
      object: clip(rest || 'isso'),
      context: host,
      text: clip(`${cap(firstWord)} ${rest}`.trim() + (host ? ` (${host})` : ''), 90),
      confidence: 0.9,
    }
  }

  // 2. Sem verbo escrito: o tipo do card decide o verbo.
  const verb = VERB_BY_TYPE[type] ?? 'Revisar'
  const host = hostOf(content)

  let object: string
  if (type === 'URL' || type === 'LINK') {
    object = pathSubjectOf(content) || host || 'o link'
  } else if (type === 'CONTATO') {
    object = line
  } else if (type === 'IMAGEM') {
    object = 'a imagem capturada'
  } else if (type === 'SHELL') {
    object = clip(line, 40)
  } else {
    // Texto comum: tira a hesitacao da frente ("e se", "sera que", "talvez"), o
    // pronome solto que sobra, e devolve o verbo ao infinitivo.
    const limpo = line
      .replace(/^(e se|sera que|será que|talvez|ideia[:\-]?|que tal|imagina que|e que tal)\s*/i, '')
      .replace(/^(eu|a gente|nos|nós|voce|você)\s+/i, '')
      .replace(/\?+$/, '')
      .trim()
    object = clip(descapitalizar(paraInfinitivo(limpo)))
  }

  const context = host || (type === 'CODIGO' || type === 'SHELL' || type === 'PROMPT' ? type.toLowerCase() : '')
  const text = clip(`${verb} ${object}`.trim() + (context ? ` (${context})` : ''), 90)

  return {
    verb,
    object,
    context,
    text,
    confidence: type === 'NOTA' ? 0.45 : 0.7,
  }
}

/* ─────────────────────────── Pasta sugerida ─────────────────────────── */

export interface FolderSuggestion {
  categoryId: string
  folderId: string
  folderName: string
  categoryLabel: string
  score: number
  /** Frase curta explicando POR QUE — o palpite tem que ser auditavel. */
  reason: string
}

/** Regra PARA de acionabilidade: o quadrante que mais combina com cada tipo. */
const QUADRANT_BY_TYPE: Partial<Record<CardType, string>> = {
  TAREFA: 'projects',
  IDEIA: 'projects',
  URL: 'resources', LINK: 'resources',
  CODIGO: 'resources', SHELL: 'resources', PROMPT: 'resources',
  ARQUIVO: 'resources', IMAGEM: 'resources',
  CONTATO: 'areas',
}

/**
 * Ranqueia as pastas existentes por afinidade com o conteudo.
 * Pontos: palavra em comum com o NOME da pasta (forte), palavra em comum com as
 * notas que ja moram nela (medio), quadrante que a regra PARA indica (leve),
 * e um empurrao pra pasta que ja tem acervo (pasta viva > pasta vazia).
 */
export function suggestFolder(
  content: string,
  type: CardType,
  para: Record<string, Quadrant>,
  notes: Note[],
): FolderSuggestion | null {
  const kw = keywords(content, 10)
  if (!Object.keys(para).length) return null

  const preferredQ = QUADRANT_BY_TYPE[type]
  const byFolder = new Map<string, Note[]>()
  for (const n of notes) {
    if (!n.folderId) continue
    const arr = byFolder.get(n.folderId) ?? []
    arr.push(n)
    byFolder.set(n.folderId, arr)
  }

  let best: FolderSuggestion | null = null

  for (const [qid, q] of Object.entries(para)) {
    for (const f of q.folders) {
      let score = 0
      const reasons: string[] = []

      // Nome da pasta bate com o conteudo (sinal mais forte).
      const nameWords = keywords(f.name, 5)
      const nameHits = kw.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)))
      if (nameHits.length) {
        score += nameHits.length * 5
        reasons.push(`fala de "${nameHits[0]}"`)
      }

      // Conteudo bate com as notas que ja estao la.
      const inside = byFolder.get(f.id) ?? []
      if (inside.length) {
        const insideWords = new Set(inside.flatMap(n => [...keywords(n.title, 6), ...n.tags]))
        const hits = kw.filter(w => insideWords.has(w))
        if (hits.length) {
          score += hits.length * 2
          reasons.push(`combina com o que já está em ${f.name}`)
        }
        score += Math.min(2, inside.length * 0.2) // pasta viva
      }

      // Regra PARA pelo tipo do card.
      if (preferredQ === qid) {
        score += 2
        reasons.push(`${(TYPE_ACCENT_FIX[type] ?? type).toLowerCase()} costuma morar em ${q.label}`)
      }

      if (score <= 0) continue
      if (!best || score > best.score) {
        best = {
          categoryId: qid,
          folderId: f.id,
          folderName: f.name,
          categoryLabel: q.label,
          score,
          reason: reasons[0] ?? `parece ${q.label.toLowerCase()}`,
        }
      }
    }
  }

  // Palpite fraco nao vira sugestao: melhor nao sugerir do que sugerir errado.
  return best && best.score >= 2 ? best : null
}
