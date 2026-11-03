# Instruções para agentes de código

Este arquivo vale para qualquer agente (Codex, Antigravity, Claude Code e outros). O `CLAUDE.md` só importa este arquivo, então **edite sempre aqui**. Quando uma regra ou a estrutura do projeto mudar, atualize este arquivo no mesmo commit.

## O que é este repositório

Blog pessoal de viagens do Manoel Henrique, "registros de viagem", no ar em **https://manoelhenrique.com**. Todo o conteúdo é em português do Brasil. O mesmo repositório também publica uma área de jogos em `/jogos/` e uma área de receitas em `/receitas/` ("Pães do Manoel"), produtos separados do blog (ver "Jogos ficam separados do blog" e "Receitas ficam separadas do blog", abaixo).

## Stack

- **Gerador:** Eleventy 2 (`@11ty/eleventy ^2.0.1`), templates Nunjucks (`.njk`), `markdown-it` com plugins próprios (`lib/video.js`, `lib/callout.js`).
- **Node 20** (`.nvmrc`). Dependências em `package.json`: só `@11ty/eleventy`, `markdown-it` e `gray-matter`. Não adicione framework (React, Tailwind, bundler etc.) sem o dono pedir.
- **Build:** `npm run build` (saída em `_site/`). Servidor local: `npm run serve`.
- **Hospedagem:** Cloudflare Pages ligado à branch `main`. **Todo push na `main` publica o site em cerca de 1 minuto.**
- **Painel de conteúdo:** Decap CMS em `/admin` (`admin/index.html` + `admin/config.yml`), versão fixa `decap-cms@3.1.3`, backend `github`. Login OAuth via Cloudflare Pages Functions em `functions/api/auth.js` e `functions/api/callback.js`.
- **Mapa:** Leaflet + tiles do OpenStreetMap (`mapa.njk`). Coordenadas novas são buscadas sozinhas no build via Nominatim (`lib/geocode.js`, `lib/coordsAutomatico.js`, cache em `_data/coordsAutoCache.json`); `_data/coordsMapa.json` guarda só correções manuais e sempre vence o automático.
- **Visual do blog:** tudo em `style.css`, cores em variáveis no `:root` (`--petrol`, `--paper`, `--ink`, `--sage`, `--sand`), fontes Fraunces, Work Sans e IBM Plex Mono.

## Mapa rápido de arquivos

| Caminho | Função |
|---|---|
| `content/posts/*.md` | Um arquivo por post (criados pelo painel) |
| `_includes/base.njk`, `_includes/post.njk` | Layout geral e página de post |
| `index.njk`, `posts.njk`, `destinos.njk`, `destino.njk`, `parques.njk`, `parque.njk`, `mapa.njk`, `timeline.njk`, `sobre.njk`, `404.njk` | Páginas do blog |
| `feed.njk`, `sitemap.njk`, `robots.njk` | RSS, sitemap e robots |
| `_data/` | Dados globais: `site.json`, `home.json`, `sobre.json`, `destinosData.json`, `parquesData.json` (editados pelo painel), mais os `.js` que derivam dados deles |
| `lib/` | Módulos compartilhados (geo, geocodificação, vídeo, mapa embutido, callout, datas do Git) |
| `.eleventy.js` | Filtros, coleções, markdown-it, `validarBuild()` e os ganchos que copiam `/jogos` e geram `/receitas` |
| `admin/` | Painel Decap CMS |
| `functions/api/` | Login OAuth do painel |
| `static-jogos/` | Área de jogos (fora do Eleventy) |
| `scripts/build-jogos.js` | Copia os jogos para `_site/jogos` e gera `_redirects` e `_headers` |
| `static-receitas/` | Área de receitas (fora do Eleventy): `receitas.json` + `assets/` |
| `scripts/build-receitas.js` | Gera as páginas de `_site/receitas` a partir de `static-receitas/receitas.json` |
| `README.md`, `COMO-PUBLICAR.md`, `GUIA-DO-BLOG.html` | Documentação para o dono (não viram páginas) |
| `AUDITORIA-RECEITAS.md` | Auditoria da área de receitas: problemas, benchmark, testes e pendências (não vira página) |

## Jogos ficam separados do blog

A área `/jogos/` (hoje: o hub em `static-jogos/index.html`, o jogo "Quem é mais?" em `static-jogos/quem-e-mais/` e a política de privacidade em `static-jogos/privacidade/`) é um produto à parte, que só divide o domínio e o repositório com o blog. Regras:

1. **Nenhuma ligação entre os dois.** O blog não linka para os jogos (menu, rodapé, home, posts, sitemap, feed) e os jogos não linkam para o blog. Não misture os dois em nenhum template.
2. **Nada do blog dentro dos jogos.** Os jogos são HTML estático autocontido: não usam `base.njk`, `style.css`, `_data/`, filtros do Eleventy nem a identidade visual do blog. Cada jogo tem visual, fontes, ícones, manifest e service worker próprios.
3. **Fora do Eleventy.** `static-jogos/` está no `.eleventyignore` e é copiado tal como está para `_site/jogos/` por `scripts/build-jogos.js`, chamado no evento `eleventy.after` do `.eleventy.js` (funciona com `npm run build` ou `eleventy` direto). Não mova os jogos para dentro dos templates e não remova esse gancho.
4. **Jogo novo** entra numa pasta própria `static-jogos/<nome-do-jogo>/` e ganha um cartão no hub `static-jogos/index.html`. Nunca na raiz do repositório (uma pasta solta na raiz seria processada pelo Eleventy e quebraria a publicação, como já aconteceu).
5. **Service worker:** ao mudar qualquer arquivo de um jogo com PWA, suba a versão do cache no `sw.js` dele (ex.: `quem-e-mais-v5` para `quem-e-mais-v6`) e mantenha a lista de arquivos em dia, senão o celular de quem já instalou continua com a versão antiga.
6. **`_redirects` e `_headers` são gerados por `scripts/build-jogos.js`** e sobrescrevem qualquer arquivo com esse nome. Redirecionamento ou cabeçalho novo (do blog ou dos jogos) entra nesse script. O endereço antigo `/quem-e-mais` redireciona (301) para `/jogos/quem-e-mais/`; não quebre isso.
7. **Arquivos na raiz do domínio** (ex.: `.well-known/assetlinks.json`, para vincular o app Android) vão em `static-root/`, que o mesmo script copia para a raiz de `_site/`. A pasta ainda não existe; crie quando precisar e mantenha no `.eleventyignore`.

## Receitas ficam separadas do blog

A área `/receitas/` ("Pães do Manoel": receitas para panificadora, com guia da máquina e os dois livros em PDF) segue as mesmas regras de separação dos jogos: nenhum link entre ela e o blog (nem menu, rodapé, sitemap, feed ou `robots.txt`), nada do blog dentro dela (sem `base.njk`, `style.css`, filtros do Eleventy nem Google Analytics) e fora do Eleventy. O foco é a experiência online; os PDFs são só um download secundário. Regras próprias:

1. **Uma fonte de dados:** todo o conteúdo vem de `static-receitas/receitas.json` (`categorias`, `livros`, `receitas`). Cada receita tem `slug`, `titulo`, `categoria`, `tags` (região e ocasião), `icone`, `resumo`, `programa`, `casca`, `timer`, `nivel`, `rende`, `colunas` (500/750/1000 g ou uma coluna só), `tabelas` (ingredientes por grupo, na ordem de colocar na forma), `preparo` (grupos de passos detalhados), `pronto`, `guardar`, `dica`, `publicado` (data real de publicação, AAAA-MM-DD, vira `datePublished`) e, opcionais, `imagens` e `complemento` (bloco extra no fim do preparo, com `titulo`, `intro`, `passosTitulo`, `passos` e `itens` de `{nome, ingredientes, modo}`; hoje usado nos 5 sabores da massa de pizza). Receita nova ou correção é só editar esse arquivo; não escreva HTML de receita à mão. **Medidas por extenso:** `1 colher (chá)`, `3 colheres (sopa)`, nunca `cc`/`cs`. Os nomes dos ingredientes ficam em negrito nos passos automaticamente (`realce()` no gerador, a partir dos nomes das `tabelas`); escreva os passos com os mesmos nomes da lista.
2. **Gerador:** `scripts/build-receitas.js` (só módulos do Node, sem dependência) cria a home (`_site/receitas/index.html`, com busca, filtros, categorias e receitas salvas), uma página por receita em `_site/receitas/<slug>/`, o guia da máquina em `_site/receitas/guia/`, `404.html` e `sitemap.xml` próprios, e copia `static-receitas/assets/` (CSS, JS, fontes, ilustrações, imagens de compartilhamento e PDFs). É chamado num gancho `eleventy.after` separado, **dentro de try/catch**: se as receitas quebrarem, o blog e os jogos publicam normalmente e o erro aparece no log como `[receitas]`. Não junte esse gancho com o dos jogos.
3. **Slug** é único, só `a-z`, `0-9` e hífen, e nunca muda depois de publicado (é o endereço indexado pelo Google). O build das receitas para se houver slug repetido ou categoria inexistente.
4. **Quantidades:** as receitas de pão foram conferidas por porcentagem de padeiro (hidratação, sal cerca de 2% e fermento cerca de 1% da farinha, iguais nos três tamanhos). Ao mudar uma quantidade, mantenha a proporção entre as colunas de 500, 750 e 1000 g; quando o ovo não acompanha a escala (1, 1, 2), a coluna de 750 g leva cerca de 20 ml a mais de líquido.
5. **SEO:** cada página tem `description`, `canonical`, Open Graph e JSON-LD (`Recipe` com ingredientes do tamanho de 750 g e passos em `HowToSection`; `BreadcrumbList`; `ItemList` na home). Sem tempos de preparo no JSON-LD, porque a duração dos ciclos da máquina não é publicada; não invente. Imagens de compartilhamento por categoria em `assets/img/<categoria>-<1x1|4x3|16x9>.jpg`. O sitemap das receitas é cadastrado direto no Google Search Console (`/receitas/sitemap.xml`); não o coloque no `robots.txt` nem no sitemap do blog.
6. **Imagens das receitas** hoje são ilustrações. Foto real de prato, quando o dono mandar, vai em `static-receitas/assets/img/` e entra no campo opcional `imagens` da receita (lista de nomes de arquivo, de preferência nas proporções 1:1, 4:3 e 16:9, nessa ordem); com ele, a foto substitui a ilustração no JSON-LD e no Open Graph.
7. **Domínio:** o gerador lê a URL de `_data/site.json` (só leitura, para montar os links absolutos). Não escreva o domínio fixo.
8. **Interface:** a página só liga e desliga elementos que já vêm prontos no HTML (busca, filtros, tamanho do pão, marcar ingredientes e passos, receitas salvas e modo cozinha com a tela acesa, tudo guardado no `localStorage` do navegador). Texto de dado sempre passa por `esc()` no gerador. Sem JavaScript, a página continua legível (as três quantidades aparecem juntas). Teste no celular: nenhuma página pode ter rolagem horizontal em 375 px.
9. **Mobile primeiro (quase todo acesso é pelo celular):** abaixo de 600 px a lista usa cartões compactos (miniatura à esquerda) e a receita tem a barra fixa "Ingredientes / Modo de preparo" (abaixo de 960 px). Toda página tem o botão Início no topo (só o ícone de casa até 400 px) e o botão flutuante "Topo" (`[data-topo]`), que aparece depois de rolar cerca de uma tela e meia; o rodapé tem espaço extra embaixo para ele não cobrir os links. O cabeçalho precisa caber em 320 px. O filtro esconde cartões com o atributo `hidden`, que precisa vencer no CSS (`[hidden]{display:none!important}`). Atalhos (links com `data-f-*`: abertura, categorias, "Ver as 9", etiquetas) sempre limpam os outros filtros antes de aplicar o seu; só os controles da própria lista se combinam. Valor de filtro desconhecido no endereço é ignorado. O `html` já tem `scroll-padding-top`; não some `scroll-margin` por cima. Teste filtros num celular simulado (Playwright, iPhone SE e iPhone 13) conferindo que o número de cartões visíveis bate com o contador. Filtros só com dado real do cadastro (hoje: categoria, etiquetas, timer, `nivel` Fácil, salvas); com 2 ou mais palavras sem resultado completo, a busca mostra as receitas com parte delas ("o que tenho em casa").
10. **Confiabilidade:** nada de dado inventado (tempo de preparo, custo, calorias, avaliações). O guia e as receitas são da Gallant GPA1E19A; diga o modelo quando a informação for específica dele. Receita com a etiqueta "Sem glúten" mostra o alerta de rótulo e contaminação cruzada (feito no gerador); "sem lactose" ou "vegetariano" só depois de revisão receita a receita.
11. **Acessibilidade e desempenho:** a cor de cada categoria é escurecida no gerador (`tinta()`) até 4,5:1 sobre o branco e sobre o fundo claro dela; não use a cor crua como texto. A Fraunces é uma versão reduzida (pesos 600 a 900, tamanho óptico fixo, eixo SOFT mantido); não troque pelo arquivo completo. Meta: Lighthouse mobile com acessibilidade 100.

## Regras de manutenção do blog

1. **Imagens:** nunca invente link. Use Wikimedia Commons no formato `https://commons.wikimedia.org/wiki/Special:FilePath/<Arquivo>?width=1280` (capas) ou `?width=640` (destinos e parques), confirme que o arquivo existe e mostra o lugar certo, prefira fotos horizontais. Nunca escreva à mão links `upload.wikimedia.org/.../thumb/...`.
2. **Crédito obrigatório** em foto de terceiros: `capaCredito` (autor · licença · Wikimedia Commons) e `capaFonte` (página do arquivo).
3. **Só um post com `destaque: true`.** O build dá erro se houver mais de um.
4. **Nunca dê a um arquivo de `_data/` o nome de um campo do front matter** (`coordenadas`, `cidades`, `data`, `title`, `resumo`, `capa`...). O dado global sobrescreve o campo em todos os posts sem avisar.
5. **Painel (Decap):** coleção de arquivo nunca aponta para JSON cujo topo seja uma lista; envolva num objeto (`{"chave": [...]}`) e crie um `_data/<nome>.js` que desembrulha, como `destinos.js`/`parques.js`. **Não apague `_data/destinos.js` nem `_data/parques.js`.**
6. **Versão do Decap é fixa** (`decap-cms@3.1.3`, sem `^` ou `~`). Ao subir de propósito, teste as 6 coleções antes.
7. **Segurança do login:** não remova as checagens do `callback.js` (confere `e.origin`, `postMessage` restrito à própria origem, nunca `"*"`) nem os atributos `Secure` + `HttpOnly` + `SameSite=Lax` do cookie `oauth_state`. O login pede só `public_repo,read:user` (o repositório é público); não volte para `repo`. O `callback.js` apaga o cookie `oauth_state` em toda resposta e manda `Cache-Control: no-store`.
8. **URL pública só em `_data/site.json` → `url`.** Use `{{ site.url }}`; não escreva o domínio fixo em template, CSS ou JS do blog. Exceção proposital: `admin/config.yml` → `base_url` aponta para `registros-de-viagem.pages.dev` (login do painel). Outra exceção: `functions/api/callback.js` lista `manoelhenrique.com` (com e sem www) nas origens que podem receber o token, porque o painel é aberto no domínio próprio e o login volta pelo `pages.dev`; mudou o domínio, atualize essa lista.
9. **Matching post ↔ destino/parque** é por igualdade exata normalizada (sem acento, minúsculo), nunca por "contém". Não troque por busca de substring.
10. **Campos opcionais da ficha de viagem** (perfil, transporte, hospedagem etc.) nunca viram obrigatórios no painel.
11. **Filtros de listagem** reusam `.filter-bar`/`.filter-chip`/`.filter-search`/`.filter-select` e o estado vazio com `aria-live="polite"` + botão "Limpar filtros".
12. **Capas clicáveis** (vídeo e mapa) usam os atributos genéricos `data-embed-*` lidos por um único handler em `base.njk`. Reuse esse padrão.
13. **Vídeo é sempre link externo** (YouTube, Vimeo, Instagram), nunca arquivo no repositório. Só vira player se o link estiver sozinho na linha.
14. **Convenção de `coordenadas` no front matter:** nome do lugar em maiúsculas (`"SALVADOR"`) ou paradas com seta (`"GRAMADO → CANELA"`), sem números.
15. **`GUIA-DO-BLOG.html` acompanha o painel.** Mudou um campo ou fluxo do painel ou do blog, atualize a seção do guia no mesmo commit.
16. **Arquivo novo na raiz** que não deve virar página (`.md`, `.html` de documentação, pastas estáticas) precisa entrar no `.eleventyignore`.
17. **Não suba ZIP** nem arquivos gerados (`_site/`, `node_modules/`).
18. **SEO por página:** toda página tem `description` própria (front matter ou `eleventyComputed`); o `base.njk` só cai no texto genérico quando falta. Números (destinos, países, parques, posts) vêm de `estatisticas`, nunca digitados. `seoTitle` no front matter substitui o título padrão "<title> — registros de viagem" (usado na Home). Em `eleventyComputed` com texto vindo de dado, use `| safe` para não escapar duas vezes (o `base.njk` já escapa).
19. **Datas de post para o Google** (`datePublished`/`dateModified` no JSON-LD e `<lastmod>` no sitemap) vêm do histórico do Git (`lib/datasGit.js`), não do campo `data`, que é a data da viagem. Se o build não tiver histórico, essas datas ficam de fora; nunca troque por uma data inventada.
20. **HTML montado no navegador** (ex.: popup do mapa) usa `document.createElement` + `textContent`, nunca texto concatenado em HTML. Dados do painel podem ter `&`, `<` e aspas.
21. **Google Analytics** (`G-SZSXHX6PQE`) fica no `<head>` do `base.njk`, só no blog. Não coloque nos jogos (produto separado) nem no `/admin`.

## Textos e preferências do dono

- **Não use travessão (—)** em texto que aparece para o leitor (posts, páginas, painel, guia, jogos). Prefira vírgula, dois-pontos, parênteses ou frase nova.
- **Nunca publique texto autoral em nome do dono sem aprovação.** Texto em primeira pessoa (Sobre, home, posts) vai primeiro como rascunho para ele revisar. Use só fatos que ele já publicou ou confirmou; não invente detalhes da vida ou das viagens.
- A página Sobre não fala de milhas nem de programas de benefício.
- Conteúdo do dia a dia (posts, fotos, destinos) é feito pelo painel `/admin`. Mudança de código é feita pelo agente: o dono não tem Git nem Node no computador (Windows) e não faz passos manuais no GitHub.

## Como trabalhar e publicar

1. Antes de publicar, rode `npm install` e `npm run build` e confira que termina sem erro e sem aviso novo das validações (`validarBuild()` no topo do `.eleventy.js`).
2. Para mudança visual, teste as páginas afetadas em desktop e mobile (sem rolagem horizontal, sem erro de console). Post de teste temporário pode ser usado, mas nunca commitado.
3. Commits pequenos e coesos, mensagem em português descrevendo a mudança.
4. Lembre que push na `main` publica na hora. Mudança grande ou arriscada pode ir numa branch com PR, que o Cloudflare Pages publica como prévia.
5. Depois de publicar, confira o site no navegador. `raw.githubusercontent.com` tem cache de alguns minutos; para ver o estado real use a página `github.com/.../blob/main/<arquivo>`.

### Ambientes com rede restrita

Alguns sandboxes bloqueiam `unpkg.com` (Decap e Leaflet), `nominatim.openstreetmap.org` e o próprio domínio do site. O build continua funcionando: a geocodificação falha só com um aviso `[geocode]` no terminal. Para testar uma página que depende de CDN bloqueado, baixe o pacote com `npm pack <pacote>@<versão>`, aponte a página para a cópia local só durante o teste e **reverta antes de commitar**. Para testar o painel sem OAuth, use `npx decap-server` com `local_backend: true` temporário no `config.yml`, nunca commitado.
