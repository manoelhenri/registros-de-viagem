// Motor do Valendo!: regras puras, sem tela e sem rede.
// O mesmo arquivo roda no navegador (modo "um celular só") e no servidor das salas
// (salas/src/index.js), então as regras e a pontuação nunca divergem entre os dois modos.
// Nenhuma função muda o estado recebido: todas devolvem um estado novo.
import { TEMAS, PERGUNTAS } from "./perguntas.js";

export const MAX_JOGADORES = 10;
export const RODADAS_OPCOES = [10, 15, 20];
export const RODADAS_PADRAO = 15;
export const MIN_TEMAS = 3;
export const TEMPO = { voto: 15000, tema: 4500, pergunta: 25000, revela: 6000, ranking: 8000 };
export const AJUDAS = { cartas: { n: "Cartas", e: "🃏" }, universitarios: { n: "Universitários", e: "🎓" }, placas: { n: "Placas", e: "🪧" } };
export const AVATARES = [["🦁", "Leão"], ["🐯", "Tigre"], ["🦊", "Raposa"], ["🐼", "Panda"], ["🐸", "Sapo"], ["🐙", "Polvo"], ["🦄", "Unicórnio"], ["🐵", "Macaco"], ["🐶", "Cachorro"], ["🐱", "Gato"], ["🐧", "Pinguim"], ["🦖", "Dino"]];
export { TEMAS, PERGUNTAS };

// Escada de prêmios, como num programa de auditório: a última rodada vale R$ 1 milhão.
const MIL = 1000;
export const ESCADAS = {
  10: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map((v) => v * MIL),
  15: [1, 2, 3, 5, 10, 20, 30, 50, 100, 150, 200, 300, 500, 750, 1000].map((v) => v * MIL),
  20: [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000].map((v) => v * MIL),
};
export const valorDa = (G, rodada) => (ESCADAS[G.rodadas] || ESCADAS[RODADAS_PADRAO])[(rodada || G.rodada) - 1] || 0;
export const reais = (v) => v >= 1e6 ? `R$ ${String(v / 1e6).replace(".", ",")} milhão` : v >= 1000 ? `R$ ${String(v / 1000).replace(".", ",")} mil` : `R$ ${v}`;
export const reaisCurto = (v) => v >= 1e6 ? `${String(+(v / 1e6).toFixed(2)).replace(".", ",")} mi` : v >= 1000 ? `${String(+(v / 1000).toFixed(1)).replace(".", ",")} mil` : String(v);

const embaralhar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const temasValidos = (lista) => {
  const ok = Array.isArray(lista) ? [...new Set(lista.filter((k) => TEMAS[k]))] : [];
  return ok.length >= MIN_TEMAS ? ok : Object.keys(TEMAS);
};
const opcoesDeTema = (temas, excluir) => {
  const livres = temas.filter((k) => k !== excluir);
  return embaralhar(livres.length >= 2 ? livres : temas).slice(0, 3);
};
const mudar = (G, fase, extra, agora) => {
  const novo = Object.assign({}, G, extra || {}, { fase, seq: (G.seq || 0) + 1, inicio: agora });
  const semRelogio = !TEMPO[fase] || (G.local && (fase === "voto" || fase === "pergunta" || fase === "ranking"));
  novo.prazo = semRelogio ? null : agora + TEMPO[fase];
  return novo;
};

export function pergunta(qid) {
  const [tema, i] = String(qid || "").split("-");
  return PERGUNTAS[tema] && PERGUNTAS[tema][+i];
}

// jogadores: [{id, n, a}]. local: true no modo de um celular só (sem relógio no voto e na pergunta).
export function novaPartida(jogadores, agora, { rodadas = RODADAS_PADRAO, local = false, temas = null } = {}) {
  const pontos = {}, tempo = {}, ajudas = {};
  jogadores.forEach((p) => { pontos[p.id] = 0; tempo[p.id] = 0; ajudas[p.id] = []; });
  const lista = temasValidos(temas);
  return mudar({
    gid: Math.random().toString(36).slice(2, 8), seq: 0, local, rodada: 1,
    rodadas: RODADAS_OPCOES.includes(rodadas) ? rodadas : RODADAS_PADRAO, temas: lista,
    jogadores: jogadores.map((p) => ({ id: p.id, n: p.n, a: p.a })),
    pontos, tempo, ajudas, ultimo: {}, usados: [], opcoes: opcoesDeTema(lista, null), tema: null, contagem: {},
    votos: {}, respostas: {}, qid: null, ordem: null,
  }, "voto", null, agora);
}

// Quem precisa agir nesta fase (no online, só quem está conectado).
const ativos = (G, conectados) => G.jogadores.filter((p) => !conectados || conectados.has(p.id)).map((p) => p.id);
const joga = (G, id) => G.jogadores.some((p) => p.id === id);

export function votar(G, id, tema, agora) {
  if (!G || G.fase !== "voto" || !G.opcoes.includes(tema) || !joga(G, id) || G.votos[id]) return G;
  return Object.assign({}, G, { votos: Object.assign({}, G.votos, { [id]: tema }) });
}

// ms: tempo de resposta. Online, o servidor mede (agora - inicio); no celular único, a tela mede a vez de cada um.
export function responder(G, id, c, agora, ms) {
  if (!G || G.fase !== "pergunta" || !joga(G, id) || G.respostas[id]) return G;
  if (!Number.isInteger(c) || c < -1 || c > 3) return G;
  const t = Math.max(0, Math.min(TEMPO.pergunta, Number.isFinite(ms) ? ms : agora - G.inicio));
  return Object.assign({}, G, { respostas: Object.assign({}, G.respostas, { [id]: { c, ms: t } }) });
}

// Cada ajuda vale uma vez por partida, por jogador, e só antes de responder.
export function usarAjuda(G, id, tipo) {
  if (!G || G.fase !== "pergunta" || !AJUDAS[tipo] || !joga(G, id) || G.respostas[id]) return G;
  const usadas = (G.ajudas && G.ajudas[id]) || [];
  if (usadas.some((u) => u.t === tipo)) return G;
  return Object.assign({}, G, { ajudas: Object.assign({}, G.ajudas, { [id]: usadas.concat({ t: tipo, seq: G.seq }) }) });
}

function fecharVoto(G, agora) {
  const contagem = {};
  G.opcoes.forEach((k) => (contagem[k] = 0));
  Object.values(G.votos).forEach((t) => { if (contagem[t] !== undefined) contagem[t]++; });
  const max = Math.max(...Object.values(contagem));
  const tema = embaralhar(G.opcoes.filter((k) => contagem[k] === max))[0];
  return mudar(G, "tema", { tema, contagem }, agora);
}

function sortearPergunta(G, agora) {
  const todas = PERGUNTAS[G.tema].map((_, i) => G.tema + "-" + i);
  let livres = todas.filter((id) => !G.usados.includes(id));
  if (!livres.length) livres = todas;
  const qid = embaralhar(livres)[0];
  return mudar(G, "pergunta", { qid, ordem: embaralhar([0, 1, 2, 3]), usados: G.usados.concat(qid), respostas: {} }, agora);
}

function fecharPergunta(G, agora) {
  const pontos = Object.assign({}, G.pontos), tempo = Object.assign({}, G.tempo), ultimo = {};
  const valor = valorDa(G);
  G.jogadores.forEach((p) => {
    const r = G.respostas[p.id];
    const certo = !!r && r.c === 0;
    const pts = certo ? valor : 0;
    pontos[p.id] = (pontos[p.id] || 0) + pts;
    tempo[p.id] = (tempo[p.id] || 0) + (r ? r.ms : TEMPO.pergunta);
    ultimo[p.id] = { c: r ? r.c : -1, pts, ms: r ? r.ms : null };
  });
  return mudar(G, "revela", { pontos, tempo, ultimo }, agora);
}

export function proxima(G, agora) {
  if (!G || G.fase !== "ranking") return G;
  if (G.rodada >= G.rodadas) return mudar(G, "fim", null, agora);
  return mudar(G, "voto", { rodada: G.rodada + 1, opcoes: opcoesDeTema(G.temas, G.tema), contagem: {}, votos: {}, respostas: {} }, agora);
}

// Avança quando o prazo acaba ou quando todo mundo (ativo) já agiu. Devolve o mesmo objeto se nada mudou.
export function avancar(G, agora, conectados) {
  if (!G) return G;
  const quem = ativos(G, conectados);
  const vencido = G.prazo != null && agora >= G.prazo;
  if (G.fase === "voto") {
    if (vencido || (quem.length && quem.every((id) => G.votos[id]))) return fecharVoto(G, agora);
  } else if (G.fase === "tema") {
    if (vencido) return sortearPergunta(G, agora);
  } else if (G.fase === "pergunta") {
    if (vencido || (quem.length && quem.every((id) => G.respostas[id]))) return fecharPergunta(G, agora);
  } else if (G.fase === "revela") {
    if (vencido) return mudar(G, "ranking", null, agora);
  } else if (G.fase === "ranking") {
    if (vencido) return proxima(G, agora);
  }
  return G;
}

// Ranking: mais dinheiro na frente; no empate, quem respondeu mais rápido no total.
export function ordenar(G) {
  return G.jogadores.slice().sort((a, b) => (G.pontos[b.id] || 0) - (G.pontos[a.id] || 0) || (G.tempo[a.id] || 0) - (G.tempo[b.id] || 0));
}
// Posição com empate de verdade (mesmo dinheiro e mesmo tempo).
export function posicoes(G) {
  const ord = ordenar(G), pos = {};
  ord.forEach((p, i) => {
    const ant = ord[i - 1];
    pos[p.id] = ant && G.pontos[ant.id] === G.pontos[p.id] && G.tempo[ant.id] === G.tempo[p.id] ? pos[ant.id] : i + 1;
  });
  return { ord, pos };
}

// Entrada de jogador no meio da partida (online): começa com zero.
export function incluir(G, p) {
  if (!G || joga(G, p.id) || G.jogadores.length >= MAX_JOGADORES || G.fase === "fim") return G;
  return Object.assign({}, G, {
    jogadores: G.jogadores.concat({ id: p.id, n: p.n, a: p.a }),
    pontos: Object.assign({}, G.pontos, { [p.id]: 0 }),
    tempo: Object.assign({}, G.tempo, { [p.id]: TEMPO.pergunta * Math.max(0, G.rodada - 1) }),
    ajudas: Object.assign({}, G.ajudas, { [p.id]: [] }),
  });
}

// O que os celulares podem ver: durante o voto e a pergunta, só QUEM já agiu, nunca o quê.
export function publico(G) {
  if (!G) return null;
  const v = Object.assign({}, G);
  v.feito = Object.keys(G.fase === "voto" ? G.votos : G.fase === "pergunta" ? G.respostas : {});
  delete v.votos; delete v.respostas; delete v.usados;
  return v;
}
