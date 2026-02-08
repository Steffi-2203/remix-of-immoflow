import express from "express";
import { requirePermission } from "../middleware/auth";
import { parsePagination, paginatedResponse } from "../../lib/pagination";
import { db } from "../../db";

const router = express.Router();

router.get("/", requirePermission("payments.read"), async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const offset = (page - 1) * limit;

  const rows = await db.query(
    "SELECT id, amount_cents, status, created_at FROM payments WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [req.user.orgId, limit, offset]
  );

  const total = await db.query(
    "SELECT COUNT(*) as cnt FROM payments WHERE organization_id = $1",
    [req.user.orgId]
  );

  res.json(paginatedResponse(rows, { page, limit, total: Number(total[0].cnt) }));
});

export default router;
