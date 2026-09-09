#!/usr/bin/env node
/*
  visual-baseline.mjs - prova visual da normalizacao do design system (TASK-461).

  Por que existe: a normalizacao troca centenas de valores cravados por token. O
  build verde e os testes verdes NAO provam que a tela continua igual - eles nao
  olham pixel. Este script fotografa as telas principais nos dois temas antes e
  depois, e o `--compare` mede a diferenca pixel a pixel.

  O app roda inteiro no navegador (a casca Tauri so hospeda o WebView), entao o
  vite dev server em :1420 mostra a mesma interface que o executavel.

  USO
    node scripts/visual-baseline.mjs antes     # grava em .visual/antes/
    node scripts/visual-baseline.mjs depois    # grava em .visual/depois/
    node scripts/visual-baseline.mjs --compare # compara as duas pastas
*/

import { chromium } from 'playwright'
import { mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, '.visual')
const URL = 'http://localhost:1420/'
const modo = process.argv[2] || 'antes'

/* Cada cena e um nome + o que fazer na pagina antes de fotografar.

   ATENCAO (licao desta rodada): a primeira versao deste script navegava por
   `[data-view="..."]`, seletor que NAO EXISTE no app. Os cliques falhavam em
   silencio e tres "cenas" diferentes fotografavam a MESMA tela - a prova
   parecia cobrir o app e cobria uma tela so. Toda cena aqui agora navega por
   `aria-label` ou por texto visivel, e `clicar()` EXPLODE quando nao acha o
   alvo, em vez de seguir calado. Prova que nao pode falhar barulhento nao e
   prova. */
const CENAS = [
  { nome: 'board', ir: async () => {} },
  { nome: 'pasta', ir: async (p) => { await clicar(p, 'text=Comece aqui'); } },
  { nome: 'nota', ir: async (p) => { await clicar(p, 'text=Comece aqui'); await clicar(p, 'text=Bem-vindo') } },
  { nome: 'constelacao', ir: (p) => clicar(p, '[aria-label="Constelação"]') },
  { nome: 'ajustes', ir: (p) => clicar(p, '[aria-label="Configurações"]') },
  { nome: 'busca', ir: async (p) => { await p.keyboard.press('Control+k'); await p.waitForTimeout(500) } },
]

async function clicar(page, seletor) {
  const alvo = page.locator(seletor).first()
  await alvo.waitFor({ state: 'visible', timeout: 4000 })
  // `force` + timeout curto: sem isso, um alvo coberto por outra camada deixa o
  // click PENDURADO pra sempre, e a captura inteira trava sem dizer nada (foi o
  // que aconteceu na primeira tentativa desta rodada).
  await alvo.click({ timeout: 4000, force: true })
  await page.waitForTimeout(700)
}

/** Volta pro board entre cenas - Escape sozinho nao desfaz navegacao. */
async function voltar(page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  try {
    const para = page.locator('text=PARA').first()
    if (await para.count()) {
      await para.click({ timeout: 3000, force: true })
      await page.waitForTimeout(500)
    }
  } catch { /* ja estava no board */ }
}

async function capturar() {
  const browser = await chromium.launch()
  for (const tema of ['dark', 'light']) {
    const dir = join(OUT, modo)
    mkdirSync(dir, { recursive: true })
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 })
    await ctx.addInitScript((t) => {
      localStorage.setItem('dott:theme', t)
      localStorage.setItem('dott:onboarding-seen', '1')
    }, tema)
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500) // boot loader + fontes
    /* Congela movimento e cursor (senao a foto pega o meio da animacao) e
       esconde a pilha de avisos: no navegador nao existe a ponte do Tauri
       pro disco, entao o app enche a tela de "Falha ao salvar" - ruido que
       varia a cada carga e sujaria a comparacao. */
    await page.addStyleTag({
      content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
                [class*="toast"],[class*="Toast"]{display:none!important}`,
    })
    let falhas = 0
    for (const cena of CENAS) {
      try {
        await cena.ir(page)
        await page.waitForTimeout(500)
        await page.screenshot({ path: join(dir, `${cena.nome}-${tema}.png`) })
        console.log(`[ok] ${cena.nome}-${tema}.png`)
      } catch (e) {
        falhas++
        console.log(`[FALHOU] ${cena.nome}-${tema}: ${e.message.split('\n')[0]}`)
      }
      await voltar(page)
    }
    if (falhas) console.log(`[AVISO] ${falhas} cena(s) de ${tema} nao foram fotografadas - a prova esta INCOMPLETA nesse tema.`)
    await ctx.close()
  }
  await browser.close()
}

function comparar() {
  const a = join(OUT, 'antes'), b = join(OUT, 'depois')
  if (!existsSync(a) || !existsSync(b)) { console.log('faltam as duas pastas'); process.exit(1) }
  let pior = 0
  for (const f of readdirSync(a).filter((f) => f.endsWith('.png'))) {
    if (!existsSync(join(b, f))) { console.log(`  ${f}: SO EM ANTES`); continue }
    const A = PNG.sync.read(readFileSync(join(a, f)))
    const B = PNG.sync.read(readFileSync(join(b, f)))
    if (A.width !== B.width || A.height !== B.height) { console.log(`  ${f}: TAMANHO MUDOU`); continue }
    let dif = 0
    for (let i = 0; i < A.data.length; i += 4) {
      if (Math.abs(A.data[i] - B.data[i]) > 8 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 8 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 8) dif++
    }
    const pct = (dif / (A.width * A.height)) * 100
    pior = Math.max(pior, pct)
    console.log(`  ${f.padEnd(18)} ${pct.toFixed(3)}% de pixel diferente`)
  }
  console.log(`\npior cena: ${pior.toFixed(3)}%`)
}

if (process.argv.includes('--compare')) comparar()
else await capturar()
