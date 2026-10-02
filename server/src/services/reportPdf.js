import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

const ink = "#253630";
const muted = "#66756d";
const green = "#34745b";

export async function createReportPdf({ report, patient, scan, aiAnalysis, gradCamImage }) {
    const document = new PDFDocument({ size: "A4", margin: 52, info: { Title: `BrainScan AI report ${report.reportId}`, Author: report.doctorName } });
    const stream = new PassThrough();
    const chunks = [];
    const complete = new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
        document.on("error", reject);
    });
    document.pipe(stream);

    document.fillColor(green).fontSize(10).font("Helvetica-Bold").text("BRAINSCAN AI", { characterSpacing: 1.3 });
    document.moveDown(0.7).fillColor(ink).fontSize(23).font("Helvetica-Bold").text("Brain MRI analysis report");
    document.moveDown(0.3).fillColor(muted).fontSize(9).font("Helvetica").text(`Report ${report.reportId} · Finalized ${new Date(report.finalizedAt || Date.now()).toLocaleString()}`);
    document.moveDown(1.2);

    function section(title, body) {
        document.fillColor(green).fontSize(10).font("Helvetica-Bold").text(title.toUpperCase(), { characterSpacing: 0.7 });
        document.moveDown(0.35).fillColor(ink).fontSize(10).font("Helvetica").text(body || "Not provided", { lineGap: 3 });
        document.moveDown(1);
    }

    section("Patient", `${patient.name} · ${patient.patientId}\nDate of birth: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "Not provided"} · Gender: ${patient.gender || "Not provided"}`);
    section("Examination", `${scan.scanId} · ${String(scan.format || "image").toUpperCase()} · ${new Date(scan.scanDate).toLocaleString()}`);
    section("Reviewing clinician", report.doctorName);

    if (aiAnalysis) {
        section("AI-assisted finding", `${aiAnalysis.predictedClass} · ${(aiAnalysis.confidence * 100).toFixed(1)}% model confidence\nModel: ${aiAnalysis.modelName} ${aiAnalysis.modelVersion}\nModel confidence is not a clinical probability.`);
        document.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("CLASS PROBABILITIES");
        document.moveDown(0.3);
        for (const item of aiAnalysis.classProbabilities || []) {
            document.fillColor(ink).fontSize(9).font("Helvetica").text(`${item.className}: ${(item.probability * 100).toFixed(1)}%`);
        }
        document.moveDown(0.8);
        if (gradCamImage) {
            document.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("GRAD-CAM EXPLAINABILITY OVERLAY");
            document.moveDown(0.3);
            document.image(gradCamImage, { fit: [280, 220], align: "center" });
            document.moveDown(0.4).fillColor(muted).fontSize(8).font("Helvetica").text("Explainability visualization only; not clinically validated segmentation.");
            document.moveDown(0.8);
        }
    } else {
        section("AI-assisted finding", "No real AI analysis is attached to this report. Mock output is not included in finalized reports.");
    }

    section("Clinician notes", report.doctorNotes);
    section("Recommendation", report.recommendation);
    document.moveDown(0.6).fillColor(muted).fontSize(8).font("Helvetica").text(
        "BrainScan AI is an academic decision-support prototype. AI findings assist clinician review and are not a substitute for professional medical judgment.",
        { align: "left", lineGap: 2 },
    );
    document.end();
    return complete;
}
