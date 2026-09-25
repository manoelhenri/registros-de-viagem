module.exports = function (eleventyConfig) {
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
    const markdownIt = require("markdown-it");
    const { pluginVideoEmbed, videoEmbedHtml } = require("./lib/video.js");
    eleventyConfig.setLibrary("md", markdownIt({ html: true }).use(pluginVideoEmbed));

    // Usado pelo campo "Vídeo de capa" do post (post.njk), pra desenhar o
    // mesmo player no topo do post quando não é um link solto no meio do
    // texto. Devolve "" (nunca quebra o build) se o link não for reconhecido.
    eleventyConfig.addFilter("videoEmbed", (url, titulo) => videoEmbedHtml(url, titulo) || "");

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
    // "localizacaoMapa" contra os nomes que já existem em destinos.json e
    // parques.json. Um pedaço que não bate com nada conhecido é ignorado —
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
    // autor visitou os lugares), com o slug do destino quando existe uma
    // página correspondente — e null quando não bate com nada conhecido
    // (nesse caso a parada aparece como texto simples, nunca vira link
    // inventado). Só usa o campo "cidades", nunca "localizacaoMapa" (que é
    // só um ponto de referência para o mapa embutido, não uma rota).
    eleventyConfig.addFilter("rotaDoPost", (post, destinos) => {
          const data = post.data || post;
          if (!data.cidades) return [];
          const conhecidas = listaCidades(destinos);
          return data.cidades
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((nomeBruto) => {
                      const norm = normalizar(nomeBruto);
                      const achado = conhecidas.find((c) => c.norm === norm);
                      return { nome: nomeBruto, slug: achado ? achado.slug : null };
            });
    });

    eleventyConfig.addFilter("parquesDoPost", (post, parques) =>
          acharCorrespondencias(pedacosDoPost(post), listaParques(parques))
                               );

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
