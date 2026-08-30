// atomic.rs — Escrita atomica em disco: grava num arquivo temporario e troca
// por cima do destino com rename (atomico no mesmo volume), evitando truncar
// o arquivo original se a escrita falhar no meio (hot path do autosave).

use std::path::{Path, PathBuf};

pub fn write(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let mut tmp_name = path.as_os_str().to_os_string();
    tmp_name.push(".tmp");
    let tmp = PathBuf::from(tmp_name);
    if let Err(e) = std::fs::write(&tmp, contents) {
        let _ = std::fs::remove_file(&tmp);
        return Err(e);
    }
    if let Err(e) = std::fs::rename(&tmp, path) {
        let _ = std::fs::remove_file(&tmp);
        return Err(e);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("dott_atomic_{}_{}.txt", tag, std::process::id()));
        let _ = std::fs::remove_file(&p);
        p
    }

    #[test]
    fn write_creates_file_with_full_content_and_no_leftover_tmp() {
        let path = temp_file("happy");
        write(&path, b"conteudo integro").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"conteudo integro");
        let mut tmp = path.as_os_str().to_os_string();
        tmp.push(".tmp");
        assert!(!PathBuf::from(tmp).exists());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn write_overwrites_existing_file_atomically() {
        let path = temp_file("overwrite");
        std::fs::write(&path, b"velho").unwrap();
        write(&path, b"novo conteudo").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"novo conteudo");
        let _ = std::fs::remove_file(&path);
    }
}
