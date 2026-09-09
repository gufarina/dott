// corrupt.rs — Quando um arquivo de estado existe mas nao da pra fazer parse,
// renomeia pro lado (nunca apaga) antes do caller cair no estado vazio/reseed,
// pra nao perder dado que ainda pode ser recuperado a mao.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Tenta colocar `path` em quarentena. Devolve `true` se o arquivo original
/// ficou protegido (renomeado); `false` se o rename falhou e o arquivo
/// corrompido continua no caminho original - nesse caso o caller NAO pode
/// tratar como "sem dado" (o dado corrompido ainda esta la, sob risco de ser
/// sobrescrito por um save futuro).
pub fn quarantine(path: &Path) -> bool {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let mut name = path.as_os_str().to_os_string();
    name.push(format!(".corrompido-{}", ts));
    let dest = PathBuf::from(name);
    std::fs::rename(path, dest).is_ok()
}

/// Caminhos (canonicalizados quando possivel, senao como vieram) que um load
/// encontrou corrompidos SEM conseguir por em quarentena - o dado corrompido
/// ainda esta no caminho original, entao nenhum save pode gravar por cima
/// dele ate um load seguinte confirmar que o problema passou.
static UNSAFE_TO_OVERWRITE: Mutex<Option<HashSet<PathBuf>>> = Mutex::new(None);

// Nao canonicaliza: o caminho chega sempre construido do mesmo jeito
// (app_data_dir().join("folders.json") / "tasks.json"), entao o PathBuf ja
// e identico entre chamadas. Canonicalizar exigiria o arquivo existir - e o
// caso mais importante (marca colocada, quarentena da certo depois e o
// arquivo original SOME do caminho) e justamente quando ele deixa de
// existir, o que quebraria o pareamento da marca.
pub fn mark_unsafe_to_overwrite(path: &Path) {
    let mut guard = UNSAFE_TO_OVERWRITE.lock().unwrap_or_else(|e| e.into_inner());
    guard.get_or_insert_with(HashSet::new).insert(path.to_path_buf());
}

/// Limpa a marca (o problema passou: load voltou a ter sucesso, ou a
/// quarentena finalmente deu certo).
pub fn clear_unsafe_to_overwrite(path: &Path) {
    let mut guard = UNSAFE_TO_OVERWRITE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(set) = guard.as_mut() {
        set.remove(path);
    }
}

/// Verdadeiro se `path` esta marcado como inseguro para sobrescrever.
pub fn is_unsafe_to_overwrite(path: &Path) -> bool {
    let guard = UNSAFE_TO_OVERWRITE.lock().unwrap_or_else(|e| e.into_inner());
    guard.as_ref().map(|s| s.contains(path)).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quarantine_renames_without_losing_content() {
        let mut path = std::env::temp_dir();
        path.push(format!("dott_corrupt_test_{}.json", std::process::id()));
        std::fs::write(&path, b"{ isso nao fecha").unwrap();
        quarantine(&path);
        assert!(!path.exists());
        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        let quarantined: Vec<PathBuf> = std::fs::read_dir(path.parent().unwrap())
            .unwrap()
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .map(|n| n.to_string_lossy().starts_with(&format!("{}.corrompido-", file_name)))
                    .unwrap_or(false)
            })
            .collect();
        assert_eq!(quarantined.len(), 1);
        assert_eq!(std::fs::read(&quarantined[0]).unwrap(), b"{ isso nao fecha");
        let _ = std::fs::remove_file(&quarantined[0]);
    }

    /// Espelha exatamente o guard que folders_save/tasks_save aplicam antes
    /// de escrever: se `is_unsafe_to_overwrite` diz que o caminho esta
    /// marcado, recusa sem tocar no disco.
    fn guarded_save(path: &Path, contents: &[u8]) -> Result<(), String> {
        if is_unsafe_to_overwrite(path) {
            return Err("bloqueado: arquivo corrompido protegido".to_string());
        }
        crate::atomic::write(path, contents).map_err(|e| e.to_string())
    }

    /// Prova o achado 2 do TASK-495: enquanto a marca esta ativa (load achou
    /// corrupcao e a quarentena falhou), save e RECUSADO e o conteudo
    /// corrompido original em disco fica intacto byte a byte. Sem o guard
    /// (ou seja, se `guarded_save` chamasse `atomic::write` direto, como o
    /// codigo fazia antes deste conserto) este teste reprovaria: o resultado
    /// seria `Ok(())` e o arquivo teria o conteudo NOVO, nao mais o
    /// corrompido - confirma que o teste de fato exercita a protecao.
    #[test]
    fn save_is_refused_while_marked_unsafe_and_disk_content_is_untouched() {
        let mut path = std::env::temp_dir();
        path.push(format!("dott_corrupt_guard_a_{}.json", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let corrupted = b"{ isso nao fecha - dado original recuperavel";
        std::fs::write(&path, corrupted).unwrap();

        // simula: load achou corrupcao e a quarentena falhou.
        mark_unsafe_to_overwrite(&path);

        let result = guarded_save(&path, b"dado novo que apagaria o original");
        assert!(result.is_err(), "save deveria ser recusado com a marca ativa");
        assert_eq!(
            std::fs::read(&path).unwrap(),
            corrupted,
            "conteudo corrompido original nao pode mudar um byte sequer"
        );

        clear_unsafe_to_overwrite(&path);
        let _ = std::fs::remove_file(&path);
    }

    /// Prova o outro lado: depois que um load do MESMO caminho volta a ter
    /// sucesso (o problema passou), a marca some e o save volta a funcionar
    /// normalmente.
    #[test]
    fn save_works_again_after_a_successful_load_clears_the_mark() {
        let mut path = std::env::temp_dir();
        path.push(format!("dott_corrupt_guard_b_{}.json", std::process::id()));
        let _ = std::fs::remove_file(&path);
        std::fs::write(&path, b"{ isso nao fecha").unwrap();

        mark_unsafe_to_overwrite(&path);
        assert!(is_unsafe_to_overwrite(&path));

        // simula: um load seguinte no mesmo caminho deu certo (usuario
        // consertou a mao, ou a quarentena funcionou desta vez).
        clear_unsafe_to_overwrite(&path);
        assert!(!is_unsafe_to_overwrite(&path));

        let result = guarded_save(&path, b"{\"ok\": true}");
        assert!(result.is_ok(), "save deveria funcionar depois da marca limpa");
        assert_eq!(std::fs::read(&path).unwrap(), b"{\"ok\": true}");

        let _ = std::fs::remove_file(&path);
    }
}
