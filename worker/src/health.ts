import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

let battlesProcessed = 0;
let lastClaimAt: string | null = null;

export function incrementProcessed() {
  battlesProcessed++;
  lastClaimAt = new Date().toISOString();
}

export function startHealthServer(port: number) {
  const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        uptime: process.uptime(),
        battles_processed: battlesProcessed,
        last_claim_at: lastClaimAt,
      }),
    );
  });

  server.listen(port, () => {
    console.log(`[health] listening on :${port}`);
  });
}
