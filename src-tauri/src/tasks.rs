// tasks.rs — Persistencia das tarefas (sai do localStorage fragil pro disco,
// junto das notas, pra entrar no backup). Mesmo padrao do folders.rs.

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

static LOCK: Mutex<()> = Mutex::new(());

fn tasks_file(app: &tauri::AppHandle) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = fs::create_dir_all(&base);
    base.join("tasks.json")
}

/// Carrega tasks.json; null (Value::Null) se ainda nao existe.
/// Se o arquivo existe mas o parse falha (corrompido), coloca em quarentena
/// (renomeia) antes de cair no estado vazio — nunca apaga o dado original.
/// Se a quarentena FALHAR, o dado corrompido continua no caminho original:
/// devolve Err em vez de Null, para o caller nunca tratar isso como "sem
/// dado" e arriscar sobrescrever o arquivo corrompido ainda recuperavel.
#[tauri::command]
pub fn tasks_load(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let p = tasks_file(&app);
    match fs::read_to_string(&p) {
        Ok(s) => match serde_json::from_str(&s) {
            Ok(v) => {
                crate::corrupt::clear_unsafe_to_overwrite(&p);
                Ok(v)
            }
            Err(_) => {
                if crate::corrupt::quarantine(&p) {
                    crate::corrupt::clear_unsafe_to_overwrite(&p);
                    Ok(serde_json::Value::Null)
                } else {
                    crate::corrupt::mark_unsafe_to_overwrite(&p);
                    Err(format!(
                        "tasks.json corrompido e a quarentena falhou: {}",
                        p.display()
                    ))
                }
            }
        },
        Err(_) => Ok(serde_json::Value::Null),
    }
}

/// Sobrescreve tasks.json com a lista completa de grupos/tarefas, de forma atomica.
/// Recusa a escrita se um load anterior achou o arquivo corrompido e nao
/// conseguiu proteger o conteudo original (ver corrupt::mark_unsafe_to_overwrite).
#[tauri::command]
pub fn tasks_save(app: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let p = tasks_file(&app);
    if crate::corrupt::is_unsafe_to_overwrite(&p) {
        return Err(
            "o arquivo de tarefas esta corrompido e nao foi possivel protege-lo; \
             a gravacao foi bloqueada para nao apagar o conteudo original"
                .to_string(),
        );
    }
    let s = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    crate::atomic::write(&p, s.as_bytes()).map_err(|e| e.to_string())
}
