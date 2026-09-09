/* backupService.ts — Exportar/restaurar todos os dados (Documentos\Dott Backups). */

import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'

/** Faz um backup completo agora. Devolve o caminho criado ou null em erro. */
export async function backupNow(): Promise<string | null> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const label = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}h${pad(now.getMinutes())}`
  try { return await invoke<string>('backup_now', { label }) } catch { return null }
}

export async function backupsFolder(): Promise<string | null> {
  try { return await invoke<string>('backups_folder') } catch { return null }
}

export async function backupsList(): Promise<string[]> {
  try { return await invoke<string[]>('backups_list') } catch { return [] }
}

export async function restoreBackup(name: string): Promise<boolean> {
  try { await invoke('backup_restore', { name }); return true } catch { return false }
}

/** Abre a pasta de backups no explorador de arquivos. */
export async function openBackupsFolder(): Promise<void> {
  const dir = await backupsFolder()
  if (dir) { try { await openPath(dir) } catch { /* ignore */ } }
}
