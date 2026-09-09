/* inboxService.ts — Inbox compartilhado entre janela principal e widget. Tauri only.
 *
 * Comandos Rust inbox_list/inbox_set/inbox_add/inbox_remove sobre inbox.json.
 */

import { invoke } from '@tauri-apps/api/core'
import type { InboxCard } from '../store'

export async function loadInbox(): Promise<InboxCard[] | null> {
  try { return await invoke<InboxCard[]>('inbox_list') } catch { return null }
}

export async function setInbox(cards: InboxCard[]): Promise<void> {
  try { await invoke('inbox_set', { cards }) } catch {}
}

export async function removeInbox(id: string): Promise<void> {
  try { await invoke('inbox_remove', { id }) } catch {}
}

export async function addInbox(content: string, kind?: string): Promise<InboxCard | 'FULL' | null> {
  try {
    return await invoke<InboxCard>('inbox_add', { content, kind })
  } catch (e) {
    if (String(e).includes('INBOX_FULL')) return 'FULL'
    return null
  }
}
