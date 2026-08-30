// vault.rs — Persistência nativa estilo Obsidian.
//
// O "banco de dados" do Dott é uma pasta de arquivos .md em $APPDATA/com.studiofarina.dott/vault/.
// Cada nota = um arquivo markdown com frontmatter YAML (metadados) + corpo com [[wiki-links]].
// O grafo de conhecimento (links/backlinks) é derivado do conteúdo no frontend — graphify-style.
//
// O usuário nunca configura nada: a pasta é criada no primeiro load, sozinha.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultNote {
    pub id: String,
    pub title: String,
    pub created: String,
    pub updated: String,
    pub folder: String,
    pub tags: Vec<String>,
    /// Simbolo do pacote proprio (ex.: "orbita"). Vazio = sem simbolo.
    #[serde(default)]
    pub glyph: String,
    /// Capa da nota: url de imagem salva em attachments. Vazio = sem capa.
    #[serde(default)]
    pub cover: String,
    pub body: String,
}

#[derive(Serialize, Deserialize)]
struct FrontMatter {
    title: String,
    created: String,
    updated: String,
    folder: String,
    tags: Vec<String>,
    // `default` mantem compativel com as notas gravadas antes deste campo existir.
    #[serde(default)]
    glyph: String,
    #[serde(default)]
    cover: String,
}

/// Diretório do vault — criado automaticamente se não existir.
fn vault_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let dir = base.join("vault");
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Mantém apenas caracteres seguros para nome de arquivo.
fn sanitize(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

fn parse_note(id: String, raw: &str) -> VaultNote {
    if let Some(rest) = raw.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---") {
            let fm_str = &rest[..end];
            let body = rest[end + 4..].trim_start_matches('\n').to_string();
            if let Ok(fm) = serde_yaml::from_str::<FrontMatter>(fm_str) {
                return VaultNote {
                    id,
                    title: fm.title,
                    created: fm.created,
                    updated: fm.updated,
                    folder: fm.folder,
                    tags: fm.tags,
                    glyph: fm.glyph,
                    cover: fm.cover,
                    body,
                };
            }
        }
    }
    // Arquivo sem frontmatter válido: trata tudo como corpo.
    VaultNote {
        id,
        title: "Sem título".into(),
        created: String::new(),
        updated: String::new(),
        folder: String::new(),
        tags: vec![],
        glyph: String::new(),
        cover: String::new(),
        body: raw.to_string(),
    }
}

fn serialize_note(n: &VaultNote) -> String {
    let fm = FrontMatter {
        title: n.title.clone(),
        created: n.created.clone(),
        updated: n.updated.clone(),
        folder: n.folder.clone(),
        tags: n.tags.clone(),
        glyph: n.glyph.clone(),
        cover: n.cover.clone(),
    };
    let yaml = serde_yaml::to_string(&fm).unwrap_or_default();
    format!("---\n{}---\n\n{}\n", yaml, n.body)
}

/// Lê todas as notas do vault.
#[tauri::command]
pub fn vault_load(app: tauri::AppHandle) -> Vec<VaultNote> {
    let dir = vault_dir(&app);
    let mut notes = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(raw) = fs::read_to_string(&path) {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        notes.push(parse_note(stem.to_string(), &raw));
                    }
                } else {
                    // leitura falhou (ex.: lock, permissao): mantem o arquivo em
                    // disco e nao inclui na lista, mas registra o caso.
                    eprintln!("dott: leitura falhou, nota mantida em disco: {}", path.display());
                }
            }
        }
    }
    notes
}

/// Grava uma nota (cria ou sobrescreve seu .md) de forma atomica: nunca trunca
/// o arquivo original se a escrita falhar no meio (hot path do autosave).
#[tauri::command]
pub fn vault_save(app: tauri::AppHandle, note: VaultNote) -> Result<(), String> {
    let dir = vault_dir(&app);
    let path = dir.join(format!("{}.md", sanitize(&note.id)));
    crate::atomic::write(&path, serialize_note(&note).as_bytes()).map_err(|e| e.to_string())
}

/// Remove uma nota do vault.
#[tauri::command]
pub fn vault_delete(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let dir = vault_dir(&app);
    let path = dir.join(format!("{}.md", sanitize(&id)));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
