# Auditoria da área de receitas (manoelhenrique.com/receitas)

Data: 2 de novembro de 2026. Escopo: a área `/receitas/` ("Pães do Manoel"), que é um produto separado do blog (ver `AGENTS.md`). O blog e os jogos não foram alterados; o build do blog foi comparado antes e depois e saiu idêntico.

## 1. Estado atual (antes desta rodada)

**Arquitetura.** Site estático gerado por `scripts/build-receitas.js` (Node puro, sem dependências) a partir de um único arquivo de dados, `static-receitas/receitas.json` (60 receitas, 7 categorias, 2 livros em PDF). Roda num gancho `eleventy.after` isolado em try/catch. Front-end com um CSS e um JS próprios, sem framework. Estado do visitante (salvas, tamanho do pão, marcações) no `localStorage`.

**Páginas.** Home com busca, filtros e categorias; 60 páginas de receita; guia da máquina; 404 próprio; sitemap próprio (62 URLs).

**O que já estava bom.**
- 0 links internos quebrados, 0 âncoras quebradas, nenhum link para o blog, nenhum link externo além do próprio domínio (canonical e Open Graph).
- Títulos e descrições únicos em todas as 63 páginas; um único H1 por página; todas as imagens com `alt` (as ilustrações são decorativas, `alt=""`).
- JSON-LD `Recipe` + `BreadcrumbList` em toda receita e `ItemList` na home, todos válidos.
- Contagens da home calculadas a partir dos dados (receitas, categorias, programas, receitas com timer).

**Problemas encontrados.**

| # | Prioridade | Problema | Evidência |
|---|---|---|---|
| 1 | P0 | Botão "Topo" não funcionava em celular de verdade | Relato do dono. A rolagem suave era interrompida pelo foco movido para a marca e o botão ficava na faixa da barra do Safari |
| 2 | P0 | Número falso na home | "3 tamanhos de pão em cada receita", mas só 38 das 60 receitas têm 3 tamanhos |
| 3 | P1 | 7 bolos sem rendimento | Campo `rende` vazio; a ficha mostrava "Rende" em branco |
| 4 | P1 | Recomendações do guia apresentadas como universais | Timer de 15 h, nomes dos programas e forma de 17 cm são da Gallant GPA1E19A, sem dizer o modelo |
| 5 | P1 | Instrução sem fonte no guia | "Descongelar: coloque o pão congelado na forma, sem a pá" não tem base no manual e nenhuma receita usa o programa |
| 6 | P1 | Receita sem glúten sem alerta | Faltava aviso de rótulo e contaminação cruzada (forma e pá usadas com trigo) |
| 7 | P1 | Contraste insuficiente | Lighthouse: texto de apoio 4,34:1; cores de categoria (mostarda 3,2:1, rosa 3,4:1); camadas do guia 2,1:1 |
| 8 | P1 | Fontes pesadas atrasando o primeiro texto | Fraunces 121 KB + 150 KB (fonte variável completa); FCP de 2,1 a 2,6 s |
| 9 | P2 | Título do guia longo para o Google | 84 caracteres |
| 10 | P2 | JSON-LD sem data de publicação | Sem `datePublished` |
| 11 | P2 | Receitas relacionadas só por categoria | Não considerava ingrediente, programa ou ocasião |

Rodadas anteriores (mesma data) já tinham corrigido: filtros que não escondiam cartões, atalhos que somavam filtros, medidas abreviadas (cs/cc), passos herdados do livro ("coluna"), temperaturas contraditórias e falta de botão Início.

## 2. Benchmark

Sites lidos nesta rodada e na anterior: Panelinha, King Arthur Baking, NYT Cooking (central de ajuda), Receiteria, TudoGostoso, Budget Bytes e Receitas Nestlé. **Allrecipes, Serious Eats, BBC Good Food, Receitas Globo, Epicurious e Cybercook bloquearam a leitura automática**; não descrevo o que não consegui ver.

| Recurso | Referência | Como funciona | Aplicação no Pães do Manoel | Prioridade |
|---|---|---|---|---|
| Busca pelo que tem em casa | Receiteria, Nestlé ("O que tem em casa?", 2 ou 3 ingredientes) | Ingredientes viram busca por receitas existentes | **Feito:** com 2+ palavras e nenhuma receita com todas, a lista mostra as que têm parte, ordenadas por quantas combinam, com aviso | P1 |
| Filtro por dificuldade | Nestlé (Fácil, Médio, Elaborado nos cards) | Rótulo e filtro | **Feito:** chip "Fáceis" (39 receitas), usando o campo `nivel` real | P1 |
| Coleções por ocasião e região | TudoGostoso, Nestlé, Receiteria | Listas temáticas | Já existia (Natal, Festa junina, Norte e Nordeste etc.), com dados reais | Feito antes |
| Modo cozinha | King Arthur, NYT Cooking | Tela acesa, passo a passo | **Feito:** além de tela acesa e letra maior, barra fixa "Voltar / Concluí" com "Passo 3 de 17" | P1 |
| Marcar ingredientes e passos | NYT Cooking | Checkbox por item | Já existia | Feito antes |
| Favoritos sem conta | NYT, Receiteria (com conta) | Salvar receita | Já existia no `localStorage`, sem cadastro | Feito antes |
| Compartilhar | Todos | Botões sociais | **Feito:** botão WhatsApp (link `wa.me`), além do compartilhar nativo | P1 |
| Copiar ingredientes | (adaptado para o celular) | Copiar lista | **Feito:** copia a lista no tamanho escolhido, com o link | P1 |
| Como guardar e congelar | Panelinha | Seção própria | Já existia em toda receita | Feito antes |
| Custo por receita e por porção | Budget Bytes ("$X recipe / $Y serving") | Valor fixo por receita, sem nota de como foi calculado na página lida | **Não feito:** sem fonte confiável de preços no Brasil, seria dado inventado. Proposta na seção 4 | P3 |
| Avaliações e comentários | TudoGostoso, Receiteria | Estrelas e contagem | **Não feito:** exige backend e moderação; sem avaliações reais não pode entrar no JSON-LD | P3 |
| Calorias e filtros nutricionais | Receiteria | Calorias por 100 g, low carb etc. | **Não feito:** sem tabela nutricional confiável | P3 |
| Ajuste de porções | Allrecipes (não verificado, site bloqueado) | Multiplica as quantidades | Já existe o modelo certo para panificadora: 500, 750 e 1000 g, os tamanhos que a máquina aceita. Multiplicar livremente geraria pão que não cabe na forma | Não se aplica |
| Lista de compras | Receiteria, Cybercook (conta) | Junta ingredientes de várias receitas | Proposta na seção 4 | P2 |

## 3. O que foi implementado nesta rodada

**P0**
- Botão "Topo": a rolagem salta para perto do topo e anima só o último trecho. Se não chegar, um salto direto termina o trabalho (ignorando o `scroll-behavior` do CSS). O foco só muda quando o botão é usado pelo teclado. O botão subiu para fora da barra do Safari. Testado em 62 páginas, a 360 e 412 px. *(Já publicado em `main`.)*
- Home: "pães com 3 tamanhos" agora mostra a contagem real (38).

**P1**
- Rendimento dos 7 bolos: "1 bolo, no formato da forma da máquina" (sem inventar número de fatias).
- Guia: aviso do modelo (Gallant de 19 programas, GPA1E19A) e de que outras máquinas mudam programas, timer e forma; "Descongelar" sem instrução inventada; rodapé cita a máquina.
- Sem glúten: alerta de rótulo e contaminação cruzada nas receitas com essa etiqueta.
- Contraste AA: texto de apoio escurecido (`--muted` #6F5A4A); cor de cada categoria escurecida no gerador (`tinta()`) até 4,5:1 sobre o branco e sobre o fundo claro dela; camadas do guia com contraste.
- Fontes: Fraunces instanciada (pesos 600 a 900, tamanho óptico fixo em 72, mantendo o eixo SOFT dos títulos): de 271 KB para 127 KB; pré-carregamento das fontes do primeiro texto.
- Busca: também procura no nível, nos sabores da pizza e em "panificadora / máquina de pão"; busca parcial "o que tenho em casa"; filtro "Fáceis" (`?nivel=facil`).
- Receita: botões WhatsApp e "Copiar ingredientes"; barra de passos no modo cozinha; "Você também pode gostar" por ingrediente em comum (sem contar os básicos), categoria, programa e ocasião.

**P2**
- Título do guia com 66 caracteres.
- `datePublished` no JSON-LD a partir do novo campo `publicado` (data real de publicação, 2026-11-02).

## 4. Propostas que não foram implementadas (precisam de decisão ou de dados)

| Proposta | Por que não agora | O que seria preciso |
|---|---|---|
| Lista de compras (P2) | Funciona com as receitas salvas e é possível somar g e ml. Mas "1 ovo + 2 ovos" e colheres de tipos diferentes exigem regras de soma que precisam de validação | Aprovar a regra: soma só mesma unidade; o resto aparece por receita |
| Tempos de preparo (P2) | A duração dos ciclos da máquina não é publicada pelo fabricante, e o Google desaconselha tempo estimado sem base | Cronometrar cada programa na Gallant (uma vez por programa e tamanho) e preencher um campo `tempos` |
| Fotos reais (P1 quando houver) | Hoje são ilustrações por categoria; o Google prefere foto do prato | Fotos tiradas pelo dono; o campo `imagens` já está pronto |
| Sem lactose e vegetariano (P3) | Não dá para garantir só pela lista (manteiga, leite em pó, queijo, gelatina e marcas variam) | Revisão receita a receita e aviso de rótulo, como no sem glúten |
| Custo por receita (P3) | Sem fonte confiável de preços; valor fixo envelhece rápido | Planilha de preços com data e fonte (ex.: compra real no mercado), atualizada a cada 3 meses, com aviso "preços de <mês/ano>" |
| Avaliações (P3) | Exige backend, moderação e LGPD | Só com volume de visitas que justifique |

## 5. Testes executados

- **Filtros:** 18 cenários num celular simulado (Playwright, iPhone 13): contador e cartões visíveis sempre iguais; atalhos, combinações, endereço com valor inválido, busca no plural e sem acento.
- **Funções novas:** "Fáceis" = 39; "frango" acha o pão de frango e a pizza (pelos sabores); "tenho frango batata cebola" mostra 6 receitas parciais com aviso; copiar ingredientes copia o tamanho escolhido; Voltar/Concluí avançam e recuam ("Passo 4 de 17" e "Passo 3 de 17"); alerta sem glúten presente.
- **Largura:** nenhuma das 62 páginas passa da tela a 320, 360, 375, 390, 393, 412, 430 e 768 px.
- **Botão Topo:** volta ao topo nas 62 páginas a 360 e 412 px.
- **Sem JavaScript:** as três quantidades aparecem juntas e a página continua legível.
- **Console:** nenhum erro de JavaScript nos testes.
- **Dados estruturados:** 121 blocos JSON-LD, todos com JSON válido. (O Teste de pesquisa aprimorada do Google não roda neste ambiente; vale passar `https://search.google.com/test/rich-results` numa receita depois de publicar.)
- **Lighthouse 12.2.1** (celular simulado, servidor local sem compressão; o Cloudflare deve ficar igual ou melhor):

| Página | Antes (desempenho / acessibilidade / boas práticas / SEO) | Depois | LCP antes → depois | CLS depois |
|---|---|---|---|---|
| Receita (presunto e queijo) | 89 / 96 / 100 / 100 | 95 / 100 / 100 / 100 | 3,3 s → 2,6 s | 0,073 |
| Home | 83 / 96 / 100 / 100 | 94 / 100 / 100 / 100 | 3,8 s → 2,9 s | 0,001 |
| Guia | 85 / 95 / 100 / 100 | 98 / 100 / 100 / 100 | 3,1 s → 2,3 s | 0,041 (era 0,168) |

INP não é medido em laboratório; só aparece com visitas reais no Search Console.

## 6. Arquivos modificados

- `scripts/build-receitas.js`: busca, relacionadas, JSON-LD, WhatsApp, copiar, alerta sem glúten, barra de passos, números da home, guia, cores com contraste, pré-carregamento de fontes.
- `static-receitas/assets/receitas.js`: botão Topo, Fáceis, busca parcial, copiar ingredientes, barra de passos.
- `static-receitas/assets/receitas.css`: estilos novos, contraste, pesos das fontes.
- `static-receitas/assets/fonts/fraunces.woff2`, `fraunces-italic.woff2`: versões mais leves.
- `static-receitas/receitas.json`: rendimento dos bolos e campo `publicado`.
- `AGENTS.md`, `.eleventyignore`, este arquivo.

## 7. Pendências

1. Cadastrar `https://manoelhenrique.com/receitas/sitemap.xml` no Search Console (só o dono pode).
2. Validar uma receita no Teste de pesquisa aprimorada do Google depois de publicar.
3. Fotos reais dos pães, quando houver.
4. Decidir sobre lista de compras e tempos cronometrados (seção 4).
5. Os PDFs ainda usam "cs" e "cc"; regerar se quiser os livros iguais ao site.
