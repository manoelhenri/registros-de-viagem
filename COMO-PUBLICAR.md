# Como publicar e usar o painel — guia completo

Esse site tem um painel de administração: depois de publicado, você acessa um endereço tipo `seusite.netlify.app/admin`, faz login e edita tudo por formulários — novos posts, novas fotos, novos destinos. Nada de código.

A publicação inicial (feita uma única vez) usa GitHub + Netlify. Depois disso, você nunca mais precisa voltar a essas ferramentas — só usa o painel.

---

## Parte 1 — Publicação inicial (só uma vez)

### 1. Crie uma conta no GitHub
Se ainda não tiver, crie em [github.com](https://github.com). É gratuito.

### 2. Crie um repositório novo
No GitHub, clique em "New repository". Dê um nome, por exemplo `registros-de-viagem`. Deixe como **público** (necessário para o plano gratuito do Netlify identificar o projeto) e clique em "Create repository".

### 3. Envie os arquivos do site para o repositório
Na página do repositório recém-criado, clique em "uploading an existing file" e arraste **todos os arquivos e pastas** desta pasta do site (menos a pasta `node_modules`, se existir — ela não deve ir para o GitHub). Confirme o envio ("Commit changes").

### 4. Crie uma conta no Netlify
Vá em [app.netlify.com](https://app.netlify.com) e crie uma conta — pode entrar direto com o GitHub, é mais rápido.

### 5. Conecte o repositório
No painel do Netlify, clique em "Add new site" → "Import an existing project" → "Deploy with GitHub". Autorize o acesso e escolha o repositório `registros-de-viagem`.

Nas configurações de build, confirme:
- **Build command:** `npm run build`
- **Publish directory:** `_site`

Clique em "Deploy site". Em 1–2 minutos o site estará no ar num link tipo `nome-aleatorio.netlify.app`.

### 6. Ative o login do painel (Netlify Identity + Git Gateway)
Isso é o que permite você (e só você) logar em `/admin` e publicar mudanças.

1. No painel do site no Netlify, vá em **Site configuration → Identity** e clique em "Enable Identity".
2. Ainda em Identity, em "Registration", deixe como **Invite only** (assim só quem você convidar consegue logar).
3. Vá em **Identity → Services → Git Gateway** e clique em "Enable Git Gateway".
4. Volte para a aba principal de Identity e clique em **"Invite users"**. Digite o seu próprio e-mail e envie o convite.
5. Você vai receber um e-mail do Netlify — abra e clique no link para definir sua senha.

### 7. (Opcional) Ajuste o link do painel no arquivo de configuração
No arquivo `admin/config.yml`, troque `SEU-SITE.netlify.app` pelo endereço real que o Netlify te deu (você pode fazer isso direto na tela de edição de arquivo do GitHub, sem precisar do computador). Isso é só cosmético — o painel funciona mesmo sem esse ajuste.

### 8. (Opcional) Domínio próprio e nome do link
Em "Domain settings" no Netlify, você pode trocar o link `nome-aleatorio.netlify.app` por algo como `manoelviaja.netlify.app`, ou conectar um domínio comprado (tipo `manoelviaja.com.br`).

Pronto — a partir daqui, você nunca mais precisa voltar ao GitHub ou ao Netlify no dia a dia.

---

## Parte 2 — Usando o painel no dia a dia

Acesse `seusite.netlify.app/admin` (troque pelo seu link) e faça login com o e-mail e senha que você definiu.

### Adicionar um novo post de viagem
1. Clique em **"Posts do blog"** → **"New Post"**.
2. Preencha: título, data da viagem, foto de capa (clique no campo de foto para enviar do computador), coordenadas/rota (texto pequeno acima do título), duração, resumo curto.
3. Marque **"Destacar na home?"** se quiser que esse seja o post em destaque da página inicial (deixe só um post marcado por vez).
4. Escreva o texto do post no campo principal — dá pra usar negrito, títulos, citações, tudo pela barra de formatação.
5. Clique em **"Publish"** no canto superior direito. Em cerca de 1 minuto a mudança aparece no site.

### Adicionar uma foto a um destino ou parque já cadastrado
1. Clique em **"Destinos (histórico de viagens)"** ou **"Parques visitados"**.
2. Abra o país (ou grupo de parques) e encontre a cidade/parque na lista.
3. No campo **"Foto"**, clique para enviar a imagem. Salve/publique.
4. A foto substitui automaticamente o quadro pontilhado no site.

### Adicionar uma cidade ou parque novo à lista
1. Abra a coleção correspondente ("Destinos" ou "Parques").
2. Dentro do país (ou grupo), clique em **"Add"** na lista de cidades/parques e preencha os campos.
3. Publique.

### Editar a página Sobre
Clique em **"Página Sobre"** e edite o texto, a foto e os números do "cartão de embarque". Publique.

### Trocar seu usuário do Instagram ou nome no rodapé
Clique em **"Configurações do site"** e ajuste. Publique.

Toda alteração feita no painel é salva automaticamente no GitHub (sem você precisar ver isso) e o Netlify republica o site sozinho em seguida.
