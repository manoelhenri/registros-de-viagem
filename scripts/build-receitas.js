// Gera a área /receitas ("Pães do Manoel") a partir de static-receitas/categorias.json e de um
// arquivo por receita em static-receitas/receitas/<slug>.json (editados pelo painel /admin).
// Produto à parte do blog: HTML próprio, sem templates, CSS, dados ou analytics do blog, e sem
// nenhum link entre os dois. Roda no fim do build (eleventy.after), depois dos jogos.
// Sem dependências: só módulos do Node.
const fs = require("fs");
const crypto = require("crypto");
const VER = { css: "", js: "" };
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "static-receitas");
// Dentro do build do blog (antes da virada) as receitas ficam em /receitas/; no site
// próprio (receitas.manoelhenrique.com, `--sozinho`) ficam na raiz. Ver sites.json.
let out = path.join(root, "_site", "receitas");
let BASE = "/receitas/";

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
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  zap: '<path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.2-1.6-2.7-2.7l.8-1-1-2z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  prev: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
};
const ico = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

// Descrições do Manual de Instruções da Gallant (programas 1 a 19).
const DESC_PROG = {
  "Macio": "Pão branco básico e pães mistos, também com ervas e passas. Escolhe tamanho e cor.",
  "Francês ou D'Água": "Pães leves, de casca mais crocante. Escolhe tamanho e cor.",
  "Pão Integral": "Pães com bastante farinha integral; começa com um pré-aquecimento mais longo para o grão absorver a água.",
  "Pão Rápido": "Mistura, crescimento e forno mais curtos e miolo mais denso; feito para receitas com fermento em pó e bicarbonato.",
  "Brioche": "Massas ricas em ovo, manteiga, líquido e açúcar; crescimento mais longo, pão leve e arejado.",
  "Sanduíche": "Miolo branco, casca dourada e textura macia, fácil de fatiar.",
  "Sem Glúten": "Farinhas sem glúten, que pedem mais tempo para absorver o líquido.",
  "Misturar": "Só mistura, por 15 minutos fixos.",
  "Massa Integral": "Mistura e fermenta, sem assar, para massa com farinha integral. Tempo fixo.",
  "Massa de Pizza": "Mistura e fermenta, sem assar. Tempo fixo.",
  "Massa": "Mistura e fermenta, sem assar: você modela e assa depois. Tempo fixo; no máximo 1 kg de ingredientes.",
  "Sovar": "Só mistura, sem fermentar nem assar. Tempo ajustável de 8 a 45 minutos.",
  "Mingau": "Mistura e fermenta, para mingau de cereais grossos.",
  "Descongelar": "Mantém cerca de 50 °C para descongelar; o tempo é ajustável.",
  "Fermentar": "Só fermenta.",
  "Misturar e Assar": "Mistura e assa.",
  "Geleia": "Geleias de frutas e marmeladas. Não aumente a quantidade: a geleia não pode transbordar.",
  "Bolo": "Mistura, cresce e assa massas com fermento em pó. Escolhe a cor.",
  "Assar": "Só assa, sem misturar nem descansar. Serve para dar mais tempo de forno.",
};
// Problemas e soluções do manual da Gallant, mais os casos de pães recheados.
const PROBLEMAS = [
  ["Cheiro de queimado", "Farinha ou outro ingrediente caiu na câmara da máquina. Pare, deixe esfriar por completo e limpe o excesso com papel-toalha. Monte a forma sempre fora da máquina."],
  ["Os ingredientes não se misturam e o motor faz barulho", "A forma ou a pá não estão bem encaixadas, ou há ingrediente demais. Confira se a pá está no eixo, se a forma travou girando no sentido horário e meça tudo com precisão."],
  ["Aparece HHH no visor", "A máquina está quente demais, em geral logo depois de outro programa. Desligue da tomada, abra a tampa, tire a forma e espere de 15 a 30 minutos antes de começar de novo."],
  ["Farinha seca nos cantos ou pão coberto de farinha", "Forma ou pá mal encaixadas, ingrediente demais ou massa seca. Junte água, 1 colher (sopa) por vez, até a massa formar uma bola. Massa sem glúten é bem úmida e pode precisar de ajuda: raspe as laterais com espátula de silicone no começo."],
  ["O pão cresceu demais e empurrou a tampa", "Fermento ou farinha demais, sal esquecido ou pá fora da forma. Meça com precisão e, na próxima vez, tire ¼ de colher (chá) de fermento."],
  ["Pão baixo, que não cresceu", "Fermento vencido ou fraco, medida errada ou tampa aberta durante o programa. Confira a validade, use líquidos em temperatura ambiente e não abra a tampa. Para testar o fermento, o manual indica 1 xícara (240 ml) de água a 45 °C a 50 °C, 1 colher (chá) de açúcar e 1 colher (sopa) de fermento: em 10 minutos, ele deve borbulhar."],
  ["Buraco no topo depois de assar", "A massa fermentou rápido demais, há fermento ou água demais, ou o programa não é o certo para a receita. Reduza um pouco o fermento ou a água e confira o programa."],
  ["Casca clara demais", "A tampa foi aberta durante o forno ou a cor escolhida foi clara. Não abra a tampa e escolha uma cor mais escura."],
  ["Casca escura demais", "Açúcar demais na receita, ou o pão ficou no Manter Aquecido. Reduza um pouco o açúcar, escolha casca clara e tire o pão logo que o programa terminar."],
  ["Pão torto ou com fundo oco", "Fermento ou água demais, massa muito úmida ou sem sal. Pães integrais e multigrãos são naturalmente mais baixos e irregulares."],
  ["A pá saiu presa no pão", "É comum, principalmente com casca escura. Espere o pão esfriar e solte a pá com uma espátula ou utensílio pequeno, nunca com a mão."],
  ["Miolo cru perto do recheio", "Recheio úmido ou rolo apertado demais. O recheio precisa estar cozido, frio e sem caldo. Se o pão sair pálido, rode mais um ciclo do programa Assar."],
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

// Cor da categoria escurecida até ter contraste de leitura (4,5:1) sobre o branco e sobre o fundo claro dela.
function luz(h) { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
function contraste(a, b) { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
function tinta(cor, fundo) {
  let rgb = [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16)), hex = cor;
  for (let k = 0; k < 40 && (contraste(hex, "#FFFFFF") < 4.5 || contraste(hex, fundo) < 4.5); k++) {
    rgb = rgb.map((v) => Math.round(v * 0.95));
    hex = "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return hex;
}

// ---------- leitura dos dados ----------
// Cada receita é um arquivo JSON (o painel Decap grava um por receita). Aqui o formato do painel
// vira o formato interno usado no resto do gerador. Receita com erro grave fica fora do ar e
// aparece no log como "[receitas] ERRO"; as outras continuam publicando.
const TRES = ["500 g", "750 g", "1000 g"];
function slugDe(nome) {
  return norm(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function carregar() {
  const base = JSON.parse(fs.readFileSync(path.join(src, "categorias.json"), "utf8"));
  const cats = new Set(base.categorias.map((c) => c.id));
  const dir = path.join(src, "receitas");
  const txt = (v) => (v == null ? "" : String(v).trim());
  const receitas = [], vistos = new Set();
  fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().forEach((arq) => {
    const erro = (m) => console.error(`[receitas] ERRO em ${arq}: ${m}. Esta receita ficou fora do site até ser corrigida.`);
    const aviso = (m) => console.warn(`[receitas] aviso em ${arq}: ${m}`);
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, arq), "utf8")); } catch (e) { return erro(`arquivo inválido (${e.message})`); }
    const slug = slugDe(arq.replace(/\.json$/, ""));
    if (!slug) return erro("nome de arquivo sem letras");
    if (vistos.has(slug)) return erro(`endereço repetido (${slug})`);
    const titulo = txt(d.titulo);
    if (!titulo) return erro("falta o título");
    if (!cats.has(d.categoria)) return erro(`categoria desconhecida (${d.categoria})`);
    const quantidades = ["oficial", "calculadas", "unica"].includes(d.quantidades) ? d.quantidades : "unica";
    const tres = quantidades !== "unica";
    const tabelas = [];
    let falta = "";
    (d.tabelas || []).forEach((g) => {
      const itens = (g && g.itens || []).filter((i) => i && txt(i.nome)).map((i) => {
        if (tres && !(txt(i.quantidade) && txt(i.q750) && txt(i.q1000))) falta = falta || txt(i.nome);
        return tres ? [txt(i.nome), txt(i.quantidade), txt(i.q750), txt(i.q1000)] : [txt(i.nome), txt(i.quantidade)];
      });
      if (itens.length) tabelas.push([txt(g.grupo) || "Ingredientes", itens]);
    });
    if (!tabelas.length) return erro("nenhum ingrediente");
    if (falta) return erro(`receita de 3 tamanhos sem as 3 quantidades em "${falta}"`);
    const preparo = (d.preparo || []).map((g) => [txt(g && g.grupo) || "Preparo", (g && g.passos || []).map(txt).filter(Boolean)]).filter((g) => g[1].length);
    if (!preparo.length) return erro("nenhum passo no modo de preparo");
    // a foto é gravada pelo painel como /receitas/assets/... (antes da virada) ou /assets/...;
    // aqui vira um caminho relativo (assets/...), que funciona nos dois endereços
    let foto = txt(d.foto).replace(/^\/(receitas\/)?/, "");
    if (foto) {
      const local = foto.startsWith("assets/") ? path.join(src, foto) : "";
      if (!local || !fs.existsSync(local)) { aviso(`foto não encontrada (${foto}); a página usa a ilustração`); foto = ""; }
      else if (fs.statSync(local).size > 700 * 1024) aviso(`foto com ${Math.round(fs.statSync(local).size / 1024)} KB; abaixo de 500 KB a página abre mais rápido no celular`);
    }
    ["resumo", "pronto", "guardar", "dica", "rende"].forEach((k) => { if (!txt(d[k])) aviso(`campo "${k}" vazio`); });
    vistos.add(slug);
    receitas.push({
      slug, titulo, categoria: d.categoria, ordem: Number(d.ordem) || 9999, publicado: txt(d.publicado).slice(0, 10),
      tags: Array.isArray(d.tags) ? d.tags.map(txt).filter(Boolean) : [],
      icone: txt(d.icone) || "loaf", resumo: txt(d.resumo), programa: txt(d.programa), casca: txt(d.casca) || null,
      timer: d.timer === true, nivel: txt(d.nivel) || "Fácil", rende: txt(d.rende),
      origem: { tipo: ["oficial", "adaptada", "autoral"].includes(d.origem && d.origem.tipo) ? d.origem.tipo : "autoral", fonte: txt(d.origem && d.origem.fonte) },
      quantidades, tamanhoBase: tres && quantidades === "calculadas" ? txt(d.tamanhoBase) || null : null,
      colunas: tres ? TRES : ["Quantidade"], tabelas, preparo,
      pronto: txt(d.pronto), guardar: txt(d.guardar), dica: txt(d.dica),
      foto, fotoAlt: txt(d.fotoAlt),
      ...(Array.isArray(d.imagens) && d.imagens.length ? { imagens: d.imagens } : {}),
      ...(d.complemento && txt(d.complemento.titulo) ? { complemento: {
        titulo: txt(d.complemento.titulo), intro: txt(d.complemento.intro), passosTitulo: txt(d.complemento.passosTitulo),
        passos: (d.complemento.passos || []).map(txt).filter(Boolean),
        itens: (d.complemento.itens || []).filter((i) => i && txt(i.nome)).map((i) => ({
          nome: txt(i.nome), modo: txt(i.modo),
          ingredientes: (i.ingredientes || []).map((x) => (Array.isArray(x) ? x.map(txt) : [txt(x && x.nome), txt(x && x.quantidade)])).filter((x) => x[0]),
        })),
      } } : {}),
    });
  });
  receitas.sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"));
  return { categorias: base.categorias, livros: base.livros || [], receitas };
}

function build(opcoes = {}) {
  const sites = JSON.parse(fs.readFileSync(path.join(root, "sites.json"), "utf8"));
  const SOZINHO = !!opcoes.sozinho;
  if (SOZINHO) { BASE = "/"; out = opcoes.saida || path.join(root, "_site"); }
  // site próprio antes da virada: existe só para teste, fora do Google
  const PREVIA = SOZINHO && !sites.separado;
  const dados = carregar();
  // versão dos arquivos pelo conteúdo: depois de publicar, o celular baixa o CSS e o JS novos
  // em vez de usar a cópia antiga (que não teria os botões novos)
  const hash = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(src, "assets", f))).digest("hex").slice(0, 10);
  VER.css = hash("receitas.css"); VER.js = hash("receitas.js");
  const site = JSON.parse(fs.readFileSync(path.join(root, "_data", "site.json"), "utf8"));
  const origem = String(SOZINHO ? sites.receitas : site.url).replace(/\/$/, "");
  const abs = (p) => origem + p;
  dados.categorias.forEach((c) => { c.cor = tinta(c.cor, c.soft); });
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
  // ingredientes que quase toda receita tem não contam para "receitas parecidas"
  const BASICOS = new Set(["farinha de trigo", "sal", "acucar", "fermento biologico seco", "agua", "agua morna", "oleo", "ovo", "ovos", "leite", "leite morno", "manteiga", "manteiga amolecida", "manteiga derretida", "azeite", "fermento quimico", "gema e gergelim"]);
  const chaves = (r) => new Set(r.tabelas.flatMap(([, it]) => it.map((x) => norm(x[0]).replace(/\s*\(.*?\)/g, "").trim())).filter((n) => !BASICOS.has(n)).map((n) => n.split(/[ ,]/)[0]));
  const pontos = (a, b) => {
    const ka = chaves(a); let n = 0;
    chaves(b).forEach((x) => { if (ka.has(x)) n += 3; });
    if (a.categoria === b.categoria) n += 2;
    if (a.programa === b.programa) n += 1;
    a.tags.forEach((t) => { if (b.tags.includes(t)) n += 1; });
    return n;
  };
  const art = (n) => `${BASE}assets/art/${n}.svg`;
  const imgs = (r) => (r.foto ? [abs(BASE + r.foto)] : Array.isArray(r.imagens) && r.imagens.length
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
${PREVIA && !robots ? '<meta name="robots" content="noindex">\n' : robots}<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pães do Manoel">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="${art("loaf")}">
<link rel="preload" href="${BASE}assets/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${BASE}assets/fonts/fraunces-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${BASE}assets/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${BASE}assets/receitas.css?v=${VER.css}">
${extra}
</head>`;

  const topo = (atual) => `<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="top"><div class="wrap">
<a class="brand" href="${BASE}"><span class="mark"><img src="${art("loaf")}" alt="" width="28" height="22"></span><span>Pães do Manoel</span></a>
<nav class="nav" aria-label="Principal">
<a class="nav-home" href="${BASE}"${atual === "home" ? ' aria-current="page"' : ""}>${ico("home")}<span>Início</span></a>
<a href="${BASE}guia/"${atual === "guia" ? ' aria-current="page"' : ""}><span class="long">Guia da máquina</span><span class="short">Guia</span></a>
<a href="${BASE}?salvas=1#receitas" class="needs-js" aria-label="Receitas salvas">${ico("heart")}<span class="long">Salvas</span><span class="badge" data-salvas-count></span></a>
</nav></div></header>`;

  const rodape = `<footer class="foot"><div class="wrap">
<div><b>Pães do Manoel</b><p>Receitas pensadas para a panificadora Gallant de 19 programas: o programa certo, a cor da casca e as quantidades para pães de 500 g, 750 g e 1 kg.</p></div>
<div><div class="t">Navegue</div><a href="${BASE}#receitas">Todas as receitas</a><a href="${BASE}guia/">Guia da máquina</a><a href="${BASE}guia/#problemas">Deu errado? Resolva aqui</a></div>
<div><div class="t">Categorias</div>${dados.categorias.map((c) => `<a href="${BASE}?categoria=${esc(c.id)}#receitas">${esc(c.nome)}</a>`).join("")}</div>
</div></footer>
<button class="totop" type="button" data-topo hidden aria-label="Voltar ao topo">${ico("up")}<span>Topo</span></button>
<script src="${BASE}assets/receitas.js?v=${VER.js}" defer></script>
</body>
</html>`;

  const pills = (r) => [r.origem && r.origem.tipo === "oficial" ? `<span class="pill o">Oficial Gallant</span>` : "", `<span class="pill">${esc(r.programa)}</span>`, r.timer ? `<span class="pill t">Timer da noite</span>` : "", `<span class="pill">${esc(r.nivel)}</span>`].join("");
  const cartao = (r) => {
    const c = cats[r.categoria];
    const k = r.complemento || {};
    const busca = norm([r.titulo, c.nome, r.programa, r.resumo, r.nivel, "panificadora maquina de pao", r.origem && r.origem.tipo === "oficial" ? "oficial gallant" : "", ...r.tags,
      ...r.tabelas.flatMap(([, it]) => it.map((x) => x[0])),
      ...(k.itens || []).flatMap((it) => [it.nome, ...it.ingredientes.map((x) => x[0])])].join(" "));
    return `<article class="rc" style="--c:${esc(c.cor)};--soft:${esc(c.soft)}" data-slug="${esc(r.slug)}" data-cat="${esc(r.categoria)}" data-tags="${esc(r.tags.join("|"))}" data-timer="${r.timer ? 1 : 0}" data-nivel="${esc(norm(r.nivel))}" data-origem="${esc(r.origem ? r.origem.tipo : "autoral")}" data-busca="${esc(busca)}">
<div class="pic${r.foto ? " com-foto" : ""}"><span class="tagc">${esc(c.nome)}</span>${r.foto ? `<img class="ft" src="${esc(BASE + r.foto)}" alt="" width="320" height="240" loading="lazy">` : `<img src="${art(r.icone)}" alt="" width="116" height="90" loading="lazy">`}</div>
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
    const outros = tres && r.tamanhoBase ? r.colunas.filter((x) => x !== r.tamanhoBase).join(" e ") : "";
    const notaQtd = r.quantidades === "oficial"
      ? "Quantidades do livro de receitas da Gallant, nos três tamanhos. O tamanho de 750 g do painel aparece no livro como 700 g."
      : r.quantidades === "calculadas"
        ? `Quantidades de ${esc(outros || "500 g e 1000 g")} calculadas por proporção a partir da receita de ${esc(r.tamanhoBase || "750 g")}.`
        : /Massa|Sovar|Bolo|Geleia|Misturar/.test(r.programa)
          ? "Tamanho único: nesses programas a máquina não tem seletor de tamanho" + (/^Massa/.test(r.programa) ? ", e o livro da Gallant limita o programa Massa a 1 kg de ingredientes." : ".")
          : "";
    const subIng = tres
      ? `<p class="sub">Escolha o tamanho do pão e marque o mesmo tamanho no painel da máquina.<span class="no-js-only"></span></p><p class="qnota">${notaQtd}</p>`
      : `<p class="sub">${r.rende ? `Rende ${esc(r.rende.charAt(0).toLowerCase() + r.rende.slice(1))}.` : "Quantidades para uma receita."}</p>${notaQtd ? `<p class="qnota">${notaQtd}</p>` : ""}`;

    const nomesIng = r.tabelas.flatMap(([, itens]) => itens.map((it) => it[0]));
    const passos = r.preparo.map(([g, itens]) =>
      `<div class="steps-g"><h3>${esc(g)}</h3><ol class="steps">${itens.map((p) => `<li><button type="button" aria-pressed="false"><span class="num" aria-hidden="true"></span><span>${realce(esc(p), nomesIng)}</span></button></li>`).join("")}</ol></div>`).join("");

    // complemento opcional (ex.: como rechear e sabores da pizza)
    const k = r.complemento;
    const complemento = k ? `<section class="extra" id="complemento" aria-labelledby="h-extra">
<h2 id="h-extra">${esc(k.titulo)}</h2>${k.intro ? `<p class="sub">${esc(k.intro)}</p>` : ""}
${k.passos && k.passos.length ? `<div class="steps-g"><h3>${esc(k.passosTitulo || "Passo a passo")}</h3><ol class="steps plain">${k.passos.map((p) => `<li><span class="num" aria-hidden="true"></span><span>${realce(esc(p), ["Molho de tomate", "Polpa de tomate", "Azeite", "Sal", "Orégano", "Queijo", "Muçarela", "Tomate", "Frango", "Milho", "Manjericão", "Rúcula"])}</span></li>`).join("")}</ol></div>` : ""}
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
    const relacionadas = rec.filter((x) => x !== r)
      .map((x) => ({ x, n: pontos(r, x) }))
      .filter((o) => o.n > 0)
      .sort((a, b) => b.n - a.n || rec.indexOf(a.x) - rec.indexOf(b.x))
      .slice(0, 8).map((o) => o.x);

    const ingLd = r.tabelas.flatMap(([, itens]) => itens.map((it) => `${it[0]}: ${it[1 + mid]}`));
    const ld = {
      "@context": "https://schema.org", "@type": "Recipe",
      name: r.titulo, description: r.resumo, image: imgs(r),
      author: r.origem && r.origem.tipo === "oficial" ? { "@type": "Organization", name: "Gallant" } : { "@type": "Person", name: site.author },
      recipeCategory: c.nome, recipeCuisine: "Brasileira",
      keywords: ["panificadora", "máquina de pão", ...r.tags, r.programa].join(", "),
      recipeYield: tres ? "1 pão de 750 g" : r.rende || "1 receita",
      ...(r.publicado ? { datePublished: r.publicado } : {}),
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
${topo("receita")}
<nav class="cooknav" aria-label="Passos do modo cozinha"><button type="button" id="passo-ant">${ico("prev")}<span>Voltar</span></button><span id="passo-pos" aria-live="polite"></span><button type="button" id="passo-ok" class="ok"><span>Concluí</span>${ico("next")}</button></nav>
<div class="cookbar" role="status"><div class="wrap"><span><b>Modo cozinha</b><span class="ck-long" data-ck-long> ligado: letras maiores e um passo por vez. Toque nos ingredientes e passos para marcar.</span><span class="ck-short" data-ck-short>: letras maiores</span></span><button type="button" id="sair-cozinha">Sair</button></div></div>
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
<a class="btn" href="https://wa.me/?text=${encodeURIComponent(`${r.titulo} na panificadora: ${abs(urlR(r))}`)}" target="_blank" rel="noopener">${ico("zap")}WhatsApp</a>
<button class="btn needs-js" type="button" id="imprimir">${ico("print")}Imprimir</button>
</div>
<div class="copia-manual" id="copia-link" hidden><p><b>Não deu para copiar sozinho.</b> Toque e segure no endereço abaixo para copiar.</p><textarea readonly rows="2" aria-label="Endereço da receita"></textarea></div>
</div>
${r.foto ? `<div class="art foto"><img src="${esc(BASE + r.foto)}" alt="${esc(r.fotoAlt || r.titulo)}" width="640" height="640"></div>` : `<div class="art"><img src="${art(r.icone)}" alt="" width="200" height="155"></div>`}
</div></section>
<div class="wrap">
<div class="glance">${glance.map(([i, l, v]) => `<div>${ico(i)}<span><small>${esc(l)}</small><b>${esc(v)}</b></span></div>`).join("")}</div>
<p class="origem o-${esc(r.origem.tipo)}">${ico(r.origem.tipo === "oficial" ? "check" : "info")}<span><b>${r.origem.tipo === "oficial" ? "Receita oficial Gallant" : r.origem.tipo === "adaptada" ? "Receita adaptada" : "Receita autoral"}</b> ${esc(r.origem.tipo === "oficial" ? `do ${r.origem.fonte}.` : r.origem.tipo === "adaptada" ? `${r.origem.fonte.replace(/^Adaptada de/, "a partir de")}, ajustada para a Gallant.` : "do Pães do Manoel, feita para a Gallant.")}</span></p>
<p class="prognota">Programas da panificadora Gallant de 19 programas. Na sua máquina o nome pode ser outro: escolha o ciclo equivalente no manual e nunca um que asse quando a receita pede só para bater a massa. <a href="${BASE}guia/#programas">O que faz cada programa</a></p>
<nav class="jump" aria-label="Ir para"><a href="#ingredientes" data-jump="ingredientes">Ingredientes<span class="jt" data-tam-label>${tres ? ` · ${esc(r.colunas[mid])}` : ""}</span></a><a href="#preparo" data-jump="preparo">Modo de preparo</a></nav>
${r.tags.includes("Sem glúten") ? `<aside class="alerta" role="note">${ico("info")}<p><b>Sem glúten, com cuidado.</b> Confira no rótulo de cada ingrediente (polvilho, farinha de arroz, psyllium, fermento) a frase "não contém glúten". Quem tem doença celíaca precisa evitar a contaminação cruzada: forma, pá e utensílios usados com farinha de trigo guardam resíduos. Na dúvida, fale com seu médico ou nutricionista.</p></aside>` : ""}
<div class="layout">
<section class="panel ingbox" id="ingredientes" data-ing="${esc(r.slug)}" aria-labelledby="h-ing">
<h2 id="h-ing">Ingredientes</h2>
${subIng}
${tam}
${ingHtml}
<p class="hint needs-js">Toque em cada item conforme for separando: ele fica riscado.</p>
<div class="ing-actions needs-js"><button class="btn small" type="button" id="copiar-ing">${ico("copy")}<span class="lbl">Copiar ingredientes</span></button><button class="linkbtn" type="button" id="limpar-marcas" hidden>Desmarcar tudo</button></div>
<div class="copia-manual" id="copia-ing" hidden><p><b>Não deu para copiar sozinho.</b> Toque e segure no texto abaixo para copiar a lista.</p><textarea readonly rows="8" aria-label="Lista de ingredientes"></textarea></div>
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
${relacionadas.length ? `<section class="sec related" aria-labelledby="h-rel"><div class="sec-h"><div><h2 id="h-rel">Você também pode gostar</h2><p>Receitas com ingredientes, programa ou ocasião em comum.</p></div><a class="more" href="${BASE}?categoria=${esc(c.id)}#receitas">Mais ${esc(c.nome.toLowerCase())}</a></div><div class="rail">${relacionadas.map(cartao).join("")}</div></section>` : ""}
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
${topo("home")}
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
<div class="facts"><div><b>${rec.length}</b><span>receitas para a panificadora</span></div><div><b>${rec.filter((r) => r.origem && r.origem.tipo === "oficial").length}</b><span>receitas oficiais do livro da Gallant</span></div><div><b>${nProg}</b><span>programas da máquina usados nas receitas</span></div><div><b>${rec.filter((r) => r.colunas.length === 3).length}</b><span>pães com 3 tamanhos: 500 g, 750 g e 1 kg</span></div></div>

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

<section class="sec" id="receitas" aria-labelledby="h-todas"><div class="sec-h"><div><h2 id="h-todas">Todas as receitas</h2><p>Busque pelo nome, por um programa da máquina ou pelos ingredientes que você tem em casa (ex.: "banana aveia").</p></div></div>
<div class="filters">
<div class="frow"><label class="fsearch">${ico("busca")}<span class="sr">Buscar receita ou ingrediente</span><input id="busca" type="search" placeholder="Ex.: banana, queijo, integral" autocomplete="off"></label>
<label class="needs-js"><span class="sr">Região ou ocasião</span><select id="f-tag"><option value="">Região ou ocasião</option>${todasTags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select></label>
<button class="chip needs-js" type="button" data-f-timer aria-pressed="false">${ico("timer")}Timer da noite</button>
<button class="chip needs-js" type="button" data-f-oficial aria-pressed="false">${ico("check")}Oficiais Gallant</button>
<button class="chip needs-js" type="button" data-f-facil aria-pressed="false">Fáceis</button>
<button class="chip needs-js" type="button" data-f-salvas aria-pressed="false">${ico("heart")}Salvas</button></div>
<div class="chips-scroll needs-js" role="group" aria-label="Categoria"><button class="chip" type="button" data-f-cat="" aria-pressed="true">Todas</button>${dados.categorias.map((c) => `<button class="chip" type="button" data-f-cat="${esc(c.id)}" aria-pressed="false" style="--c:${esc(c.cor)}"><span class="sw"></span>${esc(c.nome)}</button>`).join("")}</div>
</div>
<div class="result-line"><span id="contador" aria-live="polite">${rec.length} receitas</span><button class="linkbtn needs-js" type="button" data-limpar>Limpar filtros</button></div>
<div class="empty" id="vazio" hidden><span data-vazio="filtro"><b>Nenhuma receita com esses filtros</b>Tente outra palavra ou limpe os filtros.</span><span data-vazio="salvas" hidden><b>Você ainda não salvou receitas</b>Toque no coração de uma receita para guardá-la aqui. Fica salvo neste aparelho.</span><br><button class="linkbtn" type="button" data-limpar>Limpar filtros</button></div>
<p class="parcial" id="parcial" hidden>Nenhuma receita leva todos esses ingredientes. Estas levam parte deles, das que mais combinam para as que menos combinam.</p>
<div class="grid" id="todas">${rec.map(cartao).join("")}</div>
</section>

${dados.livros.length ? `<section class="sec" aria-labelledby="h-livros"><div class="sec-h"><div><h2 id="h-livros">Prefere no papel?</h2><p>As receitas também estão em dois livros em PDF, prontos para imprimir.</p></div></div>
<div class="books">${dados.livros.map((l, i) => `<a class="book" href="${BASE}${esc(l.arquivo)}" download><img src="${BASE}assets/img/capa-volume-${i + 1}.jpg" alt="" width="78" height="110" loading="lazy"><span><b>${esc(l.titulo)}</b><span>PDF para imprimir</span></span></a>`).join("")}</div>
</section>` : ""}
</div>
</main>
${rodape}`;
  fs.writeFileSync(path.join(out, "index.html"), home);

  // ---------- guia ----------
  const progRows = Object.keys(DESC_PROG).map((p) => {
    const rs = rec.filter((r) => programas(r).includes(p));
    return rs.length ? `<tr><td>${esc(p)}</td><td>${esc(DESC_PROG[p])}</td><td>${rs.map((r) => `<a href="${urlR(r)}">${esc(r.titulo)}</a>`).join(", ")}</td></tr>` : "";
  }).join("");
  const guia = `${head({ title: "Guia da panificadora: ordem, medidas e programas | Pães do Manoel", description: "Como montar a forma, as medidas, o timer, o que faz cada programa da máquina de pão, a técnica dos pães recheados e como resolver os problemas mais comuns.", url: abs(`${BASE}guia/`), image: ogPadrao })}
<body>
${topo("guia")}
<main id="conteudo">
<section class="gh"><div class="wrap"><div class="eyebrow">Guia da máquina</div><h1>Tudo o que faz o pão <em>dar certo</em></h1><p class="lead">A ordem dos ingredientes, as medidas, quando usar o timer, o que cada programa faz e como resolver os problemas mais comuns.</p>
<p class="modelo">${ico("info")}<span>Receitas e guia feitos para a panificadora <b>Gallant de 19 programas (modelo GPA1E19A)</b>, com pães de 500 g, 750 g e 1 kg e timer de até 15 horas. Em outra máquina, os nomes dos programas, o timer e o tamanho da forma podem mudar: confira o manual dela.</span></p></div></section>
<div class="wrap glayout">
<nav class="toc" aria-label="Neste guia"><b>Neste guia</b><ol>
<li><a href="#ordem">A ordem que nunca falha</a></li><li><a href="#medidas">Medidas</a></li><li><a href="#timer">Timer da noite</a></li>
<li><a href="#depois">Depois de assar</a></li><li><a href="#programas">Os programas</a></li><li><a href="#recheados">Pães recheados</a></li>
<li><a href="#problemas">Deu errado?</a></li><li><a href="#cuidados">Cuidados com a máquina</a></li></ol></nav>
<div>
<section class="panel gsec" id="ordem"><h2>A ordem que nunca falha</h2>
<ol class="order"><li>Tire a forma da máquina antes de colocar qualquer ingrediente: o que cai na resistência queima e solta fumaça.</li>
<li>Encaixe a pá no eixo da forma.</li><li>Líquidos primeiro, em temperatura ambiente: água, leite, ovos, óleo. A manteiga vai derretida ou em pedacinhos.</li>
<li>Depois o sal e o açúcar, em cantos opostos, e as farinhas por cima, cobrindo todo o líquido.</li>
<li>O fermento por último, numa covinha no topo da farinha, sem tocar o líquido nem o sal.</li>
<li>Encaixe a forma girando no sentido horário até travar, feche a tampa, escolha o programa (MENU), o tamanho (PESO) e a cor (COR) e aperte INICIAR/PARAR.</li></ol>
<div class="layers" aria-hidden="true"><div style="background:#E9DCC6;color:#3B2A1E">Fermento<small>numa covinha, no topo</small></div><div style="background:#E2B65A;color:#33241A">Farinhas<small>cobrindo o líquido</small></div><div style="background:#D99A4E;color:#33241A">Sal e açúcar<small>em cantos opostos</small></div><div style="background:#3D6A92">Líquidos<small>água, leite, ovos, óleo</small></div><div style="background:#3B2A1E">Pá encaixada<small>no eixo da forma</small></div></div>
<p class="cap">Como a forma fica por dentro, de cima para baixo.</p></section>

<section class="panel gsec" id="medidas"><h2>Medidas</h2><p>As receitas usam a colher e o copo medidor que vêm com a máquina, ou colheres de medida comuns. Nas colheres, a medida é sempre rasa: encha e passe as costas de uma faca por cima. Para o melhor resultado, pese farinha e açúcar na balança.</p>
<div class="meas"><div><b>1 colher (chá)</b>5 ml: cerca de 3 g de fermento ou 6 g de sal</div><div><b>1 colher (sopa)</b>15 ml: cerca de 12 g de açúcar ou 8 g de farinha</div><div><b>ml</b>líquidos, no copo medidor, olhando na altura dos olhos</div><div><b>g</b>sólidos, de preferência na balança de cozinha</div></div>
<p><b>Fermento:</b> biológico seco instantâneo. Guarde na geladeira e confira a validade: o manual aponta fermento ruim como a causa mais comum de pão que não cresce. <b>Farinha:</b> de trigo para pão (mais glúten) deixa o pão mais alto. <b>Líquidos:</b> em temperatura ambiente, entre 20 °C e 25 °C, como pede o manual.</p></section>

<section class="panel gsec" id="timer"><h2>Timer da noite</h2><p>Com a função PROGRAMAR, a Gallant termina o pão na hora que você escolher, em até 15 horas (o tempo conta o programa inteiro). Escolha primeiro o programa, o tamanho e a cor e depois ajuste o tempo com as setas, de 10 em 10 minutos. A função não existe nos programas Sovar, Mingau, Descongelar, Fermentar, Geleia, Bolo e Assar.</p><p>O manual proíbe o timer com laticínios, ovos, creme ou queijo, porque estragam enquanto esperam. Por isso o selo <b>Timer da noite</b> só aparece nos pães sem esses ingredientes, e o fermento nunca pode encostar no líquido.</p>
<p><a class="more" href="${BASE}?timer=1#receitas">Ver as ${comTimer.length} receitas que podem ficar no timer</a></p></section>

<section class="panel gsec" id="depois"><h2>Depois de assar</h2><p>No fim, a máquina toca 10 bipes e passa para o Manter Aquecido por 1 hora. Tirar o pão logo evita que a casca escureça: segure INICIAR/PARAR por 3 segundos, tire a forma com luva (girando no sentido anti-horário), vire sobre uma grade e sacuda de leve. Se a pá ficar no pão, solte com uma espátula quando ele esfriar, nunca com a mão.</p><p>O manual recomenda esperar cerca de 20 minutos antes de fatiar, com faca de serra ou cortador elétrico. Guarde em saco plástico fechado por até 3 dias, ou até 10 dias na geladeira.</p></section>

<section class="panel gsec" id="programas"><h2>Os programas e quando usar cada um</h2><p>O tempo de cada ciclo aparece no visor da máquina quando você escolhe o programa e o tamanho.</p>
<table class="gtable"><thead><tr><th>Programa</th><th>O que faz</th><th>Receitas</th></tr></thead><tbody>${progRows}</tbody></table>
<p style="margin-top:14px">Tamanho (500, 750 ou 1000 g) só existe nos programas 1 a 7; a cor da casca, nos programas 1 a 7, Misturar e Assar, Bolo e Assar. O aviso de adição (10 bipes, para frutas, nozes e passas) também só existe nos programas 1 a 7, e o momento muda de um programa para outro. <b>Descongelar</b> mantém cerca de 50 °C e não é usado em nenhuma receita.</p></section>

<section class="panel gsec" id="recheados"><h2>A técnica dos pães recheados</h2><p>Na maior parte dos pães recheados do site, a máquina faz tudo, sem ligar o forno, com três programas em sequência. Nos outros, ela prepara a massa e você assa no forno; cada receita diz qual é o caso.</p>
<ol class="order"><li><b>Massa:</b> a máquina bate a massa e deixa crescer. O livro da Gallant limita esse programa a 1 kg de ingredientes, por isso as receitas com ele têm um tamanho só.</li><li>Você abre a massa num retângulo de 1 cm, com um lado de 17 cm (o comprimento interno da forma), espalha o recheio e enrola.</li><li>O rolo volta para a forma <b>sem a pá</b>, com a emenda para baixo.</li><li><b>Fermentar:</b> a massa cresce de novo até quase a borda.</li><li><b>Assar:</b> o pão assa e doura.</li></ol>
<p><a class="more" href="${BASE}?categoria=recheados#receitas">Ver os pães recheados</a></p></section>

<section class="panel gsec" id="problemas"><h2>Deu errado? Resolva aqui</h2><p>Quase todo problema vem da medida, da temperatura ou do fermento. Toque no problema para ver a causa e a solução, e mude uma coisa por vez na próxima fornada.</p>
<div class="prob">${PROBLEMAS.map(([t, d]) => `<details><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join("")}</div></section>

<section class="panel gsec" id="cuidados"><h2>Cuidados com a máquina</h2><p><b>Antes do primeiro uso:</b> lave e seque a forma e a pá e rode o programa Assar com a máquina vazia por cerca de 10 minutos. Um pouco de fumaça ou cheiro é normal nas primeiras vezes.</p><p><b>Limpeza:</b> desligue da tomada e espere esfriar. A forma e a pá podem ir à lava-louças; o lado de fora da forma pode mudar de cor, o que é normal. Se a pá estiver difícil de soltar, deixe água no fundo da forma por até 1 hora. Não use utensílios de metal, nem produtos abrasivos, no antiaderente. O gabinete, a tampa e a janela, só com pano úmido.</p><p><b>Uso:</b> deixe a máquina no centro da bancada, porque ela balança durante a sova, e num ambiente entre 15 °C e 34 °C. Se faltar luz por até 10 minutos, o programa continua sozinho.</p></section>
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

  if (SOZINHO) {
    // site próprio: redirecionamentos das receitas que mudaram, cabeçalhos e robots.txt
    const redir = JSON.parse(fs.readFileSync(path.join(src, "redirecionamentos.json"), "utf8")).redirecionamentos;
    fs.writeFileSync(path.join(out, "_redirects"), ["# Quem digitar o caminho antigo dentro do subdomínio", "/receitas / 301", "/receitas/* /:splat 301",
      "# Receitas que mudaram de endereço ou saíram do catálogo (static-receitas/redirecionamentos.json)",
      ...redir.flatMap(({ de, para }) => [`/${de} /${para ? para + "/" : ""} 301`, `/${de}/ /${para ? para + "/" : ""} 301`]), ""].join("\n"));
    fs.writeFileSync(path.join(out, "_headers"), PREVIA ? "/*\n  X-Robots-Tag: noindex\n" : "");
    fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\n${PREVIA ? "" : `\nSitemap: ${abs("/sitemap.xml")}\n`}`);
  }
  console.log(`[receitas] ${rec.length} receitas geradas em ${path.relative(root, out)}${SOZINHO ? ` (${origem}${PREVIA ? ", noindex até a virada" : ""})` : ""}`);
}

module.exports = build;
if (require.main === module) {
  const arg = process.argv.find((a) => a.startsWith("--saida="));
  build({ sozinho: process.argv.includes("--sozinho"), saida: arg ? path.resolve(root, arg.slice(8)) : undefined });
}
