// Lista achatada de parquesData.json (uma linha por parque, com grupo, slug
// e coordenadas), usada pela paginação do Eleventy em parque.njk para gerar
// uma página por parque, e pela página do mapa (mapa.njk).
//
// Coordenada de cada parque: prioridade pra manual (coordsMapa.json); se não
// tiver, tenta geocodificar automaticamente (lib/coordsAutomatico.js, cache
// em coordsAutoCache.json) — ver "Coordenadas do mapa" em
// CONTEXTO-DO-BLOG.md (projeto). Se as duas falharem, o parque fica sem pin,
// igual sempre foi.
const fs = require("fs");
const path = require("path");
const { listaParques } = require("../lib/geo.js");
const { resolverAutomaticas } = require("../lib/coordsAutomatico.js");

module.exports = async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "parquesData.json"), "utf8"));
    const coordsManual = JSON.parse(fs.readFileSync(path.join(__dirname, "coordsMapa.json"), "utf8"));
    const manualParques = coordsManual.parques || {};

    const itens = [];
    (data.parques || []).forEach((grupo) => {
        (grupo.parques || []).forEach((parque) => {
            itens.push({ nome: parque.nome, queryExtra: parque.local || "" });
        });
    });

    const coordsAuto = await resolverAutomaticas(itens, new Set(Object.keys(manualParques)));
    const coordenadas = { parques: { ...coordsAuto, ...manualParques } };

    return listaParques(data.parques, coordenadas);
};
