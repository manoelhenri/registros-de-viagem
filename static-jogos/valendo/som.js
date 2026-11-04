// Trilha e efeitos do Valendo!, sintetizados na hora com a Web Audio API.
// Tudo é original (nenhum áudio gravado nem música de terceiros) e começa só depois do
// primeiro toque na tela, como os navegadores exigem.
const guarda = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

let ctx = null, mestre = null, ruido = null, timer = null;
let trilha = null, passo = 0, proximo = 0, urgente = false;
let mudo = guarda.get("vl_mudo") === "1";

const nota = (n) => 440 * Math.pow(2, (n - 69) / 12); // número MIDI para Hz

function liga() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  mestre = ctx.createGain(); mestre.gain.value = mudo ? 0 : 0.32;
  const comp = ctx.createDynamicsCompressor();
  mestre.connect(comp); comp.connect(ctx.destination);
  ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (trilha && !timer) { passo = 0; proximo = ctx.currentTime + 0.05; timer = setInterval(agendar, 30); }
  return true;
}

function osc(tipo, freq, t, dur, vol, { corte = 0, ataque = 0.005, deslize = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * deslize), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let saida = g;
  if (corte) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(corte, t); g.connect(f); saida = f; }
  o.connect(g); saida.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
}
function chiado(t, dur, vol, freq = 7000, tipo = "highpass") {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido; f.type = tipo; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(mestre); s.start(t); s.stop(t + dur + 0.02);
}
function bumbo(t, vol = 0.9) { osc("sine", 140, t, 0.32, vol, { deslize: 0.3, ataque: 0.002 }); }

// ---------- trilhas em loop (16 passos por compasso) ----------
// "palco": groove animado de auditório. Progressão Dó, Lá menor, Fá, Sol.
const ACORDES = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const MELODIA = [[72, 0], [74, 3], [76, 6], [79, 10], [76, 12], null, null, null, [72, 0], [72, 3], [69, 6], [72, 10], [74, 12], null, null, null, [69, 0], [72, 3], [77, 6], [76, 10], [74, 12], null, null, null, [74, 0], [76, 3], [79, 6], [81, 10], [79, 12], [83, 14], null, null];
function tocarPalco(t, p, dur16) {
  const c = Math.floor(p / 16) % 4, s = p % 16, ac = ACORDES[c];
  if (s === 0 || s === 8) bumbo(t, 0.7);
  if (s === 4 || s === 12) chiado(t, 0.16, 0.22, 2500, "bandpass");
  if (s % 2 === 0) chiado(t, 0.04, s % 4 === 2 ? 0.1 : 0.05);
  if ([0, 6, 8, 14].includes(s)) osc("triangle", nota(ac[0] - 24), t, dur16 * 2.2, 0.32, { corte: 700 });
  if ([2, 6, 10, 14].includes(s)) ac.forEach((n) => osc("sawtooth", nota(n), t, dur16 * 1.3, 0.035, { corte: 2400 }));
  const blocoMel = Math.floor(p / 16) % 8 < 4 ? null : (Math.floor(p / 16) % 4) * 8;
  if (blocoMel !== null) for (let i = 0; i < 8; i++) { const m = MELODIA[blocoMel + i]; if (m && m[1] === s) osc("square", nota(m[0]), t, dur16 * 2.4, 0.045, { corte: 3200 }); }
}
// "tensão": coração batendo, grave sustentado e o tique do relógio.
function tocarTensao(t, p, dur16) {
  const s = p % 16, c = Math.floor(p / 16) % 4;
  if (s === 0 || s === 3) bumbo(t, s === 0 ? 0.8 : 0.5);
  if (s === 0) osc("sawtooth", nota([38, 38, 39, 36][c]), t, dur16 * 15, 0.05, { corte: 380, ataque: 0.2 });
  if (s === 8 && c % 2 === 1) [62, 65, 69].forEach((n) => osc("triangle", nota(n + (c === 3 ? 1 : 0)), t, dur16 * 7, 0.028, { ataque: 0.3 }));
  if (urgente ? s % 2 === 0 : s % 4 === 0) osc("square", urgente ? 1760 : 1320, t, 0.03, 0.05, { corte: 5000 });
}
const TRILHAS = { palco: { bpm: 118, f: tocarPalco }, tensao: { bpm: 96, f: tocarTensao } };

function agendar() {
  if (!ctx || !trilha) return;
  const tr = TRILHAS[trilha], dur16 = 60 / tr.bpm / 4;
  while (proximo < ctx.currentTime + 0.15) { tr.f(proximo, passo, dur16); passo++; proximo += dur16; }
}

// ---------- efeitos ----------
const EFEITOS = {
  clique(t) { osc("sine", 880, t, 0.06, 0.12); },
  confirma(t) { [67, 72].forEach((n, i) => osc("triangle", nota(n), t + i * 0.07, 0.25, 0.18)); },
  ajuda(t) { [76, 79, 84].forEach((n, i) => osc("sine", nota(n), t + i * 0.06, 0.3, 0.14)); },
  tema(t) { for (let i = 0; i < 18; i++) chiado(t + i * 0.055, 0.05, 0.05 + i * 0.012, 1800, "bandpass"); const f = t + 1.0; bumbo(f, 1); chiado(f, 0.9, 0.25, 5000); [60, 64, 67, 72].forEach((n) => osc("sawtooth", nota(n), f, 1.0, 0.06, { corte: 3000 })); },
  acerto(t) { [72, 76, 79, 84].forEach((n, i) => osc("square", nota(n), t + i * 0.09, 0.32, 0.08, { corte: 4200 })); [84, 88, 91].forEach((n) => osc("sine", nota(n), t + 0.4, 0.9, 0.06)); chiado(t + 0.4, 0.7, 0.08, 9000); },
  erro(t) { [55, 54, 53, 52].forEach((n, i) => osc("sawtooth", nota(n), t + i * 0.28, i === 3 ? 0.8 : 0.3, 0.09, { corte: 900, deslize: i === 3 ? 0.94 : 1 })); },
  fanfarra(t) {
    const linha = [[67, 0, 0.18], [72, 0.18, 0.18], [76, 0.36, 0.18], [79, 0.54, 0.5], [76, 1.08, 0.16], [79, 1.24, 1.2]];
    linha.forEach(([n, d, du]) => { osc("sawtooth", nota(n), t + d, du, 0.08, { corte: 3500 }); osc("square", nota(n - 12), t + d, du, 0.04, { corte: 2000 }); });
    [60, 64, 67, 72].forEach((n) => osc("triangle", nota(n), t + 1.24, 1.6, 0.06));
    for (let i = 0; i < 14; i++) chiado(t + 0.9 + i * 0.025, 0.03, 0.06, 2000, "bandpass");
    bumbo(t + 1.24, 1); chiado(t + 1.24, 1.4, 0.2, 6000);
  },
};

export const Som = {
  get mudo() { return mudo; },
  liga,
  alternar() { mudo = !mudo; guarda.set("vl_mudo", mudo ? "1" : "0"); if (mestre) mestre.gain.setTargetAtTime(mudo ? 0 : 0.32, ctx.currentTime, 0.05); return mudo; },
  trilha(nome) {
    if (nome === trilha) return;
    trilha = nome || null; urgente = false;
    if (!ctx) return;
    if (trilha) { passo = 0; proximo = ctx.currentTime + 0.05; if (!timer) timer = setInterval(agendar, 30); }
    else { clearInterval(timer); timer = null; }
  },
  urgente(sim) { urgente = !!sim; },
  efeito(nome) { if (!ctx || mudo || !EFEITOS[nome]) return; EFEITOS[nome](ctx.currentTime + 0.01); },
};
