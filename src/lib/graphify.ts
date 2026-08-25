/* graphify.ts - O motor de conexao automatica do Dott.
 *
 * Liga as notas SOZINHO. Sem [[ ]], sem IA, sem rede, sem chave: tudo roda na
 * maquina do usuario, em milissegundos, deterministico (mesma entrada = mesma
 * saida, sempre).
 *
 * Pipeline (mesmo desenho do graphify, camada deterministica):
 *   1. limpa o markdown e quebra em termos (stopwords pt-BR/en fora)
 *   2. TF-IDF: o que e raro no acervo e frequente na nota vira CONCEITO dela
 *   3. arestas por tres caminhos, cada uma com o motivo legivel:
 *        menciona   [ACHADA]   o titulo de uma nota aparece escrito na outra
 *        mesma_tag  [ACHADA]   as duas carregam a mesma etiqueta
 *        mesmo_tema [INFERIDA] as duas falam dos mesmos conceitos raros
 *   4. poda: so as K mais fortes de cada nota, acima de um piso
 *   5. comunidades por propagacao de rotulo (temas), com nome derivado
 *   6. nos centrais por grau ponderado
 *
 * Honestidade (heranca do graphify): toda aresta diz se foi ACHADA no texto ou
 * INFERIDA por semelhanca. O usuario nunca ve "conexao" sem saber de onde veio.
 */

export type Confidence = 'ACHADA' | 'INFERIDA'
export type Relation = 'menciona' | 'mesma_tag' | 'mesmo_tema'

export interface GraphEdge {
  a: string
  b: string
  weight: number
  confidence: Confidence
  relation: Relation
  /** Motivo em portugues, mostrado pro usuario. */
  why: string
}

export interface GraphNode {
  id: string
  title: string
  degree: number
  strength: number
  community: number
  /** Conceitos da nota, do mais forte pro mais fraco. */
  terms: string[]
}

export interface Community {
  id: number
  label: string
  notes: string[]
}

export interface Neighbor {
  id: string
  weight: number
  why: string
  confidence: Confidence
  relation: Relation
}

export interface DottGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  communities: Community[]
  /** noteId -> vizinhos ja ordenados por forca. */
  byNote: Record<string, Neighbor[]>
  stats: { notes: number; edges: number; communities: number; achadas: number; inferidas: number }
}

export interface GraphInput {
  id: string
  title: string
  body: string
  tags: string[]
  folderId?: string
}

/* ------------------------------------------------------------------ ajustes */

/** Quantas conexoes cada nota pode mostrar. Acima disso vira teia ilegivel. */
const MAX_POR_NOTA = 6
/** Piso de semelhanca pra virar aresta INFERIDA (cosseno TF-IDF). */
const PISO_TEMA = 0.1
/** Piso mais baixo, usado SO pra nota que ficaria sozinha: melhor mostrar o
 *  parente mais proximo (marcado como inferido) do que deixar a nota orfa. */
const PISO_PARENTE = 0.05
/** Conceitos guardados por nota. */
const CONCEITOS_POR_NOTA = 14
/** Termo presente em mais de X% das notas nao identifica nada. */
const TETO_DOCUMENTOS = 0.6
/** Etiqueta que marca meio acervo nao liga nada. */
const MAX_NOTAS_POR_TAG = 8

const PESO_MENCIONA = 1
const PESO_TAG = 0.45

const STOPWORDS = new Set(`a as o os um uma uns umas de do da dos das em no na nos nas por para pra pelo pela
ao aos com sem sob sobre entre ate apos antes depois e ou mas porem contudo todavia que quem qual quais quando
onde como porque pois se nao sim ja mais menos muito muitos muita muitas pouco poucos pouca poucas todo toda
todos todas outro outra outros outras mesmo mesma mesmos mesmas tal tais cada qualquer quaisquer algum alguma
alguns algumas nenhum nenhuma nada tudo isso isto aquilo esse essa esses essas este esta estes estas aquele
aquela aqueles aquelas eu tu ele ela nos vos eles elas me te se lhe lhes meu minha meus minhas teu tua teus
tuas seu sua seus suas nosso nossa nossos nossas dele dela deles delas voce voces sou es esta estao estou
estamos estive esteve fui foi fomos foram sera serao seria seriam ser sendo sido tem tenho temos tinha tinham
ter tendo tido haver havia houve pode podem podia poder posso fazer faz fazem fez feito vai vao ia iam ir
indo aqui ali agora ainda entao assim tambem apenas bem mal ver vem vir dia dias vez vezes coisa coisas
novo nova novos novas quer quero queria sao era eram
ficou fica ficam ficar ficado ficaram deu dar deram disse dizer diz achar acha achou saber sabe sabia
deve devem dever precisa precisar precisam usar usa usam usei virar vira viram passar passa dei
duas dois tres quatro cinco seis sete oito nove dez cem mil primeiro primeira segundo segunda terceiro terceira
ex exemplo etc obs nota notas item itens parte partes tipo tipos forma formas jeito modo lugar lugares
the of and or to in on for with an is are was were be been it its this that these those you your we our
they their he she his her as at by from not but if then than so such can could will would should may might
about into over under out up down off just only very more most less least other another each any some all
no yes note notes how what when where why which who whom whose does did done doing have has had`
  .split(/\s+/).filter(Boolean))

/* ------------------------------------------------------------- normalizacao */

/** Tira acento e caixa. Comparacao de texto no Dott passa toda por aqui. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Forma canonica pra casar titulo dentro de texto: sem acento, sem pontuacao,
 *  espaco unico. Titulo com hifen tem que casar com o corpo, que perdeu o hifen. */
function canon(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Limpa a marcacao do markdown e devolve so o texto que interessa.
 *  Colchetes duplos legados viram o texto de dentro (o [[ ]] morreu). */
export function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_m, a, b) => b || a)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/[*_~>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string): string[] {
  const out: string[] = []
  // Hifen fica DENTRO do token: "bem-vindo" e uma palavra so. Quebrar no hifen
  // produzia conceito "vindo", que nao quer dizer nada.
  for (const bruto of fold(text).split(/[^a-z0-9-]+/)) {
    const raw = bruto.replace(/^-+|-+$/g, '')
    if (raw.length < 3 || raw.length > 28) continue
    if (STOPWORDS.has(raw)) continue
    if (/^\d+$/.test(raw)) continue
    out.push(raw)
  }
  return out
}

/** Rotulo legivel de um termo: a primeira grafia real vista no acervo. */
function prettyOf(term: string, seen: Map<string, string>): string {
  return seen.get(term) ?? term
}

/* -------------------------------------------------------------------- motor */

export function buildGraph(input: GraphInput[]): DottGraph {
  const N = input.length
  if (N === 0) {
    return {
      nodes: [], edges: [], communities: [], byNote: {},
      stats: { notes: 0, edges: 0, communities: 0, achadas: 0, inferidas: 0 },
    }
  }

  // 1. termos por nota + grafia original pra exibir depois
  const pretty = new Map<string, string>()
  const tf: Array<Map<string, number>> = []
  const plain: string[] = []
  for (const n of input) {
    const text = `${n.title} ${plainText(n.body)}`
    plain.push(canon(text))
    for (const w of text.split(/[^\p{L}\p{N}-]+/u)) {
      const f = fold(w)
      if (f.length >= 3 && !pretty.has(f)) pretty.set(f, w)
    }
    const m = new Map<string, number>()
    for (const t of tokens(text)) m.set(t, (m.get(t) ?? 0) + 1)
    tf.push(m)
  }

  // 2. IDF e vetores normalizados
  const df = new Map<string, number>()
  for (const m of tf) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1)

  const tetoDf = Math.max(2, Math.floor(N * TETO_DOCUMENTOS))
  const vec: Array<Map<string, number>> = []
  const conceitos: string[][] = []
  for (let i = 0; i < N; i++) {
    const v = new Map<string, number>()
    for (const [t, c] of tf[i]) {
      const d = df.get(t) ?? 1
      if (d > tetoDf && N > 3) continue // termo que esta em quase tudo nao distingue nada
      v.set(t, (1 + Math.log(c)) * Math.log(1 + N / d))
    }
    let norm = 0
    for (const w of v.values()) norm += w * w
    norm = Math.sqrt(norm) || 1
    for (const [t, w] of v) v.set(t, w / norm)
    vec.push(v)
    conceitos.push([...v.entries()].sort((a, b) => b[1] - a[1]).slice(0, CONCEITOS_POR_NOTA).map(e => e[0]))
  }

  // 3. arestas
  type Raw = { w: number; conf: Confidence; rel: Relation; why: string; extra: string[] }
  const pairs = new Map<string, Raw>()
  const key = (a: string, b: string) => (a < b ? `${a} ${b}` : `${b} ${a}`)
  const put = (a: string, b: string, r: Omit<Raw, 'extra'>) => {
    if (a === b) return
    const k = key(a, b)
    const cur = pairs.get(k)
    if (!cur) { pairs.set(k, { ...r, extra: [] }); return }
    // O motivo mais forte lidera e o outro vira complemento: a conexao nunca
    // perde informacao so porque duas evidencias apontaram pro mesmo par.
    const vence = r.w > cur.w || (r.w === cur.w && r.conf === 'ACHADA' && cur.conf !== 'ACHADA')
    if (vence) pairs.set(k, { ...r, extra: [cur.why] })
    else if (cur.extra.length === 0 && r.why !== cur.why) cur.extra = [r.why]
  }

  // 3a. ACHADA - o titulo de uma nota aparece escrito no corpo da outra.
  //     E o que substitui o [[ ]]: escreveu o nome, ligou.
  const titles = input.map(n => canon(n.title))
  for (let i = 0; i < N; i++) {
    const t = titles[i]
    const palavras = t.split(' ').filter(w => w && !STOPWORDS.has(w))
    // Titulo curto de uma palavra so (ex. "Ideias") casaria em tudo e viraria ruido.
    if (t.length < 4 || palavras.length === 0) continue
    if (palavras.length === 1 && (df.get(palavras[0]) ?? 0) > Math.max(2, N * 0.4)) continue
    const re = new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`)
    for (let j = 0; j < N; j++) {
      if (i === j) continue
      if (re.test(plain[j])) {
        put(input[i].id, input[j].id, {
          w: PESO_MENCIONA, conf: 'ACHADA', rel: 'menciona',
          why: `"${input[j].title}" cita "${input[i].title}" pelo nome`,
        })
      }
    }
  }

  // 3b. ACHADA - mesma etiqueta
  const porTag = new Map<string, string[]>()
  for (const n of input) {
    for (const tag of n.tags) {
      const f = fold(tag)
      if (!porTag.has(f)) porTag.set(f, [])
      porTag.get(f)!.push(n.id)
    }
  }
  const tetoTag = Math.max(2, Math.floor(N * TETO_DOCUMENTOS))
  // Junta TODAS as etiquetas em comum de um par numa aresta so: duas notas que
  // dividem #obra e #cliente tem um motivo, nao dois motivos repetidos.
  const tagsDoPar = new Map<string, string[]>()
  for (const [tag, ids] of porTag) {
    if (ids.length < 2 || ids.length > MAX_NOTAS_POR_TAG) continue
    // Etiqueta que esta em quase toda nota (ex. #tutorial em tudo) nao distingue
    // nada: ligaria tudo com tudo e a Constelacao viraria uma teia sem sentido.
    if (N >= 4 && ids.length > tetoTag) continue
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = key(ids[i], ids[j])
        if (!tagsDoPar.has(k)) tagsDoPar.set(k, [])
        tagsDoPar.get(k)!.push(tag)
      }
    }
  }
  for (const [k, tags] of tagsDoPar) {
    const [a, b] = k.split(' ')
    const lista = tags.map(t => `#${t}`)
    const texto = lista.length === 1
      ? `as duas carregam a etiqueta ${lista[0]}`
      : `as duas carregam as etiquetas ${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`
    put(a, b, {
      // Mais etiquetas em comum e mais evidencia, mas com retorno decrescente.
      w: PESO_TAG + Math.min(tags.length - 1, 3) * 0.06,
      conf: 'ACHADA', rel: 'mesma_tag', why: texto,
    })
  }

  // 3c. INFERIDA - mesmos conceitos raros (cosseno TF-IDF).
  //     Indice invertido: so compara par que divide pelo menos um conceito.
  const inv = new Map<string, number[]>()
  for (let i = 0; i < N; i++) {
    for (const t of conceitos[i]) {
      if (!inv.has(t)) inv.set(t, [])
      inv.get(t)!.push(i)
    }
  }
  const vistos = new Set<string>()
  // Guarda o parente mais proximo de cada nota, mesmo abaixo do piso.
  const melhor: Array<{ j: number; sim: number; top: string[] } | null> = input.map(() => null)
  for (const [, idxs] of inv) {
    if (idxs.length < 2 || idxs.length > 40) continue
    for (let x = 0; x < idxs.length; x++) {
      for (let y = x + 1; y < idxs.length; y++) {
        const i = idxs[x], j = idxs[y]
        const k = i < j ? `${i}:${j}` : `${j}:${i}`
        if (vistos.has(k)) continue
        vistos.add(k)

        const menor = vec[i].size <= vec[j].size ? vec[i] : vec[j]
        const maior = menor === vec[i] ? vec[j] : vec[i]
        let sim = 0
        const juntos: Array<[string, number]> = []
        for (const [t, w] of menor) {
          const o = maior.get(t)
          if (o !== undefined) { sim += w * o; juntos.push([t, w * o]) }
        }
        const top = juntos.sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => prettyOf(e[0], pretty))
        // Estar na mesma pasta e contexto de verdade: duas notas do mesmo
        // projeto que repetem palavras tem mais chance de falarem do mesmo do
        // que duas notas de cantos opostos da vida. Reforca, nunca liga sozinho.
        const mesmaPasta = !!input[i].folderId && input[i].folderId === input[j].folderId
        const forca = mesmaPasta ? sim * 1.3 : sim
        if (!melhor[i] || forca > melhor[i]!.sim) melhor[i] = { j, sim: forca, top }
        if (!melhor[j] || forca > melhor[j]!.sim) melhor[j] = { j: i, sim: forca, top }
        if (forca < PISO_TEMA) continue
        put(input[i].id, input[j].id, {
          w: forca, conf: 'INFERIDA', rel: 'mesmo_tema',
          why: `as duas falam de ${top.join(', ')}${mesmaPasta ? ', e estão na mesma pasta' : ''}`,
        })
      }
    }
  }

  // 3d. Nota que ficaria sozinha ganha o parente mais proximo, se houver algum.
  //     Fica marcada como INFERIDA: e deducao, e o texto diz isso na cara.
  const temAresta = new Set<string>()
  for (const k of pairs.keys()) { const [a, b] = k.split(' '); temAresta.add(a); temAresta.add(b) }
  for (let i = 0; i < N; i++) {
    if (temAresta.has(input[i].id)) continue
    const m = melhor[i]
    // Uma palavra em comum nao e assunto em comum ("as duas falam de pediu").
    // Sem duas evidencias, a nota fica sozinha mesmo: e a resposta honesta.
    if (!m || m.sim < PISO_PARENTE || m.top.length < 2) continue
    put(input[i].id, input[m.j].id, {
      w: m.sim, conf: 'INFERIDA', rel: 'mesmo_tema',
      why: `o parente mais próximo desta nota: as duas falam de ${m.top.join(', ')}`,
    })
  }

  // 4. poda - so as mais fortes de cada nota, dos dois lados
  const porNota = new Map<string, Array<{ other: string; w: number }>>()
  for (const n of input) porNota.set(n.id, [])
  for (const [k, r] of pairs) {
    const [a, b] = k.split(' ')
    porNota.get(a)?.push({ other: b, w: r.w })
    porNota.get(b)?.push({ other: a, w: r.w })
  }
  const mantidas = new Set<string>()
  for (const [id, lista] of porNota) {
    lista.sort((x, y) => y.w - x.w || x.other.localeCompare(y.other))
    for (const item of lista.slice(0, MAX_POR_NOTA)) mantidas.add(key(id, item.other))
  }

  const edges: GraphEdge[] = []
  for (const [k, r] of pairs) {
    if (!mantidas.has(k)) continue
    const [a, b] = k.split(' ')
    const why = r.extra.length ? `${r.why}, e ${r.extra[0]}` : r.why
    edges.push({ a, b, weight: r.w, confidence: r.conf, relation: r.rel, why })
  }
  edges.sort((x, y) => y.weight - x.weight || x.a.localeCompare(y.a))

  // vizinhanca final por nota
  const byNote: Record<string, Neighbor[]> = {}
  for (const n of input) byNote[n.id] = []
  for (const e of edges) {
    byNote[e.a]?.push({ id: e.b, weight: e.weight, why: e.why, confidence: e.confidence, relation: e.relation })
    byNote[e.b]?.push({ id: e.a, weight: e.weight, why: e.why, confidence: e.confidence, relation: e.relation })
  }
  for (const id of Object.keys(byNote)) byNote[id].sort((a, b) => b.weight - a.weight)

  // 5. comunidades por propagacao de rotulo (deterministica)
  const idx = new Map(input.map((n, i) => [n.id, i]))
  const label = input.map((_, i) => i)
  const viz: Array<Array<[number, number]>> = input.map(() => [])
  for (const e of edges) {
    const i = idx.get(e.a)!, j = idx.get(e.b)!
    viz[i].push([j, e.weight]); viz[j].push([i, e.weight])
  }
  for (let it = 0; it < 12; it++) {
    let mudou = false
    for (let i = 0; i < N; i++) {
      if (viz[i].length === 0) continue
      const soma = new Map<number, number>()
      for (const [j, w] of viz[i]) soma.set(label[j], (soma.get(label[j]) ?? 0) + w)
      let melhor = label[i], melhorPeso = -1
      for (const [lab, w] of [...soma.entries()].sort((a, b) => a[0] - b[0])) {
        if (w > melhorPeso) { melhorPeso = w; melhor = lab }
      }
      if (melhor !== label[i]) { label[i] = melhor; mudou = true }
    }
    if (!mudou) break
  }

  const grupos = new Map<number, number[]>()
  for (let i = 0; i < N; i++) {
    if (viz[i].length === 0) continue // nota solta nao entra em tema nenhum
    if (!grupos.has(label[i])) grupos.set(label[i], [])
    grupos.get(label[i])!.push(i)
  }
  const communities: Community[] = []
  const comOf = new Map<number, number>()
  let cid = 0
  for (const [, membros] of [...grupos.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])) {
    if (membros.length < 2) continue
    // O nome do tema tem que ser algo que os membros COMPARTILHAM: termo que so
    // aparece numa nota descreve aquela nota, nao o grupo.
    const soma = new Map<string, number>()
    const dfLocal = new Map<string, number>()
    for (const i of membros) {
      for (const [t, w] of vec[i]) {
        soma.set(t, (soma.get(t) ?? 0) + w)
        dfLocal.set(t, (dfLocal.get(t) ?? 0) + 1)
      }
    }
    const compartilhados = [...soma.entries()]
      .filter(e => (dfLocal.get(e[0]) ?? 0) >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 2)
      .map(e => prettyOf(e[0], pretty))

    // Grupo que se formou pela etiqueta pode nao ter palavra em comum nenhuma.
    // Nesse caso o nome do tema e a propria etiqueta, que e o que os une.
    const contaTag = new Map<string, number>()
    for (const i of membros) for (const tg of input[i].tags) contaTag.set(tg, (contaTag.get(tg) ?? 0) + 1)
    const tagDominante = [...contaTag.entries()]
      .filter(e => e[1] >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]

    const maisForte = [...soma.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 2)
      .map(e => prettyOf(e[0], pretty))

    const nome = compartilhados.length
      ? compartilhados.join(' e ')
      : tagDominante
        ? tagDominante[0]
        : maisForte.join(' e ')
    communities.push({ id: cid, label: nome || `Tema ${cid + 1}`, notes: membros.map(i => input[i].id) })
    for (const i of membros) comOf.set(i, cid)
    cid++
  }

  // 6. nos
  const nodes: GraphNode[] = input.map((n, i) => {
    const vizinhos = byNote[n.id] ?? []
    return {
      id: n.id,
      title: n.title,
      degree: vizinhos.length,
      strength: vizinhos.reduce((s, v) => s + v.weight, 0),
      community: comOf.get(i) ?? -1,
      terms: conceitos[i].slice(0, 6).map(t => prettyOf(t, pretty)),
    }
  })

  return {
    nodes,
    edges,
    communities,
    byNote,
    stats: {
      notes: N,
      edges: edges.length,
      communities: communities.length,
      achadas: edges.filter(e => e.confidence === 'ACHADA').length,
      inferidas: edges.filter(e => e.confidence === 'INFERIDA').length,
    },
  }
}
