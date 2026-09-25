// Estatísticas do site calculadas em tempo de build, a partir dos dados
// reais (nunca digitadas à mão): número de destinos/países cadastrados em
// destinosData.json, número de parques/grupos em parquesData.json, número
// de posts publicados e países visitados nos últimos dois anos.
//
// Antes desse arquivo, esses números viviam hardcoded em _data/home.json
// ("62 cidades · 9 países") e _data/sobre.json ("15 roteiros publicados",
// "2 países em 2025-26") — e ficavam desatualizados sempre que o catálogo
// crescia pelo painel /admin. Agora não existe mais campo pra editar isso
// no painel: o número certo sai sozinho do que já está cadastrado.
const fs = require("fs");
const path = require("path");

function contarPosts() {
    const dir = path.join(__dirname, "..", "content", "posts");
    return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

module.exports = () => {
    const destinosData = JSON.parse(fs.readFileSync(path.join(__dirname, "destinosData.json"), "utf8"));
    const parquesData = JSON.parse(fs.readFileSync(path.join(__dirname, "parquesData.json"), "utf8"));

    const totalPaises = destinosData.destinos.length;
    const totalDestinos = destinosData.destinos.reduce(
        (acc, pais) => acc + (pais.cidades ? pais.cidades.length : 0),
        0
                                                        );
    const totalGruposParques = parquesData.parques.length;
    const totalParques = parquesData.parques.reduce(
        (acc, grupo) => acc + (grupo.parques ? grupo.parques.length : 0),
        0
                                                     );
    const totalPosts = contarPosts();

    // "Países visitados recentemente" = países com pelo menos uma cidade
    // visitada no ano atual ou no ano anterior (calculado no momento do
    // build, nunca fixo em "2025-26" como antes).
    const anoAtual = new Date().getFullYear();
    const anoAnterior = anoAtual - 1;
    const paisesRecentesSet = new Set();
    destinosData.destinos.forEach((pais) => {
          (pais.cidades || []).forEach((cidade) => {
                  const anos = (cidade.anos || []).map((a) => parseInt(a, 10));
                  if (anos.includes(anoAtual) || anos.includes(anoAnterior)) {
                          paisesRecentesSet.add(pais.pais);
                  }
          });
    });

    return {
          totalPaises,
          totalDestinos,
          totalGruposParques,
          totalParques,
          totalPosts,
          anoAtual,
          anoAnterior,
          // Ex.: "2025–26" — mesmo formato que já era usado antes, só que
          // recalculado a cada build em vez de escrito à mão.
          labelAnosRecentes: `${anoAnterior}–${String(anoAtual).slice(-2)}`,
          paisesRecentes: paisesRecentesSet.size
    };
};
