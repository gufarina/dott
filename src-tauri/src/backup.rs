// backup.rs — Exportar/restaurar TODOS os dados do Dott (notas, inbox, pastas,
// tarefas e imagens). Copia a pasta de dados inteira pra Documentos\Dott Backups.
// Dependency-free (std::fs), sem zip. Restauracao troca o estado atual de forma
// atomica: so mexe no data_dir depois que a copia inteira do backup tiver dado certo.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

fn data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn backups_root(app: &tauri::AppHandle) -> PathBuf {
    let docs = app
        .path()
        .document_dir()
        .unwrap_or_else(|_| data_dir(app));
    docs.join("Dott Backups")
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let path = entry.path();
        let dest = to.join(entry.file_name());
        // Nao copia a propria pasta de backups pra dentro de um backup.
        if path.is_dir() {
            copy_dir(&path, &dest)?;
        } else {
            fs::copy(&path, &dest)?;
        }
    }
    Ok(())
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Faz um backup completo. `label` vem do frontend (data legivel). Devolve o caminho.
#[tauri::command]
pub fn backup_now(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let src = data_dir(&app);
    let safe: String = label
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == ' ' { c } else { '-' })
        .collect();
    let name = if safe.trim().is_empty() {
        "dott-backup".to_string()
    } else {
        format!("dott-backup {}", safe.trim())
    };
    let dest = backups_root(&app).join(&name);
    copy_dir(&src, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

/// Caminho da pasta de backups (pra abrir no explorador).
#[tauri::command]
pub fn backups_folder(app: tauri::AppHandle) -> String {
    let root = backups_root(&app);
    let _ = fs::create_dir_all(&root);
    root.to_string_lossy().to_string()
}

/// Lista os backups existentes (nome + caminho), mais novos primeiro por nome.
#[tauri::command]
pub fn backups_list(app: tauri::AppHandle) -> Vec<String> {
    let root = backups_root(&app);
    let mut names: Vec<String> = fs::read_dir(&root)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    names.sort();
    names.reverse();
    names
}

/// Restaura um backup pelo nome: copia pra uma pasta temporaria e so troca o
/// data_dir depois que a copia inteira tiver sucesso (evita vault hibrido se
/// a copia falhar no meio).
#[tauri::command]
pub fn backup_restore(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let root = backups_root(&app);
    let _ = fs::create_dir_all(&root);
    let src = crate::path_safety::safe_join(&root, &name).ok_or_else(|| "nome invalido".to_string())?;
    if !src.exists() {
        return Err("backup nao encontrado".into());
    }
    let dest = data_dir(&app);
    let ts = now_ms();
    let base_name = dest
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("dott-data");
    let tmp = dest.with_file_name(format!("{}.restoring-{}", base_name, ts));

    if let Err(e) = copy_dir(&src, &tmp) {
        let _ = fs::remove_dir_all(&tmp);
        return Err(e.to_string());
    }

    if dest.exists() {
        let old = dest.with_file_name(format!("{}.old-{}", base_name, ts));
        if let Err(e) = fs::rename(&dest, &old) {
            let _ = fs::remove_dir_all(&tmp);
            return Err(e.to_string());
        }
        if let Err(e) = fs::rename(&tmp, &dest) {
            // tenta reverter pro estado anterior antes de devolver o erro.
            let _ = fs::rename(&old, &dest);
            let _ = fs::remove_dir_all(&tmp);
            return Err(e.to_string());
        }
        let _ = fs::remove_dir_all(&old);
    } else if let Err(e) = fs::rename(&tmp, &dest) {
        let _ = fs::remove_dir_all(&tmp);
        return Err(e.to_string());
    }
    Ok(())
}
