// Servidor das salas online dos jogos (salas.manoelhenrique.com).
// Um Worker da Cloudflare com um Durable Object por sala: cada código de 4 letras é uma
// sala, que guarda os jogadores e o estado da partida e é a única fonte de verdade
// (sorteia, marca o tempo e calcula os pontos). Os celulares só mandam ações.
// As regras vêm do mesmo arquivo usado pelo jogo no navegador.
import { DurableObject } from "cloudflare:workers";
import { novaPartida, votar, responder, proxima, avancar, incluir, publico, AVATARES, MAX_JOGADORES, RODADAS_OPCOES, RODADAS_PADRAO } from "../../static-jogos/noite-do-quiz/motor.js";

const ORIGENS = /^(https:\/\/([a-z0-9-]+\.)*manoelhenrique\.com|https:\/\/([a-z0-9-]+\.)*pages\.dev|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const CODIGO = /^[A-Z]{4}$/;
const SEM_USO_MS = 3 * 60 * 60 * 1000; // sala vazia por 3 h é apagada
const AVS = AVATARES.map((a) => a[0]);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/sala\/([A-Za-z]{4})$/);
    if (!m) return new Response("Salas dos jogos", { status: url.pathname === "/" ? 200 : 404 });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Use WebSocket", { status: 426 });
    const origem = req.headers.get("Origin") || "";
    if (!ORIGENS.test(origem)) return new Response("Origem não permitida", { status: 403 });
    const codigo = m[1].toUpperCase();
    return env.SALA.get(env.SALA.idFromName(codigo)).fetch(new Request(`https://sala/${codigo}`, req));
  },
};

const limpaNome = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16);

export class Sala extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.s = null;
    ctx.blockConcurrencyWhile(async () => { this.s = (await ctx.storage.get("s")) || null; });
  }

  // ---------- conexões ----------
  async fetch(req) {
    const codigo = new URL(req.url).pathname.slice(1);
    if (!CODIGO.test(codigo)) return new Response("Código inválido", { status: 400 });
    if (!this.s) this.s = { codigo, membros: {}, ordem: [], anfitriao: null, rodadas: RODADAS_PADRAO, G: null };
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment({ pid: null });
    return new Response(null, { status: 101, webSocket: cliente });
  }

  conectados() {
    const ids = new Set();
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a && a.pid) ids.add(a.pid); }
    return ids;
  }

  enviar(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch (e) {} }

  async salvarEEnviar() {
    const s = this.s, on = this.conectados();
    if (!s.anfitriao || !on.has(s.anfitriao)) s.anfitriao = s.ordem.find((id) => on.has(id)) || s.anfitriao;
    await this.ctx.storage.put("s", s);
    const prazo = s.G && s.G.prazo;
    await this.ctx.storage.setAlarm(prazo ? prazo + 50 : Date.now() + SEM_USO_MS);
    const msg = JSON.stringify({
      t: "estado", agora: Date.now(),
      sala: { codigo: s.codigo, anfitriao: s.anfitriao, rodadas: s.rodadas, membros: s.ordem.map((id) => ({ id, n: s.membros[id].n, a: s.membros[id].a, on: on.has(id) })) },
      g: publico(s.G),
    });
    for (const ws of this.ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a && a.pid) try { ws.send(msg); } catch (e) {} }
  }

  avancarTudo() {
    const s = this.s; if (!s.G) return;
    const on = this.conectados();
    for (let i = 0; i < 6; i++) { const n = avancar(s.G, Date.now(), on); if (n === s.G) break; s.G = n; }
  }

  async alarm() {
    if (!this.s) return;
    if (this.ctx.getWebSockets().length === 0 && (!this.s.G || !this.s.G.prazo)) { await this.ctx.storage.deleteAll(); this.s = null; return; }
    this.avancarTudo();
    await this.salvarEEnviar();
  }

  async webSocketMessage(ws, texto) {
    let m; try { m = JSON.parse(texto); } catch (e) { return; }
    if (!m || typeof m.t !== "string") return;
    if (m.t === "ping") return this.enviar(ws, { t: "pong", agora: Date.now() });
    const s = this.s, att = ws.deserializeAttachment() || {};
    const agora = Date.now();

    if (m.t === "entrar") {
      const pid = String(m.pid || "").slice(0, 24), n = limpaNome(m.n);
      if (!/^[a-z0-9]{6,24}$/.test(pid) || !n) return this.enviar(ws, { t: "erro", e: "dados" });
      const on = this.conectados(); on.delete(pid);
      if (m.criar && on.size && !s.membros[pid]) return this.enviar(ws, { t: "erro", e: "ocupada" });
      if (!m.criar && !s.ordem.length) return this.enviar(ws, { t: "erro", e: "inexistente" });
      const ja = !!s.membros[pid];
      if (!ja && s.ordem.length >= MAX_JOGADORES) {
        // abre espaço tirando quem saiu do saguão
        const fora = s.ordem.find((id) => !on.has(id) && !(s.G && s.G.jogadores.some((p) => p.id === id)));
        if (!fora) return this.enviar(ws, { t: "erro", e: "cheia" });
        delete s.membros[fora]; s.ordem = s.ordem.filter((id) => id !== fora);
      }
      let a = AVS.includes(m.a) ? m.a : AVS[0];
      const usados = s.ordem.filter((id) => id !== pid).map((id) => s.membros[id].a);
      if (usados.includes(a)) a = AVS.find((x) => !usados.includes(x)) || a;
      // a mesma pessoa em outra aba ou depois de reconectar: fecha a conexão antiga
      for (const outro of this.ctx.getWebSockets()) { const oa = outro.deserializeAttachment(); if (outro !== ws && oa && oa.pid === pid) { outro.serializeAttachment({ pid: null }); try { outro.close(4000, "substituida"); } catch (e) {} } }
      s.membros[pid] = { n, a };
      if (!ja) s.ordem.push(pid);
      ws.serializeAttachment({ pid });
      if (s.G && s.G.fase !== "fim" && !s.G.jogadores.some((p) => p.id === pid)) s.G = incluir(s.G, { id: pid, n, a });
      if (!s.anfitriao || !on.has(s.anfitriao)) s.anfitriao = pid;
      this.enviar(ws, { t: "ok", pid, a });
      this.avancarTudo();
      return this.salvarEEnviar();
    }

    const pid = att.pid;
    if (!pid || !s.membros[pid]) return this.enviar(ws, { t: "erro", e: "fora" });
    const host = pid === s.anfitriao;
    const saguao = !s.G || s.G.fase === "fim";

    if (m.t === "perfil" && saguao) {
      const n = limpaNome(m.n); if (n) s.membros[pid].n = n;
      const outros = s.ordem.filter((id) => id !== pid).map((id) => s.membros[id].a);
      if (AVS.includes(m.a) && !outros.includes(m.a)) s.membros[pid].a = m.a;
    } else if (m.t === "rodadas" && host && saguao && RODADAS_OPCOES.includes(m.r)) {
      s.rodadas = m.r;
    } else if ((m.t === "comecar" || m.t === "denovo") && host && saguao) {
      const on = this.conectados();
      const js = s.ordem.filter((id) => on.has(id)).map((id) => ({ id, n: s.membros[id].n, a: s.membros[id].a }));
      if (js.length < 2) return this.enviar(ws, { t: "erro", e: "poucos" });
      s.G = novaPartida(js, agora, { rodadas: s.rodadas });
    } else if (m.t === "saguao" && host && s.G && s.G.fase === "fim") {
      s.G = null;
    } else if (m.t === "votar" && s.G) {
      s.G = votar(s.G, pid, String(m.tema), agora);
    } else if (m.t === "responder" && s.G) {
      s.G = responder(s.G, pid, Number(m.c), agora);
    } else if (m.t === "proxima" && host && s.G) {
      s.G = proxima(s.G, agora);
    } else if (m.t === "sair") {
      ws.serializeAttachment({ pid: null });
      if (saguao) { delete s.membros[pid]; s.ordem = s.ordem.filter((id) => id !== pid); }
      try { ws.close(1000, "saiu"); } catch (e) {}
    } else return;
    this.avancarTudo();
    return this.salvarEEnviar();
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    ws.serializeAttachment({ pid: null });
    if (!this.s || !a || !a.pid) return;
    this.avancarTudo(); // quem caiu não segura mais a rodada
    await this.salvarEEnviar();
  }

  async webSocketError(ws) { return this.webSocketClose(ws); }
}
