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
