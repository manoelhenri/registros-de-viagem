# Como publicar e usar o painel — guia completo

Esse site tem um painel de administração: você acessa **https://registros-de-viagem.pages.dev/admin**, faz login com sua conta do GitHub e edita tudo por formulários — novos posts, novas fotos, novos destinos. Nada de código.

A hospedagem é **Cloudflare Pages**, ligada ao repositório no **GitHub** (`github.com/manoelhenri/registros-de-viagem`, branch `main`). Todo commit na `main` publica o site sozinho, em cerca de 1 minuto. No dia a dia, você só usa o painel — o que vem a seguir na Parte 1 já está configurado e serve como referência, caso um dia precise mexer nisso de novo (por exemplo, se trocar de conta do GitHub).

---

## Parte 1 — Como a publicação está configurada (referência)

Isso já foi feito uma vez e está funcionando. Você só precisaria repetir esses passos se recriasse o site do zero, perdesse acesso, ou quisesse entender como o login do painel funciona.

### 1. Repositório no GitHub
O código do site vive em [github.com/manoelhenri/registros-de-viagem](https://github.com/manoelhenri/registros-de-viagem), branch `main`.

### 2. Site hospedado no Cloudflare Pages
O projeto está conectado ao Cloudflare Pages, que builda e publica o site a cada commit na `main`:
- **Build command:** `npm run build`
- **Diretório de saída (output/publish directory):** `_site`
- **Link do site:** `https://registros-de-viagem.pages.dev`

Se um dia precisar recriar essa conexão (em [dash.cloudflare.com](https://dash.cloudflare.com), aba **Workers & Pages**), é só apontar para esse mesmo repositório com essas mesmas configurações de build.

### 3. Login do painel (GitHub OAuth, sem Netlify Identity)
O painel (`/admin`) usa o [Decap CMS](https://decapcms.org/) com backend `github` — ou seja, você faz login com sua própria conta do GitHub, sem precisar de usuário/senha separado. Isso funciona por meio de duas *Cloudflare Pages Functions* já publicadas no repositório:

- `functions/api/auth.js` — inicia o login, redirecionando para a tela de autorização do GitHub.
- `functions/api/callback.js` — recebe a resposta do GitHub e entrega o acesso de volta ao painel (com checagens de segurança: confere que o pedido não foi falsificado e que só este site recebe o token).

Essas duas funções dependem de um **GitHub OAuth App**, configurado em [github.com/settings/developers](https://github.com/settings/developers), com:
- **Homepage URL:** `https://registros-de-viagem.pages.dev`
- **Authorization callback URL:** `https://registros-de-viagem.pages.dev/api/callback`

E de duas variáveis de ambiente configuradas no Cloudflare Pages (aba **Settings → Environment variables** do projeto):
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

(os valores desse Client ID/Secret vêm da página do OAuth App acima). Isso já está configurado — só é preciso mexer aqui se o OAuth App for recriado ou os segredos precisarem ser trocados.

### 4. Quem consegue logar no painel
Como o login é feito com sua conta do GitHub, só consegue entrar em `/admin` quem tiver acesso de escrita ao repositório `manoelhenri/registros-de-viagem` no GitHub. Não existe convite separado por e-mail (isso era do Netlify Identity, que não é mais usado) — para dar acesso a outra pessoa, adicione-a como colaboradora do repositório no GitHub.

---

## Parte 2 — Usando o painel no dia a dia

Acesse **https://registros-de-viagem.pages.dev/admin** e clique em **"Entrar"** — você será levado para autorizar no GitHub (só na primeira vez, ou se o acesso expirar) e voltará direto para o painel.

### Adicionar um novo post de viagem
1. Clique em **"Posts do blog"** → **"Novo(a) Post"**.
2. Preencha: título, data da viagem, foto de capa (ou vídeo de capa, se preferir — veja o hint do campo), coordenadas/rota (texto pequeno acima do título), cidades/pessoas, duração, resumo curto.
3. Marque **"Destacar na home?"** se quiser que esse seja o post em destaque da página inicial (deixe só um post marcado por vez).
4. Escreva o texto do post no campo principal — dá pra usar negrito, títulos, citações, tudo pela barra de formatação. Para colocar um vídeo no meio do texto, cole o link do YouTube/Vimeo/Instagram sozinho numa linha.
5. Clique em **"Publicar"** no canto superior direito. Em cerca de 1 minuto a mudança aparece no site.

> As estatísticas da Home e da página Sobre (número de destinos, países, roteiros publicados etc.) são **calculadas automaticamente** a partir do conteúdo real — não são campos que você preenche.

### Adicionar uma foto a um destino ou parque já cadastrado
1. Clique em **"Destinos (histórico de viagens)"** ou **"Parques visitados"**.
2. Abra o país (ou grupo de parques) e encontre a cidade/parque na lista.
3. No campo **"Foto"**, clique para enviar a imagem. Publique.
4. A foto substitui automaticamente o quadro pontilhado no site.

### Adicionar uma cidade ou parque novo à lista
1. Abra a coleção correspondente ("Destinos" ou "Parques").
2. Dentro do país (ou grupo), clique em **"Adicionar"** na lista de cidades/parques e preencha os campos.
3. Publique.
4. Uma cidade/parque novo só aparece no mapa interativo (`/mapa/`) depois que a coordenada dele for adicionada em `_data/coordsMapa.json` no GitHub — isso ainda não tem um campo no painel (peça ajuda para adicionar quando isso acontecer).

### Editar a página Sobre
Clique em **"Página Sobre"** e edite o texto e a foto. Publique.

### Trocar seu usuário do Instagram ou nome no rodapé
Clique em **"Configurações do site"** e ajuste. Publique.

Toda alteração feita no painel é salva automaticamente no GitHub (sem você precisar ver isso) e o Cloudflare Pages republica o site sozinho em seguida, em cerca de 1 minuto.

---

## Solução de problemas

- **O painel não carrega, ou fica travado numa tela em branco.** Confira sua conexão e tente atualizar a página. Se persistir, avise para investigarmos — pode ser uma mudança na versão do Decap CMS usada pelo painel.
- **Cliquei em "Entrar" e nada acontece / dá erro de autorização.** Normalmente resolve tentando de novo. Se continuar, pode ser que o acesso do GitHub OAuth App tenha expirado ou sido revogado — nesse caso, é preciso reconfigurar a Parte 1 acima.
- **Publiquei algo e não apareceu no site depois de alguns minutos.** Confira no painel do Cloudflare Pages (aba "Deployments" do projeto) se o build rodou sem erro. Um erro de build geralmente significa algum dado inválido (por exemplo, um campo obrigatório vazio).
