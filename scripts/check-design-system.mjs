#!/usr/bin/env node
/*
  check-design-system.mjs - o medidor de aderencia ao design system do Dott.

  POR QUE ESTE ARQUIVO EXISTE
  O Dott ja tinha a camada de token madura (src/styles/tokens.css, ~150 tokens: cor,
  espaco, tipografia, raio, elevacao, duracao, easing). O problema nunca foi a FONTE -
  foi o CONSUMO: tela nova nascia com valor cravado em vez de consumir a escala. Sem um
  medidor, "esta consistente" era opiniao. Aqui vira numero.

  O QUE ELE FAZ
  Le tokens.css, extrai as escalas REAIS (nao uma lista inventada aqui dentro) e varre
  src/ procurando valor cravado que ja tem token equivalente. Cada achado sai com
  arquivo:linha e, quando existe, o token que deveria estar no lugar.

  RATCHET (catraca)
  scripts/design-system-baseline.json guarda a contagem tolerada por categoria. O check
  REPROVA se a contagem subir acima da baseline - nunca deixa a divida crescer. Baixou?
  o proprio check manda rodar --update-baseline pra travar o novo piso. Este e o mesmo
  padrao de catraca que o Studio ja usa nos mapas de grafo: divida conhecida fica
  registrada e so pode encolher.

  USO
    node scripts/check-design-system.mjs             # relatorio + veredito contra baseline
    node scripts/check-design-system.mjs --verbose   # lista arquivo:linha de cada achado
    node scripts/check-design-system.mjs --json      # saida de maquina
    node scripts/check-design-system.mjs --update-baseline
*/

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const TOKENS = join(SRC, 'styles', 'tokens.css')
const BASELINE = join(ROOT, 'scripts', 'design-system-baseline.json')

const argv = process.argv.slice(2)
const VERBOSE = argv.includes('--verbose')
const AS_JSON = argv.includes('--json')
const UPDATE = argv.includes('--update-baseline')

// ---------------------------------------------------------------- arquivos

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p, out); continue }
    out.push(p)
  }
  return out
}

const rel = (p) => relative(ROOT, p).split(sep).join('/')
const ALL = walk(SRC).map(rel)

// tokens.css e reset.css sao a CAMADA de token: e la que valor cravado pode morar.
const TOKEN_LAYER = new Set(['src/styles/tokens.css', 'src/styles/reset.css'])
const isTest = (f) => /\.(test|spec)\.[jt]sx?$/.test(f)
const cssFiles = ALL.filter((f) => f.endsWith('.css') && !TOKEN_LAYER.has(f))
const codeFiles = ALL.filter((f) => /\.tsx?$/.test(f) && !isTest(f))

// ---------------------------------------------------------------- escalas reais

const tokensSrc = readFileSync(TOKENS, 'utf8')

/** Todas as declaracoes `--nome: valor;` do tokens.css, por tema. */
function readTokenDecls(src) {
  const decls = []
  const re = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim
  let m
  while ((m = re.exec(src))) decls.push({ name: m[1], value: m[2].trim() })
  return decls
}
const DECLS = readTokenDecls(tokensSrc)

/** value normalizado -> primeiro token que o declara (pra sugerir substituicao). */
function indexByValue(pred) {
  const idx = new Map()
  for (const d of DECLS) {
    if (!pred(d)) continue
    const k = d.value.toLowerCase().replace(/\s+/g, ' ')
    if (!idx.has(k)) idx.set(k, d.name)
  }
  return idx
}

const isLen = (v) => /^-?[0-9.]+px$/.test(v)
const SPACE_BY_VALUE = indexByValue((d) => /^--space-/.test(d.name) && isLen(d.value))
const TEXT_BY_VALUE = indexByValue((d) => /^--text-/.test(d.name) && isLen(d.value))
const RADIUS_BY_VALUE = indexByValue((d) => /^--r-/.test(d.name) && isLen(d.value))
const COLOR_BY_VALUE = indexByValue((d) => /^(#|rgba?\(|hsla?\(|oklch\()/i.test(d.value))
const SHADOW_BY_VALUE = indexByValue((d) => /^--(shadow|elev|elevation)/.test(d.name))
const Z_BY_VALUE = indexByValue((d) => /^--z-/.test(d.name) && /^-?[0-9]+$/.test(d.value))
const DUR_BY_VALUE = indexByValue((d) => /^--(dur|stagger|shimmer-duration)/.test(d.name) && /^[0-9.]+m?s$/.test(d.value))
const EASE_BY_VALUE = indexByValue((d) => /^--ease/.test(d.name))

/** ms de "170ms" ou "0.17s", pra casar duracao escrita nas duas notacoes. */
function emMs(v) {
  const m = /^([0-9.]+)(ms|s)$/.exec(v.trim())
  if (!m) return null
  return m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1])
}
const DUR_POR_MS = new Map()
for (const [valor, nome] of DUR_BY_VALUE) {
  const ms = emMs(valor)
  if (ms !== null && !DUR_POR_MS.has(ms)) DUR_POR_MS.set(ms, nome)
}

// ---------------------------------------------------------------- deteccao

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g
// Palavras que parecem cor mas nao sao decisao visual cravada.
const COLOR_SAFE = /^(transparent|currentcolor|inherit|initial|unset|none)$/i

const findings = []
const add = (cat, file, line, text, hint = '') =>
  findings.push({ cat, file, line, text: text.trim().slice(0, 140), hint })

/** Linhas de um arquivo, ja sem comentario de bloco CSS (ruido de doc). */
function lines(file) {
  const raw = readFileSync(join(ROOT, file), 'utf8')
  const stripped = file.endsWith('.css') ? raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')) : raw
  return stripped.split(/\r?\n/)
}

for (const file of cssFiles) {
  lines(file).forEach((ln, i) => {
    const n = i + 1

    // 1. cor literal
    for (const hit of ln.match(COLOR_RE) || []) {
      if (COLOR_SAFE.test(hit)) continue
      const key = hit.toLowerCase().replace(/\s+/g, ' ')
      add('cor', file, n, ln, COLOR_BY_VALUE.get(key) ? `var(${COLOR_BY_VALUE.get(key)})` : '')
    }

    // 2. espacamento cravado que ja existe na escala
    const sp = ln.match(/\b(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left))?\s*:\s*([^;]+)/i)
    if (sp) {
      for (const v of sp[4].match(/-?[0-9.]+px/g) || []) {
        if (v === '0px') continue
        add('espaco', file, n, ln, SPACE_BY_VALUE.get(v) ? `var(${SPACE_BY_VALUE.get(v)})` : 'fora da escala')
      }
    }

    // 3. tipografia cravada
    const fs = ln.match(/\bfont-size\s*:\s*([^;]+)/i)
    if (fs) {
      for (const v of fs[1].match(/[0-9.]+px/g) || []) {
        add('tipografia', file, n, ln, TEXT_BY_VALUE.get(v) ? `var(${TEXT_BY_VALUE.get(v)})` : 'fora da escala')
      }
    }

    // 4. raio cravado
    const br = ln.match(/\bborder-radius\s*:\s*([^;]+)/i)
    if (br) {
      for (const v of br[1].match(/[0-9.]+px/g) || []) {
        if (v === '0px') continue
        add('raio', file, n, ln, RADIUS_BY_VALUE.get(v) ? `var(${RADIUS_BY_VALUE.get(v)})` : 'fora da escala')
      }
    }

    // 5. sombra cravada (escala de elevacao existe: --elev-0..5)
    const sh = ln.match(/\bbox-shadow\s*:\s*([^;]+)/i)
    if (sh && !/var\(/.test(sh[1]) && !/^\s*none\s*$/i.test(sh[1])) {
      const key = sh[1].trim().toLowerCase().replace(/\s+/g, ' ')
      add('sombra', file, n, ln, SHADOW_BY_VALUE.get(key) ? `var(${SHADOW_BY_VALUE.get(key)})` : 'fora da escala de elevacao')
    }

    /* 7. MOVIMENTO (TASK-462). O app tem doutrina de movimento escrita em
       tokens.css ("A BRASA") e uma receita canonica em reset.css, mas a
       auditoria mediu 64 duracoes e 37 curvas cravadas fora do sistema. Sem
       medir isso, "movimento normalizado" e opiniao. */
    const mv = ln.match(/\b(transition|animation)(-duration|-timing-function)?\s*:\s*([^;]+)/i)
    if (mv) {
      const valor = mv[3]

      // 7a. `all` anima ate o que voce nao sabe que existe.
      if (/(^|\s)all(\s|,|$)/.test(valor)) add('movimento', file, n, ln, 'nomear as propriedades, nunca `all`')

      // 7b. ease-in engasga no comeco - proibido em UI pela doutrina do projeto.
      if (/\bease-in\b(?!-out)/.test(valor)) add('movimento', file, n, ln, 'ease-in e proibido em UI: use var(--ease-out)')

      // 7c. propriedade que forca recalculo de layout a cada quadro.
      const proibida = valor.match(/\b(width|height|top|left|right|bottom|margin|padding)\b/)
      if (proibida) add('movimento', file, n, ln, `nao animar ${proibida[1]}: use transform`)

      /* 7d. duracao cravada.
         EXCECAO MEDIDA: laco AMBIENTE (`infinite` com 1s ou mais). Sao as
         brasas do widget - `pulso1..4` e `respiro`, em 6.4s, 8.1s, 5.1s, 9.3s e
         4.2s. Os numeros sao propositalmente DESSINCRONIZADOS pra brasa
         tremular como carvao de verdade em vez de piscar toda junta. Empurrar
         isso pra escala da UI (90-300ms, que e escala de RESPOSTA de interface)
         sincronizaria as quatro e mataria o efeito. Duracao de laco ambiente e
         composicao, nao decisao de sistema. */
      const ambiente = /\binfinite\b/.test(valor)
      const ehAnimation = /^animation/i.test(mv[1] + (mv[2] || ''))
      for (const v of valor.match(/(?<!\()\b[0-9.]+m?s\b/g) || []) {
        if (/var\(\s*--(dur|stagger|shimmer)/.test(valor) && !valor.includes(v)) continue
        const ms = emMs(v)
        if (ms === 0) continue
        if (ambiente && ms !== null && ms >= 1000) continue

        /* Idioma universal de `prefers-reduced-motion`: uma duracao quase-zero
           (`.001ms`) pra matar a animacao sem quebrar o evento `animationend`.
           Nao e valor de design. */
        if (ms !== null && ms < 10) continue

        /* Tier de CENA. A doutrina em tokens.css cravou o teto da INTERFACE em
           300ms ("um dropdown de 180ms parece mais responsivo que um de
           400ms"), e a mesma fonte diz que motion explicativo pode ser mais
           longo. Entao `animation` acima do teto NAO e desvio da escala: e
           outro tier - a coreografia da demonstracao de onboarding, o boot, a
           brasa. Forcar isso pra 300ms nao normalizaria nada, explicaria menos.
           A CURVA dessas continua sendo cobrada (regra 7e), e `transition`
           NUNCA e isenta: transicao e sempre resposta de interface. */
        if (ehAnimation && ms !== null && ms > 300) continue

        const tok = ms !== null ? DUR_POR_MS.get(ms) : null
        add('movimento', file, n, ln, tok ? `var(${tok})` : 'duracao fora da escala')
      }

      // 7e. curva cravada (literal ou palavra-chave do navegador).
      if (/cubic-bezier\(/.test(valor) && !/var\(\s*--ease/.test(valor)) {
        const lit = valor.match(/cubic-bezier\([^)]*\)/)[0].toLowerCase().replace(/\s+/g, ' ')
        add('movimento', file, n, ln, EASE_BY_VALUE.get(lit) ? `var(${EASE_BY_VALUE.get(lit)})` : 'curva fora do sistema')
      } else if (/\b(ease-in-out|ease-out|ease)\b/.test(valor) && !/var\(\s*--ease/.test(valor)) {
        add('movimento', file, n, ln, 'curva embutida do navegador e fraca: use var(--ease-out)')
      }
    }

    /* 7f. SISTEMA DE MOVIMENTO PARALELO (o achado mais caro desta auditoria).
       Uma curva ou duracao declarada como custom property FORA de src/styles/ e
       um design system clandestino: `var(...)` no consumidor faz o codigo
       PARECER tokenizado, e a regra 7e passa batido. Foi o que estava
       acontecendo em Widget.module.css, que tinha quatro curvas proprias -
       `--chegada` byte a byte identica a `--ease-out`, `--saida` sendo um
       ease-in (proibido pela doutrina) usado justamente nas saidas, `--mola`
       com overshoot e `--morf` uma quarta curva que ninguem decidiu. Justo na
       superficie mais vista do produto. */
    const declLocal = ln.match(/^\s*(--[a-z0-9-]+)\s*:\s*(cubic-bezier\([^)]*\)|linear\([^)]*\)|steps\([^)]*\)|[0-9.]+m?s)\s*;/i)
    if (declLocal) {
      add('movimento', file, n, ln, `curva/duracao declarada fora de src/styles/: mover ${declLocal[1]} pro tokens.css ou consumir o token que ja existe`)
    }

    // 6. z-index cravado. Um digito e composicao LOCAL dentro do proprio
    //    contexto de empilhamento do componente - nao e camada do app, nao entra.
    const zi = ln.match(/\bz-index\s*:\s*(-?[0-9]+)/)
    if (zi && Math.abs(Number(zi[1])) >= 10) {
      add('z-index', file, n, ln, Z_BY_VALUE.get(zi[1]) ? `var(${Z_BY_VALUE.get(zi[1])})` : 'fora da escada')
    }
  })
}

for (const file of codeFiles) {
  lines(file).forEach((ln, i) => {
    const n = i + 1
    // cor literal em TS/TSX (style inline, config de lib, canvas)
    for (const hit of ln.match(COLOR_RE) || []) {
      if (COLOR_SAFE.test(hit)) continue
      add('cor-em-codigo', file, n, ln, '')
    }
  })
}

// 7. elemento nativo onde ja deveria haver componente canonico
const UI_DIR = /^src\/components\/ui\//
for (const file of codeFiles) {
  if (UI_DIR.test(file)) continue
  lines(file).forEach((ln, i) => {
    for (const m of ln.match(/<(button|input|select|textarea)\b/g) || []) {
      add('elemento-artesanal', file, i + 1, ln, `usar componente canonico de ${m.slice(1)}`)
    }
  })
}

// ---------------------------------------------------------------- veredito

const CATS = ['cor', 'cor-em-codigo', 'espaco', 'tipografia', 'raio', 'sombra', 'z-index', 'movimento', 'elemento-artesanal']
const counts = Object.fromEntries(CATS.map((c) => [c, findings.filter((f) => f.cat === c).length]))
const total = findings.length

if (UPDATE) {
  writeFileSync(BASELINE, JSON.stringify({ gerado: new Date().toISOString().slice(0, 10), counts }, null, 2) + '\n')
  console.log(`[OK] baseline atualizada: ${total} achados`)
  process.exit(0)
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).counts : null

if (AS_JSON) {
  console.log(JSON.stringify({ counts, total, baseline, findings }, null, 2))
  process.exit(0)
}

console.log('=== Design System - aderencia ao SSOT (src/styles/tokens.css) ===\n')
const w = Math.max(...CATS.map((c) => c.length))
let regressao = 0
let folga = 0
for (const c of CATS) {
  const now = counts[c]
  const was = baseline ? baseline[c] ?? 0 : null
  let mark = ' '
  if (was !== null) {
    if (now > was) { mark = 'X'; regressao++ }
    else if (now < was) { mark = '+'; folga++ }
    else mark = '='
  }
  console.log(` ${mark} ${c.padEnd(w)}  ${String(now).padStart(4)}${was !== null ? `   (baseline ${was})` : ''}`)
}
console.log(`\n   TOTAL${' '.repeat(w - 4)}  ${String(total).padStart(4)}`)

if (VERBOSE) {
  console.log('\n--- achados ---')
  for (const f of findings) console.log(`[${f.cat}] ${f.file}:${f.line}  ${f.hint ? `-> ${f.hint}` : ''}\n    ${f.text}`)
}

if (regressao > 0) {
  console.log(`\nFALHA: ${regressao} categoria(s) acima da baseline. A divida de design system nao pode crescer.`)
  console.log('Consulte src/styles/tokens.css e troque o valor cravado pelo token equivalente.')
  process.exit(1)
}
if (folga > 0) {
  console.log(`\n[OK] ${folga} categoria(s) abaixo da baseline. Trave o piso novo:`)
  console.log('     node scripts/check-design-system.mjs --update-baseline')
}
console.log('\n[OK] nenhuma regressao de design system.')
