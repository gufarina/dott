import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Widget } from "./widget/Widget";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/reset.css";

// Squircle real via Houdini Paint Worklet (contorna o bug do corner-shape no WebView2).
type PaintWorklet = { addModule: (url: string) => Promise<void> };
const paintWorklet = (CSS as unknown as { paintWorklet?: PaintWorklet }).paintWorklet;
if (paintWorklet) {
  paintWorklet.addModule("/squircle.js?v=2").catch(() => {
    // Sem worklet: cai no border-radius normal (round). Nao quebra nada.
  });
}

// Aplica o tema salvo antes do render (evita flash).
try {
  const saved = localStorage.getItem("dott:theme");
  document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

// Decide o que renderizar pela janela: 'widget' = orb flutuante, senão = app principal.
function currentLabel(): string {
  try {
    // Import dinâmico evita quebrar no navegador (sem Tauri).
    const w = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } })
      .__TAURI_INTERNALS__
    return w?.metadata?.currentWindow?.label ?? "main";
  } catch {
    return "main";
  }
}

// `#widget` na URL renderiza o widget no navegador: e a unica forma de CONFERIR
// o desenho dele com screenshot, porque a janela nativa do Tauri nao e alcancada
// por captura de tela. No app a URL nunca tem hash, entao nao muda nada.
const isWidget = currentLabel() === "widget" || window.location.hash === "#widget";

// Escala global +20% (conforto em alto DPI) — so na janela principal.
// O widget tem janela propria de 104px e nao deve escalar.
//
// Usa o zoom NATIVO do webview, nunca `zoom` de CSS: o zoom de CSS desalinha as
// coordenadas de ponteiro das medidas de layout no WebView2 e quebra o arrasto
// (o card e arrastado mas nunca aterrissa na pasta). O zoom nativo e resolvido
// pelo proprio navegador, entao ponteiro e layout continuam no mesmo sistema.
if (!isWidget) {
  document.documentElement.dataset.scale = "on";
  import("@tauri-apps/api/webview")
    .then(({ getCurrentWebview }) => getCurrentWebview().setZoom(1.2))
    .catch(() => {
      // Fora do Tauri (navegador, dev): segue em 100%, sem quebrar nada.
    });
}

if (isWidget) {
  // A janela do widget é transparente — o orb flutua sobre o desktop.
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
  document.body.style.overflow = "hidden";
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <App />}
  </React.StrictMode>,
);
