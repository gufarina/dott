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

const isWidget = currentLabel() === "widget";

// Escala global +20% (conforto em alto DPI) — so na janela principal.
// O widget tem janela propria de 104px e nao deve escalar.
if (!isWidget) {
  document.documentElement.dataset.scale = "on";
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
