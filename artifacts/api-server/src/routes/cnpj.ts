/**
 * GET /cnpj/:cnpj
 *
 * Real-time CNPJ validation via Receita Federal (BrasilAPI with fallback to
 * publica.cnpj.ws). Used by the signup form for live feedback. The same
 * underlying service is called server-side at signup to prevent client-side
 * bypass — see services/cnpj-lookup.ts.
 *
 * Open endpoint (used before login) with per-IP rate limiting.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { lookupCnpj } from "../services/cnpj-lookup";

const router: IRouter = Router();

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_MAX) return false;
  b.count += 1;
  return true;
}

router.get("/cnpj/:cnpj", async (req: Request, res: Response) => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").toString();
  if (!rateLimit(ip)) {
    res.status(429).json({ error: "Muitas consultas. Aguarde 1 minuto." });
    return;
  }
  const raw = typeof req.params.cnpj === "string" ? req.params.cnpj : "";
  const outcome = await lookupCnpj(raw);

  if (outcome.kind === "invalid") {
    res.status(400).json({ error: outcome.reason });
    return;
  }
  if (outcome.kind === "notfound") {
    res.status(404).json({ error: "CNPJ não encontrado na Receita Federal" });
    return;
  }
  if (outcome.kind === "fail") {
    req.log.warn({ status: outcome.status, cnpj: raw }, "All CNPJ providers failed");
    res.status(502).json({
      error: "Serviço de consulta temporariamente indisponível. Tente novamente em alguns minutos.",
    });
    return;
  }
  res.json(outcome.result);
});

export default router;
