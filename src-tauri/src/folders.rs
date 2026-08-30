// folders.rs — Persistência das pastas PARA.
//
// Segue o mesmo padrão do inbox.rs: lê/escreve folders.json em app_data_dir.

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn folders_file(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&base);
    base.join("folders.json")
}

/// Carrega folders.json; retorna null (Value::Null) se não existe ainda.
/// Se o arquivo existe mas o parse falha (corrompido), coloca em quarentena
/// (renomeia) antes de cair no estado vazio — nunca apaga o dado original.
#[tauri::command]
pub fn folders_load(app: tauri::AppHandle) -> serde_json::Value {
    let p = folders_file(&app);
    match fs::read_to_string(&p) {
        Ok(s) => match serde_json::from_str(&s) {
            Ok(v) => v,
            Err(_) => {
                crate::corrupt::quarantine(&p);
                serde_json::Value::Null
            }
        },
        Err(_) => serde_json::Value::Null,
    }
}

/// Sobrescreve folders.json com o estado completo de `para`, de forma atomica.
#[tauri::command]
pub fn folders_save(app: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    let p = folders_file(&app);
    let s = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    crate::atomic::write(&p, s.as_bytes()).map_err(|e| e.to_string())
}
