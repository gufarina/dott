/* foldersService.ts — Persistência das pastas PARA. Tauri only.
 *
 * Comandos Rust folders_load / folders_save sobre folders.json.
 */

import { invoke } from '@tauri-apps/api/core'
import type { Quadrant } from '../store'
import { showToast } from '../components/Toast'

export async function loadFolders(): Promise<Record<string, Quadrant> | null> {
  try {
    const data = await invoke<Record<string, Quadrant> | null>('folders_load')
    // O backend devolve null (JSON null) quando o arquivo ainda não existe.
    return data ?? null
  } catch { return null }
}

export async function saveFolders(para: Record<string, Quadrant>): Promise<void> {
  try {
    await invoke('folders_save', { data: para })
  } catch (e) {
    showToast('warn', 'Falha ao salvar', 'Não consegui gravar as pastas no disco.')
    console.error('folders_save falhou:', e)
  }
}
