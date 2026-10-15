// Datas reais de publicação e de última alteração de cada post, tiradas do
// histórico do Git (data do commit que criou o arquivo e do último commit que
// mexeu nele). Usadas no JSON-LD do post (datePublished/dateModified) e no
// <lastmod> do sitemap, no lugar do campo "data" do post, que é a data da
// viagem e não a da publicação.
//
// Se o build rodar num clone raso (só o último commit), tenta buscar o
// histórico completo. Se não conseguir, devolve um mapa vazio e os templates
// simplesmente deixam essas datas de fora, em vez de publicar uma data errada.
const { execFileSync } = require("child_process");
const path = require("path");

const raiz = path.join(__dirname, "..");
let cache = null;

function git(args) {
    return execFileSync("git", args, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function historicoCompleto() {
    try {
        if (git(["rev-parse", "--is-shallow-repository"]).trim() !== "true") return true;
        git(["fetch", "--unshallow", "--quiet"]);
        return git(["rev-parse", "--is-shallow-repository"]).trim() !== "true";
    } catch (e) {
        return false;
    }
}

function carregar() {
    const mapa = {};
    if (!historicoCompleto()) {
        console.warn("[datasGit] histórico do Git indisponível: datas de publicação ficam de fora do JSON-LD e do sitemap.");
        return mapa;
    }
    let saida = "";
    try {
        // Do commit mais novo para o mais antigo: a primeira vez que um arquivo
        // aparece é a última alteração; a última vez é a criação.
        saida = git(["log", "--format=%x00%aI", "--name-only", "--", "content/posts"]);
    } catch (e) {
        return mapa;
    }
    saida.split("\0").forEach((bloco) => {
        const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
        if (!linhas.length) return;
        const data = linhas.shift();
        linhas.forEach((arquivo) => {
            const chave = "./" + arquivo;
            if (!mapa[chave]) mapa[chave] = { modificado: data, publicado: data };
            else mapa[chave].publicado = data;
        });
    });
    return mapa;
}

// Recebe o page.inputPath do Eleventy (ex.: "./content/posts/salvador.md").
module.exports = function datasGit(inputPath) {
    if (!cache) cache = carregar();
    return cache[inputPath] || {};
};
