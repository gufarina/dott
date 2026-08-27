# Graph Report - C:\Users\Lite OS\Projetos\dott-warmfox  (2026-08-26)

## Corpus Check
- 54 files · ~127,126 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 262 nodes · 308 edges · 48 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 19 edges
2. `suggestTask()` - 9 edges
3. `saveImageFile()` - 6 edges
4. `buildGraph()` - 6 edges
5. `backups_root()` - 6 edges
6. `inbox_add()` - 6 edges
7. `capture()` - 5 edges
8. `read_all()` - 5 edges
9. `write_all()` - 5 edges
10. `onWindowDrop()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `onDragEnd()` --calls--> `showToast()`  [INFERRED]
  C:\Users\Lite OS\Projetos\dott-warmfox\src\App.tsx → src\components\Toast.tsx
- `abrirTarefa()` --calls--> `suggestTask()`  [INFERRED]
  C:\Users\Lite OS\Projetos\dott-warmfox\src\features\inbox\InboxPanel.tsx → src\lib\interpret.ts
- `graphOf()` --calls--> `buildGraph()`  [INFERRED]
  C:\Users\Lite OS\Projetos\dott-warmfox\src\store.ts → C:\Users\Lite OS\Projetos\dott-warmfox\src\lib\graphify.ts
- `doBackup()` --calls--> `showToast()`  [INFERRED]
  C:\Users\Lite OS\Projetos\dott-warmfox\src\components\Settings.tsx → src\components\Toast.tsx
- `doRestore()` --calls--> `showToast()`  [INFERRED]
  C:\Users\Lite OS\Projetos\dott-warmfox\src\components\Settings.tsx → src\components\Toast.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (18): onWindowDrop(), imageFromEvent(), saveImageFile(), criarPasta(), criarTarefa(), newNote(), onFile(), onNoteFile() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (20): detectType(), acorda(), alvos(), aplicarGeo(), capture(), collapse(), damp(), escrever() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (8): buildGraph(), canon(), fold(), plainText(), tokens(), comContagem(), graphOf(), recountFolders()

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (9): finish(), go(), onKey(), pickLocal(), sendEmail(), isValidEmail(), joinWaitlist(), setStorageMode() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (11): detect_type(), inbox_add(), inbox_file(), inbox_list(), inbox_remove(), inbox_set(), InboxCard, now_id() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (7): backupNow(), backupsFolder(), backupsList(), openBackupsFolder(), restoreBackup(), doBackup(), doRestore()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (10): cap(), clip(), descapitalizar(), firstLine(), hostOf(), keywords(), paraInfinitivo(), pathSubjectOf() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (8): FrontMatter, parse_note(), serialize_note(), vault_delete(), vault_dir(), vault_load(), vault_save(), VaultNote

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (1): onDragEnd()

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (4): isGlyphId(), fromNote(), saveNoteToVault(), toNote()

### Community 10 - "Community 10"
Cohesion: 0.57
Nodes (7): backup_now(), backup_restore(), backups_folder(), backups_list(), backups_root(), copy_dir(), data_dir()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (2): abrirTarefa(), pastaDe()

### Community 12 - "Community 12"
Cohesion: 0.47
Nodes (3): ColorFrom(), Draw-Glow(), Draw-Orb()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.83
Nodes (3): attach_dir(), attachment_remove(), save_attachment()

### Community 16 - "Community 16"
Cohesion: 0.83
Nodes (3): folders_file(), folders_load(), folders_save()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): run(), main()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): tasks_file(), tasks_load(), tasks_save()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (4): Captured Text: 'quanto que ta o m2 do marmoglass hoje', Dott Floating Bubble Widget (with badge count), NOTA Tag Label, Guardado no Dott - Toast Notification

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): FolderCard(), maxNotes()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): Badge de Contador Numerico (valor 6), Icone Chama/Olho Laranja-Vermelho (logo do widget), Widget Dott - Estado de Repouso (Tema Preto)

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): README.md - template Tauri+React+TypeScript

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): landing/lp-dott-lancamento-2026-08-09.html - LP mesma copy, revisao de 09/08

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Dott Widget - Painel de Nota Aberto (digitando)

## Knowledge Gaps
- **11 isolated node(s):** `InboxCard`, `VaultNote`, `FrontMatter`, `README.md - template Tauri+React+TypeScript`, `landing/lp-dott-lancamento-2026-08-09.html - LP mesma copy, revisao de 09/08` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (2 nodes): `main.tsx`, `currentLabel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `BootLoader()`, `BootLoader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `Breadcrumb()`, `Breadcrumb.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `CardTypeIcon()`, `CardTypeIcon.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `DottMark()`, `DottMark.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `Icon()`, `Icon.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `ModalPortal()`, `ModalPortal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `SearchModal()`, `SearchModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `Titlebar.tsx`, `Titlebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `ImageViewer()`, `ImageViewer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `Constellation.tsx`, `Constellation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `main()`, `build.rs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `widget_geo.rs`, `widget_set_geometry()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `GlyphPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `seedNotes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `README.md - template Tauri+React+TypeScript`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `landing/lp-dott-lancamento-2026-08-09.html - LP mesma copy, revisao de 09/08`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Dott Widget - Painel de Nota Aberto (digitando)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 0` to `Community 8`, `Community 9`, `Community 5`, `Community 1`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `capture()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `abrirTarefa()` connect `Community 0` to `Community 6`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `showToast()` (e.g. with `onWindowDrop()` and `onDragEnd()`) actually correct?**
  _`showToast()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `saveImageFile()` (e.g. with `onWindowDrop()` and `onFile()`) actually correct?**
  _`saveImageFile()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `InboxCard`, `VaultNote`, `FrontMatter` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._