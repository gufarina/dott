// squircle.js — Paint Worklet (Houdini) que desenha um retangulo com cantos
// superellipse (squircle estilo Apple) e o usa como mascara do elemento.
//
// Por que: corner-shape: superellipse() e renderizado errado pelo WebView2 do
// Tauri em elementos com overflow:hidden. O worklet desenha a curva na mao e
// funciona em qualquer Chromium/WebView2, em qualquer tamanho, lendo o raio
// real do proprio elemento (border-top-left-radius). Uso: mask-image: paint(squircle).
registerPaint('squircle', class {
  static get inputProperties() {
    return ['--sq-r', 'border-top-left-radius', '--sq-smooth'];
  }

  paint(ctx, geom, props) {
    const w = geom.width;
    const h = geom.height;
    // Le o raio de --sq-r (confiavel em worklet); cai pro border-radius se faltar.
    let r = parseFloat(props.get('--sq-r')) ||
            parseFloat(props.get('border-top-left-radius').toString()) || 0;
    let n = parseFloat(props.get('--sq-smooth')) || 4;
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) {
      // Sem raio: mascara cheia (retangulo), nao corta nada.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const k = 2 / n;
    const seg = 32;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(r, 0);

    // Cada canto e um quarto de superellipse, na ordem horaria.
    const corner = (cx, cy, sx, sy, swap) => {
      for (let i = 0; i <= seg; i++) {
        const th = (i / seg) * (Math.PI / 2);
        const a = Math.pow(Math.cos(th), k) * r;
        const b = Math.pow(Math.sin(th), k) * r;
        const x = swap ? cx + sx * b : cx + sx * a;
        const y = swap ? cy + sy * a : cy + sy * b;
        ctx.lineTo(x, y);
      }
    };
    corner(w - r, r, +1, -1, true);     // superior direito
    corner(w - r, h - r, +1, +1, false); // inferior direito
    corner(r, h - r, -1, +1, true);     // inferior esquerdo
    corner(r, r, -1, -1, false);        // superior esquerdo
    ctx.closePath();
    ctx.fill();
  }
});
