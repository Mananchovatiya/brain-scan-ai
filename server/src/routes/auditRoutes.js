import { Router } from "express";
import { listAuditLogs } from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
router.get("/", authenticate, requireRole("admin"), listAuditLogs);

export default router;
