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
  "# Receitas que mudaram de endereço ou saíram do catálogo (revisão com os manuais, nov/2026)",
  "/receitas/pao-rapido-de-queijo /receitas/pao-de-parmesao/ 301",
  "/receitas/pao-rapido-de-queijo/ /receitas/pao-de-parmesao/ 301",
  "/receitas/integral-com-mel /receitas/pao-integral/ 301",
  "/receitas/integral-com-mel/ /receitas/pao-integral/ 301",
  "/receitas/brioche-amanteigado /receitas/pao-brioche/ 301",
  "/receitas/brioche-amanteigado/ /receitas/pao-brioche/ 301",
  "/receitas/rosca-de-coco /receitas/pao-de-coco/ 301",
  "/receitas/rosca-de-coco/ /receitas/pao-de-coco/ 301",
  "/receitas/geleia-de-abacaxi-com-pimenta /receitas/geleia-de-abacaxi/ 301",
  "/receitas/geleia-de-abacaxi-com-pimenta/ /receitas/geleia-de-abacaxi/ 301",
  "/receitas/multigraos-com-sementes /receitas/pao-multigraos-de-linhaca-e-chia/ 301",
  "/receitas/multigraos-com-sementes/ /receitas/pao-multigraos-de-linhaca-e-chia/ 301",
  "/receitas/arroz-doce-cremoso /receitas/ 301",
  "/receitas/arroz-doce-cremoso/ /receitas/ 301",
  "/receitas/canjica-cremosa /receitas/ 301",
  "/receitas/canjica-cremosa/ /receitas/ 301",
  "/receitas/nhoque-de-batata /receitas/ 301",
  "/receitas/nhoque-de-batata/ /receitas/ 301",
  "/receitas/goiabada-cremosa /receitas/ 301",
  "/receitas/goiabada-cremosa/ /receitas/ 301",
  "/receitas/doce-de-banana /receitas/ 301",
  "/receitas/doce-de-banana/ /receitas/ 301",
  "/receitas/geleia-de-frutas-vermelhas /receitas/ 301",
  "/receitas/geleia-de-frutas-vermelhas/ /receitas/ 301",
  "",
].join("\n");
fs.writeFileSync(path.join(out, "_redirects"), redirects);
// Arquivos da raiz do domínio (ex.: .well-known/assetlinks.json, usado para vincular o app Android ao site).
const rootDir = path.join(root, "static-root");
if (fs.existsSync(rootDir)) fs.cpSync(rootDir, out, { recursive: true });
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
