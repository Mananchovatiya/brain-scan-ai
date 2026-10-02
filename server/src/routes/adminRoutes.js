import { Router } from "express";
import {
  getOverview,
  listAllPatients,
  listAllReports,
  listAllScans,
  listDoctors,
  updateDoctorStatus,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { doctorStatusSchema } from "../validation/adminSchemas.js";

const router = Router();
router.use(authenticate, requireRole("admin"));
router.get("/overview", getOverview);
router.get("/doctors", listDoctors);
router.patch("/doctors/:doctorId", validate(doctorStatusSchema), updateDoctorStatus);
router.get("/patients", listAllPatients);
router.get("/scans", listAllScans);
router.get("/reports", listAllReports);

export default router;
