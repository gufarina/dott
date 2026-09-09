#!/usr/bin/env node
/*
  motion-frames.mjs - prova quadro a quadro do movimento (TASK-462).

  POR QUE ESTE ARQUIVO EXISTE
  Uma captura de tela normal fotografa a animacao PARADA no fim. Isso nao prova
  nada sobre movimento: uma animacao quebrada, uma que quica quando nao deveria e
  uma que esta perfeita terminam todas no mesmo quadro final. O defeito mora no
  MEIO, e e exatamente o meio que ninguem olha.

  Este script pausa a animacao e ANDA COM ELA NA MAO, fotografando em 0%, 25%,
  50%, 75% e 100% do percurso. Assim da pra ver se a coisa passou do ponto
  (overshoot), se a luz esta chegando depois da forma (a assinatura da brasa) e
  se o meio do caminho tem algum salto.

  Usa a API de animacoes do proprio navegador (`document.getAnimations()`), que
  enxerga transition E keyframes, entao nao depende de saber o nome de nada.

  USO (com o vite em :1420)
    node scripts/motion-frames.mjs            # grava em .visual/quadros/
    node scripts/motion-frames.mjs --cena=busca
*/

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, '..', '.visual', 'quadros')
const URL = 'http://localhost:1420/'
const AMOSTRAS = [0, 0.25, 0.5, 0.75, 1]

const soCena = (process.argv.find((a) => a.startsWith('--cena=')) || '').split('=')[1]

/* Cada cena dispara UMA animacao e diz o que estamos conferindo nela. */
const CENAS = [
  {
    nome: 'ajustes',
    olho: 'entrada do painel de Ajustes - era a mola (passava do ponto), agora tem que chegar e parar',
    disparar: async (p) => p.locator('[aria-label="Configuracoes"], [aria-label="Configurações"]').first().click({ force: true }),
  },
  {
    nome: 'busca',
    olho: 'entrada da janela de busca - a luz tem que fechar depois da forma assentar',
    disparar: async (p) => p.keyboard.press('Control+k'),
  },
  {
    nome: 'constelacao',
    olho: 'troca de tela pra constelacao',
    disparar: async (p) => p.locator('[aria-label="Constelação"], [aria-label="Constelacao"]').first().click({ force: true }),
  },
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(() => {
    localStorage.setItem('dott:theme', 'dark')
    localStorage.setItem('dott:onboarding-seen', '1')
  })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.addStyleTag({ content: '[class*="toast"],[class*="Toast"]{display:none!important}' })

  for (const cena of CENAS) {
    if (soCena && cena.nome !== soCena) continue
    try {
      await cena.disparar(page)
      // Pausa TUDO no primeiro instante, antes que o quadro 1 termine.
      await page.waitForTimeout(16)
      const info = await page.evaluate(() => {
        const as = document.getAnimations().filter((a) => a.effect && a.playState !== 'finished')
        as.forEach((a) => a.pause())
        const dur = Math.max(0, ...as.map((a) => a.effect.getComputedTiming().activeDuration || 0))
        return { quantas: as.length, duracao: dur }
      })
      if (!info.quantas) {
        console.log(`[SEM ANIMACAO] ${cena.nome} - nada animou ao disparar. Isso e um achado, nao um erro do script.`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
        continue
      }
      for (const t of AMOSTRAS) {
        await page.evaluate((frac) => {
          document.getAnimations().forEach((a) => {
            const d = a.effect?.getComputedTiming().activeDuration
            if (d) { a.currentTime = d * frac }
          })
        }, t)
        await page.waitForTimeout(60)
        await page.screenshot({ path: join(OUT, `${cena.nome}-${String(Math.round(t * 100)).padStart(3, '0')}.png`) })
      }
      console.log(`[ok] ${cena.nome} - ${info.quantas} animacoes, ${Math.round(info.duracao)}ms | conferir: ${cena.olho}`)
      await page.evaluate(() => document.getAnimations().forEach((a) => a.play()))
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      const para = page.locator('text=PARA').first()
      if (await para.count()) await para.click({ timeout: 2000, force: true }).catch(() => {})
      await page.waitForTimeout(400)
    } catch (e) {
      console.log(`[FALHOU] ${cena.nome}: ${e.message.split('\n')[0]}`)
    }
  }
  await browser.close()
}

await main()
