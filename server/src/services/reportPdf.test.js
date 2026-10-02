import assert from "node:assert/strict";
import test from "node:test";
import { createReportPdf } from "./reportPdf.js";

test("creates a printable PDF draft/final report document", async () => {
    const pdf = await createReportPdf({
        report: { reportId: "RPT-TEST", doctorName: "Dr Test", doctorNotes: "Reviewed", recommendation: "Follow up", finalizedAt: new Date("2026-01-01T00:00:00Z") },
        patient: { name: "De-identified Patient", patientId: "PT-TEST", gender: "Other", dateOfBirth: null },
        scan: { scanId: "MRI-TEST", format: "jpg", scanDate: new Date("2026-01-01T00:00:00Z") },
        aiAnalysis: null,
        gradCamImage: null,
    });

    assert.ok(Buffer.isBuffer(pdf));
    assert.equal(pdf.subarray(0, 4).toString("ascii"), "%PDF");
});
