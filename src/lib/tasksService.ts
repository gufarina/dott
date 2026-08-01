/* tasksService.ts — Persistencia das tarefas no disco (tasks.json via Rust),
 * substituindo o localStorage fragil. Entra no backup junto com tudo. */

import { invoke } from '@tauri-apps/api/core'
import type { TaskGroup } from '../store'

export async function loadTasks(): Promise<TaskGroup[] | null> {
  try {
    const data = await invoke<TaskGroup[] | null>('tasks_load')
    return data ?? null
  } catch { return null }
}

export async function saveTasks(groups: TaskGroup[]): Promise<void> {
  try { await invoke('tasks_save', { data: groups }) } catch { /* best-effort */ }
}
