/* tasksService.ts — Persistencia das tarefas no disco (tasks.json via Rust),
 * substituindo o localStorage fragil. Entra no backup junto com tudo.
 * TASK-374: o formato no disco deixou de ser TaskGroup[] (grupos) e virou
 * uma lista achatada de TaskItem - mas o Rust so guarda `serde_json::Value`
 * (src-tauri/src/tasks.rs), entao ele nunca precisou saber o formato. Por
 * isso `loadTasks` devolve `unknown[]`: quem ja tem o arquivo antigo no
 * disco ainda carrega, e `store.ts` (flattenLegacyTasks) decide o que fazer
 * com cada formato. */

import { invoke } from '@tauri-apps/api/core'
import type { TaskItem } from '../store'

export async function loadTasks(): Promise<unknown[] | null> {
  try {
    const data = await invoke<unknown[] | null>('tasks_load')
    return data ?? null
  } catch { return null }
}

export async function saveTasks(tasks: TaskItem[]): Promise<void> {
  try { await invoke('tasks_save', { data: tasks }) } catch { /* best-effort */ }
}
