// Gera a área /receitas ("Pães do Manoel") a partir de static-receitas/receitas.json.
// Produto à parte do blog: HTML próprio, sem templates, CSS, dados ou analytics do blog, e sem
// nenhum link entre os dois. Roda no fim do build (eleventy.after), depois dos jogos.
// Sem dependências: só módulos do Node.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "static-receitas");
const out = path.join(root, "_site", "receitas");
const BASE = "/receitas/";

const esc = (t) => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const norm = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const P = {
  prog: '<rect x="3" y="4" width="18" height="16" rx="3"/><rect x="7" y="8" width="10" height="5" rx="1"/><circle cx="9" cy="16.5" r="1"/><circle cx="15" cy="16.5" r="1"/>',
  casca: '<path d="M4 15 Q4 6 12 6 Q20 6 20 15 L20 19 L4 19 Z"/><path d="M8 11 Q10 9 12 11 M13 10 Q15 8 17 10"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9 L12 13 L15 15 M10 2 L14 2"/>',
  nivel: '<path d="M5 20 L5 14 M12 20 L12 9 M19 20 L19 4"/>',
  rende: '<path d="M3 13 Q12 22 21 13 Z M7 9 Q8 6 7 3 M12 9 Q13 6 12 3 M17 9 Q18 6 17 3"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/>',
  chef: '<path d="M7 18h10v3H7z"/><path d="M7 18c-3 0-4.5-2.5-4-5 .5-2.4 3-3.5 4.6-2.8C8 7.5 10 6 12 6s4 1.5 4.4 4.2c1.6-.7 4.1.4 4.6 2.8.5 2.5-1 5-4 5"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
};
const ico = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

const DESC_PROG = {
  "Macio": "Pão branco de miolo fofo, ciclo completo.",
  "Francês ou D'Água": "Sova e fermentação mais longas, casca firme.",
  "Pão Integral": "Começa com um descanso para a farinha integral hidratar.",
  "Pão Rápido": "Ciclo curto, para receitas com mais fermento.",
  "Brioche": "Para massas ricas em ovo, manteiga e açúcar.",
  "Sanduíche": "Miolo mais fechado, bom para fatiar fino.",
  "Sem Glúten": "Mistura curta, sem sova, e assa por mais tempo.",
  "Massa": "Só bate e deixa crescer, sem assar. Você modela depois.",
  "Massa Integral": "Igual ao Massa, para farinha integral.",
  "Massa de Pizza": "Sova curta, sem fermentação longa.",
  "Fermentar": "Só aquece de leve para a massa crescer.",
  "Assar": "Só assa, sem bater. Também serve para dar mais tempo de forno.",
  "Bolo": "Mistura suave e assa massas com fermento químico.",
  "Misturar e Assar": "Mistura rápido e assa, sem fermentar.",
  "Misturar": "Mistura curta, sem sova.",
  "Sovar": "Só sova, sem fermentar nem assar.",
  "Geleia": "Cozinha mexendo devagar.",
  "Mingau": "Cozinha mexendo devagar, com leite.",
};
const PROBLEMAS = [
  ["O pão cresceu e murchou no topo", "Fermento ou líquido demais, ou um dia muito quente. Na próxima vez, tire ¼ colher (chá) de fermento ou 10 ml de líquido. No verão, use água gelada."],
  ["Pão baixo e pesado", "Fermento velho, líquido quente demais ou sal encostado no fermento. Teste o fermento: 1 colher (chá) dele em meio copo de água morna, com 1 colher (chá) de açúcar, deve espumar em até 10 minutos. Use líquidos até 30 °C."],
  ["Farinha seca nos cantos da forma", "A massa ficou seca ou a pá não alcançou os cantos. Nos primeiros 5 minutos, raspe as laterais com espátula de silicone e junte 1 colher (sopa) de água se precisar."],
  ["A massa gruda nas paredes durante a sova", "Massa úmida demais, comum com batata, abóbora ou macaxeira. Junte 1 colher (sopa) de farinha por vez até formar uma bola que solta das paredes."],
  ["Casca escura demais", "Muito açúcar, ovo ou leite na massa. Nos pães doces, escolha sempre casca clara."],
  ["Miolo cru perto do recheio", "Recheio úmido ou rolo apertado demais. O recheio precisa estar cozido, frio e sem caldo. Se o pão sair pálido, rode mais um ciclo de Assar."],
  ["Buraco no fundo do pão", "É a marca da pá, normal em toda panificadora. Para evitar, tire a pá depois da última sova, antes da fermentação final."],
  ["O pão grudou na forma", "Desenformado frio ou antiaderente gasto. Desenforme logo que terminar e unte a forma nos pães doces e recheados."],
];

// Negrito nos ingredientes citados nos passos. Cada nome da lista gera variações curtas
// ("Fermento biológico seco" também acha "fermento"; "Leite morno" também acha "leite").
// O texto já vem escapado por esc(); os nomes só têm letras, espaços e hífen.
const DESCRITIVOS = new Set(["cozida", "cozido", "picada", "picado", "picados", "ralada", "ralado", "amassada", "espremida", "fatiada", "fatiado", "refogada", "refogado", "derretido", "derretida", "amolecida", "sem", "escorrido", "madura", "maduras", "bem", "desfiado", "granulada", "torrado", "moído", "esfarelada", "descongelada", "crua", "média", "nanica", "frescas", "cortada", "gelada", "morna", "morno", "seco", "fina", "miúdo", "padrão", "cremoso", "branca", "verde", "sêmola", "ou", "tipo"]);
const SO_COMPLETO = new Set(["raspas", "suco", "gotas", "casca", "polpa", "mix", "essência", "frutas", "folhas", "tomates", "molho"]);
function termos(nomes) {
  const t = new Set();
  nomes.forEach((nome) => {
    String(nome).toLowerCase().replace(/\(.*?\)/g, " ").split(/,|\+/).forEach((parte) => {
      const p = parte.trim().split(/\s+/).filter(Boolean);
      if (!p.length) return;
      const cab = [];
      for (const w of p) { if (DESCRITIVOS.has(w)) break; cab.push(w); }
      if (cab.length) t.add(cab.join(" "));
      if (cab.length >= 3 && cab[1] === "de") t.add(cab.slice(0, 3).join(" "));
      if (!SO_COMPLETO.has(p[0]) && (p[0].length >= 3)) t.add(p[0]);
    });
  });
  return [...t].filter((x) => x.length >= 3 && /^[\p{L} -]+$/u.test(x)).sort((a, b) => b.length - a.length);
}
function realce(textoEscapado, nomes) {
  const lista = termos(nomes);
  if (!lista.length) return textoEscapado;
  const alt = lista.map((x) => x.replace(/ /g, "\\s+")).join("|");
  const rx = new RegExp(`(?<![\\p{L}\\p{N}-])((?:${alt})(?:e?s)?)(?![\\p{L}-])`, "giu");
  return textoEscapado.replace(rx, "<strong>$1</strong>");
}

function build() {
  const dados = JSON.parse(fs.readFileSync(path.join(src, "receitas.json"), "utf8"));
  const site = JSON.parse(fs.readFileSync(path.join(root, "_data", "site.json"), "utf8"));
  const origem = String(site.url).replace(/\/$/, "");
  const abs = (p) => origem + p;
  const cats = Object.fromEntries(dados.categorias.map((c) => [c.id, c]));
  const rec = dados.receitas;

  // validações: erro aqui não derruba o blog (o gancho no .eleventy.js segura), só a área de receitas
  const vistos = new Set();
  rec.forEach((r) => {
    if (!/^[a-z0-9-]+$/.test(r.slug)) throw new Error(`slug inválido: ${r.slug}`);
    if (vistos.has(r.slug)) throw new Error(`slug repetido: ${r.slug}`);
    if (!cats[r.categoria]) throw new Error(`categoria desconhecida em ${r.slug}: ${r.categoria}`);
    vistos.add(r.slug);
  });

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(path.join(src, "assets"), path.join(out, "assets"), { recursive: true });

  const urlR = (r) => `${BASE}${r.slug}/`;
  const art = (n) => `${BASE}assets/art/${n}.svg`;
  const imgs = (r) => (Array.isArray(r.imagens) && r.imagens.length
    ? r.imagens.map((p) => abs(`${BASE}assets/img/${p}`))
    : ["1x1", "4x3", "16x9"].map((k) => abs(`${BASE}assets/img/${r.categoria}-${k}.jpg`)));
  const programas = (r) => r.programa.split("→").map((p) => p.trim());
  const todasTags = [...new Set(rec.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const comTimer = rec.filter((r) => r.timer);
  const ogPadrao = abs(`${BASE}assets/img/og-receitas.jpg`);

  const head = ({ title, description, url, image, extra = "", robots = "" }) => `<!doctype html>
<html lang="pt-BR" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FBF5EA">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots}<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pães do Manoel">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="${art("loaf")}">
<link rel="preload" href="${BASE}assets/fonts/fraunces-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${BASE}assets/receitas.css">
${extra}
</head>`;

  const topo = (atual) => `<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="top"><div class="wrap">
<a class="brand" href="${BASE}"><span class="mark"><img src="${art("loaf")}" alt="" width="28" height="22"></span><span>Pães do Manoel</span></a>
<nav class="nav" aria-label="Principal">
<a class="nav-rec" href="${BASE}#receitas"${atual === "receitas" ? ' aria-current="page"' : ""}>Receitas</a>
<a href="${BASE}guia/"${atual === "guia" ? ' aria-current="page"' : ""}><span class="long">Guia da máquina</span><span class="short">Guia</span></a>
<a href="${BASE}?salvas=1#receitas" class="needs-js" aria-label="Receitas salvas">${ico("heart")}<span class="long">Salvas</span><span class="badge" data-salvas-count></span></a>
</nav></div></header>`;

  const rodape = `<footer class="foot"><div class="wrap">
<div><b>Pães do Manoel</b><p>Receitas pensadas para panificadora: o programa certo, a cor da casca e as quantidades para pães de 500 g, 750 g e 1 kg.</p></div>
<div><div class="t">Navegue</div><a href="${BASE}#receitas">Todas as receitas</a><a href="${BASE}guia/">Guia da máquina</a><a href="${BASE}guia/#problemas">Deu errado? Resolva aqui</a></div>
<div><div class="t">Categorias</div>${dados.categorias.map((c) => `<a href="${BASE}?categoria=${esc(c.id)}#receitas">${esc(c.nome)}</a>`).join("")}</div>
</div></footer>
<script src="${BASE}assets/receitas.js" defer></script>
</body>
</html>`;

  const pills = (r) => [`<span class="pill">${esc(r.programa)}</span>`, r.timer ? `<span class="pill t">Timer da noite</span>` : "", `<span class="pill">${esc(r.nivel)}</span>`].join("");
  const cartao = (r) => {
    const c = cats[r.categoria];
    const busca = norm([r.titulo, c.nome, r.programa, r.resumo, ...r.tags, ...r.tabelas.flatMap(([, it]) => it.map((x) => x[0]))].join(" "));
    return `<article class="rc" style="--c:${esc(c.cor)};--soft:${esc(c.soft)}" data-slug="${esc(r.slug)}" data-cat="${esc(r.categoria)}" data-tags="${esc(r.tags.join("|"))}" data-timer="${r.timer ? 1 : 0}" data-busca="${esc(busca)}">
<div class="pic"><span class="tagc">${esc(c.nome)}</span><img src="${art(r.icone)}" alt="" width="116" height="90" loading="lazy"></div>
<button class="save" type="button" data-save="${esc(r.slug)}" data-titulo="${esc(r.titulo)}" aria-pressed="false" aria-label="Salvar: ${esc(r.titulo)}">${ico("heart")}</button>
<div class="body"><small class="kc">${esc(c.nome)}</small><h3><a href="${urlR(r)}">${esc(r.titulo)}</a></h3><p>${esc(r.resumo)}</p><div class="meta">${pills(r)}</div></div>
</article>`;
  };

  // ---------- páginas das receitas ----------
  rec.forEach((r) => {
    const c = cats[r.categoria];
    const tres = r.colunas.length === 3;
    const mid = tres ? 1 : 0;

    const ingHtml = r.tabelas.map(([rotulo, itens]) => {
      const tit = r.tabelas.length > 1 ? `<h3 class="ing-g">${esc(rotulo.replace(" (na ordem)", ""))}</h3>` : "";
      return tit + `<ul class="ing">${itens.map((it) => `<li><button type="button" aria-pressed="false"><span class="box" aria-hidden="true"></span><span class="it"><span class="qs">${it.slice(1).map((q, j) => `<span class="q${j === mid ? " on" : ""}" data-col="${j}">${esc(q)}</span>`).join("")}</span> <span class="nm">${esc(it[0])}</span></span></button></li>`).join("")}</ul>`;
    }).join("");
    const tam = tres ? `<div class="sizes needs-js" role="group" aria-label="Tamanho do pão">${r.colunas.map((h, j) => `<button type="button" data-col="${j}" aria-pressed="${j === mid ? "true" : "false"}">${esc(h)}</button>`).join("")}</div>` : "";
    const subIng = tres
      ? `<p class="sub">Escolha o tamanho do pão e marque o mesmo tamanho no painel da máquina.<span class="no-js-only"></span></p>`
      : `<p class="sub">${r.rende ? `Rende ${esc(r.rende.charAt(0).toLowerCase() + r.rende.slice(1))}.` : "Quantidades para uma receita."}</p>`;

    const nomesIng = r.tabelas.flatMap(([, itens]) => itens.map((it) => it[0]));
    const passos = r.preparo.map(([g, itens]) =>
      `<div class="steps-g"><h3>${esc(g)}</h3><ol class="steps">${itens.map((p) => `<li><button type="button" aria-pressed="false"><span class="num" aria-hidden="true"></span><span>${realce(esc(p), nomesIng)}</span></button></li>`).join("")}</ol></div>`).join("");

    // complemento opcional (ex.: como rechear e sabores da pizza)
    const k = r.complemento;
    const complemento = k ? `<section class="extra" id="complemento" aria-labelledby="h-extra">
<h2 id="h-extra">${esc(k.titulo)}</h2>${k.intro ? `<p class="sub">${esc(k.intro)}</p>` : ""}
${k.passos && k.passos.length ? `<div class="steps-g"><h3>${esc(k.passosTitulo || "Passo a passo")}</h3><ol class="steps plain">${k.passos.map((p) => `<li><span class="num" aria-hidden="true"></span><span>${realce(esc(p), ["Molho de tomate", "Polpa de tomate", "Azeite", "Sal", "Orégano", "Queijo", "Mussarela", "Tomate", "Frango", "Milho", "Manjericão", "Rúcula"])}</span></li>`).join("")}</ol></div>` : ""}
${(k.itens || []).length ? `<div class="flavors">${k.itens.map((it) => `<article class="flavor"><h3>${esc(it.nome)}</h3><ul>${it.ingredientes.map(([n, q]) => `<li><b>${esc(q)}</b> <span>${esc(n)}</span></li>`).join("")}</ul><p>${realce(esc(it.modo), it.ingredientes.map((x) => x[0]))}</p></article>`).join("")}</div>` : ""}
</section>` : "";

    const glance = [["prog", "Programa", r.programa]];
    if (r.casca) glance.push(["casca", "Casca", r.casca]);
    glance.push(["timer", "Timer da noite", r.timer ? "Pode programar" : "Não programe"]);
    glance.push(["nivel", "Nível", r.nivel]);
    glance.push(["rende", "Rende", r.rende]);

    const mesmas = rec.filter((x) => x.categoria === r.categoria);
    const pos = mesmas.indexOf(r);
    const ant = mesmas[pos - 1], prox = mesmas[pos + 1];
    const relacionadas = mesmas.filter((x) => x !== r).slice(0, 8);

    const ingLd = r.tabelas.flatMap(([, itens]) => itens.map((it) => `${it[0]}: ${it[1 + mid]}`));
    const ld = {
      "@context": "https://schema.org", "@type": "Recipe",
      name: r.titulo, description: r.resumo, image: imgs(r),
      author: { "@type": "Person", name: site.author },
      recipeCategory: c.nome, recipeCuisine: "Brasileira",
      keywords: ["panificadora", "máquina de pão", ...r.tags, r.programa].join(", "),
      recipeYield: tres ? "1 pão de 750 g" : r.rende || "1 receita",
      recipeIngredient: ingLd,
      recipeInstructions: r.preparo.map(([g, itens]) => ({ "@type": "HowToSection", name: g, itemListElement: itens.map((p) => ({ "@type": "HowToStep", text: p })) })),
    };
    const crumbsLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Receitas", item: abs(BASE) },
      { "@type": "ListItem", position: 2, name: r.titulo, item: abs(urlR(r)) }] };

    const html = `${head({
      title: `${r.titulo} na panificadora | Pães do Manoel`, description: `${r.titulo} na panificadora. ${r.resumo}`, url: abs(urlR(r)), image: imgs(r).slice(-1)[0],
      extra: `<script type="application/ld+json">${jsonLd(ld)}</script>\n<script type="application/ld+json">${jsonLd(crumbsLd)}</script>`,
    })}
<body style="--c:${esc(c.cor)};--soft:${esc(c.soft)}">
${topo("receitas")}
<div class="cookbar" role="status"><div class="wrap"><span><b>Modo cozinha</b><span class="ck-long"> ligado: a tela fica acesa. Toque nos ingredientes e passos para marcar.</span><span class="ck-short">: tela acesa</span></span><button type="button" id="sair-cozinha">Sair</button></div></div>
<main id="conteudo">
<section class="rh"><div class="wrap">
<div>
<nav class="crumbs" aria-label="Você está em"><a href="${BASE}">Receitas</a><span aria-hidden="true">›</span><a href="${BASE}?categoria=${esc(c.id)}#receitas">${esc(c.nome)}</a></nav>
<h1>${esc(r.titulo)}</h1>
<p class="lead">${esc(r.resumo)}</p>
<div class="tags">${r.tags.map((t) => `<a class="pill" href="${BASE}?tag=${encodeURIComponent(t)}#receitas">${esc(t)}</a>`).join("")}${r.timer ? `<a class="pill t" href="${BASE}?timer=1#receitas">Timer da noite</a>` : ""}</div>
<div class="actions">
<button class="btn primary needs-js" type="button" id="modo-cozinha" aria-pressed="false">${ico("chef")}Modo cozinha</button>
<button class="btn save-btn needs-js" type="button" data-save="${esc(r.slug)}" data-titulo="${esc(r.titulo)}" aria-pressed="false">${ico("heart")}<span class="lbl">Salvar</span></button>
<button class="btn needs-js" type="button" id="compartilhar">${ico("share")}<span class="lbl">Compartilhar</span></button>
<button class="btn needs-js" type="button" id="imprimir">${ico("print")}Imprimir</button>
</div>
</div>
<div class="art"><img src="${art(r.icone)}" alt="" width="200" height="155"></div>
</div></section>
<div class="wrap">
<div class="glance">${glance.map(([i, l, v]) => `<div>${ico(i)}<span><small>${esc(l)}</small><b>${esc(v)}</b></span></div>`).join("")}</div>
<nav class="jump" aria-label="Ir para"><a href="#ingredientes" data-jump="ingredientes">Ingredientes<span class="jt" data-tam-label>${tres ? ` · ${esc(r.colunas[mid])}` : ""}</span></a><a href="#preparo" data-jump="preparo">Modo de preparo</a></nav>
<div class="layout">
<section class="panel ingbox" id="ingredientes" data-ing="${esc(r.slug)}" aria-labelledby="h-ing">
<h2 id="h-ing">Ingredientes</h2>
${subIng}
${tam}
${ingHtml}
<p class="hint needs-js">Toque em cada item conforme for separando: ele fica riscado. <button class="linkbtn" type="button" id="limpar-marcas">Desmarcar tudo</button></p>
</section>
<div>
<section class="panel" id="preparo" aria-labelledby="h-modo">
<h2 id="h-modo">Modo de preparo</h2>
<p class="sub needs-js">Toque em cada passo quando terminar; o próximo fica em destaque.</p>
<div class="steps-wrap">${passos}</div>
${complemento}
<div class="info">
<div class="infocard"><h3>${ico("check")}Como saber se está pronto</h3><p>${esc(r.pronto)}</p></div>
<div class="infocard"><h3>${ico("box")}Como guardar</h3><p>${esc(r.guardar)}</p></div>
</div>
<aside class="note" aria-label="Dica"><div class="h">Dica de ouro</div><p>${esc(r.dica)}</p></aside>
<a class="help" href="${BASE}guia/#problemas">${ico("alert")}<span>Pão baixo, murchou ou ficou com farinha nos cantos? <b>Veja como resolver</b></span></a>
</section>
<nav class="pager" aria-label="Mais receitas desta categoria">${ant ? `<a href="${urlR(ant)}"><small>‹ Anterior</small><b>${esc(ant.titulo)}</b></a>` : ""}${prox ? `<a class="next" href="${urlR(prox)}"><small>Próxima ›</small><b>${esc(prox.titulo)}</b></a>` : ""}</nav>
</div>
</div>
${relacionadas.length ? `<section class="sec related" aria-labelledby="h-rel"><div class="sec-h"><div><h2 id="h-rel">Mais ${esc(c.nome.toLowerCase())}</h2></div><a class="more" href="${BASE}?categoria=${esc(c.id)}#receitas">Ver todas</a></div><div class="rail">${relacionadas.map(cartao).join("")}</div></section>` : ""}
</div>
</main>
${rodape}`;
    fs.mkdirSync(path.join(out, r.slug), { recursive: true });
    fs.writeFileSync(path.join(out, r.slug, "index.html"), html);
  });

  // ---------- home ----------
  const nProg = new Set(rec.flatMap(programas)).size;
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", itemListElement: rec.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: abs(urlR(r)) })) };
  const descHome = `${rec.length} receitas para panificadora: pães, recheados, bolos, massas e geleias, com o programa certo, a cor da casca e as quantidades para pães de 500 g, 750 g e 1 kg.`;
  const home = `${head({ title: "Pães do Manoel | Receitas para panificadora e máquina de pão", description: descHome, url: abs(BASE), image: ogPadrao, extra: `<script type="application/ld+json">${jsonLd(itemList)}</script>` })}
<body>
${topo("receitas")}
<main id="conteudo">
<section class="hero"><div class="wrap">
<div>
<div class="eyebrow">Receitas para panificadora</div>
<h1>Pão caseiro <em>sem errar</em>, direto da sua máquina.</h1>
<p class="lead">${rec.length} receitas com o programa certo, a cor da casca e as quantidades para pães de 500 g, 750 g e 1 kg. Escolha, separe e aperte iniciar.</p>
<form class="bigsearch" id="busca-topo" action="${BASE}" method="get" role="search">${ico("busca")}<label class="sr" for="q-topo">Buscar receita ou ingrediente</label><input id="q-topo" name="q" type="search" placeholder="Pão ou ingrediente" autocomplete="off"><button type="submit">Buscar</button></form>
<div class="quick"><a href="${BASE}?timer=1#receitas" data-f-timer>Para acordar com pão quentinho</a><a href="${BASE}?categoria=recheados#receitas" data-f-cat="recheados">Pães recheados</a><a href="${BASE}?tag=Natal#receitas" data-f-tag="Natal">Natal</a><a href="${BASE}?tag=Sem%20gl%C3%BAten#receitas" data-f-tag="Sem glúten">Sem glúten</a><a href="${BASE}?tag=Festa%20junina#receitas" data-f-tag="Festa junina">Festa junina</a></div>
</div>
<div class="stage" aria-hidden="true">
<div class="cloth"></div><div class="plate"><img src="${art("loaf")}" alt=""></div>
<img class="wheat" src="${art("wheat")}" alt="">
<div class="sticker s1"><span class="dot" style="background:#5E7A2E">${ico("timer")}</span><span><b>Timer da noite</b>${comTimer.length} receitas</span></div>
<div class="sticker s2"><span class="dot" style="background:#C8402B">${ico("layers")}</span><span><b>500 · 750 · 1000 g</b>quantidade certa</span></div>
</div>
</div></section>
<div class="wrap">
<div class="facts"><div><b>${rec.length}</b><span>receitas com as quantidades conferidas</span></div><div><b>${dados.categorias.length}</b><span>categorias, do pão de forma à geleia</span></div><div><b>${nProg}</b><span>programas da máquina usados nas receitas</span></div><div><b>3</b><span>tamanhos de pão em cada receita</span></div></div>

<section class="sec" aria-labelledby="h-start"><div class="sec-h"><div><h2 id="h-start">Comece por aqui</h2><p>Três leituras rápidas para acertar já na primeira fornada.</p></div><a class="more" href="${BASE}guia/">Ver o guia completo</a></div>
<div class="starts">
<a class="start" href="${BASE}guia/#ordem"><span class="n" style="background:#C8402B">${ico("layers")}</span><span><b>A ordem que nunca falha</b><span>Líquidos, depois secos, fermento por último.</span></span></a>
<a class="start" href="${BASE}guia/#programas"><span class="n" style="background:#2E6B78">${ico("prog")}</span><span><b>Qual programa usar</b><span>O que cada um faz e quais receitas usam.</span></span></a>
<a class="start" href="${BASE}guia/#problemas"><span class="n" style="background:#B97300">${ico("alert")}</span><span><b>Deu errado? Resolva aqui</b><span>Pão baixo, murcho, cru ou com farinha nos cantos.</span></span></a>
</div></section>

<section class="sec" aria-labelledby="h-cat"><div class="sec-h"><div><h2 id="h-cat">Categorias</h2></div></div>
<div class="cats">${dados.categorias.map((c) => `<a class="cat" href="${BASE}?categoria=${esc(c.id)}#receitas" data-f-cat="${esc(c.id)}" style="--c:${esc(c.cor)};--soft:${esc(c.soft)}"><img src="${art(c.icone)}" alt="" width="92" height="72" loading="lazy"><b>${esc(c.nome)}</b><span>${rec.filter((r) => r.categoria === c.id).length} receitas</span></a>`).join("")}</div>
</section>

<section class="sec" aria-labelledby="h-timer"><div class="sec-h"><div><h2 id="h-timer">Para acordar com pão quentinho</h2><p>Monte a forma à noite, programe o timer e acorde com o pão pronto.</p></div><a class="more" href="${BASE}?timer=1#receitas" data-f-timer>Ver as ${comTimer.length}</a></div>
<div class="rail">${comTimer.slice(0, 8).map(cartao).join("")}</div></section>

<section class="sec" id="receitas" aria-labelledby="h-todas"><div class="sec-h"><div><h2 id="h-todas">Todas as receitas</h2><p>Busque pelo nome ou por um ingrediente que você tem em casa.</p></div></div>
<div class="filters">
<div class="frow"><label class="fsearch">${ico("busca")}<span class="sr">Buscar receita ou ingrediente</span><input id="busca" type="search" placeholder="Ex.: banana, queijo, integral" autocomplete="off"></label>
<label class="needs-js"><span class="sr">Região ou ocasião</span><select id="f-tag"><option value="">Região ou ocasião</option>${todasTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></label>
<button class="chip needs-js" type="button" data-f-timer aria-pressed="false">${ico("timer")}Timer da noite</button>
<button class="chip needs-js" type="button" data-f-salvas aria-pressed="false">${ico("heart")}Salvas</button></div>
<div class="chips-scroll needs-js" role="group" aria-label="Categoria"><button class="chip" type="button" data-f-cat="" aria-pressed="true">Todas</button>${dados.categorias.map((c) => `<button class="chip" type="button" data-f-cat="${esc(c.id)}" aria-pressed="false" style="--c:${esc(c.cor)}"><span class="sw"></span>${esc(c.nome)}</button>`).join("")}</div>
</div>
<div class="result-line"><span id="contador" aria-live="polite">${rec.length} receitas</span><button class="linkbtn needs-js" type="button" data-limpar>Limpar filtros</button></div>
<div class="empty" id="vazio" hidden><span data-vazio="filtro"><b>Nenhuma receita com esses filtros</b>Tente outra palavra ou limpe os filtros.</span><span data-vazio="salvas" hidden><b>Você ainda não salvou receitas</b>Toque no coração de uma receita para guardá-la aqui. Fica salvo neste aparelho.</span><br><button class="linkbtn" type="button" data-limpar>Limpar filtros</button></div>
<div class="grid" id="todas">${rec.map(cartao).join("")}</div>
</section>

<section class="sec" aria-labelledby="h-livros"><div class="sec-h"><div><h2 id="h-livros">Prefere no papel?</h2><p>As receitas também estão em dois livros em PDF, prontos para imprimir.</p></div></div>
<div class="books">${dados.livros.map((l, i) => `<a class="book" href="${BASE}${esc(l.arquivo)}" download><img src="${BASE}assets/img/capa-volume-${i + 1}.jpg" alt="" width="78" height="110" loading="lazy"><span><b>${esc(l.titulo)}</b><span>PDF para imprimir</span></span></a>`).join("")}</div>
</section>
</div>
</main>
${rodape}`;
  fs.writeFileSync(path.join(out, "index.html"), home);

  // ---------- guia ----------
  const progRows = Object.keys(DESC_PROG).map((p) => {
    const rs = rec.filter((r) => programas(r).includes(p));
    return rs.length ? `<tr><td>${esc(p)}</td><td>${esc(DESC_PROG[p])}</td><td>${rs.map((r) => `<a href="${urlR(r)}">${esc(r.titulo)}</a>`).join(", ")}</td></tr>` : "";
  }).join("");
  const guia = `${head({ title: "Guia da panificadora: ordem dos ingredientes, programas e problemas | Pães do Manoel", description: "Como montar a forma, as medidas, o timer, o que faz cada programa da máquina de pão, a técnica dos pães recheados e como resolver os problemas mais comuns.", url: abs(`${BASE}guia/`), image: ogPadrao })}
<body>
${topo("guia")}
<main id="conteudo">
<section class="gh"><div class="wrap"><div class="eyebrow">Guia da máquina</div><h1>Tudo o que faz o pão <em>dar certo</em></h1><p class="lead">A ordem dos ingredientes, as medidas, quando usar o timer, o que cada programa faz e como resolver os problemas mais comuns.</p></div></section>
<div class="wrap glayout">
<nav class="toc" aria-label="Neste guia"><b>Neste guia</b><ol>
<li><a href="#ordem">A ordem que nunca falha</a></li><li><a href="#medidas">Medidas</a></li><li><a href="#timer">Timer da noite</a></li>
<li><a href="#depois">Depois de assar</a></li><li><a href="#programas">Os programas</a></li><li><a href="#recheados">Pães recheados</a></li>
<li><a href="#problemas">Deu errado?</a></li><li><a href="#cuidados">Cuidados com a máquina</a></li></ol></nav>
<div>
<section class="panel gsec" id="ordem"><h2>A ordem que nunca falha</h2>
<ol class="order"><li>Tire a forma da máquina antes de colocar qualquer ingrediente: o que cai na resistência queima e solta fumaça.</li>
<li>Encaixe a pá no eixo da forma.</li><li>Líquidos primeiro: água, leite, ovos, óleo, manteiga.</li>
<li>Depois o sal e o açúcar, em cantos opostos, e as farinhas por cima, cobrindo todo o líquido.</li>
<li>O fermento por último, numa covinha no topo da farinha, sem tocar o líquido nem o sal.</li>
<li>Encaixe a forma, escolha o programa, o tamanho e a cor da casca e aperte iniciar.</li></ol>
<div class="layers" aria-hidden="true"><div style="background:#E9DCC6;color:#3B2A1E">Fermento<small>numa covinha, no topo</small></div><div style="background:#D9A441">Farinhas<small>cobrindo o líquido</small></div><div style="background:#C9802F">Sal e açúcar<small>em cantos opostos</small></div><div style="background:#5B8DB8">Líquidos<small>água, leite, ovos, óleo</small></div><div style="background:#3B2A1E">Pá encaixada<small>no eixo da forma</small></div></div>
<p class="cap">Como a forma fica por dentro, de cima para baixo.</p></section>

<section class="panel gsec" id="medidas"><h2>Medidas</h2><p>As receitas usam a colher e o copo medidor que vêm com a máquina, ou colheres de medida comuns. Nas colheres, a medida é sempre rasa: encha e passe as costas de uma faca por cima. Para o melhor resultado, pese farinha e açúcar na balança.</p>
<div class="meas"><div><b>1 colher (chá)</b>5 ml: cerca de 3 g de fermento ou 6 g de sal</div><div><b>1 colher (sopa)</b>15 ml: cerca de 12 g de açúcar ou 8 g de farinha</div><div><b>ml</b>líquidos, no copo medidor, olhando na altura dos olhos</div><div><b>g</b>sólidos, de preferência na balança de cozinha</div></div>
<p><b>Fermento:</b> sempre biológico seco instantâneo, o de sachê de 10 g. <b>Farinha:</b> de trigo tipo 1; a "especial para pão" deixa o pão mais alto. <b>Líquidos:</b> até 30 °C, porque líquido quente mata o fermento.</p></section>

<section class="panel gsec" id="timer"><h2>Timer da noite</h2><p>O timer deixa a máquina esperando até 15 horas para começar, e o pão fica pronto na hora que você escolher. Só use nas receitas marcadas com <b>Timer da noite</b>: elas não levam ovo, leite fresco, queijo ou recheio, que estragariam fora da geladeira. O fermento nunca pode encostar no líquido enquanto a massa espera.</p>
<p><a class="more" href="${BASE}?timer=1#receitas">Ver as ${comTimer.length} receitas que podem ficar no timer</a></p></section>

<section class="panel gsec" id="depois"><h2>Depois de assar</h2><p>Tire a forma com luva, vire e desenforme na hora: se o pão ficar na forma, o vapor amolece a casca. Se a pá ficar presa no pão, solte com um palito de madeira, nunca com faca, para não riscar o antiaderente. Espere pelo menos 40 minutos antes de fatiar: o miolo termina de firmar enquanto esfria.</p></section>

<section class="panel gsec" id="programas"><h2>Os programas e quando usar cada um</h2><p>O tempo de cada ciclo aparece no visor da máquina quando você escolhe o programa e o tamanho.</p>
<table class="gtable"><thead><tr><th>Programa</th><th>O que faz</th><th>Receitas</th></tr></thead><tbody>${progRows}</tbody></table>
<p style="margin-top:14px"><b>Descongelar:</b> coloque o pão congelado na forma, sem a pá, e rode o programa para ele voltar macio.</p></section>

<section class="panel gsec" id="recheados"><h2>A técnica dos pães recheados</h2><p>Dá para fazer pão recheado sem ligar o forno, com três programas em sequência:</p>
<ol class="order"><li><b>Massa:</b> a máquina bate a massa e deixa crescer.</li><li>Você abre a massa num retângulo de 1 cm, com um lado de 17 cm (o comprimento interno da forma), espalha o recheio e enrola.</li><li>O rolo volta para a forma <b>sem a pá</b>, com a emenda para baixo.</li><li><b>Fermentar:</b> a massa cresce de novo até quase a borda.</li><li><b>Assar:</b> o pão assa e doura.</li></ol>
<p><a class="more" href="${BASE}?categoria=recheados#receitas">Ver os pães recheados</a></p></section>

<section class="panel gsec" id="problemas"><h2>Deu errado? Resolva aqui</h2><p>Quase todo problema vem da medida, da temperatura ou do fermento. Toque no problema para ver a causa e a solução, e mude uma coisa por vez na próxima fornada.</p>
<div class="prob">${PROBLEMAS.map(([t, d]) => `<details><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join("")}</div></section>

<section class="panel gsec" id="cuidados"><h2>Cuidados com a máquina</h2><p>Não lave a forma na lava-louças nem use palha de aço. Se a pá prender no eixo, deixe a forma de molho em água morna por 15 minutos. Limpe o interior só com pano úmido, com a máquina fria e desligada da tomada. Nunca ligue a máquina vazia ou sem a forma encaixada.</p></section>
</div></div>
</main>
${rodape}`;
  fs.mkdirSync(path.join(out, "guia"), { recursive: true });
  fs.writeFileSync(path.join(out, "guia", "index.html"), guia);

  // ---------- 404 próprio (o Cloudflare Pages usa o 404.html mais próximo) ----------
  fs.writeFileSync(path.join(out, "404.html"), `${head({ title: "Receita não encontrada | Pães do Manoel", description: "Essa receita não existe ou mudou de endereço.", url: abs(BASE), image: ogPadrao, robots: '<meta name="robots" content="noindex">\n' })}
<body>
${topo("")}
<main id="conteudo"><section class="gh"><div class="wrap"><div class="eyebrow">Ops</div><h1>Essa receita <em>não saiu do forno</em></h1><p class="lead">O endereço não existe ou mudou. Veja todas as receitas na página inicial.</p><p style="margin-top:20px"><a class="btn primary" href="${BASE}">Ver todas as receitas</a></p></div></section></main>
${rodape}`);

  // ---------- sitemap próprio (fora do sitemap e do robots.txt do blog) ----------
  const urls = [BASE, `${BASE}guia/`, ...rec.map(urlR)].map((u) => `  <url><loc>${esc(abs(u))}</loc></url>`).join("\n");
  fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  console.log(`[receitas] ${rec.length} receitas geradas em _site/receitas`);
}

module.exports = build;
if (require.main === module) build();
