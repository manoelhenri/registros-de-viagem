// Busca a coordenada (lat/lng) de um lugar pelo nome, usando a API pública
// do Nominatim (OpenStreetMap) — gratuita, sem chave de API, e é a mesma
// fonte de dados geográficos que já fornece os tiles do mapa interativo
// (mapa.njk). Usada por lib/coordsAutomatico.js para preencher sozinho o
// pin de um destino/parque novo, sem precisar editar coordsMapa.json à mão.
//
// Uso responsável da API (política do Nominatim,
// https://operations.osmfoundation.org/policies/nominatim/): no máximo 1
// requisição por segundo (respeitado por quem chama esta função, ver
// ATRASO_ENTRE_BUSCAS_MS) e um User-Agent identificando o site.
//
// Falha de rede, timeout ou nenhum resultado NUNCA lançam erro — só
// retornam null, e quem chamou decide o que fazer (aqui: o lugar fica sem
// pin no mapa, exatamente como já acontecia antes desta automação).

const USER_AGENT = "registros-de-viagem-blog/1.0 (+https://manoelhenrique.com)";
const TIMEOUT_MS = 6000;
const ATRASO_ENTRE_BUSCAS_MS = 1100; // Nominatim: no máximo 1 requisição por segundo

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buscarCoordenada(query) {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query);
    const controle = new AbortController();
    const timeout = setTimeout(() => controle.abort(), TIMEOUT_MS);

    try {
        const resp = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
            signal: controle.signal
        });

        if (!resp.ok) {
            console.warn(`[geocode] Nominatim respondeu ${resp.status} para "${query}" — pin não gerado automaticamente (cadastre em _data/coordsMapa.json se precisar).`);
            return null;
        }

        const resultados = await resp.json();
        if (!Array.isArray(resultados) || resultados.length === 0) {
            console.warn(`[geocode] Nenhum resultado do Nominatim para "${query}" — cadastre a coordenada manualmente em _data/coordsMapa.json.`);
            return null;
        }

        const { lat, lon } = resultados[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return null;

        return [latNum, lonNum];
    } catch (erro) {
        const motivo = erro && erro.name === "AbortError" ? "tempo esgotado" : erro.message;
        console.warn(`[geocode] Não consegui buscar a coordenada de "${query}" (${motivo}) — pin não gerado automaticamente (cadastre em _data/coordsMapa.json se precisar).`);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { buscarCoordenada, esperar, ATRASO_ENTRE_BUSCAS_MS };
