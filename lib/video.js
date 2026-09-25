// Detecta um link de vídeo (YouTube, Vimeo ou Instagram) e devolve o HTML de
// uma "capa clicável" (thumbnail + botão de play) — o player de verdade só é
// criado no navegador quando a pessoa clica (ver o script em
// _includes/base.njk que faz essa troca). Isso evita carregar o iframe do
// YouTube/Vimeo/Instagram — e os scripts de rastreamento deles — em toda
// visita a um post com vídeo, só em quem realmente assiste. Usado em dois
// lugares:
//
//  1. Pelo plugin de markdown-it (pluginVideoEmbed, abaixo) — quando um link
//     de vídeo aparece SOZINHO numa linha do texto do post (um parágrafo cujo
//     único conteúdo é a URL), o parágrafo inteiro é trocado pela capa. É
//     assim que dá pra colocar um vídeo no meio do texto sem aprender HTML:
//     basta colar o link na linha onde ele deve aparecer.
//  2. Pelo campo "Vídeo de capa" do post (post.njk), pra desenhar a mesma
//     capa no topo do post, no lugar da foto de capa.
//
// Só reconhece link "puro" (a URL inteira, sem mais nada no texto) — um link
// dentro de uma frase (ex.: "veja em https://...") não vira player, fica só
// um link normal, pra não surpreender quem está escrevendo.
//
// Sem JavaScript no navegador, a capa ainda funciona: o <noscript> dentro
// dela traz o player de verdade direto (mesmo comportamento de antes),
// então ninguém fica sem conseguir assistir.

const PADROES = [
    // youtube.com/watch?v=ID — formato horizontal (16:9)
    {
          regex: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          thumb: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          vertical: false
    },
    // youtu.be/ID — link curto do YouTube, também horizontal
    {
          regex: /^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          thumb: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          vertical: false
    },
    // youtube.com/shorts/ID — Shorts, formato vertical (9:16)
    {
          regex: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
          embed: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
          thumb: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          vertical: true
    },
    // vimeo.com/ID — horizontal. O Vimeo não tem uma URL de thumbnail fixa
    // (precisaria de uma chamada de API), então mostra um retângulo com o
    // nome "Vimeo" no lugar da miniatura — sem depender de serviço externo.
    {
          regex: /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
          embed: (id) => `https://player.vimeo.com/video/${id}`,
          thumb: null,
          label: "Vimeo",
          vertical: false
    },
    // instagram.com/reel/CODE ou /reels/CODE — Reels são sempre verticais
    // (9:16). Mesma limitação do Vimeo: sem thumbnail fixa, mostra o nome
    // "Instagram".
    {
          regex: /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels)\/([a-zA-Z0-9_-]+)/,
          embed: (_id, urlOriginal) => `${urlOriginal.split("?")[0].replace(/\/$/, "")}/embed`,
          thumb: null,
          label: "Instagram",
          vertical: true
    },
    // instagram.com/tv/CODE — vídeos do IGTV, também verticais.
    {
          regex: /^https?:\/\/(?:www\.)?instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
          embed: (_id, urlOriginal) => `${urlOriginal.split("?")[0].replace(/\/$/, "")}/embed`,
          thumb: null,
          label: "Instagram",
          vertical: true
    },
    // instagram.com/p/CODE — posts comuns podem ser quadrados, horizontais ou
    // verticais, sem uma forma confiável de saber qual sem chamar a API do
    // Instagram. Sem essa confirmação, não presumimos vertical: tratamos como
    // horizontal (formato mais neutro — um vídeo quadrado ou vertical real
    // ainda cabe dentro do player, só sem preencher toda a largura).
    {
          regex: /^https?:\/\/(?:www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
          embed: (_id, urlOriginal) => `${urlOriginal.split("?")[0].replace(/\/$/, "")}/embed`,
          thumb: null,
          label: "Instagram",
          vertical: false
    }
];

// Reconhece uma URL de vídeo suportada. Devolve { src, thumb, label,
// vertical }, ou null se a URL não bate com nenhum padrão conhecido (nesse
// caso quem chamou deve tratar como um link comum, nunca inventar um player).
function reconhecerVideo(urlBruta) {
    const url = String(urlBruta || "").trim();
    for (const padrao of PADROES) {
          const m = url.match(padrao.regex);
          if (m) {
                  return {
                            src: padrao.embed(m[1], url),
                            thumb: padrao.thumb ? padrao.thumb(m[1]) : null,
                            label: padrao.label || null,
                            vertical: padrao.vertical
                  };
          }
    }
    return null;
}

const ICONE_PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" fill="currentColor"/></svg>';

// Atributos comuns do iframe do player — os mesmos usados tanto no
// <noscript> (sem JS) quanto pelo script em base.njk (depois do clique).
const IFRAME_ALLOW =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

// HTML da capa clicável. `titulo` vira o texto de acessibilidade do botão de
// play e o title do iframe (mesma prática já usada no mapa embutido do
// Google).
function videoEmbedHtml(urlBruta, titulo) {
    const info = reconhecerVideo(urlBruta);
    if (!info) return null;

    const classe = info.vertical ? "video-embed video-embed--vertical" : "video-embed";
    const tituloSeguro = String(titulo || "Vídeo").replace(/"/g, "&quot;");

    const capaHtml = info.thumb
          ? `<img src="${info.thumb}" alt="" loading="lazy" decoding="async">`
          : `<div class="video-facade-placeholder" aria-hidden="true">${info.label}</div>`;

    const iframeSemJs =
          `<iframe src="${info.src}" title="${tituloSeguro}" loading="lazy" allow="${IFRAME_ALLOW}" ` +
          `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

    return (
          `<div class="${classe} video-facade" data-embed-src="${info.src}" data-embed-title="${tituloSeguro}" data-embed-allow="${IFRAME_ALLOW}" data-embed-autoplay="1">` +
          capaHtml +
          `<button type="button" class="video-play-btn" aria-label="Reproduzir vídeo: ${tituloSeguro}">${ICONE_PLAY}</button>` +
          `<noscript>${iframeSemJs}</noscript>` +
          `</div>`
    );
}

// Plugin de markdown-it: depois do parse do markdown, procura parágrafos
// cujo ÚNICO conteúdo é uma URL de vídeo reconhecida e troca o parágrafo
// inteiro por um bloco de HTML com a capa clicável. Não mexe em links de
// vídeo que aparecem no meio de uma frase — só quando a linha inteira é só
// o link.
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
