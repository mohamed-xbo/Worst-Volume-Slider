export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'invalid-json' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const token = payload && payload.token;
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'missing-token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const secret = env.RECAPTCHA_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ success: false, error: 'missing-secret' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const verifyResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });

    const json = await verifyResp.json();
    return new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json' } });
  }
};
