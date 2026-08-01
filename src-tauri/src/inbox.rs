// inbox.rs — Captura rápida compartilhada entre a janela principal e o widget flutuante.
//
// O inbox vive em $APPDATA/com.studiofarina.dott/inbox.json (fonte única de verdade).
// O widget grava via inbox_add; a janela principal lê via inbox_list e ouve o evento
// "inbox-changed" para atualizar ao vivo quando o widget captura algo.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

// Trava global de escrita do inbox.json — evita que widget e janela principal
// se atropelem no read-modify-write (perda de update).
static LOCK: Mutex<()> = Mutex::new(());
// Contador por execucao pra garantir id unico mesmo no mesmo milissegundo.
static SEQ: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize, Deserialize, Clone)]
pub struct InboxCard {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub content: String,
    pub time: String,
    // Epoch ms da captura (0 = card antigo sem timestamp; UI cai no `time`).
    #[serde(default)]
    pub ts: i64,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn inbox_file(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&base);
    base.join("inbox.json")
}

fn read_all(app: &tauri::AppHandle) -> Vec<InboxCard> {
    let p = inbox_file(app);
    fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_all(app: &tauri::AppHandle, cards: &[InboxCard]) {
    if let Ok(s) = serde_json::to_string_pretty(cards) {
        let _ = fs::write(inbox_file(app), s);
    }
}

/// Heurística leve de tipo — sem IA, só padrões de texto.
fn detect_type(c: &str) -> String {
    let t = c.trim();
    let l = t.to_lowercase();
    if l.starts_with("http://asset.localhost")
        || l.starts_with("https://asset.localhost")
        || l.starts_with("asset:")
    {
        "IMAGEM".to_string()
    } else if l.starts_with("http://") || l.starts_with("https://") {
        "URL".into()
    } else if l.starts_with("npx ")
        || l.starts_with("npm ")
        || l.starts_with("git ")
        || l.starts_with("cd ")
        || l.starts_with("sudo ")
    {
        "SHELL".into()
    } else if t.contains("=>") || t.contains("const ") || t.contains("function ") || t.contains("();")
    {
        "CODIGO".into()
    } else if !t.contains(' ') && t.contains('.') && t.len() > 3 {
        "URL".into()
    } else {
        "NOTA".into()
    }
}

fn now_id() -> String {
    // ms + contador atomico = unico mesmo em capturas no mesmo milissegundo.
    format!("i{}-{}", now_ms(), SEQ.fetch_add(1, Ordering::Relaxed))
}

#[tauri::command]
pub fn inbox_list(app: tauri::AppHandle) -> Vec<InboxCard> {
    read_all(&app)
}

/// Sobrescreve o inbox (usado no primeiro uso para semear os exemplos).
#[tauri::command]
pub fn inbox_set(app: tauri::AppHandle, cards: Vec<InboxCard>) -> Result<(), String> {
    write_all(&app, &cards);
    Ok(())
}

/// Remove um card do inbox (ex.: depois de processá-lo numa pasta).
#[tauri::command]
pub fn inbox_remove(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut cards = read_all(&app);
    cards.retain(|c| c.id != id);
    write_all(&app, &cards);
    let _ = app.emit("inbox-changed", ());
    Ok(())
}

/// Limite de cards não processados no inbox (premissa do app).
const MAX_CARDS: usize = 10;

/// Adiciona um card (captura). Usa o tipo do motor (frontend) ou detecta.
/// Bloqueia quando o inbox está cheio (força o usuário a processar).
#[tauri::command]
pub fn inbox_add(
    app: tauri::AppHandle,
    content: String,
    kind: Option<String>,
) -> Result<InboxCard, String> {
    let content = content.trim().to_string();
    if content.is_empty() {
        return Err("conteúdo vazio".into());
    }
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut cards = read_all(&app);
    if cards.len() >= MAX_CARDS {
        return Err("INBOX_FULL".into());
    }
    let card = InboxCard {
        id: now_id(),
        kind: kind.filter(|k| !k.is_empty()).unwrap_or_else(|| detect_type(&content)),
        content,
        time: "agora".into(),
        ts: now_ms(),
    };
    cards.insert(0, card.clone());
    write_all(&app, &cards);
    let _ = app.emit("inbox-changed", ());
    Ok(card)
}
