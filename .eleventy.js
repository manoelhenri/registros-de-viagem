// ---------------------------------------------------------------------
// Validações de build: pegam erros de dado antes de publicar, sem exigir
// que alguém abra cada post/cadastro manualmente pra conferir. Rodam toda
// vez que o build é configurado (build normal ou --serve).
//
// - ERRO (interrompe o build): mais de um post com "destaque: true" — só
//   um post pode ser o destaque da home por vez.
// - AVISO (não interrompe, só aparece no terminal do build): um destino ou
//   parque cadastrado sem coordenada em coordsMapa.json (não aparece no
//   mapa interativo); ou uma cidade/parque citada num post que não bate
//   com o cadastro, quando pelo menos outra cidade/parque do mesmo post
//   bate — sinal de que aquele pedaço provavelmente é um lugar de verdade
//   com o nome escrito diferente do cadastro (e não um texto livre tipo
//   "6 pessoas", que nunca aparece misturado com lugares de verdade).
// ---------------------------------------------------------------------
function validarBuild() {
    const fs = require("fs");
    const path = require("path");
    const matter = require("gray-matter");
    const { normalizar, listaCidades, listaParques } = require("./lib/geo.js");

    const dataDir = path.join(__dirname, "_data");
    const destinosData = JSON.parse(fs.readFileSync(path.join(dataDir, "destinosData.json"), "utf8"));
    const parquesData = JSON.parse(fs.readFileSync(path.join(dataDir, "parquesData.json"), "utf8"));
    const coordsMapa = JSON.parse(fs.readFileSync(path.join(dataDir, "coordsMapa.json"), "utf8"));

    const destinosConhecidos = listaCidades(destinosData.destinos, coordsMapa);
    const parquesConhecidos = listaParques(parquesData.parques, coordsMapa);

    // --- erro: mais de um post em destaque ---------------------------------
    const postsDir = path.join(__dirname, "content/posts");
    const arquivosPosts = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
    const posts = arquivosPosts.map((arquivo) => {
          const bruto = fs.readFileSync(path.join(postsDir, arquivo), "utf8");
          const { data } = matter(bruto);
          return { arquivo, data };
    });

    const emDestaque = posts.filter((p) => p.data.destaque === true);
    if (emDestaque.length > 1) {
          throw new Error(
                `Build interrompido: ${emDestaque.length} posts marcados com "destaque: true" ` +
              `(${emDestaque.map((p) => p.arquivo).join(", ")}). Só um post pode ser o destaque da home por vez.`
                                     );
    }

    // --- aviso: destino/parque cadastrado sem coordenada --------------------
    const avisos = [];
    destinosConhecidos.forEach((c) => {
          if (c.lat == null || c.lng == null) {
                  avisos.push(`Destino "${c.nome}" (${c.pais}) não tem coordenada em _data/coordsMapa.json — não aparece no mapa interativo.`);
          }
    });
    parquesConhecidos.forEach((p) => {
          if (p.lat == null || p.lng == null) {
                  avisos.push(`Parque "${p.nome}" (${p.grupo}) não tem coordenada em _data/coordsMapa.json — não aparece no mapa interativo.`);
          }
    });

    // --- aviso: cidade/parque de um post que não bate com o cadastro --------
    posts.forEach((post) => {
          if (!post.data.cidades) return;
          const pedacos = post.data.cidades.split(",").map((p) => p.trim()).filter(Boolean);
          if (pedacos.length < 2) return; // item único: pode ser texto livre ("6 pessoas") — nunca avisa

          const resultados = pedacos.map((pedaco) => {
                  const norm = normalizar(pedaco);
                  const bate = destinosConhecidos.some((c) => c.norm === norm) || parquesConhecidos.some((p) => p.norm === norm);
                  return { pedaco, bate };
          });
          const algumBateu = resultados.some((r) => r.bate);
          if (!algumBateu) return; // nenhum pedaço bateu: provavelmente todo o campo é texto livre

          resultados.filter((r) => !r.bate).forEach((r) => {
                  avisos.push(`Post "${post.arquivo}": "${r.pedaco}" (em "cidades") não bate com nenhum destino/parque cadastrado — confira o nome ou cadastre o lugar.`);
          });
    });

    if (avisos.length) {
          console.warn(`\n⚠ Avisos de build (${avisos.length}) — não impedem a publicação:`);
          avisos.forEach((a) => console.warn(`  - ${a}`));
          console.warn("");
    }
}

module.exports = function (eleventyConfig) {
    validarBuild();

    // Static passthrough: images uploaded via the admin panel, the stylesheet,
    // and the admin panel itself (Decap CMS) go straight to the output folder.
    eleventyConfig.addPassthroughCopy("images");
    eleventyConfig.addPassthroughCopy("style.css");
    eleventyConfig.addPassthroughCopy("admin");
    eleventyConfig.addPassthroughCopy("robots.txt");

    // markdown-it com o plugin de vídeo (lib/video.js): quando um link de
    // YouTube/Vimeo/Instagram aparece sozinho numa linha do corpo do post,
    // vira um player embutido em vez de só um link. "html: true" mantém o
    // comportamento padrão do Eleventy (permite HTML solto no markdown).
    // "Dicas que fazem diferença" / "Vale a pena?": ver lib/callout.js —
    // envolve esses headings (quando existem) num bloco destacado, sem
    // reescrever nenhuma palavra do texto original (Bloco 5, item 22).
    const markdownIt = require("markdown-it");
    const { pluginVideoEmbed, videoEmbedHtml } = require("./lib/video.js");
    const { pluginCallout } = require("./lib/callout.js");
    eleventyConfig.setLibrary("md", markdownIt({ html: true }).use(pluginVideoEmbed).use(pluginCallout));

    // Usado pelo campo "Vídeo de capa" do post (post.njk), pra desenhar o
    // mesmo player no topo do post quando não é um link solto no meio do
    // texto. Devolve "" (nunca quebra o build) se o link não for reconhecido.
    eleventyConfig.addFilter("videoEmbed", (url, titulo) => videoEmbedHtml(url, titulo) || "");

    // Capa clicável de mapa do Google (lib/mapa-embed.js) — usada no lugar do
    // iframe direto em post.njk/destino.njk/parque.njk (Bloco 6, item 24).
    // Devolve "" (nunca quebra o build) se não houver texto de busca.
    const { mapaEmbedHtml } = require("./lib/mapa-embed.js");
    eleventyConfig.addFilter("mapaEmbed", (query, titulo) => mapaEmbedHtml(query, titulo) || "");

    eleventyConfig.addFilter("pad2", (num) => String(num).padStart(2, "0"));

    eleventyConfig.addFilter("dataAno", (dateObj) => {
          if (!dateObj) return "";
          const d = new Date(dateObj);
          return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    });

    // ISO 8601 date (YYYY-MM-DD), used for structured data and the RSS/sitemap feeds.
    eleventyConfig.addFilter("isoDate", (dateObj) => {
          if (!dateObj) return "";
          return new Date(dateObj).toISOString();
    });

    // RFC 822 date, required by the RSS <pubDate> spec.
    eleventyConfig.addFilter("rfc822Date", (dateObj) => {
          if (!dateObj) return "";
          return new Date(dateObj).toUTCString();
    });

    // Used to safely drop free-text place names into a Google Maps embed URL.
    eleventyConfig.addFilter("encodeURI", (str) => encodeURIComponent(str || ""));

    // Safe string escaping for values dropped inside JSON-LD / RSS XML.
    eleventyConfig.addFilter("escapeJson", (str) => JSON.stringify(str || "").slice(1, -1));
    eleventyConfig.addFilter("escapeXml", (str) =>
          String(str || "")
                                   .replace(/&/g, "&amp;")
                                   .replace(/</g, "&lt;")
                                   .replace(/>/g, "&gt;")
                                   .replace(/"/g, "&quot;")
                                   .replace(/'/g, "&apos;")
                               );

    // Used on post pages to build the "related posts" list, excluding the current one.
    eleventyConfig.addFilter("excludeUrl", (posts, url) =>
          (posts || []).filter((p) => p.url !== url)
                               );

    // Rough reading-time estimate from the rendered post HTML (~200 wpm, pt-BR).
    eleventyConfig.addFilter("readingTime", (html) => {
          const text = String(html || "").replace(/<[^>]+>/g, " ");
          const words = text.trim().split(/\s+/).filter(Boolean).length;
          return Math.max(1, Math.round(words / 200));
    });

    // ---------------------------------------------------------------------
    // Relacionamentos: post <-> destino, post <-> parque
    //
    // O campo "cidades" do front matter de um post nem sempre é uma lista de
    // cidades de verdade — em alguns posts é um texto tipo "7 cidades" ou
    // "6 pessoas". Por isso o matching nunca assume que "cidades" é sempre
    // uma lista: ele tenta casar cada pedaço (separado por vírgula) e o campo
    // "localizacaoMapa" contra os nomes que já existem em destinosData.json e
    // parquesData.json. Um pedaço que não bate com nada conhecido é ignorado —
    // nunca vira um destino ou parque inventado.
    // ---------------------------------------------------------------------

    // normalizar/slugify/listaCidades/listaParques vêm de lib/geo.js — a
    // mesma fonte usada por _data/destinosFlat.js e _data/parquesFlat.js,
    // para o slug de uma cidade/parque ser sempre idêntico entre os links
    // gerados aqui e as páginas individuais geradas por paginação.
    const { normalizar, slugify, listaCidades, listaParques } = require("./lib/geo.js");

    eleventyConfig.addFilter("slugify", slugify);

    // Serializa um valor como JSON para embutir em <script> (ex.: dados do mapa).
    eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

    // Pedaços de texto que podem referenciar lugares num post: cada item de
    // "cidades" (separado por vírgula) mais cada item de "localizacaoMapa"
    // (também separado por vírgula — normalmente "Cidade, Estado, País").
    //
    // Cada pedaço é comparado por IGUALDADE exata (normalizada), nunca por
    // "contém". Comparar por substring fazia "Porto" (cidade em Portugal)
    // bater dentro de "Porto Seguro" ou "Porto de Galinhas" (cidades
    // diferentes, no Brasil) só porque uma string contém a outra — um
    // pedaço que não é exatamente igual a um destino/parque conhecido é
    // ignorado, nunca vira um destino ou parque inventado.
    function pedacosDoPost(post) {
          const data = post.data || post;
          const pedacos = [];
          if (data.cidades) {
                  data.cidades.split(",").forEach((p) => {
                            const t = p.trim();
                            if (t) pedacos.push(t);
                  });
          }
          if (data.localizacaoMapa) {
                  data.localizacaoMapa.split(",").forEach((p) => {
                            const t = p.trim();
                            if (t) pedacos.push(t);
                  });
          }
          return pedacos;
    }

    // Acha, entre os pedaços de texto do post, quais cidades/parques
    // conhecidos aparecem — por igualdade exata (normalizada) apenas.
    function acharCorrespondencias(pedacos, itens) {
          const achados = new Map();
          pedacos.forEach((pedaco) => {
                  const normPedaco = normalizar(pedaco);
                  if (!normPedaco) return;
                  itens.forEach((item) => {
                            if (item.norm && item.norm === normPedaco) achados.set(item.slug, item);
                  });
          });
          return Array.from(achados.values());
    }

    eleventyConfig.addFilter("destinosDoPost", (post, destinos) =>
          acharCorrespondencias(pedacosDoPost(post), listaCidades(destinos))
                               );

    // Rota visual: a ordem em que o post escreveu "cidades" (a ordem em que o
    // autor visitou os lugares), com o slug e o tipo (destino OU parque)
    // quando existe uma página correspondente — e slug/tipo null quando não
    // bate com nada conhecido (nesse caso a parada aparece como texto
    // simples, nunca vira link inventado). Cada pedaço é testado primeiro
    // contra destinos e, se não achar, contra parques — mesma regra de
    // igualdade exata (normalizada) usada em pedacosDoPost/acharCorrespondencias,
    // nunca por substring. Só usa o campo "cidades", nunca "localizacaoMapa"
    // (que é só um ponto de referência para o mapa embutido, não uma rota).
    eleventyConfig.addFilter("rotaDoPost", (post, destinos, parques) => {
          const data = post.data || post;
          if (!data.cidades) return [];
          const destinosConhecidos = listaCidades(destinos);
          const parquesConhecidos = listaParques(parques || []);
          return data.cidades
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((nomeBruto) => {
                      const norm = normalizar(nomeBruto);
                      const destinoAchado = destinosConhecidos.find((c) => c.norm === norm);
                      if (destinoAchado) {
                              return { nome: nomeBruto, slug: destinoAchado.slug, tipo: "destino" };
                      }
                      const parqueAchado = parquesConhecidos.find((p) => p.norm === norm);
                      if (parqueAchado) {
                              return { nome: nomeBruto, slug: parqueAchado.slug, tipo: "parque" };
                      }
                      return { nome: nomeBruto, slug: null, tipo: null };
            });
    });

    eleventyConfig.addFilter("parquesDoPost", (post, parques) =>
          acharCorrespondencias(pedacosDoPost(post), listaParques(parques))
                               );

    // Ano da viagem (número), a partir do front matter "data" — usado pelo
    // filtro por ano de /posts/ e pelo <select> correspondente.
    eleventyConfig.addFilter("ano", (dateObj) => (dateObj ? new Date(dateObj).getFullYear() : ""));

    // Lista de anos distintos entre os posts, do mais recente pro mais
    // antigo — usada pra montar as opções do filtro por ano em /posts/.
    eleventyConfig.addFilter("anosDosPosts", (posts) => {
          const anos = new Set((posts || []).map((p) => new Date(p.data.data).getFullYear()));
          return Array.from(anos).sort((a, b) => b - a);
    });

    // "Brasil" ou "exterior", pra filtrar /posts/ por região: exterior se
    // QUALQUER destino/parque resolvido do post não for do Brasil (ex.: Foz
    // do Iguaçu, que mistura Brasil e Paraguai, conta como exterior — é uma
    // viagem internacional). Cai em "brasil" quando nada é resolvido (não
    // deveria acontecer com os dados reais — ver validações de build).
    eleventyConfig.addFilter("regiaoDoPost", (post, destinos, parques) => {
          const destinosPost = acharCorrespondencias(pedacosDoPost(post), listaCidades(destinos));
          const parquesPost = acharCorrespondencias(pedacosDoPost(post), listaParques(parques));
          const temDestinoForaDoBrasil = destinosPost.some((d) => d.pais !== "Brasil");
          const temParqueForaDoBrasil = parquesPost.some((p) => !String(p.local || "").startsWith("Brasil"));
          return temDestinoForaDoBrasil || temParqueForaDoBrasil ? "exterior" : "brasil";
    });

    // Número de países distintos entre os destinos resolvidos de um post —
    // usado na ficha da viagem.
    eleventyConfig.addFilter("paisesUnicos", (destinosViagem) =>
          new Set((destinosViagem || []).map((d) => d.pais)).size
                               );

    // Posts cujo "cidades"/"localizacaoMapa" batem com o nome de uma cidade
    // (igualdade exata por pedaço — ver comentário de pedacosDoPost acima).
    eleventyConfig.addFilter("postsDaCidade", (cidadeNome, posts) => {
          const normCidade = normalizar(cidadeNome);
          return (posts || []).filter((post) =>
                  pedacosDoPost(post).some((pedaco) => normalizar(pedaco) === normCidade)
                                          );
    });

    // Posts cujo "cidades"/"localizacaoMapa" batem com o nome de um parque.
    eleventyConfig.addFilter("postsDoParque", (parqueNome, posts) => {
          const normParque = normalizar(parqueNome);
          return (posts || []).filter((post) =>
                  pedacosDoPost(post).some((pedaco) => normalizar(pedaco) === normParque)
                                          );
    });

    // Maior ano numérico de uma lista "anos" (ex.: ["2017", "2021"]) — usada
    // na página de destino/parque pra mostrar a "última visita" (Bloco 4,
    // item 20). Cai no último item da lista, sem comparar, quando nenhum ano
    // é numérico (ex.: só "várias visitas") — mesma lógica de anosNumericos
    // já usada no filtro por ano do mapa (mapa.njk).
    eleventyConfig.addFilter("ultimaVisita", (anos) => {
          const numericos = (anos || []).map(String).filter((a) => /^\d{4}$/.test(a));
          if (numericos.length) return Math.max(...numericos.map(Number));
          return (anos && anos[anos.length - 1]) || "";
    });

    // Destinos/parques relacionados a um lugar (Bloco 4, item 20): cruza os
    // posts que passam por esse lugar com os OUTROS destinos/parques que
    // aparecem nos mesmos posts — "quem visitou esse lugar também visitou".
    // Mesma regra de igualdade exata (normalizada) usada no resto do
    // arquivo, nunca por substring; o próprio lugar nunca aparece na lista.
    eleventyConfig.addFilter("lugaresRelacionados", (nomeLugar, posts, destinos, parques) => {
          const normLugar = normalizar(nomeLugar);
          const postsRelacionados = (posts || []).filter((post) =>
                  pedacosDoPost(post).some((pedaco) => normalizar(pedaco) === normLugar)
                                                );
          const destinosConhecidos = listaCidades(destinos);
          const parquesConhecidos = listaParques(parques);
          const achados = new Map();

          postsRelacionados.forEach((post) => {
                  const pedacos = pedacosDoPost(post);
                  acharCorrespondencias(pedacos, destinosConhecidos).forEach((d) => {
                            if (d.norm === normLugar) return;
                            achados.set("destino:" + d.slug, { nome: d.nome, slug: d.slug, tipo: "destino", bandeira: d.bandeira });
                  });
                  acharCorrespondencias(pedacos, parquesConhecidos).forEach((p) => {
                            if (p.norm === normLugar) return;
                            achados.set("parque:" + p.slug, { nome: p.nome, slug: p.slug, tipo: "parque", icone: p.icone });
                  });
          });

          return Array.from(achados.values());
    });

    // Recomendações relacionadas, em ordem de prioridade:
    // 1) mesma cidade  2) mesmo país  3) mais recente.
    eleventyConfig.addFilter("relacionadosDe", (post, posts, destinos, limite) => {
          limite = limite || 3;
          const cidadesDoPost = acharCorrespondencias(pedacosDoPost(post), listaCidades(destinos));
          const cidadesNomes = new Set(cidadesDoPost.map((c) => c.norm));
          const paisesDoPost = new Set(cidadesDoPost.map((c) => normalizar(c.pais)));

                                 const candidatos = (posts || [])
            .filter((p) => p.url !== post.url)
            .map((p) => {
                      const cidadesP = acharCorrespondencias(pedacosDoPost(p), listaCidades(destinos));
                      const mesmaCidade = cidadesP.some((c) => cidadesNomes.has(c.norm));
                      const mesmoPais = cidadesP.some((c) => paisesDoPost.has(normalizar(c.pais)));
                      let score = 0;
                      if (mesmaCidade) score = 3;
                      else if (mesmoPais) score = 2;
                      else score = 1;
                      return { post: p, score, data: new Date(p.data.data) };
            })
            .sort((a, b) => {
                      if (b.score !== a.score) return b.score - a.score;
                      return b.data - a.data;
            });

                                 return candidatos.slice(0, limite).map((c) => c.post);
    });

    // Viagem anterior/próxima na ordem histórica (mesma ordem de
    // collections.posts: mais recente primeiro). "Anterior" é a viagem mais
    // antiga que esta; "Próxima" é a viagem mais recente que esta — nomeado
    // do ponto de vista de quem está lendo em ordem cronológica de viagem.
    // Complementar aos "Outros registros" (relacionadosDe) já existentes,
    // nunca substitui.
    eleventyConfig.addFilter("vizinhosDoPost", (post, posts) => {
          const lista = posts || [];
          const indice = lista.findIndex((p) => p.url === post.url);
          if (indice === -1) return { anterior: null, proximo: null };
          return {
                  anterior: lista[indice + 1] || null,
                  proximo: indice > 0 ? lista[indice - 1] : null
          };
    });

    eleventyConfig.addCollection("posts", (collectionApi) => {
          return collectionApi.getFilteredByGlob("content/posts/*.md")
            .sort((a, b) => new Date(b.data.data) - new Date(a.data.data));
    });

    // Whichever post is marked "destaque: true" in the front matter (falls
    // back to the newest post when none is marked) — used on the homepage.
    eleventyConfig.addCollection("postoDestaque", (collectionApi) => {
          const posts = collectionApi.getFilteredByGlob("content/posts/*.md")
            .sort((a, b) => new Date(b.data.data) - new Date(a.data.data));
          return posts.find((p) => p.data.destaque) || posts[0];
    });

    // Posts agrupados por ano (mais recente primeiro), para a página /timeline/.
    eleventyConfig.addCollection("timeline", (collectionApi) => {
          const posts = collectionApi.getFilteredByGlob("content/posts/*.md")
            .sort((a, b) => new Date(b.data.data) - new Date(a.data.data));
          const porAno = new Map();
          posts.forEach((post) => {
                  const ano = new Date(post.data.data).getFullYear();
                  if (!porAno.has(ano)) porAno.set(ano, []);
                  porAno.get(ano).push(post);
          });
          return Array.from(porAno.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([ano, posts]) => ({ ano, posts }));
    });

    return {
          dir: {
                  input: ".",
                  includes: "_includes",
                  data: "_data",
                  output: "_site"
          },
          markdownTemplateEngine: "njk",
          htmlTemplateEngine: "njk",
          templateFormats: ["njk", "md", "html"]
    };
};
