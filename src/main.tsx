import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Widget } from "./widget/Widget";
import { showToast } from "./components/Toast";
// TASK-316 (27/08/2026): "./styles/fonts.css" (MiSans Latin, 8 arquivos
// .otf) removido daqui - fonte reprovada pelo CEO em 25/08/2026 ("amador"),
// zero consumidor no codigo (grep confirmou: nenhum font-family referencia
// MiSans em lugar nenhum), so pesava bundle. O arquivo `src/styles/fonts.css`
// e os .otf em `src/styles/fonts/` continuam em disco (esta ferramenta nao
// apaga arquivo) - fisicamente remove-los e o proximo passo, sinalizado ao
// coordenador.
// Manrope (UI: titulo, botao, label, navegacao) e Merriweather (corpo de
// leitura da nota, .md-view em markdown.css) via @fontsource — pacote NPM,
// nunca link de CDN (o app roda sem rede por dentro). PENDENCIA: os pacotes
// abaixo ainda nao estao instalados (`npm i @fontsource/manrope
// @fontsource/merriweather`); ate la o build falha nestes dois imports.
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
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

// Item 5: tela de falha honesta (nunca pagina branca). Estilo em linha com
// os tokens de src/styles/tokens.css (ja carregados acima) - DESIGN.md
// secoes 1-4 (superficie escura neutra, --fg/--fg2, --font-ui, --r-btn,
// botao primario 44px em --fg/--bg, --danger-s so no icone de aviso).
function FailScreen({ onReload }: { onReload: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        background: "var(--bg)",
        color: "var(--fg)",
        fontFamily: "var(--font-ui)",
        textAlign: "center",
        padding: "var(--space-6)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--r-full)",
          background: "var(--danger-s)",
          color: "var(--danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
        }}
      >
        !
      </div>
      <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
        Algo deu errado
      </h1>
      <p style={{ fontSize: "var(--text-base)", color: "var(--fg2)", maxWidth: 360, margin: 0 }}>
        O Dott encontrou um problema inesperado e precisou parar esta tela.
        Suas notas já salvas continuam guardadas em arquivo, no seu
        computador. Recarregue para continuar. Se a edição mais recente
        não aparecer, é só refazê-la.
      </p>
      <button
        type="button"
        onClick={onReload}
        style={{
          marginTop: "var(--space-2)",
          height: 44,
          padding: "0 var(--space-6)",
          borderRadius: "var(--r-btn)",
          border: "none",
          cursor: "pointer",
          background: "var(--fg)",
          color: "var(--bg)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
        }}
      >
        Recarregar
      </button>
    </div>
  );
}

// Cobre erro de RENDER dentro da arvore React (o que window.onerror nao pega).
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
  }
  render() {
    if (this.state.hasError) {
      return <FailScreen onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

// Cobre throw FORA da arvore React (handler de evento, promise sem catch) -
// o ErrorBoundary sozinho nao alcanca esses casos. CORRIGIR (reprovado na
// conferencia): isto NAO pode substituir a tela inteira pela FailScreen -
// a arvore React continua viva e funcional por baixo, entao sequestrar a
// tela transformaria um erro hoje inofensivo (ex.: um invoke que falhou
// num caminho nao coberto) numa perda de sessao visivel. So registra no
// console e avisa de forma NAO destrutiva pelo toast que o app ja tem -
// o usuario continua trabalhando. A FailScreen de tela cheia fica
// EXCLUSIVA do ErrorBoundary (erro de render, onde a arvore de fato morreu).
function Root() {
  React.useEffect(() => {
    const avisar = (origem: string, detalhe: unknown) => {
      console.error(`[${origem}]`, detalhe);
      showToast("warn", "Algo não funcionou", "Um problema passageiro aconteceu, mas o Dott continua funcionando.");
    };
    const onError = (event: ErrorEvent) => avisar("window.onerror", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => avisar("unhandledrejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return <ErrorBoundary>{isWidget ? <Widget /> : <App />}</ErrorBoundary>;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
