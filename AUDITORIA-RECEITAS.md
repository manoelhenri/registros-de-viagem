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

---

# Revisão editorial das 60 receitas (3 de novembro de 2026)

Base: auditoria editorial externa (`auditoria-receitas-manoel-100.md`), feita sobre o arquivo de texto exportado do site. **Status: aplicada na branch `receitas-revisao-editorial`, com prévia, ainda não publicada.**

## O que a auditoria apontou e não se aplicava ao site

- **Tamanhos (item 4.1):** o arquivo exportado só trazia o pão de 750 g, mas o site tem as três colunas (500, 750 e 1000 g) com botão de tamanho. A instrução "escolha o tamanho" está certa no site.
- **Massa de pizza (24):** no site, massa, passo a passo e sabores já ficavam em blocos separados; o texto exportado juntava tudo. Mesmo assim, o molho virou um item próprio e o forno deixou de aparecer duas vezes.

## Correções aplicadas

| Nº | Receita | Correção |
|---:|---|---|
| todas | Ponto da massa | A frase única ("bola lisa que solta das paredes") virou duas: uma para pão comum (bola macia, pode grudar um pouco) e outra para massas ricas do programa Brioche (mole e brilhante é normal, não junte farinha) |
| todas | Ordem do fim | "Deixe esfriar 40 minutos" vem logo depois de desenformar, antes de qualquer passo de fatiar, dourar ou fazer rabanada; o pão de 1 kg pede mais tempo |
| 15, 16, 46, 47 | Adicionais | Frutas, gotas e passas entram quando a máquina apitar (se avisar) ou com a massa lisa |
| todas | Grafia | "Mussarela" virou "muçarela" |
| 3, 34, 40, 41, 55 | Peso cozido | Passo novo: pesar depois de cozido, escorrido e espremido |
| 7 | Integral com mel | Saiu a troca genérica para 100% integral, sem tabela nem teste |
| 8 | Multigrãos | Colher de sementes da casca separada na lista; se a máquina não avisar o momento, pular |
| 9 | Aveia e mel | Mudou para "Pães do dia a dia" (é farinha branca com aveia); sem "o melhor do site" |
| 10 | Pão italiano | Descrição: "inspirado nos sabores italianos", feito na forma |
| 11 | Sem glúten | Psyllium em pó (não a casca inteira); esfriar pelo menos 1 hora; sem frase duplicada |
| 12 | Brioche | Sem a contradição de juntar farinha; sem superlativos |
| 13 | Leite condensado | "Miolo macio e levemente adocicado"; casca clara porque doura rápido |
| 20 | Romeu e Julieta | Gema e açúcar cristal na lista (acabamento); cubos de goiabada longe da borda |
| 23 | Hambúrguer | Gema e gergelim saíram da massa e viraram "Acabamento" |
| 25 | Focaccia | Azeite, alecrim, tomate e sal grosso saíram da forma da máquina e viraram "Cobertura" com quantidades |
| 30, 57 a 60 | Geleias e doces | Pote limpo e escaldado, geladeira até 3 semanas ou freezer até 3 meses, "não é conserva" |
| 35 | Centeio | Descrição: pão de trigo com 30% de centeio |
| 37 | Pão de queijo de forma | Avisa que leva trigo e glúten; fatiar e dourar só depois de frio; "como guardar" sem o recheio que não existe |
| 40, 43 | Macaxeira | "(aipim ou mandioca mansa)"; no bolo, aviso para nunca usar mandioca-brava |
| 41 | Jerimum | Título "Pão de abóbora cabotiá (jerimum)" (endereço mantido) |
| 42 | Tapioca | Tapioca granulada, não a goma pronta |
| 45 | Rabanada | Esfriar, guardar até o dia seguinte e só então fatiar e fritar |
| 46 | Stollen | Como embrulhar e guardar nos 3 dias de descanso |
| 47 | Rosca de Páscoa | Gema na lista; glacê só depois de desenformar e esfriar; como a trança cabe na forma |
| 50 | Pão de mel | Especiarias separadas: ½ colher (chá) de canela, ¼ de cravo, ¼ de gengibre |
| 51, 52 | Arroz-doce e canjica | Peso cru (arroz) e seco (canjica), antes de cozinhar |
| 54 | Pastel | Saiu a frase sobre fermento (a receita não leva) |
| 57 | Goiabada | 100 ml de água na lista |
| 31, 32 | Cucas | Se a farofa não dourar na máquina, 5 a 10 minutos no forno |
| 6, 22, 49 e outras | Ajustes | Pão rápido com parmesão (não é pão de queijo); provar o recheio antes de salgar; paçoca de rolha |
| páginas | Programas | Nota em toda receita: os programas são os da Gallant; em outra máquina, use o ciclo equivalente do manual |

## Depende de teste na máquina (não alterado sem preparo real)

| Receitas | O que testar |
|---|---|
| 43, 46, 51, 52, 36, 48 | Volume na forma: bolo de macaxeira (800 g), stollen com frutas e marzipã, arroz-doce, canjica, broa e bolo de milho. Doce que ferve não pode passar da metade da forma |
| 42 | Se a tapioca granulada precisa ser hidratada antes |
| 11 | Textura final do pão sem glúten |
| 31, 32 | Se a farofa doura dentro da máquina |
| 14, 17 a 22 | Volume de recheio e se a emenda segura |
| 56 | Ponto do brownie no programa Misturar e Assar |
| 6 | Fermento no ciclo rápido |

Nenhuma receita deve ser apresentada como "testada" até esse preparo real.

## Sugestões não aplicadas (decisão do dono)

- **Trocar colheres por gramas como medida principal:** exige pesar cada colher de cada ingrediente; as colheres hoje seguem o padrão da máquina.
- **"Panificadora (máquina de pão)" e "programar para começar mais tarde (timer)" em todo texto:** o guia já explica; repetir em 60 receitas deixaria os passos mais longos no celular.
- **Renomear "Pão francês de forma" e "Pão de queijo de forma":** mantive os nomes (são os que as pessoas buscam) e deixei a descrição honesta.

## Pauta de 40 receitas novas (planejamento, não publicado)

Só entram no site depois de terem quantidades nos três tamanhos (quando for pão), preparo real na Gallant, rendimento confirmado e foto.

| Categoria | Atuais | Novas | Meta |
|---|---:|---:|---:|
| Pães do dia a dia | 13 | 8 | 21 |
| Integrais e especiais | 5 | 8 | 13 |
| Pães doces e roscas | 11 | 7 | 18 |
| Pães recheados | 7 | 7 | 14 |
| Massas para modelar | 7 | 5 | 12 |
| Bolos e cucas | 10 | 4 | 14 |
| Geleias e doces de panela | 7 | 1 | 8 |
| **Total** | **60** | **40** | **100** |

(Aveia e mel passou de "Integrais" para "Dia a dia", por isso 13 e 5.)

**Pães do dia a dia:** pão de milho verde; pão de cebola; pão de iogurte natural; pão de mandioquinha; pão de azeitonas e orégano; pão de tomate seco e manjericão; pão de alho assado e ervas; pão de arroz cozido.

**Integrais e especiais:** pão 100% integral com aveia; pão integral de linhaça e chia; pão de quinoa e ervas; pão de trigo-sarraceno e sementes; pão de sorgo sem glúten; pão sem glúten de milho e polvilho; pão sem lactose de ervas; pão vegano integral.

**Pães doces e roscas:** rolinhos de canela; pão doce de maçã e canela; pão doce de laranja e baunilha; rosca de creme de baunilha; pão de banana com nozes; pão doce de abacaxi e coco; trança doce de chocolate e avelã.

**Pães recheados:** carne-seca com abóbora; escarola com provolone; brócolis com queijo; tomate seco com muçarela; cogumelos e queijo; pernil com queijo coalho; bacalhau com azeitonas.

**Massas para modelar:** pão de hot dog; baguete caseira; esfiha assada; pretzel macio; pão de queijo mineiro em bolinhas.

**Bolos e cucas:** bolo de laranja; bolo de fubá com goiabada; cuca de maçã com farofa; bolo de limão com iogurte.

**Geleias e doces de panela:** doce de abóbora com coco.

**Ordem sugerida:** primeiro as que preenchem lacunas reais do catálogo (pão 100% integral, pão de queijo mineiro sem trigo, segunda opção sem glúten, rolinhos de canela, pão de hot dog), porque respondem a buscas comuns e corrigem pontos levantados pela auditoria.

---

# Catálogo de 100 receitas revisado com os manuais (3 de novembro de 2026)

Base: o catálogo sugerido em `catalogo_100_receitas_Gallant_final_para_site.docx`, conferido contra o **Manual de Instruções Gallant** (24 páginas), o **Livro de Receitas Gallant** (19 programas, 600 W) e o **manual Britânia Multi Pane** (61 páginas). Publicado depois da aprovação do dono.

## O que vale dos manuais

- Tamanho (500, 750, 1000 g) só nos programas 1 a 7; cor nos programas 1 a 7, 16, 18 e 19; PROGRAMAR até 15 horas, indisponível nos programas 12 a 15 e 17 a 19, e proibido com laticínios, ovos, creme ou queijo.
- Aviso de adição (10 bipes) só nos programas 1 a 7. Manter Aquecido por 1 hora.
- Líquidos em temperatura ambiente (20 °C a 25 °C). Esperar cerca de 20 minutos antes de fatiar. Pão em saco fechado por 3 dias, ou 10 dias na geladeira.
- Forma e pá podem ir à lava-louças; primeiro uso: Assar vazia por 10 minutos; ambiente de 15 °C a 34 °C.
- Programa Massa: no máximo 1 kg de ingredientes (livro). Geleias feitas na panificadora: geladeira, até 1 semana (livro).
- O livro usa 1 kg, 700 g e 500 g; o painel mostra 1000, 750 e 500 g.

## Como cada receita foi montada

| Origem | Quantas | Como |
|---|---:|---|
| Oficial Gallant | 12 | Fórmulas transcritas do livro: 9 pães nos três tamanhos, 2 bolos e a geleia de morango |
| Adaptada (Britânia) | 39 | Fórmula do docx; páginas do manual Britânia conferidas no índice |
| Autoral | 49 | Fórmula do docx ou a versão já revisada do site |

Pães dos programas 1 a 7 sempre com três tamanhos: oficiais (do livro) ou calculados por proporção a partir do tamanho-base, marcado na página. Massa, Bolo, Geleia, Sovar e Misturar e Assar com quantidade única.

## Erros do docx corrigidos

- **Massa de pastel (54):** o docx trazia ingredientes e preparo de pão de cerveja; ficou a versão revisada do site.
- **Pretzel (94):** o docx trazia uma receita de pão de queijo no programa Bolo; a massa de pretzel foi escrita do zero (autoral).
- **Programas impressos no livro:** o livro da Gallant põe "programa 1" em todas as receitas; valeu o nome (Macio, Francês, Integral, Brioche), confirmado no painel do manual. Pão de milho no programa Francês, como no livro.
- **Pão de banana (81):** o docx somou nozes à fórmula oficial; ficou a fórmula do livro.
- **Pão de sanduíche:** a dica dizia que o programa Sanduíche não permite escolher a cor; o manual diz que permite.
- **Rosca de Páscoa e stollen:** passas e frutas entram à mão na modelagem (o programa Massa não tem aviso de adição).
- Textos herdados que contradiziam o manual: amornar o leite a 30 °C, esperar 40 minutos, "não lave na lava-louças", "nunca ligue vazia", soltar a pá com palito.

## Endereços

Mantidos os endereços das receitas que continuam (mesmo prato). Novos endereços para pratos novos. Redirecionamento 301:

- para a receita equivalente: pão rápido de queijo → pão de parmesão; integral com mel → pão integral; brioche amanteigado → pão brioche; rosca de coco → pão de coco; geleia de abacaxi com pimenta → geleia de abacaxi; multigrãos com sementes → pão multigrãos de linhaça e chia;
- para a página inicial das receitas (prato que saiu do catálogo): arroz-doce, canjica, nhoque, goiabada cremosa, doce de banana e geleia de frutas vermelhas.

## Pendências

1. Nenhuma receita foi preparada na máquina; quantidades calculadas e receitas autorais e adaptadas precisam de teste.
2. Os PDFs dos livros saíram da home por estarem desatualizados; regerar a partir do catálogo novo, se quiser.
3. Fotos reais dos pães.
4. Reenviar o sitemap no Search Console (agora com 102 endereços).
