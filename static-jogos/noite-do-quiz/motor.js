// Motor do Noite do Quiz: regras puras, sem tela e sem rede.
// O mesmo arquivo roda no navegador (modo "um celular só") e no servidor das salas
// (salas/src/index.js), então as regras e a pontuação nunca divergem entre os dois modos.
// Nenhuma função muda o estado recebido: todas devolvem um estado novo.
import { TEMAS, PERGUNTAS } from "./perguntas.js";

export const MAX_JOGADORES = 10;
export const RODADAS_OPCOES = [10, 15, 20];
export const RODADAS_PADRAO = 15;
export const TEMPO = { voto: 20000, tema: 3000, pergunta: 20000, revela: 5000, ranking: 9000 };
export const AVATARES = [["🧛", "Vampiro"], ["🧟", "Zumbi"], ["🧙‍♀️", "Bruxa"], ["👻", "Fantasma"], ["💀", "Caveira"], ["🎃", "Abóbora"], ["🤡", "Palhaço"], ["🐺", "Lobisomem"], ["🕷️", "Aranha"], ["🦇", "Morcego"], ["👹", "Demônio"], ["👽", "Alien"]];
export { TEMAS, PERGUNTAS };

const embaralhar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const opcoesDeTema = (excluir) => embaralhar(Object.keys(TEMAS).filter((k) => k !== excluir)).slice(0, 3);
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
export function novaPartida(jogadores, agora, { rodadas = RODADAS_PADRAO, local = false } = {}) {
  const pontos = {};
  jogadores.forEach((p) => (pontos[p.id] = 0));
  return mudar({
    gid: Math.random().toString(36).slice(2, 8), seq: 0, local, rodadas, rodada: 1,
    jogadores: jogadores.map((p) => ({ id: p.id, n: p.n, a: p.a })),
    pontos, ultimo: {}, usados: [], opcoes: opcoesDeTema(null), tema: null, contagem: {},
    votos: {}, respostas: {}, qid: null, ordem: null,
  }, "voto", null, agora);
}

// Quem precisa agir nesta fase (no online, só quem está conectado).
const ativos = (G, conectados) => G.jogadores.filter((p) => !conectados || conectados.has(p.id)).map((p) => p.id);

export function votar(G, id, tema, agora) {
  if (!G || G.fase !== "voto" || !G.opcoes.includes(tema) || !G.jogadores.some((p) => p.id === id) || G.votos[id]) return G;
  return Object.assign({}, G, { votos: Object.assign({}, G.votos, { [id]: tema }) });
}

// ms: tempo de resposta. Online, o servidor mede (agora - inicio); no celular único, a tela mede a vez de cada um.
export function responder(G, id, c, agora, ms) {
  if (!G || G.fase !== "pergunta" || !G.jogadores.some((p) => p.id === id) || G.respostas[id]) return G;
  if (!Number.isInteger(c) || c < -1 || c > 3) return G;
  const t = Math.max(0, Math.min(TEMPO.pergunta, Number.isFinite(ms) ? ms : agora - G.inicio));
  return Object.assign({}, G, { respostas: Object.assign({}, G.respostas, { [id]: { c, ms: t } }) });
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
  const pontos = Object.assign({}, G.pontos), ultimo = {};
  G.jogadores.forEach((p) => {
    const r = G.respostas[p.id];
    const certo = !!r && r.c === 0;
    const pts = certo ? 100 + Math.round(100 * (1 - r.ms / TEMPO.pergunta)) : 0;
    pontos[p.id] = (pontos[p.id] || 0) + pts;
    ultimo[p.id] = { c: r ? r.c : -1, pts };
  });
  return mudar(G, "revela", { pontos, ultimo }, agora);
}

export function proxima(G, agora) {
  if (!G || G.fase !== "ranking") return G;
  if (G.rodada >= G.rodadas) return mudar(G, "fim", null, agora);
  return mudar(G, "voto", { rodada: G.rodada + 1, opcoes: opcoesDeTema(G.tema), contagem: {}, votos: {}, respostas: {} }, agora);
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

// Entrada de jogador no meio da partida (online): começa com zero pontos.
export function incluir(G, p) {
  if (!G || G.jogadores.some((x) => x.id === p.id) || G.jogadores.length >= MAX_JOGADORES || G.fase === "fim") return G;
  return Object.assign({}, G, { jogadores: G.jogadores.concat({ id: p.id, n: p.n, a: p.a }), pontos: Object.assign({}, G.pontos, { [p.id]: 0 }) });
}

// O que os celulares podem ver: durante o voto e a pergunta, só QUEM já agiu, nunca o quê.
export function publico(G) {
  if (!G) return null;
  const v = Object.assign({}, G);
  v.feito = Object.keys(G.fase === "voto" ? G.votos : G.fase === "pergunta" ? G.respostas : {});
  delete v.votos; delete v.respostas; delete v.usados;
  return v;
}
