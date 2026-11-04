// Foto do jogador com filtros engraçados, feita toda no celular (canvas).
// A foto sai redonda, pequena (192 px, JPEG) e só vai para a sala online se a pessoa usar.
export const FILTROS = [
  ["nenhum", "Sem filtro", "🙂"], ["oculos", "Óculos", "😎"], ["bigode", "Bigodão", "🥸"], ["coroa", "Majestade", "👑"],
  ["palhaco", "Palhaço", "🤡"], ["milionario", "Milionário", "🎩"], ["festa", "Festa", "🥳"], ["tv", "TV antiga", "📺"], ["pop", "Pop", "🌈"],
];

const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function carregarImagem(arquivo) {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
    img.src = url;
  });
}

function corPixels(c, W, filtro) {
  if (filtro !== "tv" && filtro !== "pop") return;
  const d = c.getImageData(0, 0, W, W), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], b = p[i + 2];
    if (filtro === "tv") {
      const y = (0.3 * r + 0.59 * g + 0.11 * b - 128) * 1.35 + 128;
      const linha = Math.floor(i / 4 / W) % 4 < 2 ? 1 : 0.82;
      r = g = b = y * linha; b *= 1.04;
    } else {
      const m = (r + g + b) / 3;
      r = m + (r - m) * 2.2; g = m + (g - m) * 2.2; b = m + (b - m) * 2.2;
      r = Math.round(r / 64) * 64; g = Math.round(g / 64) * 64; b = Math.round(b / 64) * 64;
    }
    p[i] = Math.max(0, Math.min(255, r)); p[i + 1] = Math.max(0, Math.min(255, g)); p[i + 2] = Math.max(0, Math.min(255, b));
  }
  c.putImageData(d, 0, 0);
}

function emoji(c, txt, x, y, tam, giro = 0) {
  c.save(); c.translate(x, y); c.rotate(giro);
  c.font = `${tam}px ${EMOJI}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 0);
  c.restore();
}

function acessorios(c, W, filtro) {
  const u = W / 100;
  if (filtro === "oculos") emoji(c, "🕶️", 50 * u, 42 * u, 52 * u);
  if (filtro === "bigode") {
    c.save(); c.fillStyle = "#2b1a10"; c.translate(50 * u, 62 * u);
    for (const lado of [-1, 1]) {
      c.beginPath(); c.moveTo(0, -1 * u);
      c.bezierCurveTo(lado * 8 * u, -7 * u, lado * 20 * u, -6 * u, lado * 24 * u, -1 * u);
      c.bezierCurveTo(lado * 27 * u, 2 * u, lado * 29 * u, -2 * u, lado * 28 * u, -5 * u);
      c.bezierCurveTo(lado * 31 * u, 1 * u, lado * 24 * u, 8 * u, lado * 14 * u, 4 * u);
      c.bezierCurveTo(lado * 8 * u, 2 * u, lado * 3 * u, 3 * u, 0, 2 * u);
      c.fill();
    }
    c.restore();
  }
  if (filtro === "coroa") { emoji(c, "👑", 50 * u, 12 * u, 40 * u); emoji(c, "✨", 18 * u, 22 * u, 14 * u); emoji(c, "✨", 82 * u, 20 * u, 12 * u); }
  if (filtro === "palhaco") {
    c.save(); c.fillStyle = "rgba(255,60,90,.35)";
    [[30, 60], [70, 60]].forEach(([x, y]) => { c.beginPath(); c.arc(x * u, y * u, 8 * u, 0, 7); c.fill(); });
    const gr = c.createRadialGradient(47 * u, 50 * u, 1 * u, 50 * u, 53 * u, 9 * u); gr.addColorStop(0, "#ff8a8a"); gr.addColorStop(1, "#d6001c");
    c.fillStyle = gr; c.beginPath(); c.arc(50 * u, 53 * u, 8.5 * u, 0, 7); c.fill();
    const cores = ["#ff3d8b", "#ffc93c", "#3fe0ff", "#7cff6b"];
    for (let i = 0; i < 14; i++) { const lado = i < 7 ? -1 : 1, k = i % 7; c.fillStyle = cores[(i + k) % 4]; c.beginPath(); c.arc(50 * u + lado * (38 + (k % 2) * 6) * u, (14 + k * 6) * u, 7 * u, 0, 7); c.fill(); }
    c.restore();
  }
  if (filtro === "milionario") {
    emoji(c, "🎩", 50 * u, 9 * u, 42 * u);
    c.save(); c.strokeStyle = "#d9a400"; c.lineWidth = 2.2 * u; c.beginPath(); c.arc(64 * u, 42 * u, 8 * u, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(71 * u, 46 * u); c.quadraticCurveTo(80 * u, 60 * u, 76 * u, 78 * u); c.lineWidth = 0.9 * u; c.stroke(); c.restore();
    emoji(c, "💰", 84 * u, 82 * u, 20 * u); emoji(c, "💵", 16 * u, 80 * u, 18 * u, -0.4);
  }
  if (filtro === "festa") {
    c.save(); c.translate(64 * u, 12 * u); c.rotate(0.35);
    c.beginPath(); c.moveTo(0, -16 * u); c.lineTo(-11 * u, 14 * u); c.lineTo(11 * u, 14 * u); c.closePath();
    const gr = c.createLinearGradient(-11 * u, 0, 11 * u, 0); gr.addColorStop(0, "#ff3d8b"); gr.addColorStop(0.5, "#ffc93c"); gr.addColorStop(1, "#3fe0ff");
    c.fillStyle = gr; c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -16 * u, 3.5 * u, 0, 7); c.fill(); c.restore();
    const cores = ["#ff3d8b", "#ffc93c", "#3fe0ff", "#7cff6b", "#ffffff"];
    for (let i = 0; i < 26; i++) { c.fillStyle = cores[i % 5]; const a = i * 2.4, r = 40 + (i % 3) * 4; c.fillRect(50 * u + Math.cos(a) * r * u, 50 * u + Math.sin(a) * r * u, 3 * u, 5 * u); }
    emoji(c, "🎉", 18 * u, 84 * u, 20 * u);
  }
  if (filtro === "tv") {
    const v = c.createRadialGradient(50 * u, 50 * u, 30 * u, 50 * u, 50 * u, 72 * u); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.65)");
    c.fillStyle = v; c.fillRect(0, 0, W, W);
  }
}

// Desenha a foto (com pan e zoom) e o filtro num canvas quadrado de lado W.
export function desenhar(canvas, ed, W) {
  canvas.width = W; canvas.height = W;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.fillStyle = "#16207a"; c.fillRect(0, 0, W, W);
  if (ed.img) {
    const im = ed.img, base = W / Math.min(im.naturalWidth, im.naturalHeight), esc = base * ed.zoom;
    const w = im.naturalWidth * esc, h = im.naturalHeight * esc;
    c.drawImage(im, (W - w) / 2 + ed.x * W, (W - h) / 2 + ed.y * W, w, h);
  }
  corPixels(c, W, ed.filtro);
  acessorios(c, W, ed.filtro);
  // recorte redondo
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
