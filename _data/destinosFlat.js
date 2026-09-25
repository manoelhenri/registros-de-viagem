// Lista achatada de destinosData.json (uma linha por cidade, com país, slug
// e coordenadas), usada pela paginação do Eleventy em destino.njk para gerar
// uma página por cidade, e pela página do mapa (mapa.njk).
const fs = require("fs");
const path = require("path");
const { listaCidades } = require("../lib/geo.js");

module.exports = () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "destinosData.json"), "utf8"));
    const coordenadas = JSON.parse(fs.readFileSync(path.join(__dirname, "coordsMapa.json"), "utf8"));
    return listaCidades(data.destinos, coordenadas);
};
