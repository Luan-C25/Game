// Step 1: health check only. The API grows in later steps.
export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return Response.json({ ok: true });
    if (url.pathname === "/api/event") return new Response(null, { status: 204 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
