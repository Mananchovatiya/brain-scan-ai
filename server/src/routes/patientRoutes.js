import { Router } from "express";
import { createPatient, listPatients, updatePatient } from "../controllers/patientController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { patientSchema } from "../validation/patientSchemas.js";

const router = Router();
router.use(authenticate, requireRole("doctor"));
router.get("/", listPatients);
router.post("/", validate(patientSchema), createPatient);
router.patch("/:patientId", validate(patientSchema), updatePatient);

export default router;
