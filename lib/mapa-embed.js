// HTML da "capa clicável" de um mapa do Google embutido — mesmo padrão da
// capa de vídeo em lib/video.js (Bloco/Fase de vídeo): o iframe real só é
// criado no clique (ver o script em _includes/base.njk), em vez de carregar
// o mapa do Google — e os scripts dele — em toda visita a uma página com
// mapa embutido (post, destino ou parque).
//
// O Google Maps embutido não tem uma URL de thumbnail fixa sem chamar uma
// API paga, então a capa mostra um retângulo com um ícone de mapa no lugar
// da miniatura — mesma solução já usada pra Vimeo/Instagram em lib/video.js.
//
// Sem JavaScript no navegador, o <noscript> dentro da capa traz o iframe de
// verdade direto, então ninguém fica sem conseguir ver o mapa.
function mapaEmbedHtml(query, titulo) {
    const queryLimpa = String(query || "").trim();
    if (!queryLimpa) return null;

    const src = `https://www.google.com/maps?q=${encodeURIComponent(queryLimpa)}&output=embed`;
    const tituloSeguro = String(titulo || queryLimpa).replace(/"/g, "&quot;");

    const iframeSemJs =
          `<iframe src="${src}" title="Mapa de ${tituloSeguro}" loading="lazy" ` +
          `referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;

    return (
          `<div class="map-facade" data-embed-src="${src}" data-embed-title="Mapa de ${tituloSeguro}">` +
          `<div class="map-facade-placeholder" aria-hidden="true">🗺️</div>` +
          `<button type="button" class="map-play-btn" aria-label="Carregar mapa de ${tituloSeguro}">Ver mapa</button>` +
          `<noscript>${iframeSemJs}</noscript>` +
          `</div>`
    );
}

module.exports = { mapaEmbedHtml };
