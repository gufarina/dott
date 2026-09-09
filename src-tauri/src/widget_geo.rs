// widget_geo.rs — Reposicionar E redimensionar o widget em UMA operacao.
//
// Por que isto existe: o widget muda de tamanho quando o trilho abre, e como
// ele e ancorado pelo canto de baixo-direita, mudar o tamanho exige mudar a
// posicao junto. Feito do lado do JavaScript sao duas chamadas assincronas
// separadas, e entre uma e outra o compositor pode desenhar um quadro com o
// tamanho NOVO na posicao VELHA — a bolinha aparece deslocada e volta. Era o
// pulo que se via toda vez que o trilho abria.
//
// Aqui as duas viram uma chamada so, resolvidas no mesmo passo do laco de
// eventos da janela: nao ha quadro intermediario pra desenhar.

use tauri::{LogicalPosition, LogicalSize, Manager};

/// Move e redimensiona a janela `widget` de uma vez. Coordenadas logicas.
#[tauri::command]
pub fn widget_set_geometry(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Result<(), String> {
    let win = app
        .get_webview_window("widget")
        .ok_or_else(|| "janela widget nao encontrada".to_string())?;

    // Posicao ANTES do tamanho: crescendo, a janela ja nasce no lugar certo;
    // encolhendo, o canto de baixo-direita (onde a bolinha mora) nao se mexe.
    win.set_position(LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    win.set_size(LogicalSize::new(w, h))
        .map_err(|e| e.to_string())?;
    Ok(())
}
