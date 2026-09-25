// Fornece o dado global "destinos" (a lista simples de países, igual antes)
// para os templates e para lib/geo.js — a partir de _data/destinosData.json.
//
// Por que esse arquivo existe: o painel /admin (Decap CMS) só consegue
// editar arquivos JSON cuja raiz é um objeto ({ "destinos": [...] }), nunca
// uma lista solta ([...]) — é uma limitação do próprio Decap CMS (widget
// "list" em coleções de arquivo). Por isso os dados de verdade ficam em
// _data/destinosData.json (o arquivo que o painel edita), e este arquivo só
// "desembrulha" a lista para manter o nome de dado global "destinos" que
// todos os templates (.njk) e o .eleventy.js já usam como array direto.
//
// Não edite _data/destinosData.json à mão fora do painel sem manter esse
// formato { "destinos": [...] } — e não delete este arquivo, ou o campo
// global "destinos" passa a ser o objeto inteiro em vez da lista.
const fs = require("fs");
const path = require("path");

module.exports = () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "destinosData.json"), "utf8"));
    return data.destinos;
};
