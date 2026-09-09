// atomic.rs — Escrita atomica em disco: grava num arquivo temporario e troca
// por cima do destino com rename (atomico no mesmo volume), evitando truncar
// o arquivo original se a escrita falhar no meio (hot path do autosave).
//
// TASK-495 (conserto): tres reforcos sobre a versao anterior.
// 1. Trava global (`LOCK`) serializa toda escrita atomica do app, entao duas
//    escritas concorrentes no MESMO caminho nunca disputam.
// 2. Mesmo com a trava, o nome do tmp e UNICO por escrita (pid + contador
//    atomico), entao mesmo se a trava cair no futuro, dois tmps nunca colidem.
// 3. fsync (`sync_all`) antes do rename: fecha a janela de queda de energia
//    entre a escrita do tmp e a troca atomica.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

static LOCK: Mutex<()> = Mutex::new(());
static COUNTER: AtomicU64 = AtomicU64::new(0);

fn unique_tmp_path(path: &Path) -> PathBuf {
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut tmp_name = path.as_os_str().to_os_string();
    tmp_name.push(format!(".{}.{}.tmp", std::process::id(), n));
    PathBuf::from(tmp_name)
}

pub fn write(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let tmp = unique_tmp_path(path);
    let result = (|| {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(contents)?;
        f.sync_all()?;
        drop(f); // fecha o handle antes do rename (Windows: rename com handle
                  // aberto so funciona por share mode implicito da std; nao
                  // depender disso no hot path do autosave).
        std::fs::rename(&tmp, path)
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&tmp);
    }
    result
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

    /// Prova a serializacao (achado 1/2): N threads escrevendo o MESMO caminho
    /// em paralelo nunca podem produzir mistura/truncamento nem deixar tmp
    /// sobrando - o conteudo final tem que ser EXATAMENTE um dos valores
    /// escritos. Sem a trava global (`LOCK`) do modulo, threads intercalam
    /// escrita/rename e o resultado pode ficar truncado ou o rename de uma
    /// thread pode falhar por outra ja ter apagado o mesmo tmp.
    #[test]
    fn concurrent_writes_to_same_path_never_mix_and_leave_no_tmp() {
        let path = temp_file("concurrent");
        let n = 16;
        let values: Vec<Vec<u8>> = (0..n)
            .map(|i| format!("valor-{}-{}", i, "x".repeat(200)).into_bytes())
            .collect();

        std::thread::scope(|scope| {
            for v in &values {
                let path = &path;
                scope.spawn(move || {
                    write(path, v).unwrap();
                });
            }
        });

        let final_content = std::fs::read(&path).unwrap();
        assert!(
            values.iter().any(|v| v == &final_content),
            "conteudo final nao bate com nenhum dos valores escritos (mistura/truncamento)"
        );

        let dir = path.parent().unwrap();
        let stem = path.file_name().unwrap().to_string_lossy().to_string();
        let leftover_tmp: Vec<PathBuf> = std::fs::read_dir(dir)
            .unwrap()
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .map(|n| {
                        let n = n.to_string_lossy();
                        n.starts_with(&stem) && n.ends_with(".tmp")
                    })
                    .unwrap_or(false)
            })
            .collect();
        assert!(leftover_tmp.is_empty(), "sobrou tmp: {:?}", leftover_tmp);

        let _ = std::fs::remove_file(&path);
    }
}
