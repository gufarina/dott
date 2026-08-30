// path_safety.rs — Valida nomes vindos do frontend antes de juntar com um
// diretorio base, para que um caminho absoluto ou com drive (Windows) nunca
// escape do diretorio esperado (usado antes de fs::remove_file / restauracao).
// Funcoes puras: sem AppHandle, testaveis direto.

use std::path::{Component, Path, PathBuf};

/// Ultimo segmento de um caminho/URL, tratando tanto '/' quanto '\' como separador.
pub fn last_segment(raw: &str) -> &str {
    raw.rsplit(['/', '\\']).next().unwrap_or(raw)
}

/// Junta `base` com `candidate` so se o resultado ficar contido dentro de `base`.
/// Recusa candidate vazio, com "..", ou com prefixo/raiz de caminho (ex.: drive
/// do Windows como "C:algo" ou "C:\algo", ou raiz estilo Unix "/etc").
pub fn safe_join(base: &Path, candidate: &str) -> Option<PathBuf> {
    if candidate.is_empty() || candidate.contains("..") {
        return None;
    }
    let candidate_path = Path::new(candidate);
    if candidate_path.has_root()
        || candidate_path
            .components()
            .any(|c| matches!(c, Component::Prefix(_)))
    {
        return None;
    }
    let base_canon = std::fs::canonicalize(base).ok()?;
    let target = base_canon.join(candidate);
    // candidate nao tem ".." nem raiz/prefixo, entao o join acima ja fica dentro
    // de base_canon; canonicaliza so se o alvo ja existir (senao nao ha nada a
    // resolver, ex.: arquivo ainda nao criado).
    let target_check = std::fs::canonicalize(&target).unwrap_or_else(|_| target.clone());
    if target_check.starts_with(&base_canon) {
        Some(target)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(tag: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("dott_pathsafety_{}_{}", tag, std::process::id()));
        let _ = std::fs::remove_dir_all(&p);
        std::fs::create_dir_all(&p).unwrap();
        p
    }

    fn is_contained_or_rejected(base: &Path, result: &Option<PathBuf>) -> bool {
        // safe_join devolve caminho canonicalizado (no Windows, com prefixo \\?\);
        // compara contra o base tambem canonicalizado pra nao dar falso negativo.
        let base_canon = std::fs::canonicalize(base).unwrap_or_else(|_| base.to_path_buf());
        match result {
            None => true, // recusado explicitamente: seguro
            Some(p) => p.starts_with(&base_canon),
        }
    }

    #[test]
    fn attachment_remove_never_escapes_base_for_malicious_urls() {
        let base = temp_dir("escape");
        for raw in [
            r"C:\Users\ele\Documents\importante.docx",
            "C:algo.txt",
            "/etc/passwd",
            r"..\..\x",
        ] {
            let name = last_segment(raw);
            let result = safe_join(&base, name);
            assert!(
                is_contained_or_rejected(&base, &result),
                "escapou de base para {:?} a partir de {:?}",
                result,
                raw
            );
        }
    }

    #[test]
    fn attachment_remove_rejects_drive_relative_without_root() {
        // "C:algo.txt" nao tem separador: o "ultimo segmento" e o proprio texto,
        // que carrega prefixo de drive sem barra (Path::prefix() pega, has_root() nao).
        let base = temp_dir("drive_relative");
        let name = last_segment("C:algo.txt");
        assert_eq!(safe_join(&base, name), None);
    }

    #[test]
    fn attachment_remove_accepts_simple_name_inside_attachments() {
        let base = temp_dir("simple_ok");
        std::fs::write(base.join("img1.png"), b"x").unwrap();
        let expected = std::fs::canonicalize(&base).unwrap().join("img1.png");
        assert_eq!(safe_join(&base, "img1.png"), Some(expected));
    }

    #[test]
    fn backup_restore_rejects_name_with_drive_or_root() {
        let base = temp_dir("backup_root");
        assert_eq!(safe_join(&base, r"C:\Windows"), None);
        assert_eq!(safe_join(&base, "C:algo"), None);
        assert_eq!(safe_join(&base, "/etc"), None);
    }
}
