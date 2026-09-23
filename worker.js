function secureHeaders(response, { privateCache = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (privateCache) headers.set("Cache-Control", "private, no-store, max-age=0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "start-brand-campus" });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API not configured yet" }, 503);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return secureHeaders(assetResponse, {
      privateCache: url.pathname.startsWith("/campus/")
    });
  }
};