import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  interestsTable,
  fundsTable,
  assetsTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

function getUser(req: any) {
  return req.user as {
    id?: string;
    role?: string;
    company?: string | null;
    cnpj?: string | null;
  };
}

function normalizeCnpj(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Descobre qual fundo pertence ao usuário autenticado.
 *
 * Prioridade:
 * 1. CNPJ do usuário
 * 2. Nome da empresa do usuário
 */
async function getFundForUser(req: any) {
  const user = getUser(req);

  const userCnpj = normalizeCnpj(user.cnpj);

  if (userCnpj.length === 14) {
    const funds = await db.select().from(fundsTable);

    const fundByCnpj = funds.find(
      (fund) => normalizeCnpj(fund.cnpj) === userCnpj,
    );

    if (fundByCnpj) {
      return fundByCnpj;
    }
  }

  const company = (user.company ?? "").trim().toLowerCase();

  if (company) {
    const funds = await db.select().from(fundsTable);

    const fundByName = funds.find(
      (fund) => fund.nome.trim().toLowerCase() === company,
    );

    if (fundByName) {
      return fundByName;
    }
  }

  return null;
}

/**
 * POST /api/interests
 *
 * Fundo manifesta interesse em um ativo.
 */
router.post(
  "/",
  requireRole("fundo"),
  async (req, res) => {
    try {
      const { ativoId } = req.body;

      const parsedAssetId = Number(ativoId);

      if (!Number.isInteger(parsedAssetId) || parsedAssetId <= 0) {
        res.status(400).json({
          error: "ativoId inválido",
        });
        return;
      }

      const [asset] = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.id, parsedAssetId));

      if (!asset) {
        res.status(404).json({
          error: "Ativo não encontrado",
        });
        return;
      }

      const fund = await getFundForUser(req);

      if (!fund) {
        res.status(400).json({
          error:
            "Não foi possível identificar o fundo associado ao usuário autenticado.",
        });
        return;
      }

      const existing = await db
        .select()
        .from(interestsTable)
        .where(
          and(
            eq(interestsTable.fundoId, fund.id),
            eq(interestsTable.ativoId, parsedAssetId),
          ),
        );

      if (existing.length > 0) {
        res.status(409).json({
          error: "Este fundo já manifestou interesse neste ativo.",
          interest: existing[0],
        });
        return;
      }

      const [interest] = await db
        .insert(interestsTable)
        .values({
          fundoId: fund.id,
          ativoId: parsedAssetId,
          status: "pendente",
        })
        .returning();

      res.status(201).json({
        message: "Interesse manifestado com sucesso.",
        interest,
      });
    } catch (error) {
      console.error("Erro ao manifestar interesse:", error);

      res.status(500).json({
        error: "Erro interno ao registrar interesse.",
      });
    }
  },
);

/**
 * GET /api/interests/asset/:assetId
 *
 * Fundo consulta seu próprio interesse em determinado ativo.
 *
 * Nunca retorna os fundos que manifestaram interesse.
 */
router.get(
  "/asset/:assetId",
  requireRole("fundo", "ativo", "admin"),
  async (req, res) => {
    try {
      const assetId = Number(req.params.assetId);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          error: "assetId inválido",
        });
        return;
      }

      const user = getUser(req);

      // ADMIN pode visualizar todos.
      if (user.role === "admin") {
        const interests = await db
          .select({
            id: interestsTable.id,
            fundoId: interestsTable.fundoId,
            ativoId: interestsTable.ativoId,
            status: interestsTable.status,
            createdAt: interestsTable.createdAt,
          })
          .from(interestsTable)
          .where(eq(interestsTable.ativoId, assetId))
          .orderBy(desc(interestsTable.createdAt));

        res.json(interests);
        return;
      }

      // ATIVO não recebe nenhuma informação sobre quais fundos
      // demonstraram interesse.
      if (user.role === "ativo") {
        res.json([]);
        return;
      }

      const fund = await getFundForUser(req);

      if (!fund) {
        res.status(400).json({
          error:
            "Não foi possível identificar o fundo associado ao usuário.",
        });
        return;
      }

      const interests = await db
        .select({
          id: interestsTable.id,
          fundoId: interestsTable.fundoId,
          ativoId: interestsTable.ativoId,
          status: interestsTable.status,
          createdAt: interestsTable.createdAt,
        })
        .from(interestsTable)
        .where(
          and(
            eq(interestsTable.ativoId, assetId),
            eq(interestsTable.fundoId, fund.id),
          ),
        )
        .orderBy(desc(interestsTable.createdAt));

      res.json(interests);
    } catch (error) {
      console.error("Erro ao consultar interesse:", error);

      res.status(500).json({
        error: "Erro interno ao consultar interesse.",
      });
    }
  },
);

/**
 * GET /api/interests/fund/:fundId
 *
 * Admin pode consultar todos.
 * Fundo só pode consultar os próprios interesses.
 */
router.get(
  "/fund/:fundId",
  requireRole("fundo", "admin"),
  async (req, res) => {
    try {
      const fundId = Number(req.params.fundId);

      if (!Number.isInteger(fundId) || fundId <= 0) {
        res.status(400).json({
          error: "fundId inválido",
        });
        return;
      }

      const user = getUser(req);

      if (user.role === "fundo") {
        const fund = await getFundForUser(req);

        if (!fund || fund.id !== fundId) {
          res.status(403).json({
            error: "Acesso negado.",
          });
          return;
        }
      }

      const interests = await db
        .select({
          id: interestsTable.id,
          fundoId: interestsTable.fundoId,
          ativoId: interestsTable.ativoId,
          status: interestsTable.status,
          createdAt: interestsTable.createdAt,
          ativo: assetsTable,
        })
        .from(interestsTable)
        .innerJoin(
          assetsTable,
          eq(interestsTable.ativoId, assetsTable.id),
        )
        .where(eq(interestsTable.fundoId, fundId))
        .orderBy(desc(interestsTable.createdAt));

      res.json(interests);
    } catch (error) {
      console.error("Erro ao consultar interesses do fundo:", error);

      res.status(500).json({
        error: "Erro interno ao consultar interesses.",
      });
    }
  },
);

/**
 * GET /api/interests
 *
 * SOMENTE ADMIN.
 *
 * Tela futura de curadoria da Ingenium.
 */
router.get(
  "/",
  requireRole("admin"),
  async (_req, res) => {
    try {
      const interests = await db
        .select({
          id: interestsTable.id,
          fundoId: interestsTable.fundoId,
          ativoId: interestsTable.ativoId,
          status: interestsTable.status,
          createdAt: interestsTable.createdAt,
          fundo: fundsTable,
          ativo: assetsTable,
        })
        .from(interestsTable)
        .innerJoin(
          fundsTable,
          eq(interestsTable.fundoId, fundsTable.id),
        )
        .innerJoin(
          assetsTable,
          eq(interestsTable.ativoId, assetsTable.id),
        )
        .orderBy(desc(interestsTable.createdAt));

      res.json(interests);
    } catch (error) {
      console.error("Erro ao listar interesses:", error);

      res.status(500).json({
        error: "Erro interno ao listar interesses.",
      });
    }
  },
);

/**
 * PATCH /api/interests/:id
 *
 * SOMENTE ADMIN.
 *
 * Estados:
 * - pendente
 * - aprovado
 * - rejeitado
 */
router.patch(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({
          error: "id inválido",
        });
        return;
      }

      const allowedStatuses = new Set([
        "pendente",
        "aprovado",
        "rejeitado",
      ]);

      if (!allowedStatuses.has(status)) {
        res.status(400).json({
          error:
            "Status inválido. Use: pendente, aprovado ou rejeitado.",
        });
        return;
      }

      const [updated] = await db
        .update(interestsTable)
        .set({
          status,
        })
        .where(eq(interestsTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({
          error: "Interesse não encontrado.",
        });
        return;
      }

      res.json({
        message: "Interesse atualizado.",
        interest: updated,
      });
    } catch (error) {
      console.error("Erro ao atualizar interesse:", error);

      res.status(500).json({
        error: "Erro interno ao atualizar interesse.",
      });
    }
  },
);

export default router;