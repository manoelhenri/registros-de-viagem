// Foto do jogador, feita toda no celular (canvas), com filtros de cor.
// Os filtros mexem só nas cores, então funcionam com qualquer rosto e enquadramento
// (nada de acessório desenhado num lugar fixo). A foto sai redonda, com 192 px (JPEG),
// e só vai para a sala online se a pessoa usar.
export const FILTROS = [
  ["normal", "Normal"], ["pb", "P&B"], ["novela", "Novela antiga"], ["tv", "TV de tubo"],
  ["pop", "Pop"], ["neon", "Neon"], ["ouro", "Milionário"], ["gelo", "Gelo"],
];

export function carregarImagem(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
    img.src = url;
  });
}

const lim = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const luz = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
// Duotom: sombras numa cor, luzes em outra.
const duo = (y, a, b) => [a[0] + (b[0] - a[0]) * y, a[1] + (b[1] - a[1]) * y, a[2] + (b[2] - a[2]) * y];

function cores(c, W, filtro) {
  if (filtro === "normal") return;
  const d = c.getImageData(0, 0, W, W), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], b = p[i + 2];
    const y = luz(r, g, b);
    if (filtro === "pb") { const v = (y - 128) * 1.25 + 128; r = g = b = v; }
    else if (filtro === "novela") { r = y * 1.07 + 30; g = y * 0.95 + 18; b = y * 0.72 + 4; }
    else if (filtro === "tv") {
      const linha = Math.floor(i / 4 / W) % 3 === 0 ? 0.72 : 1;
      const v = ((y - 128) * 1.4 + 128) * linha; r = v * 0.92; g = v * 1.02; b = v * 1.08;
    } else if (filtro === "pop") {
      const m = (r + g + b) / 3;
      r = Math.round(lim(m + (r - m) * 2.1) / 64) * 64; g = Math.round(lim(m + (g - m) * 2.1) / 64) * 64; b = Math.round(lim(m + (b - m) * 2.1) / 64) * 64;
    } else if (filtro === "neon") [r, g, b] = duo(Math.pow(y / 255, 0.9), [40, 10, 120], [255, 70, 170]);
    else if (filtro === "ouro") [r, g, b] = duo(Math.pow(y / 255, 0.85), [40, 22, 0], [255, 214, 90]);
    else if (filtro === "gelo") [r, g, b] = duo(Math.pow(y / 255, 0.9), [8, 30, 80], [200, 245, 255]);
    p[i] = lim(r); p[i + 1] = lim(g); p[i + 2] = lim(b);
  }
  c.putImageData(d, 0, 0);
  if (filtro === "tv" || filtro === "novela") {
    const v = c.createRadialGradient(W / 2, W / 2, W * 0.32, W / 2, W / 2, W * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, filtro === "tv" ? "rgba(0,0,0,.6)" : "rgba(60,30,0,.45)");
    c.fillStyle = v; c.fillRect(0, 0, W, W);
  }
}

// ed: {img, zoom, x, y, giro (0..3, em quartos de volta), filtro}. Zoom 1 = a foto inteira cabe no círculo.
export function desenhar(canvas, ed, W) {
  canvas.width = W; canvas.height = W;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.fillStyle = "#16207a"; c.fillRect(0, 0, W, W);
  if (ed.img) {
    const im = ed.img, deitada = ed.giro % 2 === 1;
    const iw = deitada ? im.naturalHeight : im.naturalWidth, ih = deitada ? im.naturalWidth : im.naturalHeight;
    // zoom 1 preenche o círculo pelo lado menor; dá para afastar até 0,5 sem cortar nada
    const esc = (W / Math.min(iw, ih)) * ed.zoom;
    c.save();
    c.translate(W / 2 + ed.x * W, W / 2 + ed.y * W);
    c.rotate((ed.giro * Math.PI) / 2);
    c.drawImage(im, (-im.naturalWidth * esc) / 2, (-im.naturalHeight * esc) / 2, im.naturalWidth * esc, im.naturalHeight * esc);
    c.restore();
  }
  cores(c, W, ed.filtro);
  c.globalCompositeOperation = "destination-in"; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.fill();
  c.globalCompositeOperation = "destination-over"; c.fillStyle = "#16207a"; c.fillRect(0, 0, W, W);
  c.globalCompositeOperation = "source-over";
}

// Foto final, pequena para viajar pela sala online.
export function exportar(ed) {
  const cv = document.createElement("canvas");
  desenhar(cv, ed, 192);
  let q = 0.82, url = cv.toDataURL("image/jpeg", q);
  while (url.length > 30000 && q > 0.4) { q -= 0.1; url = cv.toDataURL("image/jpeg", q); }
  return url;
}

// Miniatura de cada filtro para os botões (usa a foto atual).
export function miniatura(ed, filtro, W = 56) {
  const cv = document.createElement("canvas");
  desenhar(cv, Object.assign({}, ed, { filtro }), W);
  return cv.toDataURL("image/jpeg", 0.7);
}
