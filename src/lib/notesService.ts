/* notesService.ts — Persistência de notas. Tauri only (sem webapp/fallback).
 *
 * Os comandos Rust vault_load/vault_save/vault_delete leem/escrevem arquivos .md
 * reais em $APPDATA/com.studiofarina.dott/vault/. O frontend não conhece o formato.
 */

import { invoke } from '@tauri-apps/api/core'
import type { Note } from '../store'
import { isGlyphId } from '../components/NoteGlyphs'
import { showToast } from '../components/Toast'
import { extractTags, mergeTags } from './tags'

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

/* TASK-364 (CEO: perda silenciosa de dado do usuario nao passa no crivo):
 * antes da TASK-360 a Etiqueta so vivia neste campo `tags` do frontmatter,
 * nunca no corpo. Migrar ou reescrever o arquivo do usuario pra "corrigir"
 * isso foi recusado - em vez disso, a LEITURA soma as duas fontes (corpo +
 * este campo) e nunca perde nada; so o que sobra AQUI (o que ainda nao esta
 * escrito como #etiqueta no corpo) e o que persiste neste campo daqui pra
 * frente - ele encolhe sozinho conforme a nota for sendo salva de novo. */
function toNote(v: VaultNote): Note {
  const bodyTags = extractTags(v.body)
  const legacyTags = (v.tags ?? []).filter(t => !bodyTags.includes(t))
  return {
    id: v.id,
    title: v.title,
    date: v.created,
    updatedAt: v.updated,
    folderId: v.folder || undefined,
    img: false,
    body: v.body,
    tags: mergeTags(bodyTags, legacyTags),
    legacyTags,
    glyph: isGlyphId(v.glyph) ? v.glyph : undefined,
    cover: v.cover || undefined,
  }
}

function fromNote(n: Note): VaultNote {
  return {
    id: n.id,
    title: n.title,
    created: n.date,
    updated: n.updatedAt,
    folder: n.folderId ?? '',
    // So o que ainda nao convergiu pro corpo — nunca a uniao inteira, senao
    // este campo nunca esvaziaria e o corpo nunca vira fonte unica de fato.
    tags: n.legacyTags ?? [],
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
    showToast('warn', 'Falha ao salvar', 'Não consegui gravar a nota no disco. O texto ainda está aqui, tente de novo.')
    console.error('vault_save falhou:', e)
  }
}

export async function deleteNoteFromVault(id: string): Promise<void> {
  try { await invoke('vault_delete', { id }) } catch (e) { console.error('vault_delete falhou:', e) }
}
