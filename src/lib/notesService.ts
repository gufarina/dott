/* notesService.ts — Persistência de notas. Tauri only (sem webapp/fallback).
 *
 * Os comandos Rust vault_load/vault_save/vault_delete leem/escrevem arquivos .md
 * reais em $APPDATA/com.studiofarina.dott/vault/. O frontend não conhece o formato.
 */

import { invoke } from '@tauri-apps/api/core'
import type { Note } from '../store'
import { isGlyphId } from '../components/NoteGlyphs'
import { showToast } from '../components/Toast'

interface VaultNote {
  id: string
  title: string
  created: string
  updated: string
  folder: string
  tags: string[]
  /** Simbolo do pacote proprio (GlyphId) — '' quando nao tem. */
  glyph: string
  /** Capa da nota (url de attachment) — '' quando nao tem. */
  cover: string
  body: string
}

function toNote(v: VaultNote): Note {
  return {
    id: v.id,
    title: v.title,
    date: v.created,
    updatedAt: v.updated,
    folderId: v.folder || undefined,
    img: false,
    body: v.body,
    tags: v.tags ?? [],
    glyph: isGlyphId(v.glyph) ? v.glyph : undefined,
    cover: v.cover || undefined,
    links: [],
    backlinks: [],
  }
}

function fromNote(n: Note): VaultNote {
  return {
    id: n.id,
    title: n.title,
    created: n.date,
    updated: n.updatedAt,
    folder: n.folderId ?? '',
    tags: n.tags,
    glyph: n.glyph ?? '',
    cover: n.cover ?? '',
    body: n.body,
  }
}

export async function loadVault(): Promise<Note[] | null> {
  try {
    const raw = await invoke<VaultNote[]>('vault_load')
    return raw.map(toNote)
  } catch { return null }
}

export async function saveNoteToVault(note: Note): Promise<void> {
  try {
    await invoke('vault_save', { note: fromNote(note) })
  } catch (e) {
    showToast('warn', 'Falha ao salvar', 'Não consegui gravar a nota no disco. O texto ainda está aqui — tente de novo.')
    console.error('vault_save falhou:', e)
  }
}

export async function deleteNoteFromVault(id: string): Promise<void> {
  try { await invoke('vault_delete', { id }) } catch (e) { console.error('vault_delete falhou:', e) }
}
