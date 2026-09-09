/* attachments.ts — Salva imagens coladas/arrastadas e devolve a URL exibível. */

import { invoke, convertFileSrc } from '@tauri-apps/api/core'

/** Pega a primeira imagem de um evento de paste/drop, se houver. */
export function imageFromEvent(e: ClipboardEvent | DragEvent): File | null {
  const dt = (e as ClipboardEvent).clipboardData ?? (e as DragEvent).dataTransfer
  if (!dt) return null
  const items = dt.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) return f
      }
    }
  }
  if (dt.files) {
    for (let i = 0; i < dt.files.length; i++) {
      if (dt.files[i].type.startsWith('image/')) return dt.files[i]
    }
  }
  return null
}

/** Apaga do disco a imagem referenciada por uma URL de anexo (faxina de orfãos). */
export async function removeAttachment(url: string): Promise<void> {
  try { await invoke('attachment_remove', { url }) } catch { /* best-effort */ }
}

/** Salva a imagem no vault e devolve uma URL utilizável em <img>/markdown. */
export async function saveImageFile(file: File): Promise<string | null> {
  try {
    const buf = new Uint8Array(await file.arrayBuffer())
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg')
    const path = await invoke<string>('save_attachment', { data: Array.from(buf), ext })
    return convertFileSrc(path)
  } catch { return null }
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

function extFromUrl(url: string): string {
  const clean = url.split(/[?#]/)[0]
  const dot = clean.lastIndexOf('.')
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase()
}

/** Le os bytes de um anexo pelo lado nativo e monta um `blob:` (mesma origem
 *  do app) em vez de usar a URL do asset protocol (http://asset.localhost)
 *  direto num <img>. MEDIDO (30/08/2026): o markerjs2 desenha esse <img> num
 *  canvas e depois chama toDataURL() pra gerar a anotacao — origem cruzada
 *  sem CORS suja o canvas e toDataURL() lanca SecurityError, mudo, antes do
 *  nosso listener de 'render' rodar. `blob:` e mesma origem: nao ha o que
 *  sujar. Chama-quem-usa e responsavel por `URL.revokeObjectURL` no
 *  blob devolvido quando trocar de imagem ou desmontar. */
export async function readAttachmentBlobUrl(url: string): Promise<string | null> {
  try {
    const bytes = await invoke<number[]>('attachment_read', { url })
    const mime = MIME_BY_EXT[extFromUrl(url)] || 'image/png'
    const blob = new Blob([new Uint8Array(bytes)], { type: mime })
    return URL.createObjectURL(blob)
  } catch { return null }
}
