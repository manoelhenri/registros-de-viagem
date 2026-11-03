// Gera a área /receitas ("Pães do Manoel") a partir de static-receitas/receitas.json.
// É um produto à parte do blog: HTML próprio, sem templates, CSS, dados ou analytics do blog,
// e sem nenhum link entre os dois. Roda no fim do build (eleventy.after), depois dos jogos.
// Sem dependências: só módulos do Node.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "static-receitas");
const out = path.join(root, "_site", "receitas");
const BASE = "/receitas/";

const esc = (t) => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// JSON dentro de <script>: impede que "</script>" ou "<!--" no texto feche a tag.
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const norm = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ICO = {
  prog: '<rect x="3" y="4" width="18" height="16" rx="3"/><rect x="7" y="8" width="10" height="5" rx="1"/><circle cx="9" cy="16.5" r="1"/><circle cx="15" cy="16.5" r="1"/>',
  casca: '<path d="M4 15 Q4 6 12 6 Q20 6 20 15 L20 19 L4 19 Z"/><path d="M8 11 Q10 9 12 11 M13 10 Q15 8 17 10"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9 L12 13 L15 15 M10 2 L14 2"/>',
  nivel: '<path d="M5 20 L5 14 M12 20 L12 9 M19 20 L19 4"/>',
  rende: '<path d="M3 13 Q12 22 21 13 Z M7 9 Q8 6 7 3 M12 9 Q13 6 12 3 M17 9 Q18 6 17 3"/>',
  pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M12 11v6M9 14l3 3 3-3"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
};
const ico = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n]}</svg>`;
const chip = (n, label, valor) => `<span class="chip">${ico(n)}<small>${esc(label)}</small><b>${esc(valor)}</b></span>`;

function head({ title, description, url, image, extra = "" }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#C8402B">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pães do Manoel">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="${BASE}assets/art/loaf.svg">
<link rel="preload" href="${BASE}assets/fonts/fraunces-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${BASE}assets/receitas.css">
${extra}
</head>`;
}

const foot = `<footer class="foot"><div class="wrap"><b>Pães do Manoel</b>Receitas para a Panificadora Gallant de 19 programas</div></footer>
<script src="${BASE}assets/receitas.js" defer></script>
</body>
</html>`;

function build() {
  const dados = JSON.parse(fs.readFileSync(path.join(src, "receitas.json"), "utf8"));
  const site = JSON.parse(fs.readFileSync(path.join(root, "_data", "site.json"), "utf8"));
  const origem = String(site.url).replace(/\/$/, "");
  const abs = (p) => origem + p;

  const caps = Object.fromEntries(dados.capitulos.map((c) => [c.id, c]));
  const vols = Object.fromEntries(dados.volumes.map((v) => [v.numero, v]));
  const rec = dados.receitas;

  // validações: erro aqui não derruba o blog (o gancho no .eleventy.js segura), só a área de receitas
  const slugs = new Set();
  rec.forEach((r) => {
    if (!/^[a-z0-9-]+$/.test(r.slug)) throw new Error(`slug inválido: ${r.slug}`);
    if (slugs.has(r.slug)) throw new Error(`slug repetido: ${r.slug}`);
    if (!caps[r.capitulo]) throw new Error(`capítulo desconhecido em ${r.slug}: ${r.capitulo}`);
    slugs.add(r.slug);
  });

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(path.join(src, "assets"), path.join(out, "assets"), { recursive: true });

  const programas = (r) => r.programa.split("→").map((p) => p.trim());
  const urlReceita = (r) => `${BASE}${r.slug}/`;
  const imgs = (c) => ["1x1", "4x3", "16x9"].map((k) => abs(`${BASE}assets/img/${c.id}-${k}.jpg`));
  // foto própria da receita (campo opcional "imagens": caminhos dentro de assets/img/) vence a ilustração do capítulo
  const imgsReceita = (r, c) => (Array.isArray(r.imagens) && r.imagens.length ? r.imagens.map((p) => abs(`${BASE}assets/img/${p}`)) : imgs(c));
  const descricao = (r) => r.colunas.length === 3
    ? `${r.titulo} para a Panificadora Gallant de 19 programas, no programa ${r.programa}, com quantidades para pães de 500 g, 750 g e 1000 g.`
    : `${r.titulo} feito na Panificadora Gallant de 19 programas, no programa ${r.programa}. Ingredientes, modo de preparo e dica.`;

  // ---------- páginas das receitas ----------
  rec.forEach((r, idx) => {
    const c = caps[r.capitulo];
    const v = vols[r.volume];
    const tres = r.colunas.length === 3;
    const mid = tres ? 1 : 0;

    const linhas = r.tabelas.map(([rotulo, itens], i) => {
      const sub = r.tabelas.length > 1 ? `<tr class="sub"><td colspan="${r.colunas.length + 1}">${esc(rotulo)}</td></tr>` : "";
      return sub + itens.map((it) =>
        `<tr><td>${esc(it[0])}</td>${it.slice(1).map((q, j) => `<td class="q${j === mid ? " on" : ""}" data-col="${j}">${esc(q)}</td>`).join("")}</tr>`).join("");
    }).join("");
    const cab = r.tabelas.length > 1 ? "Ingrediente" : r.tabelas[0][0];
    const tabela = `<table class="ing"><thead><tr><th scope="col">${esc(cab)}</th>${r.colunas.map((h, j) => `<th scope="col" class="q${j === mid ? " on" : ""}" data-col="${j}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table>`;
    const tamanhos = tres ? `<div class="sizes" role="group" aria-label="Tamanho do pão">${r.colunas.map((h, j) =>
      `<button type="button" data-col="${j}" aria-pressed="${j === mid ? "true" : "false"}">${esc(h)}</button>`).join("")}</div>
<p class="sizes-hint">Escolha no painel da máquina o mesmo tamanho.</p>` : "";

    const chips = [chip("prog", "Programa", r.programa)];
    if (r.casca) chips.push(chip("casca", "Casca", r.casca));
    chips.push(chip("timer", "Timer", r.timer ? "Sim" : "Não"));
    if (r.rende) chips.push(chip("rende", "Rende", r.rende));
    chips.push(chip("nivel", "Nível", r.nivel));

    const doVol = rec.filter((x) => x.volume === r.volume);
    const pos = doVol.indexOf(r);
    const ant = doVol[pos - 1], prox = doVol[pos + 1];

    // quantidades do JSON-LD: tamanho do meio (750 g) quando há três colunas
    const ingLd = r.tabelas.flatMap(([, itens]) => itens.map((it) => `${it[0]}: ${it[1 + mid]}`));
    const ld = {
      "@context": "https://schema.org", "@type": "Recipe",
      name: r.titulo, description: descricao(r), image: imgsReceita(r, c),
      author: { "@type": "Person", name: site.author },
      recipeCategory: c.nome, recipeCuisine: "Brasileira",
      keywords: ["panificadora", "máquina de pão", "Gallant", r.programa, c.nome].join(", "),
      recipeYield: r.rende || (tres ? "1 pão de 750 g" : "1 forma"),
      recipeIngredient: ingLd,
      recipeInstructions: r.passos.map((p, i) => ({ "@type": "HowToStep", position: i + 1, text: p })),
      isPartOf: { "@type": "Book", name: `Pães do Manoel, ${v.titulo}` },
    };
    const crumbs = {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Receitas", item: abs(BASE) },
        { "@type": "ListItem", position: 2, name: r.titulo, item: abs(urlReceita(r)) }],
    };

    const html = `${head({
      title: `${r.titulo} na panificadora | Pães do Manoel`, description: descricao(r), url: abs(urlReceita(r)), image: imgsReceita(r, c).slice(-1)[0],
      extra: `<script type="application/ld+json">${jsonLd(ld)}</script>\n<script type="application/ld+json">${jsonLd(crumbs)}</script>`,
    })}
<body style="--c:${esc(c.cor)};--soft:${esc(c.corSuave)}">
<a class="skip" href="#conteudo">Pular para a receita</a>
<header class="band dots"><div class="wrap">
<nav class="crumbs" aria-label="Você está em"><a href="${BASE}">Receitas</a><span aria-hidden="true">›</span><span>Volume ${r.volume}</span><span aria-hidden="true">›</span><span>${esc(c.nome)}</span></nav>
<h1>${esc(r.titulo)}</h1>
<div class="num" aria-hidden="true">${String(r.numero).padStart(2, "0")}</div>
</div></header>
<main id="conteudo" class="wrap">
<div class="chips">${chips.join("")}</div>
<div class="recipe">
<section class="card" aria-labelledby="h-ing">
<h2 id="h-ing">Ingredientes</h2>
${tamanhos}
<div data-sel="${mid}">${tabela}</div>
</section>
<div>
<section class="card" aria-labelledby="h-modo">
<h2 id="h-modo">Modo de preparo</h2>
<ol class="steps">${r.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
</section>
<aside class="note" aria-label="Dica"><div class="h">Dica de ouro</div><p>${esc(r.dica)}</p></aside>
<div class="art"><img src="${BASE}assets/art/${esc(c.icone)}.svg" alt="" width="150" height="120" loading="lazy"></div>
<a class="pdf" href="${BASE}${esc(v.pdf)}" download>
<span class="ic">${ico("pdf")}</span><span><b>Baixar o ${esc(v.titulo)} em PDF</b><span>Livro completo, pronto para imprimir</span></span></a>
</div>
</div>
<nav class="pager" aria-label="Outras receitas">${ant ? `<a class="prev" href="${urlReceita(ant)}"><small>‹ Anterior</small><b>${esc(ant.titulo)}</b></a>` : ""}${prox ? `<a class="next" href="${urlReceita(prox)}"><small>Próxima ›</small><b>${esc(prox.titulo)}</b></a>` : ""}</nav>
</main>
${foot}`;
    fs.mkdirSync(path.join(out, r.slug), { recursive: true });
    fs.writeFileSync(path.join(out, r.slug, "index.html"), html);
  });

  // ---------- página inicial ----------
  const listaProg = [...new Set(rec.flatMap(programas))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const secoes = dados.capitulos.map((c) => {
    const rs = rec.filter((r) => r.capitulo === c.id);
    if (!rs.length) return "";
    const cards = rs.map((r) => {
      const busca = norm([r.titulo, c.nome, r.programa, ...r.tabelas.flatMap(([, it]) => it.map((x) => x[0]))].join(" "));
      return `<a class="rcard" href="${urlReceita(r)}" style="--c:${esc(c.cor)}" data-vol="${r.volume}" data-cap="${esc(c.id)}" data-prog="${esc(programas(r).join("|"))}" data-busca="${esc(busca)}">
<div class="top"><span class="n" aria-hidden="true">${String(r.numero).padStart(2, "0")}</span><h3>${esc(r.titulo)}</h3></div>
<div class="meta"><span><b>${esc(r.programa)}</b></span><span>${r.timer ? "Timer: sim" : "Timer: não"}</span><span>${esc(r.nivel)}</span></div></a>`;
    }).join("");
    return `<section class="chapter" style="--c:${esc(c.cor)}" aria-labelledby="cap-${esc(c.id)}">
<div class="chapter-h"><span class="n">V${c.volume}</span><h2 id="cap-${esc(c.id)}">${esc(c.nome)}</h2><small>${rs.length} receitas</small></div>
<div class="grid">${cards}</div></section>`;
  }).join("");

  const livros = dados.volumes.map((v) => `<a class="pdf" href="${BASE}${esc(v.pdf)}" download style="--c:#C8402B;--soft:#F7DCD3;margin:0">
<span class="ic">${ico("pdf")}</span><span><b>${esc(v.titulo)}</b><span>${rec.filter((r) => r.volume === v.numero).length} receitas em PDF, pronto para imprimir</span></span></a>`).join("");

  const itemList = {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: rec.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: abs(urlReceita(r)) })),
  };
  const descIndex = `${rec.length} receitas de pães, bolos, doces e geleias para a Panificadora Gallant de 19 programas, com quantidades para pães de 500 g, 750 g e 1000 g.`;
  const index = `${head({
    title: "Pães do Manoel | Receitas para panificadora Gallant", description: descIndex, url: abs(BASE),
    image: abs(`${BASE}assets/img/og-receitas.jpg`), extra: `<script type="application/ld+json">${jsonLd(itemList)}</script>`,
  })}
<body>
<a class="skip" href="#lista">Pular para as receitas</a>
<header class="band hero dots"><div class="wrap">
<div><div class="kick">Livro de receitas · ${rec.length} receitas</div><h1>Pães do Manoel</h1>
<p>Receitas feitas para a Panificadora Gallant de 19 programas, com o programa, a cor da casca e as quantidades para pães de 500 g, 750 g e 1000 g.</p></div>
<div class="plate"><img src="${BASE}assets/art/loaf.svg" alt="" width="220" height="170"></div>
</div></header>
<div class="filters"><div class="wrap">
<div class="filter-row">
<label class="search">${ico("busca")}<span class="sr">Buscar receita ou ingrediente</span><input id="busca" type="search" placeholder="Buscar receita ou ingrediente" autocomplete="off"></label>
<div class="seg" role="group" aria-label="Volume"><button type="button" data-vol="todos" aria-pressed="true">Todos</button>${dados.volumes.map((v) => `<button type="button" data-vol="${v.numero}" aria-pressed="false">Vol. ${v.numero}</button>`).join("")}</div>
<label><span class="sr">Capítulo</span><select id="f-capitulo"><option value="">Todos os capítulos</option>${dados.capitulos.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)} (vol. ${c.volume})</option>`).join("")}</select></label>
<label><span class="sr">Programa da máquina</span><select id="f-programa"><option value="">Todos os programas</option>${listaProg.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>
</div>
<p class="count" id="contador" aria-live="polite">${rec.length} receitas</p>
</div></div>
<main class="wrap" id="lista">
<div class="empty" id="vazio" hidden aria-live="polite"><p>Nenhuma receita encontrada com esses filtros.</p><button type="button" id="limpar">Limpar filtros</button></div>
${secoes}
<details class="guide"><summary>Antes de começar: a ordem que nunca falha</summary>
<ol><li>Tire a forma da máquina antes de colocar os ingredientes.</li><li>Encaixe a pá no eixo da forma.</li>
<li>Líquidos primeiro: água, leite, ovos, óleo, manteiga.</li><li>Depois sal, açúcar e as farinhas, cobrindo todo o líquido.</li>
<li>Fermento por último, numa covinha no topo da farinha.</li><li>Só use o timer nas receitas com "Timer: sim".</li></ol></details>
<section aria-labelledby="h-livros" style="margin-top:34px"><div class="chapter-h"><h2 id="h-livros">Os livros em PDF</h2></div><div class="books">${livros}</div></section>
</main>
${foot}`;
  fs.writeFileSync(path.join(out, "index.html"), index);

  // ---------- 404 só da área de receitas (o Cloudflare Pages usa o 404.html mais próximo) ----------
  fs.writeFileSync(path.join(out, "404.html"), `${head({
    title: "Receita não encontrada | Pães do Manoel", description: "Essa receita não existe ou mudou de endereço.", url: abs(BASE), image: abs(`${BASE}assets/img/og-receitas.jpg`),
    extra: '<meta name="robots" content="noindex">',
  })}
<body><header class="band hero dots"><div class="wrap"><div><div class="kick">Ops</div><h1>Receita não encontrada</h1>
<p>Esse endereço não existe ou mudou. Veja todas as receitas na página inicial.</p></div></div></header>
<main class="wrap"><p style="margin-top:30px"><a class="pdf" href="${BASE}" style="display:inline-flex"><span><b>Ver todas as receitas</b></span></a></p></main>
${foot}`);

  // ---------- sitemap próprio (não entra no sitemap nem no robots.txt do blog) ----------
  const urls = [BASE, ...rec.map(urlReceita)].map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join("\n");
  fs.writeFileSync(path.join(out, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  console.log(`[receitas] ${rec.length} receitas geradas em _site/receitas`);
}

module.exports = build;
if (require.main === module) build();
