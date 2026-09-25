// Fornece o dado global "parques" (a lista simples de grupos, igual antes)
// para os templates e para lib/geo.js — a partir de _data/parquesData.json.
//
// Por que esse arquivo existe: o painel /admin (Decap CMS) só consegue
// editar arquivos JSON cuja raiz é um objeto ({ "parques": [...] }), nunca
// uma lista solta ([...]) — é uma limitação do próprio Decap CMS (widget
// "list" em coleções de arquivo). Por isso os dados de verdade ficam em
// _data/parquesData.json (o arquivo que o painel edita), e este arquivo só
// "desembrulha" a lista para manter o nome de dado global "parques" que
// todos os templates (.njk) e o .eleventy.js já usam como array direto.
//
// Não edite _data/parquesData.json à mão fora do painel sem manter esse
// formato { "parques": [...] } — e não delete este arquivo, ou o campo
// global "parques" passa a ser o objeto inteiro em vez da lista.
const fs = require("fs");
const path = require("path");

module.exports = () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "parquesData.json"), "utf8"));
    return data.parques;
};
