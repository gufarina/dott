// corrupt.rs — Quando um arquivo de estado existe mas nao da pra fazer parse,
// renomeia pro lado (nunca apaga) antes do caller cair no estado vazio/reseed,
// pra nao perder dado que ainda pode ser recuperado a mao.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn quarantine(path: &Path) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let mut name = path.as_os_str().to_os_string();
    name.push(format!(".corrompido-{}", ts));
    let dest = PathBuf::from(name);
    let _ = std::fs::rename(path, dest);
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
}
