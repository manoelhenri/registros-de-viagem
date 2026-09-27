// Lista achatada de destinosData.json (uma linha por cidade, com país, slug
// e coordenadas), usada pela paginação do Eleventy em destino.njk para gerar
// uma página por cidade, e pela página do mapa (mapa.njk).
//
// Coordenada de cada cidade: prioridade pra manual (coordsMapa.json); se não
// tiver, tenta geocodificar automaticamente (lib/coordsAutomatico.js, cache
// em coordsAutoCache.json) — ver "Coordenadas do mapa" em
// CONTEXTO-DO-BLOG.md (projeto). Se as duas falharem, a cidade fica sem pin,
// igual sempre foi.
const fs = require("fs");
const path = require("path");
const { listaCidades } = require("../lib/geo.js");
const { resolverAutomaticas } = require("../lib/coordsAutomatico.js");

module.exports = async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "destinosData.json"), "utf8"));
    const coordsManual = JSON.parse(fs.readFileSync(path.join(__dirname, "coordsMapa.json"), "utf8"));
    const manualDestinos = coordsManual.destinos || {};

    const itens = [];
    (data.destinos || []).forEach((pais) => {
        (pais.cidades || []).forEach((cidade) => {
            itens.push({ nome: cidade.nome, queryExtra: [cidade.estado, pais.pais].filter(Boolean).join(", ") });
        });
    });

    const coordsAuto = await resolverAutomaticas(itens, new Set(Object.keys(manualDestinos)));
    const coordenadas = { destinos: { ...coordsAuto, ...manualDestinos } };

    return listaCidades(data.destinos, coordenadas);
};
