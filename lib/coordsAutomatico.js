// Orquestra a geocodificação automática de destinos/parques (ver
// lib/geocode.js): decide quais lugares ainda não têm coordenada manual em
// _data/coordsMapa.json, confere primeiro o cache em
// _data/coordsAutoCache.json (evita buscar de novo um lugar já resolvido
// antes) e só sai pra internet pro que sobrar. No fim, salva o cache
// atualizado em disco.
//
// Coordenada manual em coordsMapa.json sempre tem prioridade sobre a
// automática — é assim que dá pra corrigir à mão um pin que a busca
// automática colocou no lugar errado.

const fs = require("fs");
const path = require("path");
const { buscarCoordenada, esperar, ATRASO_ENTRE_BUSCAS_MS } = require("./geocode.js");
const { normalizar } = require("./geo.js");

const CACHE_PATH = path.join(__dirname, "..", "_data", "coordsAutoCache.json");

function lerCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    } catch {
        return {};
    }
}

function salvarCache(cache) {
    try {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
    } catch (erro) {
        console.warn(`[geocode] Não consegui salvar o cache de coordenadas automáticas (${erro.message}).`);
    }
}

function chaveCache(nome, queryExtra) {
    return normalizar(`${nome} ${queryExtra || ""}`);
}

// itens: lista de { nome, queryExtra } — queryExtra ajuda a busca a achar o
// lugar certo (ex.: "São Paulo, Brasil" em vez de só "São Paulo").
// nomesComCoordenadaManual: Set com os nomes que já têm entrada em
// coordsMapa.json — esses nunca são buscados automaticamente.
// Retorna um objeto { "Nome do lugar": [lat, lng], ... } só com os lugares
// resolvidos automaticamente (cache ou busca nova).
async function resolverAutomaticas(itens, nomesComCoordenadaManual) {
    const cache = lerCache();
    const resultado = {};
    let cacheMudou = false;

    for (const item of itens) {
        if (nomesComCoordenadaManual.has(item.nome)) continue;

        const chave = chaveCache(item.nome, item.queryExtra);
        if (cache[chave]) {
            resultado[item.nome] = cache[chave];
            continue;
        }

        const query = `${item.nome}, ${item.queryExtra || ""}`.replace(/,\s*$/, "");
        const coord = await buscarCoordenada(query);
        if (coord) {
            resultado[item.nome] = coord;
            cache[chave] = coord;
            cacheMudou = true;
        }

        // Só espera entre buscas de verdade (não entre acertos de cache),
        // pra não atrasar o build à toa quando tudo já está resolvido.
        await esperar(ATRASO_ENTRE_BUSCAS_MS);
    }

    if (cacheMudou) salvarCache(cache);
    return resultado;
}

module.exports = { resolverAutomaticas, lerCache, chaveCache };
