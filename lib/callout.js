// Plugin de markdown-it: reconhece headings específicos do corpo do post
// ("Dicas que fazem diferença", "Vale a pena?") e envolve o heading + todo o
// conteúdo seguinte (até o próximo heading de nível igual ou mais alto, ou o
// fim do post) num bloco visualmente destacado (callout) — sem reescrever
// nenhuma palavra do texto original, só a estrutura HTML ao redor dele.
//
// A comparação do título é por texto normalizado (minúsculo, sem espaços nas
// pontas), então "## Vale a pena?" bate independente de variação de
// maiúscula/minúscula. Um heading que não bate com nenhum título conhecido
// não é tocado.

const TITULOS_CALLOUT = [
    { titulo: "dicas que fazem diferença", classe: "callout--dicas", icone: "💡" },
    { titulo: "vale a pena?", classe: "callout--vale-a-pena", icone: "🤔" }
];

function textoDoHeading(tokens, i) {
    const inline = tokens[i + 1];
    return inline && inline.type === "inline" ? (inline.content || "").trim().toLowerCase() : "";
}

function pluginCallout(md) {
    md.core.ruler.push("callout_sections", (state) => {
          const tokens = state.tokens;
          let i = 0;
          while (i < tokens.length) {
                  const tok = tokens[i];
                  if (tok.type !== "heading_open") { i++; continue; }

                  const nivel = Number(String(tok.tag || "").replace("h", "")) || 0;
                  const texto = textoDoHeading(tokens, i);
                  const match = TITULOS_CALLOUT.find((c) => c.titulo === texto);
                  if (!match || !nivel) { i++; continue; }

                  // Acha o fim do bloco: o próximo heading de nível igual ou
                  // mais alto (ex.: outro "##"), ou o fim do documento.
                  let fim = i + 3; // pula heading_open + inline + heading_close deste título
                  while (fim < tokens.length) {
                          const t = tokens[fim];
                          const nivelT = t.type === "heading_open" ? Number(String(t.tag || "").replace("h", "")) : null;
                          if (nivelT && nivelT <= nivel) break;
                          fim++;
                  }

                  const abre = new state.Token("html_block", "", 0);
                  abre.content = `<div class="callout ${match.classe}"><span class="callout-icone" aria-hidden="true">${match.icone}</span><div class="callout-corpo">`;
                  const fecha = new state.Token("html_block", "", 0);
                  fecha.content = "</div></div>";

                  // Insere o fechamento antes do abre-parênteses pra não precisar
                  // recalcular o índice de "fim" depois da primeira inserção.
                  tokens.splice(fim, 0, fecha);
                  tokens.splice(i, 0, abre);
                  i = fim + 2;
          }
    });
}

module.exports = { pluginCallout };
