export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const clientId = env.GITHUB_CLIENT_ID;
  const redirectUri = `${url.origin}/api/callback`;
  const state = crypto.randomUUID();

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // Repositório público: public_repo basta para o Decap ler e gravar, e
  // read:user só lê o perfil (nome e avatar no painel). Não peça "repo",
  // que daria acesso a todos os repositórios privados da conta.
  authUrl.searchParams.set('scope', 'public_repo,read:user');
  authUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
