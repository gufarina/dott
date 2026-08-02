import { useEffect, useRef, useState } from 'react'
import { readText, readImage } from '@tauri-apps/plugin-clipboard-manager'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, Window } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'
import { detectType } from '../lib/detectType'
import { saveImageFile } from '../lib/attachments'
import { showToast } from '../components/Toast'
import { DottMark } from '../components/DottMark'
import { Icon } from '../components/Icon'
import s from './Widget.module.css'

const WIN   = 104   // janela colapsada (orb 56 + folga pro brilho)
const EXP_W = 340
const EXP_H = 300   // aumentado de 260 → 300 para acomodar chip + preview de imagem

// Mapa de tipo → classe CSS (mesmos nomes do InboxPanel.module.css)
const TYPE_CSS: Record<string, string> = {
  NOTA: 'nota', URL: 'url', CODIGO: 'codigo', SHELL: 'shell', IDEIA: 'ideia',
  PROMPT: 'prompt', TAREFA: 'tarefa', CONTATO: 'contato', IMAGEM: 'imagem',
}

export function Widget() {
  const [open, setOpen]         = useState(false)
  const [text, setText]         = useState('')
  const [count, setCount]       = useState(0)
  const [imgPreview, setImgPreview] = useState<{ file: File; url: string } | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const drag  = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const detection = text.trim() ? detectType(text) : imgPreview ? { type: 'IMAGEM', label: 'Imagem', confidence: 1 } : null

  const refreshCount = () => {
    invoke<unknown[]>('inbox_list').then(c => setCount(c.length)).catch(() => {})
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

  const win = () => getCurrentWindow()

  const resizeAnchored = async (fromW: number, fromH: number, toW: number, toH: number) => {
    const w = win()
    try {
      const pos   = await w.outerPosition()
      const scale = await w.scaleFactor()
      const lx = pos.x / scale
      const ly = pos.y / scale
      await w.setSize(new LogicalSize(toW, toH))
      await w.setPosition(new LogicalPosition(lx + fromW - toW, ly + fromH - toH))
    } catch {
      try { await w.setSize(new LogicalSize(toW, toH)) } catch {}
    }
  }

  // Lê clipboard ao abrir: imagem tem prioridade; texto preenche se caixa vazia.
  // Usa tauri-plugin-clipboard-manager (nativo) — sem pop-up de permissão do sistema.
  const readClipboard = async () => {
    // Tenta imagem primeiro
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
      if (blob) {
        if (imgPreview) URL.revokeObjectURL(imgPreview.url)
        const file = new File([blob], 'paste.png', { type: 'image/png' })
        setImgPreview({ file, url: URL.createObjectURL(blob) })
        return
      }
    } catch {
      // Sem imagem no clipboard — tenta texto
    }
    // Tenta texto
    try {
      const t = await readText()
      if (t && t.trim()) setText(prev => prev || t)
    } catch {
      // Sem texto ou clipboard vazio — silencioso
    }
  }

  const expand = async () => {
    setOpen(true)
    await resizeAnchored(WIN, WIN, EXP_W, EXP_H)
    await readClipboard()
    setTimeout(() => taRef.current?.focus(), 70)
  }

  const collapse = () => {
    setOpen(false)
    setText('')
    if (imgPreview) { URL.revokeObjectURL(imgPreview.url); setImgPreview(null) }
    resizeAnchored(EXP_W, EXP_H, WIN, WIN)
  }

  const isFull = count >= 10

  const capture = async () => {
    if (isFull) return
    // Captura de imagem
    if (imgPreview) {
      const url = await saveImageFile(imgPreview.file)
      if (!url) {
        showToast('warn', 'Falha ao salvar', 'Não consegui salvar a imagem. Tente de novo.')
        collapse()
        return
      }
      try { await invoke('inbox_add', { content: url, kind: 'IMAGEM' }) } catch {}
      setCount(c => c + 1)
      collapse()
      return
    }
    const v = text.trim()
    if (!v) return
    const kind = detectType(v).type
    try { await invoke('inbox_add', { content: v, kind }) } catch {}
    setCount(c => c + 1)
    collapse()
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

  // Arrastar orb manual: clique parado = abre captura.
  const onDown = (e: React.MouseEvent) => {
    drag.current = { x: e.screenX, y: e.screenY, moved: false }
  }
  const onMove = (e: React.MouseEvent) => {
    const d = drag.current
    if (!d) return
    if (Math.abs(e.screenX - d.x) > 4 || Math.abs(e.screenY - d.y) > 4) {
      d.moved = true
      win().startDragging().catch(() => {})
    }
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) expand()
  }

  // Trazer janela principal para frente
  const focusMain = async () => {
    try {
      const main = await Window.getByLabel('main')
      if (main) { await main.show(); await main.setFocus() }
    } catch {}
  }

  const orbState = isFull ? 'full' : count >= 8 ? 'warn' : 'idle'

  // — Orb colapsado —
  if (!open) {
    return (
      <div className={s.stage}>
        <button
          className={`${s.orb} ${s[orbState]}`}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          aria-label="Capturar (clique) ou arraste para mover"
        >
          <DottMark size={26} className={s.mark} />
        </button>
        {count > 0 && <span className={s.badge}>{count}</span>}
      </div>
    )
  }

  // — Painel expandido —
  const typeClass = detection ? TYPE_CSS[detection.type] ?? 'nota' : null

  return (
    <div className={s.panel}>
      {/* Header: chip de tipo (ou dot neutro se sem conteúdo) + botão fechar */}
      <div className={s.header} data-tauri-drag-region>
        {detection && typeClass ? (
          <span className={`${s.typeChip} ${s['chip-' + typeClass]}`}>{detection.label}</span>
        ) : (
          <><span className={s.dot} /><span className={s.titleNeutral}>Nova captura</span></>
        )}
        <span className={s.counter}>{count}/10</span>
        <button className={s.close} onClick={collapse} aria-label="Fechar">×</button>
      </div>

      {/* Preview de imagem OU textarea */}
      {imgPreview ? (
        <div className={s.imgPreviewWrap}>
          <img src={imgPreview.url} alt="preview" className={s.imgPreview} draggable={false} />
          <button
            className={s.imgClear}
            onClick={() => { URL.revokeObjectURL(imgPreview.url); setImgPreview(null) }}
            aria-label="Remover imagem"
          >×</button>
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

      {/* Footer */}
      <div className={s.footer}>
        <span className={s.hint}>Enter salva · Esc fecha</span>
        <button
          className={s.btnOpen}
          onClick={focusMain}
          title="Abrir Dott"
          aria-label="Abrir janela principal"
        >
          <Icon name="imagem" size={13} />
        </button>
        <button
          className={`${s.btn} ${isFull ? s.btnFull : ''}`}
          onClick={capture}
          disabled={isFull}
          title={isFull ? 'Inbox cheio — processe alguns cards' : undefined}
        >
          {isFull ? '10/10 cheio' : <>Salvar <span className={s.arrow}>→</span></>}
        </button>
      </div>
    </div>
  )
}
