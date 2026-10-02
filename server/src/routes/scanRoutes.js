import { Router } from "express";
import multer from "multer";
import { analyzeUploadedScan, getSavedAnalysis, listScans, previewScan, uploadScan } from "../controllers/scanController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter(request, file, callback) {
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    const supported = (extension === "png" && file.mimetype === "image/png")
      || ((extension === "jpg" || extension === "jpeg") && file.mimetype === "image/jpeg");
    callback(null, supported);
  },
});
const uploadSchema = z.object({ patientId: z.string().trim().min(1).max(40) }).strict();

router.use(authenticate, requireRole("doctor"));
router.get("/", listScans);
router.post("/", upload.single("file"), validate(uploadSchema), uploadScan);
router.post("/:scanId/analyze", analyzeUploadedScan);
router.get("/:scanId/analysis", getSavedAnalysis);
router.get("/:scanId/preview", previewScan);

export default router;
