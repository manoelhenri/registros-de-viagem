// Funções compartilhadas de normalização/slug e achatamento de
// destinosData.json / parquesData.json, usadas tanto pelos filtros do Eleventy
// (.eleventy.js) quanto pelos arquivos de dados computados
// (_data/destinosFlat.js, _data/parquesFlat.js) — uma única fonte de
// verdade, para nunca desalinhar o slug usado nos links com o slug
// usado para gerar as páginas.

const normalizar = (str) =>
    String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const slugify = (str) =>
    normalizar(str)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Lista achatada de todas as cidades de destinosData.json, com o país e um slug.
function listaCidades(destinos, coordenadas) {
    const coordsDestinos = (coordenadas && coordenadas.destinos) || {};
    const out = [];
    (destinos || []).forEach((pais) => {
          (pais.cidades || []).forEach((cidade) => {
                  const coord = coordsDestinos[cidade.nome];
                  out.push({
                            ...cidade,
                            pais: pais.pais,
                            bandeira: pais.bandeira,
                            paisId: pais.id,
                            slug: slugify(cidade.nome),
                            norm: normalizar(cidade.nome),
                            lat: coord ? coord[0] : null,
                            lng: coord ? coord[1] : null
                  });
          });
    });
    return out;
}

// Lista achatada de todos os parques de parquesData.json, com o grupo e um slug.
function listaParques(parques, coordenadas) {
    const coordsParques = (coordenadas && coordenadas.parques) || {};
    const out = [];
    (parques || []).forEach((grupo) => {
          (grupo.parques || []).forEach((parque) => {
                  const coord = coordsParques[parque.nome];
                  out.push({
                            ...parque,
                            grupo: grupo.grupo,
                            icone: grupo.icone,
                            grupoId: grupo.id,
                            slug: slugify(parque.nome),
                            norm: normalizar(parque.nome),
                            lat: coord ? coord[0] : null,
                            lng: coord ? coord[1] : null
                  });
          });
    });
    return out;
}

// Se dois lugares geram o mesmo slug (ex.: "Wet'n'Wild" e "Wet'n Wild"),
// desambigua acrescentando o local/estado ao slug do segundo em diante —
// nunca gera dois slugs iguais, o que quebraria a geração de páginas.
function desambiguarSlugs(lista, campoLocal) {
    const contagem = new Map();
    lista.forEach((item) => {
          const usados = contagem.get(item.slug) || 0;
          if (usados > 0) {
                  item.slug = `${item.slug}-${slugify(item[campoLocal] || String(usados + 1))}`;
          }
          contagem.set(item.slug, usados + 1);
    });
    return lista;
}

module.exports = {
    normalizar,
    slugify,
    listaCidades: (destinos, coordenadas) => desambiguarSlugs(listaCidades(destinos, coordenadas), "estado"),
    listaParques: (parques, coordenadas) => desambiguarSlugs(listaParques(parques, coordenadas), "local")
};
