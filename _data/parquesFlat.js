// Lista achatada de parquesData.json (uma linha por parque, com grupo, slug
// e coordenadas), usada pela paginação do Eleventy em parque.njk para gerar
// uma página por parque, e pela página do mapa (mapa.njk).
const fs = require("fs");
const path = require("path");
const { listaParques } = require("../lib/geo.js");

module.exports = () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "parquesData.json"), "utf8"));
    const coordenadas = JSON.parse(fs.readFileSync(path.join(__dirname, "coordsMapa.json"), "utf8"));
    return listaParques(data.parques, coordenadas);
};
