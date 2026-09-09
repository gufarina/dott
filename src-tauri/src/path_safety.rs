// path_safety.rs — Valida nomes vindos do frontend antes de juntar com um
// diretorio base, para que um caminho absoluto ou com drive (Windows) nunca
// escape do diretorio esperado (usado antes de fs::remove_file / restauracao).
// Funcoes puras: sem AppHandle, testaveis direto.

use std::path::{Component, Path, PathBuf};

/// Decodifica sequencias percent-encoded (%XX) sem depender de crate externa -
/// so bytes ASCII hex, suficiente pro que `convertFileSrc` (frontend, Windows)
/// gera: barra, contrabarra, dois-pontos e espaco escapados.
fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(byte) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Ultimo segmento de um caminho/URL, tratando tanto '/' quanto '\' como
/// separador.
/// REGRESSAO MEDIDA (31/08/2026, rodando o app empacotado de verdade - Tauri
/// build --debug + WebView2 real - "Editar imagem" nao fazia nada porque o
/// botao ficava desabilitado pra sempre): no Windows, `convertFileSrc`
/// (frontend) devolve `http://asset.localhost/C%3A%5CUsers%5C...%5Cimg.png` -
/// a contrabarra do caminho absoluto vira `%5C` (percent-encoded), NUNCA uma
/// '\' literal. Decodificar so DEPOIS de separar (como era antes) nunca acha
/// separador nenhum na string toda encoded, entao "ultimo segmento" virava a
/// URL INTEIRA - `safe_join` nao rejeitava (sem ':' ou '\' literal pra
/// disparar `Component::Prefix`/`has_root`), mas o arquivo juntado nunca
/// existia, `fs::read` falhava, `attachment_read` devolvia Err, e
/// `readAttachmentBlobUrl` (src/lib/attachments.ts) engolia o erro e devolvia
/// `null` pra sempre. Decodificar ANTES de separar resolve os dois formatos
/// (com ou sem encoding).
pub fn last_segment(raw: &str) -> String {
    let decoded = percent_decode(raw);
    decoded
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(&decoded)
        .to_string()
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
            let result = safe_join(&base, &name);
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
        assert_eq!(safe_join(&base, &name), None);
    }

    #[test]
    fn attachment_read_acha_arquivo_real_quando_url_e_convertfilesrc_do_windows() {
        // REGRESSAO MEDIDA (31/08/2026): convertFileSrc no Windows devolve
        // `http://asset.localhost/<caminho-absoluto-percent-encoded>` - toda
        // contrabarra do caminho vira `%5C`, nunca uma '\' literal. last_segment
        // tem que decodificar ANTES de separar, senao "ultima parte" vira a
        // URL inteira e nunca bate um arquivo real (fs::read falhava, o botao
        // "Editar imagem" ficava desabilitado pra sempre - ver ImageViewer.tsx).
        let base = temp_dir("convertfilesrc_windows");
        std::fs::write(base.join("img1788173762806.png"), b"fake-png-bytes").unwrap();
        let base_str = base.to_string_lossy().replace('\\', "%5C").replace(':', "%3A");
        let url = format!(
            "http://asset.localhost/{}%5Cimg1788173762806.png",
            base_str
        );
        let name = last_segment(&url);
        assert_eq!(name, "img1788173762806.png");
        let joined = safe_join(&base, &name);
        assert!(joined.is_some(), "deveria achar o arquivo real, achou None");
        assert!(joined.unwrap().exists());
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
