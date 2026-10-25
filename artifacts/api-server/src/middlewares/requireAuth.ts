import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

export function requireRole(...roles: Array<"fundo" | "ativo" | "admin">) {
  const allowed = new Set(roles);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    const role = (req.user as { role?: string } | undefined)?.role;
    if (!role || !allowed.has(role as "fundo" | "ativo" | "admin")) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  };
}
