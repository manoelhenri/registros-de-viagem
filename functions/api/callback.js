export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('Cookie') || '';
  const cookieState = (cookie.match(/oauth_state=([^;]+)/) || [])[1];

  // O state vale para um único login: o cookie é apagado em toda resposta
  // daqui, deu certo ou não, e a página com o token não fica em cache.
  const semCache = {
    'Set-Cookie': 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    'Cache-Control': 'no-store',
  };

  if (!code || !state || state !== cookieState) {
    return new Response('Invalid OAuth state. Please try logging in again.', { status: 400, headers: semCache });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    return new Response('GitHub OAuth error: ' + (tokenData.error_description || tokenData.error), { status: 400, headers: semCache });
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });

  // O painel pode ser aberto em manoelhenrique.com/admin, mas o login sempre
  // volta por registros-de-viagem.pages.dev (base_url do config.yml). Por isso
  // o token só é entregue a uma destas origens, nunca a "*".
  const origens = [url.origin, 'https://manoelhenrique.com', 'https://www.manoelhenrique.com'];

  const html = `<!DOCTYPE html><html><body>
<script>
(function() {
  var origens = ${JSON.stringify(origens)};
  function receiveMessage(e) {
    // Only hand the token to the admin panel on one of the blog's own origins.
    if (origens.indexOf(e.origin) === -1) return;
    window.opener.postMessage('authorization:github:success:${payload}', e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  // Announce to each allowed origin; the browser drops the ones that don't
  // match the opener, so nothing goes to a third-party site.
  origens.forEach(function (o) { window.opener.postMessage('authorizing:github', o); });
})();
</script>
</body></html>`;

  return new Response(html, { headers: { ...semCache, 'Content-Type': 'text/html' } });
}
