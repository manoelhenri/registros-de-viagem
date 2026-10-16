# Instruções para agentes de código

Este arquivo vale para qualquer agente (Codex, Antigravity, Claude Code e outros). O `CLAUDE.md` só importa este arquivo, então **edite sempre aqui**. Quando uma regra ou a estrutura do projeto mudar, atualize este arquivo no mesmo commit.

## O que é este repositório

Blog pessoal de viagens do Manoel Henrique, "registros de viagem", no ar em **https://manoelhenrique.com**. Todo o conteúdo é em português do Brasil. O mesmo repositório também publica uma área de jogos em `/jogos/`, que é um produto separado do blog (ver "Jogos ficam separados do blog", abaixo).

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
| `.eleventy.js` | Filtros, coleções, markdown-it, `validarBuild()` e o gancho que copia `/jogos` |
| `admin/` | Painel Decap CMS |
| `functions/api/` | Login OAuth do painel |
| `static-jogos/` | Área de jogos (fora do Eleventy) |
| `scripts/build-jogos.js` | Copia os jogos para `_site/jogos` e gera `_redirects` e `_headers` |
| `README.md`, `COMO-PUBLICAR.md`, `GUIA-DO-BLOG.html` | Documentação para o dono (não viram páginas) |

## Jogos ficam separados do blog

A área `/jogos/` (hoje: o hub em `static-jogos/index.html`, o jogo "Quem é mais?" em `static-jogos/quem-e-mais/` e a política de privacidade em `static-jogos/privacidade/`) é um produto à parte, que só divide o domínio e o repositório com o blog. Regras:

1. **Nenhuma ligação entre os dois.** O blog não linka para os jogos (menu, rodapé, home, posts, sitemap, feed) e os jogos não linkam para o blog. Não misture os dois em nenhum template.
2. **Nada do blog dentro dos jogos.** Os jogos são HTML estático autocontido: não usam `base.njk`, `style.css`, `_data/`, filtros do Eleventy nem a identidade visual do blog. Cada jogo tem visual, fontes, ícones, manifest e service worker próprios.
3. **Fora do Eleventy.** `static-jogos/` está no `.eleventyignore` e é copiado tal como está para `_site/jogos/` por `scripts/build-jogos.js`, chamado no evento `eleventy.after` do `.eleventy.js` (funciona com `npm run build` ou `eleventy` direto). Não mova os jogos para dentro dos templates e não remova esse gancho.
4. **Jogo novo** entra numa pasta própria `static-jogos/<nome-do-jogo>/` e ganha um cartão no hub `static-jogos/index.html`. Nunca na raiz do repositório (uma pasta solta na raiz seria processada pelo Eleventy e quebraria a publicação, como já aconteceu).
5. **Service worker:** ao mudar qualquer arquivo de um jogo com PWA, suba a versão do cache no `sw.js` dele (ex.: `quem-e-mais-v5` para `quem-e-mais-v6`) e mantenha a lista de arquivos em dia, senão o celular de quem já instalou continua com a versão antiga.
6. **`_redirects` e `_headers` são gerados por `scripts/build-jogos.js`** e sobrescrevem qualquer arquivo com esse nome. Redirecionamento ou cabeçalho novo (do blog ou dos jogos) entra nesse script. O endereço antigo `/quem-e-mais` redireciona (301) para `/jogos/quem-e-mais/`; não quebre isso.
7. **Arquivos na raiz do domínio** (ex.: `.well-known/assetlinks.json`, para vincular o app Android) vão em `static-root/`, que o mesmo script copia para a raiz de `_site/`. A pasta ainda não existe; crie quando precisar e mantenha no `.eleventyignore`.

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
