/* detectType.ts — Motor de detecção de tipo em tempo real (heurística, sem IA).
 *
 * Analisa o conteúdo e devolve o tipo mais provável + um rótulo amigável.
 * Roda a cada tecla — leve e determinístico (premissa local/offline).
 */

export type DetectedType =
  | 'NOTA' | 'URL' | 'CODIGO' | 'SHELL' | 'IDEIA'
  | 'PROMPT' | 'TAREFA' | 'CONTATO' | 'IMAGEM'

export interface Detection {
  type: DetectedType
  label: string
  confidence: number // 0..1
}

const LABELS: Record<DetectedType, string> = {
  NOTA: 'Nota', URL: 'Link', CODIGO: 'Código', SHELL: 'Comando',
  IDEIA: 'Ideia', PROMPT: 'Prompt', TAREFA: 'Tarefa', CONTATO: 'Contato', IMAGEM: 'Imagem',
}

const SHELL_CMDS = /^(npm|npx|yarn|pnpm|bun|git|cd|sudo|docker|kubectl|curl|wget|ssh|scp|cargo|rustc|python|python3|node|deno|pip|pip3|brew|apt|apt-get|yum|mkdir|rmdir|rm|cp|mv|ls|cat|grep|sed|awk|chmod|chown|export|echo|source|make|tar|zip|unzip|ps|kill|systemctl|nano|vim)\b/i

const CODE_SIGNALS: RegExp[] = [
  /=>/, /\bfunction\b/, /\b(const|let|var)\s+\w+\s*=/, /\bdef\s+\w+\s*\(/,
  /\bclass\s+\w+/, /\bimport\b[\s\S]*\bfrom\b/, /\brequire\(/, /[{};]\s*$/,
  /<\/?[a-z][\w-]*\s*\/?>/i, /\breturn\b/, /\)\s*\{/, /::/, /\b(public|private|protected|static|async|await)\b/,
  /\$\{[^}]+\}/, /\bif\s*\(.+\)/, /\bfor\s*\(.+\)/, /=>\s*\{/,
]

const PROMPT_START = /^(voc[eê] [eé]|you are|aja como|atue como|escreva |gere |crie (um|uma) |liste |explique |resuma |traduza |imagine que|como (um|uma) |dado (o|a|este|essa) )/i
const IDEA_START = /^(e se |talvez |ideia[:\- ]|ser[aá] que |imagina |que tal |poderia |e que tal |seria (legal|bom|interessante)|💡)/i
const TASK_START = /^(- \[\s?\]|\[\s?\]\s|todo[:\- ]|fazer[:\- ]|comprar |ligar (para|pro|pra) |enviar |mandar |marcar |agendar |revisar |terminar |finalizar |implementar |corrigir |responder |pagar |contratar |estudar |ler |escrever |criar |organizar |arrumar )/i

export function detectType(raw: string): Detection {
  const t = raw.trim()
  if (!t) return { type: 'NOTA', label: LABELS.NOTA, confidence: 0 }
  const l = t.toLowerCase()
  const oneLine = !t.includes('\n')

  // Imagem (URL de asset)
  if (/^(https?:\/\/asset\.localhost|asset:)/.test(l)) return mk('IMAGEM', 1)

  // URL / link
  if (oneLine && /^(https?:\/\/|www\.)\S+$/i.test(t)) return mk('URL', 0.97)
  if (oneLine && !t.includes(' ') && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t) && /\.(com|net|org|io|dev|app|br|gov|edu|co|ai|me|xyz)\b/i.test(t)) return mk('URL', 0.85)

  // Contato (email / telefone)
  if (oneLine && /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(t)) return mk('CONTATO', 0.95)
  if (oneLine && /^\+?\d[\d\s().-]{7,}\d$/.test(t)) return mk('CONTATO', 0.8)

  // Shell / comando
  if (SHELL_CMDS.test(t) || /^\$\s/.test(t)) return mk('SHELL', 0.9)

  // Código (por sinais acumulados)
  const codeScore = CODE_SIGNALS.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0)
  if (codeScore >= 2) return mk('CODIGO', Math.min(0.95, 0.55 + codeScore * 0.1))
  if (/;\s*$/.test(t) && oneLine && t.length > 8) return mk('CODIGO', 0.7)

  // Prompt (instrução para modelo / persona)
  if (PROMPT_START.test(l)) return mk('PROMPT', 0.85)

  // Ideia
  if (IDEA_START.test(l)) return mk('IDEIA', 0.8)

  // Tarefa (ação / to-do)
  if (TASK_START.test(l)) return mk('TAREFA', 0.82)

  // Default: nota
  return mk('NOTA', 0.5)

  function mk(type: DetectedType, confidence: number): Detection {
    return { type, label: LABELS[type], confidence }
  }
}
