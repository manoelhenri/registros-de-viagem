// Copia a área /jogos (app estático, fora do Eleventy) para o site publicado
// e cria as regras de redirecionamento do Cloudflare Pages.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "_site");
fs.cpSync(path.join(root, "static-jogos"), path.join(out, "jogos"), { recursive: true });
const redirects = [
  "# Endereço antigo do Quem é mais? -> novo endereço dentro de /jogos",
  "/quem-e-mais /jogos/quem-e-mais/ 301",
  "/quem-e-mais/* /jogos/quem-e-mais/:splat 301",
  "",
].join("\n");
fs.writeFileSync(path.join(out, "_redirects"), redirects);
// O service worker nunca fica em cache do navegador: assim as atualizações do jogo chegam na hora.
const headers = [
  "/jogos/quem-e-mais/sw.js",
  "  Cache-Control: no-cache",
  "/jogos/quem-e-mais/index.html",
  "  Cache-Control: no-cache",
  "",
].join("\n");
fs.writeFileSync(path.join(out, "_headers"), headers);
console.log("[jogos] copiado para _site/jogos + _redirects");
