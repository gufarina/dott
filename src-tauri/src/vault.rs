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
    pub body: String,
}

#[derive(Serialize, Deserialize)]
struct FrontMatter {
    title: String,
    created: String,
    updated: String,
    folder: String,
    tags: Vec<String>,
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
                }
            }
        }
    }
    notes
}

/// Grava uma nota (cria ou sobrescreve seu .md).
#[tauri::command]
pub fn vault_save(app: tauri::AppHandle, note: VaultNote) -> Result<(), String> {
    let dir = vault_dir(&app);
    let path = dir.join(format!("{}.md", sanitize(&note.id)));
    fs::write(path, serialize_note(&note)).map_err(|e| e.to_string())
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
