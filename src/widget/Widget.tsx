import { useEffect, useRef, useState } from 'react'
import { readText, readImage } from '@tauri-apps/plugin-clipboard-manager'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, Window } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { detectType, type DetectedType } from '../lib/detectType'
import { saveImageFile } from '../lib/attachments'
import { showToast } from '../components/Toast'
import { DottMark } from '../components/DottMark'
import { CardTypeIcon } from '../components/CardTypeIcon'
import { Icon } from '../components/Icon'
import s from './Widget.module.css'

const WIN   = 104   // janela colapsada (orb 56 + folga pro brilho)
const EXP_W = 340
const EXP_H = 300   // acomoda chip de tipo + preview de imagem

// Janela do aviso de captura: ele mora ACIMA da bolinha e nao cabe nos 104px do
// repouso. E o UNICO motivo que sobrou pra janela mudar de tamanho fora do
// painel — e ele aparece depois de uma acao deliberada, nunca a esmo.
const STAGE_W = 380
const STAGE_H = 200

// Distancia do CENTRO da bolinha ate a borda direita da janela. E a MESMA em
// todo tamanho, de proposito: se ela mudasse junto com a janela, o CSS aplicaria
// a mudanca no mesmo quadro e a janela so um ou dois quadros depois — e a
// bolinha pularia no intervalo. Ver o comentario no lugar do `.stageBig`.
const ORB_R = 52

// NAO reintroduza comportamento de hover aqui.
// Ja existiram duas versoes: um trilho de tres botoes e, depois, uma caixa de
// captura rapida. As duas cairam pelo mesmo motivo de fundo — abrir alguma coisa
// ao passar o mouse obriga a JANELA a mudar de tamanho, e mudar o tamanho de uma
// janela nativa embaixo do cursor nunca fica bom: trava, pisca e disputa o
// controle com o Windows. Passar o mouse nao e uma intencao; clicar e.
// A bolinha responde ao cursor SO com a luz por dentro, que e desenho, nao janela.

// Tempo do aviso de captura na tela, e da animacao de saida dele.
const AVISO_VIDA  = 2600
const AVISO_SAIDA = 220

/* ═══ A LUZ QUE CORRE ATRAS DO CURSOR ══════════════════════════════════════
   A BOLINHA fica parada — ela nao se mexe, nao cresce, nao reage. Quem responde
   ao cursor e so a LUZ dentro dela.

   A diferenca em relacao a versao antiga (que era lenta) esta em O QUE se
   escreve por quadro. Antes o laco escrevia a POSICAO DENTRO DO GRADIENTE, e
   gradiente que muda tem que ser redesenhado do zero — quatro deles, sessenta
   vezes por segundo. Agora o laco escreve `translate`, que so desloca uma imagem
   ja pronta: trabalho de placa de video, custo perto de zero.

   `translate` e `scale` sao propriedades SEPARADAS de proposito: a pulsacao mora
   em `scale` (keyframe de CSS) e o arrasto mora em `translate` (este laco). Se
   as duas disputassem `transform`, a animacao de CSS ganharia e o arrasto nunca
   apareceria. */
const ALCANCE = 220                    // ate onde o cursor e sentido
const ALC_LUZ = 121                    // 220 * .55 — onde o deslocamento satura
const UY_TETO = 0.24                   // a luz sobe muito e desce pouco
// Arrasto diferencial: o nucleo chega antes (lam alto, deslocamento maior) e o
// ambiente e o mais preguicoso. E essa DIFERENCA — e so ela — que abre o rastro.
// Aproximar os numeros mata o efeito inteiro.
// `pull` e o deslocamento MAXIMO teorico em px. O deslocamento real dá cerca de
// 48% disso (o pico da curva de proximidade cai perto de 121px de distancia),
// entao o nucleo anda ~10px e o ambiente ~2,4px. Teto de seguranca: a camada tem
// 14px de folga de cada lado (`inset: -25%` sobre 56px), e a pior diagonal
// possivel da ~12px — passar muito destes numeros faz a borda da camada aparecer.
const CAMADAS = [
  { k: 'l4', pull:  5, lam:  5 },
  { k: 'l1', pull: 15, lam: 11 },
  { k: 'l2', pull: 12, lam:  7 },
  { k: 'l3', pull: 22, lam: 26 },
] as const
const DT_TETO = 0.064                  // s — se a maquina engasgar, a luz nao teleporta
const EPS_POS = 0.05                   // px — abaixo disso, assentou

// Amortecimento exponencial independente da taxa de quadro: a 60Hz e a 144Hz o
// resultado por segundo de relogio e IDENTICO (o lerp de fator fixo nao e).
const damp = (cur: number, alvo: number, lambda: number, dt: number) =>
  cur + (alvo - cur) * (1 - Math.exp(-lambda * dt))

// Saida do painel. Entrar e uma decisao (420ms, no CSS); sair e obediencia.
// Este numero existe aqui porque o JS precisa ESPERAR o painel terminar de
// encolher antes de mudar a janela — se mudar, mude junto o `.panelSaindo`.
const SAIDA_PAINEL = 220

// Mapa de tipo → classe CSS (mesmos nomes do InboxPanel.module.css)
const TYPE_CSS: Record<string, string> = {
  NOTA: 'nota', URL: 'url', CODIGO: 'codigo', SHELL: 'shell', IDEIA: 'ideia',
  PROMPT: 'prompt', TAREFA: 'tarefa', CONTATO: 'contato', IMAGEM: 'imagem',
}

interface Aviso {
  id: string
  type: DetectedType
  label: string
  texto: string
  saindo?: boolean
}

// Contador monotonico: dois avisos no mesmo milissegundo teriam a MESMA chave.
let seqAviso = 0

export function Widget() {
  const [open, setOpen]         = useState(false)
  const [fechando, setFechando] = useState(false)
  const [text, setText]         = useState('')
  const [count, setCount]       = useState(0)
  const [avisos, setAvisos]     = useState<Aviso[]>([])
  const [imgPreview, setImgPreview] = useState<{ file: File; url: string } | null>(null)
  const taRef    = useRef<HTMLTextAreaElement>(null)
  const orbRef   = useRef<HTMLButtonElement>(null)
  const drag  = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // Enquanto o botao esta apertado (ou a janela esta sendo arrastada pelo
  // Windows) o widget CONGELA: nao abre nada e nao redimensiona a janela.
  // Redimensionar no meio de um arrasto nativo e o que fazia o widget saltar.
  const preso = useRef(false)
  const [arrastando, setArrastando] = useState(false)
  // O laco da luz le isto a cada quadro. Precisa ser ref, nao estado: o laco e
  // criado uma vez e nunca ve um valor novo de closure.
  const abertoRef = useRef(false)

  // As quatro camadas de luz e o estado do laco. Vive em ref porque e escrito a
  // cada quadro: se fosse estado do React, cada quadro custaria uma renderizacao.
  const luzes = useRef<Record<string, HTMLSpanElement | null>>({})
  const campo = useRef({
    px: -1e5, py: -1e5, temPonteiro: false,
    p: Object.fromEntries(CAMADAS.map(c => [c.k, [0, 0]])) as Record<string, number[]>,
    alvo: Object.fromEntries(CAMADAS.map(c => [c.k, [0, 0]])) as Record<string, number[]>,
    rodando: false, ultQuadro: 0, id: 0,
  })

  const detection = text.trim() ? detectType(text) : imgPreview ? { type: 'IMAGEM', label: 'Imagem', confidence: 1 } : null

  const refreshCount = () => {
    invoke<{ content: string }[]>('inbox_list')
      .then(c => setCount(c.length))
      .catch(() => {})
  }
  useEffect(() => { refreshCount() }, [])

  // Atalho global (Ctrl+Shift+Space) → abre o painel de captura.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('widget-summon', () => { refreshCount(); expand() }))
      .then(fn => { unlisten = fn })
      .catch(() => {})
    return () => { unlisten?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O contador local so ressincronizava no mount e no summon; a Inbox pode
  // mudar pela janela principal (processar/excluir card) sem o widget saber,
  // e o guard `isFull` disparava errado. Mesmo evento que App.tsx ja escuta.
  useEffect(() => {
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen('inbox-changed', () => refreshCount()))
      .then(fn => { unlisten = fn })
      .catch(() => {})
    return () => { unlisten?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const win = () => getCurrentWindow()

  // ── A ANCORA ──────────────────────────────────────────────────────────────
  // A bolinha NAO pode se mexer quando a janela muda de tamanho: em todo tamanho
  // ela mora a `r` da borda direita e a ORB_R da de baixo (o CSS ancora ela ali).
  // A janela cresce pra cima e pra esquerda, e o cursor continua onde estava.
  //
  // O ponto fixo e o CENTRO DA BOLINHA NA TELA, guardado aqui uma vez. Antes
  // cada redimensionamento LIA a posicao atual e escrevia uma nova a partir
  // dela. Com DPI fracionario (125%, 150%) cada volta arredonda meio pixel, e o
  // erro se acumula: a bolinha escorrega, sai de debaixo do cursor, o mouse
  // "sai" da janela, ela encolhe, o mouse entra de novo — e o widget fica
  // piscando e andando pela tela. Com a ancora guardada nao ha leitura, nao ha
  // realimentacao, e nao ha deriva.
  const geo = useRef({ w: WIN, h: WIN, r: ORB_R })
  const ancora = useRef<{ x: number; y: number } | null>(null)
  // Ultima posicao que NOS pedimos, e a escala da tela em cache. Servem pro
  // ouvinte de movimento saber distinguir "a janela se mexeu porque eu mandei"
  // de "a janela se mexeu porque o usuario arrastou".
  const posPedida = useRef<{ x: number; y: number } | null>(null)
  const escala = useRef(1)

  // Le a posicao real e converte pro centro da bolinha. So e chamada em dois
  // momentos: ao abrir o widget, e ao fim de um ARRASTO DE VERDADE — os unicos
  // em que quem mexeu na janela foi o Windows, e nao nos.
  //
  // O `snapshot` do tamanho e tirado ANTES do primeiro await, e isso e o coracao
  // da correcao. Havia uma corrida aqui: um clique disparava esta funcao e, no
  // mesmo instante, `expand()` mudava `geo.current` de 104x104 pra 340x300. Como
  // a conta rodava DEPOIS dos awaits, ela somava a posicao da janela PEQUENA com
  // o tamanho da janela GRANDE e a ancora saia 236px pra direita e 196px pra
  // baixo. Ao fechar o painel, a janela voltava pra esse lugar errado — e o
  // widget simplesmente sumia de onde deveria estar.
  const lerAncora = async () => {
    const g = { ...geo.current }        // ANTES de qualquer await. Nao mova isto.
    try {
      const wd    = win()
      const pos   = await wd.outerPosition()
      const scale = await wd.scaleFactor()
      ancora.current = {
        x: Math.round(pos.x / scale) + (g.w - g.r),
        y: Math.round(pos.y / scale) + (g.h - ORB_R),
      }
    } catch {
      // Fora do Tauri (conferencia por navegador). NAO zera a ancora que ja
      // existe: uma leitura que falhou nao e prova de que a anterior era ruim.
    }
  }
  useEffect(() => { lerAncora() }, [])

  // ── Quem move a janela nem sempre somos nos ───────────────────────────────
  // O painel e arrastavel pela barra do topo (`data-tauri-drag-region`), e esse
  // arrasto e NATIVO: o Windows move a janela sozinho, sem passar por nenhum
  // codigo daqui. A ancora guardada continuava valendo o lugar antigo, entao ao
  // fechar o painel o widget voltava pro ponto onde estava quando foi aberto.
  //
  // Ouvir o evento de movimento resolve a classe inteira do problema, nao so
  // este caso: vale pro arrasto pela barra, pra janela encaixada pelo Windows,
  // pra troca de monitor. Nao ha mais adivinhacao sobre quem mexeu.
  useEffect(() => {
    let parar: (() => void) | undefined
    let vivo = true
    const wd = win()
    wd.scaleFactor().then(s => { if (vivo) escala.current = s }).catch(() => {})
    wd.onMoved(({ payload }) => {
      const lx = Math.round(payload.x / escala.current)
      const ly = Math.round(payload.y / escala.current)
      const alvo = posPedida.current
      // Movimento NOSSO: ignora. Recalcular a ancora a partir do proprio
      // resultado e o laco de realimentacao que fazia o widget derivar pela
      // tela — o mesmo defeito que a ancora veio consertar.
      if (alvo && Math.abs(lx - alvo.x) <= 1 && Math.abs(ly - alvo.y) <= 1) return
      const g = geo.current
      ancora.current = { x: lx + (g.w - g.r), y: ly + (g.h - ORB_R) }
    }).then(f => { if (vivo) parar = f; else f() }).catch(() => {})
    return () => { vivo = false; parar?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toda mudanca de geometria entra nesta fila. Sem ela, duas chamadas que se
  // cruzam (fechar o painel enquanto um aviso aparece, por exemplo) leem o mesmo
  // `geo.current` e a segunda parte de um estado que ja nao existe mais.
  const fila = useRef<Promise<void>>(Promise.resolve())
  const setGeo = (w: number, h: number, r: number) => {
    fila.current = fila.current.then(() => aplicarGeo(w, h, r)).catch(() => {})
    return fila.current
  }

  const aplicarGeo = async (w: number, h: number, r: number) => {
    const from = geo.current
    if (from.w === w && from.h === h && from.r === r) return
    // Arrasto em curso: quem manda na posicao da janela e o Windows. Mexer aqui
    // e disputar o controle com ele — o widget saltava e o gesto se perdia.
    if (preso.current) return
    const a = ancora.current
    if (!a) {
      try { await win().setSize(new LogicalSize(w, h)); geo.current = { w, h, r } } catch {}
      return
    }
    const x = a.x - (w - r)
    const y = a.y - (h - ORB_R)
    // Registra ANTES de pedir: e assim que o ouvinte de movimento reconhece o
    // evento que vai chegar como nosso, e nao como um arrasto do usuario.
    posPedida.current = { x, y }
    try {
      // UMA chamada: mover e redimensionar do lado nativo, no mesmo passo. Em
      // duas chamadas separadas o compositor desenhava um quadro com o tamanho
      // novo na posicao velha, e a bolinha dava um pulo visivel.
      await invoke('widget_set_geometry', { x, y, w, h })
      // So depois de dar certo. Marcar antes fazia o widget "achar" que estava
      // num tamanho que nunca chegou a existir, e a proxima chamada partia dai.
      geo.current = { w, h, r }
    } catch {
      try { await win().setSize(new LogicalSize(w, h)); geo.current = { w, h, r } } catch {}
    }
  }

  // Tamanho da janela no estado colapsado. A abertura e o fechamento do painel
  // NAO passam por aqui: eles precisam mandar na ORDEM (crescer antes de entrar,
  // encolher depois de sair), e um efeito declarativo nao expressa ordem.
  // `arrastando` esta na lista porque, quando o arrasto acaba, este efeito roda
  // de novo e poe a janela no tamanho que o estado ja pedia.
  useEffect(() => { abertoRef.current = open }, [open])

  useEffect(() => {
    if (open || fechando) return
    if (avisos.length > 0) setGeo(STAGE_W, STAGE_H, ORB_R)
    else setGeo(WIN, WIN, ORB_R)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fechando, avisos.length, arrastando])

  // ── O laco da luz ─────────────────────────────────────────────────────────
  // Um unico rAF, que ESTACIONA SOZINHO: quando tudo assenta ele cancela o
  // proximo quadro e some. O widget fica aberto o dia inteiro sobre a tela —
  // quadro rodando em repouso seria bateria queimada a toa.
  useEffect(() => {
    const c = campo.current
    const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches

    const alvos = () => {
      const orbe = orbRef.current
      if (!orbe) return
      // A bolinha NAO se move mais, entao medir ela e seguro — mas o retangulo
      // ainda carrega o `scale` do aperto. Descontar nao vale a pena: o centro
      // nao muda com escala, so o tamanho.
      const r = orbe.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = c.px - cx
      const dy = c.py - cy
      const d = Math.hypot(dx, dy)
      // Curva ao quadrado: fica frio mais tempo e esquenta rapido no fim.
      // Painel aberto: a bolinha e so a marca branca la em cima — a luz esta
      // invisivel e nao ha por que continuar calculando nada.
      const f = c.temPonteiro && !calmo && !abertoRef.current
        ? Math.pow(Math.max(0, Math.min(1, 1 - d / ALCANCE)), 2) : 0
      const g = 0.35 + f * 0.65
      const ux = Math.max(-1, Math.min(1, dx / ALC_LUZ)) * g
      const uy = Math.max(-1, Math.min(UY_TETO, dy / ALC_LUZ)) * g
      for (const cam of CAMADAS) {
        c.alvo[cam.k][0] = f > 0 ? ux * cam.pull : 0
        c.alvo[cam.k][1] = f > 0 ? uy * cam.pull : 0
      }
    }

    // O UNICO ponto que toca o DOM. `translate` (nao `transform`): a pulsacao
    // mora em `scale` e as duas propriedades se somam sem brigar.
    const escrever = () => {
      for (const cam of CAMADAS) {
        const el = luzes.current[cam.k]
        if (!el) continue
        const [x, y] = c.p[cam.k]
        el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`
      }
    }

    const laco = (t: number) => {
      const dt = c.ultQuadro ? Math.min(DT_TETO, (t - c.ultQuadro) / 1000) : 1 / 60
      c.ultQuadro = t
      if (!orbRef.current) { c.rodando = false; return }
      alvos()
      let parou = true
      for (const cam of CAMADAS) {
        for (let i = 0; i < 2; i++) {
          c.p[cam.k][i] = damp(c.p[cam.k][i], c.alvo[cam.k][i], cam.lam, dt)
          if (Math.abs(c.p[cam.k][i] - c.alvo[cam.k][i]) > EPS_POS) parou = false
        }
      }
      if (parou) for (const cam of CAMADAS) { c.p[cam.k][0] = c.alvo[cam.k][0]; c.p[cam.k][1] = c.alvo[cam.k][1] }
      escrever()
      if (parou) { c.rodando = false; return }   // zero quadro em repouso
      c.id = requestAnimationFrame(laco)
    }

    const acorda = () => {
      if (c.rodando) return
      c.rodando = true
      c.ultQuadro = 0
      c.id = requestAnimationFrame(laco)
    }

    // O ponteiro so ARMAZENA; quem le e o laco. So a ultima amostra do quadro
    // importa, entao nao ha ganho em reagir a cada evento cru.
    const onPonteiro = (e: PointerEvent) => {
      c.px = e.clientX; c.py = e.clientY; c.temPonteiro = true; acorda()
    }
    const onSaiu = () => { c.temPonteiro = false; c.px = -1e5; c.py = -1e5; acorda() }
    const raiz = document.documentElement
    raiz.addEventListener('pointermove', onPonteiro)
    raiz.addEventListener('pointerleave', onSaiu)
    acorda()

    return () => {
      raiz.removeEventListener('pointermove', onPonteiro)
      raiz.removeEventListener('pointerleave', onSaiu)
      cancelAnimationFrame(c.id)
      c.rodando = false
    }
  }, [])

  // Volta a luz pro centro quando o painel abre: la em cima a bolinha e so a
  // marca branca, e um deslocamento herdado apareceria como desenho torto.
  const repousarLuz = () => {
    const c = campo.current
    for (const cam of CAMADAS) { c.p[cam.k][0] = 0; c.p[cam.k][1] = 0; c.alvo[cam.k][0] = 0; c.alvo[cam.k][1] = 0 }
    for (const cam of CAMADAS) {
      const el = luzes.current[cam.k]
      if (el) el.style.translate = '0px 0px'
    }
  }

  // Le imagem do clipboard como arquivo PNG (ou null se nao houver imagem).
  // Usa tauri-plugin-clipboard-manager (nativo) — sem pop-up de permissao.
  const imagemDoClipboard = async (): Promise<File | null> => {
    try {
      const img = await readImage()
      const rgba = await img.rgba()
      const { width, height } = await img.size()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height)
      ctx.putImageData(imageData, 0, 0)
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
      return blob ? new File([blob], 'paste.png', { type: 'image/png' }) : null
    } catch {
      // Sem imagem no clipboard
      return null
    }
  }

  // Le clipboard ao abrir: imagem tem prioridade; texto preenche se caixa vazia.
  const readClipboard = async () => {
    const file = await imagemDoClipboard()
    if (file) {
      if (imgPreview) URL.revokeObjectURL(imgPreview.url)
      setImgPreview({ file, url: URL.createObjectURL(file) })
      return
    }
    try {
      const t = await readText()
      if (t && t.trim()) setText(prev => prev || t)
    } catch {
      // Sem texto ou clipboard vazio — silencioso
    }
  }

  // A janela CRESCE primeiro, o painel entra depois. Invertido, o painel era
  // desenhado por um quadro ou dois dentro da janela de 104px e piscava torto.
  // Como a bolinha e ancorada pelo canto, ela nao se mexe na tela quando a
  // janela cresce — a viagem dela pro cabecalho e a UNICA coisa que se move.
  const expand = async () => {
    if (open || fechando) return
    repousarLuz()
    await setGeo(EXP_W, EXP_H, ORB_R)
    setOpen(true)
    setTimeout(() => taRef.current?.focus(), 60)
    // O clipboard SO e lido depois que a animacao de entrada terminou. Ler uma
    // imagem grande decodifica RGBA, pinta num canvas e gera PNG — tudo na
    // thread principal. Fazendo isso durante a abertura, a animacao travava.
    setTimeout(() => { readClipboard() }, 460)
  }

  // Fechar tem duas fases: a animacao de saida roda com a janela AINDA grande, e
  // so quando ela termina a janela encolhe. Encolher antes cortaria a saida no meio.
  const collapse = (depois?: () => void) => {
    if (!open || fechando) return
    setFechando(true)
    window.setTimeout(() => {
      setFechando(false)
      setOpen(false)
      setText('')
      if (imgPreview) { URL.revokeObjectURL(imgPreview.url); setImgPreview(null) }
      depois?.()
    }, SAIDA_PAINEL)
  }

  const isFull = count >= 10

  // ── O aviso de captura ────────────────────────────────────────────────────
  // Nao e "salvo com sucesso": diz o TIPO e o comeco do CONTEUDO, e a bolinha
  // reage com um pulso curto ao que acabou de entrar.
  const avisar = (type: DetectedType, label: string, texto: string) => {
    const id = 'a' + (++seqAviso)
    setAvisos(a => [...a, { id, type, label, texto }].slice(-3))
    window.setTimeout(() => {
      setAvisos(a => a.map(x => (x.id === id ? { ...x, saindo: true } : x)))
      window.setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), AVISO_SAIDA)
    }, AVISO_VIDA)
    // Anima `scale` (nao `transform`) pra nao atropelar nada, e e a UNICA
    // reacao de movimento que sobrou na bolinha: acontece quando algo entra,
    // nao quando o mouse passa perto.
    requestAnimationFrame(() => {
      orbRef.current?.animate(
        [{ scale: '1' }, { scale: '1.13' }, { scale: '1' }],
        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      )
    })
  }

  const capture = async () => {
    if (isFull) return
    // Captura de imagem
    if (imgPreview) {
      const nome = imgPreview.file.name
      const url = await saveImageFile(imgPreview.file)
      if (!url) {
        showToast('warn', 'Falha ao salvar', 'Não consegui salvar a imagem. Tente de novo.')
        collapse()
        return
      }
      try {
        await invoke('inbox_add', { content: url, kind: 'IMAGEM' })
      } catch {
        showToast('warn', 'Falha ao guardar', 'Não consegui salvar no Dott. Tente de novo.')
        collapse()
        return
      }
      setCount(c => c + 1)
      // O aviso so entra DEPOIS que o painel saiu: ele nasce da bolinha, e a
      // bolinha ainda estava la em cima fazendo de marca do cabecalho.
      collapse(() => avisar('IMAGEM', 'Imagem', nome))
      return
    }
    const v = text.trim()
    if (!v) return
    const d = detectType(v)
    try {
      await invoke('inbox_add', { content: v, kind: d.type })
    } catch {
      showToast('warn', 'Falha ao guardar', 'Não consegui salvar no Dott. Tente de novo.')
      collapse()
      return
    }
    setCount(c => c + 1)
    collapse(() => avisar(d.type, d.label, v))
  }

  // Colar imagem manualmente (onPaste dentro do textarea)
  const onPasteTextarea = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const dt = e.nativeEvent.clipboardData
    if (!dt) return
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i]
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        e.preventDefault()
        const file = it.getAsFile()
        if (file) {
          if (imgPreview) URL.revokeObjectURL(imgPreview.url)
          setImgPreview({ file, url: URL.createObjectURL(file) })
        }
        return
      }
    }
  }

  // ── Arrastar a bolinha ────────────────────────────────────────────────────
  // Clique parado = abre a captura. Clique que anda = move a janela.
  // Apertar o botao CONGELA o redimensionamento: sem isso, a janela mudava de
  // tamanho E de posicao junto com o Windows, e o arrasto se perdia.
  //
  // Os ouvintes do gesto vivem na JANELA, nao na bolinha. Presos a bolinha, um
  // botao solto 3px fora dela nunca chegava a soltar o congelamento: `preso`
  // ficava ligado pra sempre e o widget nao voltava mais a mudar de tamanho.
  const gesto = useRef<(() => void) | null>(null)

  const onDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || open || fechando) return
    preso.current = true
    drag.current = { x: e.screenX, y: e.screenY, moved: false }

    const mover = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || d.moved) return        // startDragging UMA vez: repetir a cada
      if (Math.abs(ev.screenX - d.x) > 4 || Math.abs(ev.screenY - d.y) > 4) {
        d.moved = true                 // quadro entupia o canal com o Windows
        setArrastando(true)
        win().startDragging().catch(() => {})
      }
    }
    const acabou = () => {
      const d = drag.current
      const eraClique = !!d && !d.moved
      soltar(!!d && d.moved)
      if (eraClique) expand()
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', acabou)
    gesto.current = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', acabou)
    }
  }

  // Solta o congelamento e deixa a janela voltar ao tamanho que o estado pedir.
  //
  // `moveuAJanela` decide se a ancora precisa ser relida, e essa distincao E a
  // correcao: antes ela era relida em TODO clique. Como `lerAncora` e assincrona
  // e `expand()` mudava o tamanho no mesmo instante, a leitura terminava somando
  // a posicao da janela pequena com o tamanho da janela grande. A ancora saia
  // torta em 236x196px e, ao fechar o painel, a janela ia pra esse lugar errado
  // — era por isso que o widget nao voltava. Num clique a janela nao se move,
  // entao nao ha nada pra reler.
  const soltar = (moveuAJanela: boolean) => {
    gesto.current?.()
    gesto.current = null
    if (!preso.current) return
    preso.current = false
    drag.current = null
    if (!moveuAJanela) { setArrastando(false); return }
    // Arrasto de verdade: quem mexeu na janela foi o Windows. Le a ancora e so
    // ENTAO libera — assim o redimensionamento seguinte ja parte do lugar certo.
    lerAncora().finally(() => setArrastando(false))
  }

  // Durante o arrasto nativo o Windows sequestra o mouse e o webview NAO recebe
  // mouseup nenhum — sem esta rede o widget ficava preso em "arrastando" pra
  // sempre e nunca mais voltava ao tamanho de repouso. O primeiro evento de
  // ponteiro que chegar depois do gesto e a prova de que ele acabou.
  useEffect(() => {
    if (!arrastando) return
    const fim = () => soltar(true)
    window.addEventListener('pointermove', fim, { once: true })
    window.addEventListener('pointerdown', fim, { once: true })
    window.addEventListener('focus', fim)
    return () => {
      window.removeEventListener('pointermove', fim)
      window.removeEventListener('pointerdown', fim)
      window.removeEventListener('focus', fim)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastando])

  // Trazer janela principal para frente
  const focusMain = async () => {
    try {
      const main = await Window.getByLabel('main')
      if (main) { await main.show(); await main.setFocus() }
    } catch {}
  }

  const orbState = isFull ? 'full' : count >= 8 ? 'warn' : 'idle'
  const typeClass = detection ? TYPE_CSS[detection.type] ?? 'nota' : null
  // Enquanto o painel existe, quem desenha a bolinha e a `.brasa` de dentro
  // dele. A bolinha de verdade fica apagada o tempo TODO — inclusive durante o
  // fechamento — e so reaparece quando o painel sai do DOM. Nesse instante a
  // brasa ja encolheu de volta ao tamanho e a cor dela, entao a troca nao se ve.
  const oculta = open

  // UMA arvore para os dois estados. A bolinha nunca e desmontada: e o MESMO
  // elemento que vive no canto e que sobe pro cabecalho. Desmontar e remontar
  // seria um corte seco — nao ha continuidade possivel entre dois elementos
  // diferentes, so um troca-troca disfarcado de animacao.
  return (
    <div className={s.stage}>
      {open && (
        <div className={`${s.panel} ${fechando ? s.panelSaindo : ''}`}>
          {/* A bolinha, desenhada DENTRO do painel. E ela que cresce e vira a
              superficie — sem isso o painel so nasceria atras da bolinha. */}
          <span className={s.brasa} aria-hidden="true" />
          <DottMark size={26} className={s.brasaMarca} aria-hidden="true" />

          {/* Header: marca + chip de tipo + contador + fechar */}
          <div className={s.header} data-tauri-drag-region>
            <DottMark size={22} className={s.headerMark} />
            {detection && typeClass
              ? <span className={`${s.typeChip} ${s['chip-' + typeClass]}`}>{detection.label}</span>
              : <span className={s.titleNeutral}>Nova captura</span>}
            <span className={s.counter}>{count}/10</span>
            <button className={s.close} onClick={() => collapse()} aria-label="Fechar">
              <Icon name="fechar" size={12} />
            </button>
          </div>

          {imgPreview ? (
            <div className={s.imgPreviewWrap}>
              <img src={imgPreview.url} alt="preview" className={s.imgPreview} draggable={false} />
              <button
                className={s.imgClear}
                onClick={() => { URL.revokeObjectURL(imgPreview.url); setImgPreview(null) }}
                aria-label="Remover imagem"
              ><Icon name="fechar" size={11} /></button>
            </div>
          ) : (
            <textarea
              ref={taRef}
              className={s.input}
              placeholder="O que está na sua mente?"
              value={text}
              onChange={e => setText(e.target.value)}
              onPaste={onPasteTextarea}
              disabled={isFull}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); capture() }
                if (e.key === 'Escape') collapse()
              }}
            />
          )}

          <div className={s.footer}>
            <span className={s.hint}>Enter salva · Esc fecha</span>
            <button
              className={s.btnOpen}
              onClick={focusMain}
              title="Abrir Dott"
              aria-label="Abrir janela principal"
            >
              <Icon name="maximizar" size={13} />
            </button>
            <button
              className={`${s.btn} ${isFull ? s.btnFull : ''}`}
              onClick={capture}
              disabled={isFull}
              title={isFull ? 'Inbox cheio. Processe alguns cards' : undefined}
            >
              {isFull ? '10/10 cheio' : <>Salvar <Icon name="enviar" size={13} /></>}
            </button>
          </div>
        </div>
      )}

      <div
        className={`${s.cena} ${arrastando ? s.arrastando : ''} ${oculta ? s.cenaOculta : ''}`}
      >
        {!open && (
          <div className={s.toaster}>
            {avisos.map(a => (
              <div key={a.id} className={`${s.toast} ${a.saindo ? s.toastSaindo : ''}`}>
                <span className={s.toastIco}><CardTypeIcon type={a.type} size={15} /></span>
                <span className={s.toastTxt}>
                  <span className={s.toastTit}>Guardado no Dott</span>
                  <span className={s.toastSub}>{a.texto}</span>
                </span>
                <span className={s.toastTipo}>{a.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          ref={orbRef}
          className={`${s.orb} ${s[orbState]}`}
          onMouseDown={onDown}
          tabIndex={open ? -1 : 0}
          aria-hidden={open}
          aria-label="Capturar (clique) ou arraste para mover"
        >
          {orbState === 'idle' && (
            <>
              <span ref={el => { luzes.current.l4 = el }} className={s.luz4} />
              <span ref={el => { luzes.current.l1 = el }} className={s.luz1} />
              <span ref={el => { luzes.current.l2 = el }} className={s.luz2} />
              <span ref={el => { luzes.current.l3 = el }} className={s.luz3} />
              <span className={s.grao} />
            </>
          )}
          <DottMark size={26} className={s.mark} />
        </button>

        {count > 0 && !open && <span className={s.badge}>{count}</span>}
      </div>
    </div>
  )
}
