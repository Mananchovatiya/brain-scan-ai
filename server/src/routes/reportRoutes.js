import { Router } from "express";
import { downloadFinalReport, finalizeReport, listReports, saveReportDraft } from "../controllers/reportController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { reportDraftSchema } from "../validation/reportSchemas.js";

const router = Router();
router.use(authenticate, requireRole("doctor"));
router.get("/", listReports);
router.post("/", validate(reportDraftSchema), saveReportDraft);
router.patch("/:reportId/finalize", finalizeReport);
router.get("/:reportId/pdf", downloadFinalReport);

export default router;
