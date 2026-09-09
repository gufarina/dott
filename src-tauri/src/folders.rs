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
/// Se a quarentena FALHAR, o dado corrompido continua no caminho original:
/// devolve Err em vez de Null, para o caller nunca tratar isso como "sem
/// dado" e arriscar sobrescrever o arquivo corrompido ainda recuperavel.
#[tauri::command]
pub fn folders_load(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let p = folders_file(&app);
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
                        "folders.json corrompido e a quarentena falhou: {}",
                        p.display()
                    ))
                }
            }
        },
        Err(_) => Ok(serde_json::Value::Null),
    }
}

/// Sobrescreve folders.json com o estado completo de `para`, de forma atomica.
/// Recusa a escrita se um load anterior achou o arquivo corrompido e nao
/// conseguiu proteger o conteudo original (ver corrupt::mark_unsafe_to_overwrite).
#[tauri::command]
pub fn folders_save(app: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    let p = folders_file(&app);
    if crate::corrupt::is_unsafe_to_overwrite(&p) {
        return Err(
            "o arquivo de pastas esta corrompido e nao foi possivel protege-lo; \
             a gravacao foi bloqueada para nao apagar o conteudo original"
                .to_string(),
        );
    }
    let s = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    crate::atomic::write(&p, s.as_bytes()).map_err(|e| e.to_string())
}
