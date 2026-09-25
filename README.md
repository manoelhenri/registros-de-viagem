# registros de viagem

Blog pessoal de viagens com um painel de administração — você adiciona posts, destinos e fotos preenchendo formulários, sem editar nenhum arquivo de código.

Veja **COMO-PUBLICAR.md** para o passo a passo completo de publicação.

## Estrutura (para referência — você não precisa mexer aqui)

- `content/posts/` — cada post do blog (criado pelo painel)
- `_data/destinosData.json` — histórico de cidades visitadas (editado pelo painel; `_data/destinos.js` desembrulha para o site)
- `_data/parquesData.json` — histórico de parques visitados (editado pelo painel; `_data/parques.js` desembrulha para o site)
- `_data/sobre.json` — conteúdo da página Sobre
- `_data/site.json` — nome, Instagram, rodapé
- `admin/` — o painel de administração (acessível em `/admin` depois de publicado)
- `images/uploads/` — fotos enviadas pelo painel
