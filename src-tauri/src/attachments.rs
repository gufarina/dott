// attachments.rs — Salva imagens (e outros anexos) coladas/arrastadas no app.
// Arquivos vão para $APPDATA/com.studiofarina.dott/attachments/ e são exibidos
// via asset protocol (convertFileSrc no frontend).

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

fn attach_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let dir = base.join("attachments");
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Remove um anexo (imagem) do disco a partir da sua URL (asset:// ou
/// http://asset.localhost/...). So apaga dentro de attachments/ — extrai o nome
/// do arquivo do fim da URL. Usado pra faxinar imagens orfas ao deletar nota/card.
#[tauri::command]
pub fn attachment_remove(app: tauri::AppHandle, url: String) -> Result<(), String> {
    // Nome do arquivo = ultimo segmento, sem query/fragment.
    let tail = url.split(['?', '#']).next().unwrap_or(&url);
    let name = tail.rsplit('/').next().unwrap_or("");
    if name.is_empty() || name.contains("..") {
        return Ok(()); // nada a fazer / caminho suspeito
    }
    let path = attach_dir(&app).join(name);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Salva bytes de imagem e devolve o caminho absoluto do arquivo.
#[tauri::command]
pub fn save_attachment(app: tauri::AppHandle, data: Vec<u8>, ext: String) -> Result<String, String> {
    let dir = attach_dir(&app);
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let safe: String = ext.chars().filter(|c| c.is_alphanumeric()).take(5).collect();
    let ext = if safe.is_empty() { "png".to_string() } else { safe.to_lowercase() };
    let path = dir.join(format!("img{}.{}", ms, ext));
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
