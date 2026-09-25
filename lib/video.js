// Detecta um link de vídeo (YouTube, Vimeo ou Instagram) e devolve o HTML de
// um player responsivo embutido. Usado em dois lugares:
//
//  1. Pelo plugin de markdown-it (pluginVideoEmbed, abaixo) — quando um link
//     de vídeo aparece SOZINHO numa linha do texto do post (um parágrafo cujo
//     único conteúdo é a URL), o parágrafo inteiro é trocado pelo player. É
//     assim que dá pra colocar um vídeo no meio do texto sem aprender HTML:
//     basta colar o link na linha onde ele deve aparecer.
//  2. Pelo campo "Vídeo de capa" do post (post.njk), pra desenhar o mesmo
//     player no topo do post, no lugar da foto de capa.
//
// Só reconhece link "puro" (a URL inteira, sem mais nada no texto) — um link
// dentro de uma frase (ex.: "veja em https://...") não vira player, fica só
// um link normal, pra não surpreender quem está escrevendo.

const PADROES = [
    // youtube.com/watch?v=ID — formato horizontal (16:9)
    {
          regex: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          vertical: false
    },
    // youtu.be/ID — link curto do YouTube, também horizontal
    {
          regex: /^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          vertical: false
    },
    // youtube.com/shorts/ID — Shorts, formato vertical (9:16)
    {
          regex: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          vertical: true
    },
    // vimeo.com/ID — horizontal
    {
          regex: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
          embed: (id) => `https://player.vimeo.com/video/${id}`,
          vertical: false
    },
    // instagram.com/reel/CODE, /p/CODE ou /tv/CODE — Reels são verticais; posts
    // "/p/" às vezes são quadrados/horizontais, mas o player do Instagram se
    // ajusta sozinho, então tratamos todos como vertical (o formato mais comum).
    {
          regex: /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/,
          embed: (_id, urlOriginal) => `${urlOriginal.split("?")[0].replace(/\/$/, "")}/embed`,
          vertical: true
    }
];

// Reconhece uma URL de vídeo suportada. Devolve { src, vertical } pro
// iframe, ou null se a URL não bate com nenhum padrão conhecido (nesse caso
// quem chamou deve tratar como um link comum, nunca inventar um player).
function reconhecerVideo(urlBruta) {
    const url = String(urlBruta || "").trim();
    for (const padrao of PADROES) {
          const m = url.match(padrao.regex);
          if (m) return { src: padrao.embed(m[1], url), vertical: padrao.vertical };
    }
    return null;
}

// HTML do player responsivo. `titulo` vira o atributo title do iframe
// (acessibilidade — mesma prática já usada no mapa embutido do Google).
function videoEmbedHtml(urlBruta, titulo) {
    const info = reconhecerVideo(urlBruta);
    if (!info) return null;
    const classe = info.vertical ? "video-embed video-embed--vertical" : "video-embed";
    const tituloSeguro = String(titulo || "Vídeo").replace(/"/g, "&quot;");
    return (
          `<div class="${classe}">` +
          `<iframe src="${info.src}" title="${tituloSeguro}" loading="lazy" ` +
          `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
          `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` +
          `</div>`
    );
}

// Plugin de markdown-it: depois do parse do markdown, procura parágrafos
// cujo ÚNICO conteúdo é uma URL de vídeo reconhecida e troca o parágrafo
// inteiro por um bloco de HTML com o player. Não mexe em links de vídeo que
// aparecem no meio de uma frase — só quando a linha inteira é só o link.
function pluginVideoEmbed(md) {
    md.core.ruler.push("video_embed", (state) => {
          const tokens = state.tokens;
          for (let i = 0; i < tokens.length - 2; i++) {
                  if (tokens[i].type !== "paragraph_open") continue;
                  const inline = tokens[i + 1];
                  const fechamento = tokens[i + 2];
                  if (!inline || inline.type !== "inline" || !fechamento || fechamento.type !== "paragraph_close") continue;

                  const textoBruto = (inline.content || "").trim();
                  const html = videoEmbedHtml(textoBruto, null);
                  if (!html) continue;

                  const htmlToken = new state.Token("html_block", "", 0);
                  htmlToken.content = html;
                  htmlToken.map = tokens[i].map;
                  tokens.splice(i, 3, htmlToken);
          }
    });
}

module.exports = { reconhecerVideo, videoEmbedHtml, pluginVideoEmbed };
