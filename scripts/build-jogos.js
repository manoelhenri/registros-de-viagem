// Jogos, redirecionamentos e cabeçalhos dos três sites.
//
// Três jeitos de rodar (ver sites.json e AGENTS.md, seção Domínios):
// - dentro do build do blog, com "separado": false (como sempre foi): copia static-jogos/
//   para _site/jogos e gera _redirects e _headers do domínio antigo;
// - dentro do build do blog, com "separado": true: o blog não leva mais os jogos; gera os
//   redirecionamentos do endereço antigo (/jogos e /receitas) para os subdomínios e a
//   despedida do service worker do Quem é mais?;
// - sozinho (`node scripts/build-jogos.js --sozinho`): o site jogos.manoelhenrique.com,
//   com os jogos na raiz.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const sites = JSON.parse(fs.readFileSync(path.join(root, "sites.json"), "utf8"));
const receitasRedir = JSON.parse(fs.readFileSync(path.join(root, "static-receitas", "redirecionamentos.json"), "utf8")).redirecionamentos;
const semBarra = (u) => String(u).replace(/\/$/, "");

const SW_NO_CACHE = (p) => [`${p}quem-e-mais/sw.js`, "  Cache-Control: no-cache", `${p}quem-e-mais/index.html`, "  Cache-Control: no-cache"];

// Copia os jogos trocando o endereço antigo escrito nas páginas (prévias de compartilhamento
// e política de privacidade) pelo endereço onde eles vão ficar.
function copiarJogos(destino, enderecoNovo) {
  fs.cpSync(path.join(root, "static-jogos"), destino, { recursive: true });
  if (!enderecoNovo) return;
  const antigo = semBarra(sites.antigo) + "/jogos/";
  const textoAntigo = semBarra(sites.antigo).replace(/^https:\/\//, "") + "/jogos";
  const textoNovo = semBarra(enderecoNovo).replace(/^https:\/\//, "");
  const trocar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) return trocar(f);
    if (!/\.(html|webmanifest)$/.test(e.name)) return;
    const s = fs.readFileSync(f, "utf8");
    const n = s.split(antigo).join(semBarra(enderecoNovo) + "/").split(textoAntigo).join(textoNovo);
    if (n !== s) fs.writeFileSync(f, n);
  });
  trocar(destino);
}

function copiarRaiz(out) {
  // Arquivos da raiz do domínio (ex.: .well-known/assetlinks.json, para vincular o app Android).
  const rootDir = path.join(root, "static-root");
  if (fs.existsSync(rootDir)) fs.cpSync(rootDir, out, { recursive: true });
}

// ---------- build do blog ----------
function noBlog() {
  const out = path.join(root, "_site");
  const linhas = [];
  const headers = [];
  if (!sites.separado) {
    // Como sempre foi: blog, jogos e receitas no mesmo domínio.
    copiarJogos(path.join(out, "jogos"));
    linhas.push(
      "# Endereço antigo do Quem é mais? -> novo endereço dentro de /jogos",
      "/quem-e-mais /jogos/quem-e-mais/ 301",
      "/quem-e-mais/* /jogos/quem-e-mais/:splat 301",
      "# Receitas que mudaram de endereço ou saíram do catálogo (static-receitas/redirecionamentos.json)",
      ...receitasRedir.flatMap(({ de, para }) => [`/receitas/${de} /receitas/${para ? para + "/" : ""} 301`, `/receitas/${de}/ /receitas/${para ? para + "/" : ""} 301`]),
    );
    headers.push(...SW_NO_CACHE("/jogos/"));
  } else {
    // Três sites: o domínio do blog só redireciona os endereços antigos de jogos e receitas.
    const J = semBarra(sites.jogos), R = semBarra(sites.receitas);
    // Quem instalou o Quem é mais? no endereço antigo abre a cópia guardada no celular.
    // Se o sw.js fosse redirecionado, essa cópia nunca mais atualizaria; por isso ele
    // continua respondendo aqui, numa versão que apaga a cópia e recarrega a página
    // (que então é redirecionada para o subdomínio).
    fs.mkdirSync(path.join(out, "legado"), { recursive: true });
    fs.writeFileSync(path.join(out, "legado", "quem-e-mais-sw.js"), `// Despedida do endereço antigo (${semBarra(sites.antigo)}/jogos/quem-e-mais/).
// Apaga a cópia do jogo guardada no celular, se desinstala e recarrega a página, que é
// redirecionada para ${J}/quem-e-mais/.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach((c) => { try { c.navigate(c.url); } catch (err) {} });
  })());
});
`);
    linhas.push(
      "# Despedida do service worker antigo do Quem é mais? (precisa vir antes dos redirecionamentos de /jogos)",
      "/jogos/quem-e-mais/sw.js /legado/quem-e-mais-sw.js 200",
      "# Jogos e receitas mudaram para subdomínios próprios",
      `/quem-e-mais ${J}/quem-e-mais/ 301`,
      `/quem-e-mais/* ${J}/quem-e-mais/:splat 301`,
      `/jogos ${J}/ 301`,
      `/jogos/* ${J}/:splat 301`,
      ...receitasRedir.flatMap(({ de, para }) => [`/receitas/${de} ${R}/${para ? para + "/" : ""} 301`, `/receitas/${de}/ ${R}/${para ? para + "/" : ""} 301`]),
      `/receitas ${R}/ 301`,
      `/receitas/* ${R}/:splat 301`,
    );
    headers.push("/legado/quem-e-mais-sw.js", "  Cache-Control: no-cache", "/jogos/quem-e-mais/sw.js", "  Cache-Control: no-cache");
  }
  fs.writeFileSync(path.join(out, "_redirects"), linhas.join("\n") + "\n");
  fs.writeFileSync(path.join(out, "_headers"), headers.join("\n") + "\n");
  copiarRaiz(out);
  console.log(sites.separado ? "[jogos] blog sem jogos: _redirects para os subdomínios + despedida do sw" : "[jogos] copiado para _site/jogos + _redirects");
}

// ---------- site próprio: jogos.manoelhenrique.com ----------
function sozinho(out) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  copiarJogos(out, sites.jogos);
  // O service worker é outro endereço; a versão do cache sobe para garantir arquivos novos.
  const swf = path.join(out, "quem-e-mais", "sw.js");
  fs.writeFileSync(swf, fs.readFileSync(swf, "utf8").replace(/const CACHE='quem-e-mais-v(\d+)';/, (m, n) => `const CACHE='quem-e-mais-v${Number(n) + 1}';`));
  fs.writeFileSync(path.join(out, "_redirects"), ["# Quem digitar o caminho antigo dentro do subdomínio", "/jogos / 301", "/jogos/* /:splat 301", "# Noite do Quiz virou Valendo! (nov/2026)", "/noite-do-quiz /valendo/ 301", "/noite-do-quiz/* /valendo/ 301", ""].join("\n"));
  const headers = [...SW_NO_CACHE("/")];
  // Antes da virada este site existe só para teste: fora do Google.
  if (!sites.separado) headers.push("/*", "  X-Robots-Tag: noindex");
  fs.writeFileSync(path.join(out, "_headers"), headers.join("\n") + "\n");
  fs.writeFileSync(path.join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
  copiarRaiz(out);
  console.log(`[jogos] site próprio gerado em ${path.relative(root, out) || "."} (${sites.jogos}${sites.separado ? "" : ", noindex até a virada"})`);
}

if (require.main === module) {
  const arg = process.argv.find((a) => a.startsWith("--saida="));
  if (process.argv.includes("--sozinho")) sozinho(path.resolve(root, arg ? arg.slice(8) : "_site"));
  else noBlog();
} else {
  module.exports = { noBlog, sozinho, sites };
}
