import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { request } from "../api/http.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

const dateText = (date) => date ? new Date(date).toLocaleDateString() : "—";
const errorText = (error) => error?.message || "Something went wrong. Please try again.";
const fieldClass = "mt-1.5 block min-h-11 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10";

function useLoad(path, key) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    request(path).then((result) => { if (active) setData(result[key]); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, key]);
  return { data, error, loading, setData };
}

function Alert({ children }) {
  return children ? <p className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-5 text-danger" role="alert">{children}</p> : null;
}

function Button({ children, onClick, type = "button", disabled = false, secondary = false }) {
  const common = "min-h-11 rounded-lg px-4 text-sm font-semibold transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
  return <button className={secondary ? `${common} border border-line bg-white text-ink shadow-sm hover:bg-page` : `${common} bg-primary text-white shadow-sm hover:bg-deep`} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

function SearchBox({ value, onChange, placeholder }) {
  return <label className="relative block w-full sm:max-w-sm"><span className="sr-only">{placeholder}</span><svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.7" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><input className="min-h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Status({ status }) {
  const label = status.replaceAll("_", " ");
  const tone = ["completed", "complete"].includes(label) ? "bg-soft text-deep" : label === "failed" ? "bg-danger/10 text-danger" : "bg-page text-muted";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}><span className="mr-1.5 mt-1 size-1.5 rounded-full bg-current" />{label}</span>;
}

function OverviewMetric({ label, value, note, tone, icon }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-bottom"><strong>{value}</strong></div><div className="metric-note">{note}</div></article>;
}

function OverviewIcon({ kind }) {
  const shape = kind === "patients" ? <><path d="M12 10a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0ZM2.5 19c.7-3.2 2.7-4.8 6-4.8s5.3 1.6 6 4.8M15 7a3 3 0 0 1 0 5.8M16 15c1.5.5 2.4 1.8 2.8 4" /></> : kind === "scans" ? <><path d="M12 2.5c-4.3 0-7 3.4-7 8s2.7 8 7 8 7-3.4 7-8-2.7-8-7-8Z" /><path d="M12 3v15M8 6c1.1.4 1.7 1.2 1.7 2.4M16 6c-1.1.4-1.7 1.2-1.7 2.4M8 15c1.1-.4 1.7-1.2 1.7-2.4M16 15c-1.1-.4-1.7-1.2-1.7-2.4" /></> : kind === "pending" ? <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.4 2" /></> : <><path d="M5 3.5h9l4 4V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5v4h4M7 11h7M7 14h7M7 17h4" /></>;
  return <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}

function Table({ headings, rows }) {
  return <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm"><table className="w-full border-collapse text-left text-sm"><thead className="bg-soft text-[11px] uppercase tracking-[.08em] text-muted"><tr>{headings.map((heading) => <th className="whitespace-nowrap px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr className="border-t border-line text-ink transition-colors hover:bg-page/70" key={row.key ?? index}>{row.cells.map((cell, cellIndex) => <td className="px-4 py-3.5 align-middle" key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="px-4 py-8 text-center text-sm text-muted" colSpan={headings.length}>No records found.</td></tr>}</tbody></table></div>;
}

function Field({ label, name, value, onChange, type = "text", required = false, options, ...props }) {
  return <label className="mb-4 block text-[13px] font-semibold text-ink">{label}{options ? <select className={fieldClass} name={name} value={value || ""} onChange={onChange} required={required}><option value="">Choose...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : type === "textarea" ? <textarea className={`${fieldClass} min-h-28 resize-y`} name={name} value={value || ""} onChange={onChange} required={required} {...props} /> : <input className={fieldClass} name={name} type={type} value={value || ""} onChange={onChange} required={required} {...props} />}</label>;
}

export function DoctorHome() {
  const { user } = useAuth();
  const patients = useLoad("/patients", "patients");
  const scans = useLoad("/scans", "scans");
  const reports = useLoad("/reports", "reports");
  const error = patients.error || scans.error || reports.error;
  const metrics = [
    { label: "Total patients", value: patients.data?.length ?? "—", note: "records in your practice", tone: "mint", icon: "patients" },
    { label: "MRI examinations", value: scans.data?.length ?? "—", note: "uploaded scans", tone: "blue-tone", icon: "scans" },
    { label: "Pending reviews", value: (scans.data || []).filter((scan) => scan.status === "needs_review").length, note: "awaiting clinician sign-off", tone: "peach", icon: "pending" },
    { label: "Reports generated", value: reports.data?.length ?? "—", note: "saved report drafts", tone: "lavender", icon: "reports" },
  ];
  const recentScans = (scans.data || []).slice(0, 5);
  return <div className="space-y-6"><section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> CLINICAL WORKSPACE</div><h1>Good morning, {user?.name?.split(/\s+/).slice(-1)[0]}</h1><p className="welcome-sub">Here&apos;s what&apos;s happening with your practice today.</p></div><div className="welcome-actions"><Link className="button button-secondary" to="/doctor/reports">View reports</Link><Link className="button button-primary" to="/doctor/patients">Manage patients</Link></div></section><Alert>{error}</Alert><div className="metric-grid" aria-label="Practice overview">{metrics.map((metric) => <OverviewMetric key={metric.label} {...metric} icon={<OverviewIcon kind={metric.icon} />} />)}</div><div className="grid grid-cols-1 items-start gap-[17px] xl:grid-cols-[minmax(0,1.85fr)_minmax(260px,.9fr)]"><section className="panel scans-panel"><div className="panel-heading"><div><div className="heading-title"><h2>Recent examinations</h2><span className="count-pill">{scans.data?.length ?? 0}</span></div><p>Review and manage your latest MRI scans.</p></div><Link className="text-link" to="/doctor/scans">View all <span aria-hidden="true">→</span></Link></div><div className="table-wrap"><Table headings={["Patient", "Scan", "Date", "Status"]} rows={recentScans.map((scan) => ({ key: scan.scanId, cells: [<span><b>{scan.patientName}</b><small className="block text-muted">{scan.patientId}</small></span>, <Link className="font-semibold text-primary underline-offset-4 hover:underline" to={`/doctor/scans?scan=${encodeURIComponent(scan.scanId)}`}>{scan.scanId}</Link>, dateText(scan.date), <Status status={scan.status} />] }))} empty="No MRI examinations have been uploaded yet." /></div><div className="table-footer"><span>Showing <b>{recentScans.length}</b> of {scans.data?.length ?? 0} examinations</span><Link to="/doctor/scans">See all examinations →</Link></div></section><aside className="space-y-3"><section className="model-card"><div className="model-top"><span className="model-icon"><OverviewIcon kind="scans" /></span><span className="model-live model-offline"><span /> NOT CONNECTED</span></div><h3>AI model not configured</h3><p>Python FastAPI service · awaiting setup</p><div className="model-rule" /><div className="model-bottom"><span>Analysis unavailable</span><Link to="/doctor/scans">Open scans →</Link></div><div className="model-orbit orbit-one" /><div className="model-orbit orbit-two" /></section><section className="tip-card"><span className="tip-icon"><OverviewIcon kind="pending" /></span><p><b>Clinical reminder</b><br />AI supports clinician review; it does not replace professional medical judgment.</p></section><section className="panel p-4"><b className="text-sm text-ink">Saved report drafts</b><p className="mt-1 text-2xl font-semibold text-deep">{reports.data?.length ?? "—"}</p><Link className="text-link" to="/doctor/reports">Open reports →</Link></section></aside></div></div>;
}

export function PatientWorkspace() {
  const params = useParams();
  const editing = Boolean(params.patientId);
  const { data, error, loading, setData } = useLoad("/patients", "patients");
  const { data: scans } = useLoad("/scans", "scans");
  const { data: reports } = useLoad("/reports", "reports");
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(editing);
  const [busy, setBusy] = useState(false);
  const initial = { name: "", dateOfBirth: "", gender: "", phone: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "" };
  const selected = data?.find((patient) => patient.patientId === params.patientId);
  const [form, setForm] = useState(initial);
  useEffect(() => { if (selected) setForm({ ...initial, ...selected, dateOfBirth: selected.dateOfBirth?.slice(0, 10) || "" }); }, [selected?.patientId]);
  const filtered = (data || []).filter((patient) => `${patient.name} ${patient.patientId} ${patient.email}`.toLowerCase().includes(query.toLowerCase()));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request(editing ? `/patients/${encodeURIComponent(params.patientId)}` : "/patients", { method: editing ? "PATCH" : "POST", body: JSON.stringify(form) });
      setData((current) => editing ? current.map((patient) => patient.patientId === params.patientId ? result.patient : patient) : [result.patient, ...(current || [])]);
      showToast(editing ? "Patient updated." : "Patient created.");
      setFormOpen(false);
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusy(false);
    }
  }

  const patientScans = (scans || []).filter((scan) => scan.patientId === selected?.patientId);
  const patientReports = (reports || []).filter((report) => report.patientId === selected?.patientId);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-ink">{editing ? selected?.name || "Patient profile" : "Your patients"}</h1><p className="mt-1 text-sm text-muted">Manage patient details and examination history.</p></div><Alert>{error}</Alert>{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading patient records...</p>}{editing && selected && <><section className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6"><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Patient ID</span><p className="mt-1 font-semibold text-ink">{selected.patientId}</p></div><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Demographics</span><p className="mt-1 font-medium text-ink">{selected.gender} · Born {dateText(selected.dateOfBirth)}</p></div><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Contact</span><p className="mt-1 text-sm text-ink">{selected.email || "No email"} · {selected.phone || "No phone"}</p></div><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Address</span><p className="mt-1 text-sm text-ink">{selected.address || "No address"}</p></div><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Emergency contact</span><p className="mt-1 text-sm text-ink">{selected.emergencyContactName || "Not provided"}</p><p className="text-xs text-muted">{[selected.emergencyContactRelationship, selected.emergencyContactPhone].filter(Boolean).join(" · ")}</p></div><div><span className="text-xs font-semibold uppercase tracking-wide text-muted">Record summary</span><p className="mt-1 text-sm text-ink">{patientScans.length} MRI examinations · {patientReports.length} report drafts</p></div><div className="sm:col-span-2"><Button secondary onClick={() => setFormOpen((current) => !current)}>Edit patient</Button></div></section><section className="space-y-3"><div><h2 className="text-lg font-semibold text-ink">Examination history</h2><p className="text-sm text-muted">MRI scans recorded for this patient.</p></div><Table headings={["Scan", "Date", "Format", "Status"]} rows={patientScans.map((scan) => ({ key: scan.scanId, cells: [scan.scanId, dateText(scan.date), scan.format?.toUpperCase(), <Status status={scan.status} />] }))} empty="No MRI examinations recorded yet." /></section></>}{!editing && <><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SearchBox value={query} onChange={setQuery} placeholder="Search patients" /><Button onClick={() => { setForm(initial); setFormOpen((current) => !current); }}>Add patient</Button></div><Table headings={["Patient", "Patient ID", "Date of birth", "Gender", "Profile"]} rows={filtered.map((patient) => ({ key: patient.patientId, cells: [patient.name, patient.patientId, dateText(patient.dateOfBirth), patient.gender, <Link className="font-semibold text-primary underline-offset-4 hover:underline" to={`/doctor/patients/${encodeURIComponent(patient.patientId)}`}>View profile</Link>] }))} empty="No patient records yet. Add a patient to get started." /></>}{formOpen && <form className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" onSubmit={submit}><h2 className="mb-5 text-lg font-semibold text-ink">{editing ? "Edit patient details" : "New patient"}</h2><div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">{Object.keys(form).map((name) => <Field key={name} name={name} label={name.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} type={name === "dateOfBirth" ? "date" : name === "email" ? "email" : name === "address" ? "textarea" : "text"} required={["name", "dateOfBirth", "gender"].includes(name)} options={name === "gender" ? ["Female", "Male", "Other", "Prefer not to say"] : undefined} />)}</div><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save patient"}</Button></form>}</div>;
}

export function ScanWorkspace() {
  const { data: scans, error, loading, setData } = useLoad("/scans", "scans");
  const { data: patients } = useLoad("/patients", "patients");
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [filter, setFilter] = useState("all");

  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setAnalysis(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("patientId", patientId);
      const result = await request("/scans", { method: "POST", body: form });
      setData((current) => [result.scan, ...(current || [])]);
      setFile(null);
      event.target.reset();
      showToast("MRI uploaded.");
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusy(false);
    }
  }

  async function analyze(scanId) {
    setBusy(true);
    setAnalysisError("");
    try {
      const result = await request(`/scans/${encodeURIComponent(scanId)}/analyze`, { method: "POST" });
      setAnalysis(result);
      if (!result.isMock) {
        setData((current) => (current || []).map((scan) => scan.scanId === scanId ? {
          ...scan,
          status: "needs_review",
          result: result.prediction?.predictedClass ?? null,
          confidence: result.prediction?.confidence ?? null,
          aiAnalysis: {
            predictedClass: result.prediction?.predictedClass,
            confidence: result.prediction?.confidence,
            classProbabilities: result.classProbabilities,
            modelName: result.model?.name,
            modelVersion: result.model?.version,
            analyzedAt: result.analyzedAt || new Date().toISOString(),
            gradCamAvailable: Boolean(result.gradCamUrl),
          },
        } : scan));
      }
    } catch (cause) {
      setAnalysisError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  async function viewAnalysis(scanId) {
    setBusy(true);
    setAnalysisError("");
    try {
      setAnalysis(await request(`/scans/${encodeURIComponent(scanId)}/analysis`));
    } catch (cause) {
      setAnalysisError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  const rows = (scans || []).filter((scan) => (`${scan.scanId} ${scan.patientName} ${scan.patientId}`).toLowerCase().includes(query.toLowerCase()) && (filter === "all" || scan.status === filter));
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight text-ink">MRI examinations</h1><p className="mt-1 text-sm text-muted">Upload and review de-identified MRI images.</p></div><Alert>{error}</Alert><form className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6" onSubmit={upload}><div><h2 className="text-lg font-semibold text-ink">Upload MRI image</h2><p className="mt-1 text-sm leading-6 text-muted">PNG or JPG · maximum 50 MB · DICOM uploads are disabled.</p></div><label className="grid gap-2 text-[13px] font-semibold text-ink">Patient<select className={fieldClass} required value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Select a patient</option>{(patients || []).map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.name} ({patient.patientId})</option>)}</select></label><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-page p-5 text-center transition duration-150 hover:border-primary hover:bg-soft"><span className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-sm"><svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12v4h12v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span className="text-sm font-semibold text-ink">{file?.name || "Choose MRI image"}</span><span className="text-xs text-muted">PNG or JPG · de-identify all source data first</span><input className="sr-only" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" required onChange={(event) => setFile(event.target.files?.[0])} /></label><Button type="submit" disabled={busy || !patients?.length}>{busy ? "Uploading..." : "Upload scan"}</Button></form><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><SearchBox value={query} onChange={setQuery} placeholder="Search scans or patients" /><select className={fieldClass} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="uploaded">Uploaded</option><option value="processing">Processing</option><option value="needs_review">Needs review</option><option value="completed">Completed</option><option value="failed">Failed</option></select></div>{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading examinations...</p>}<Table headings={["Scan", "Patient", "Date", "Format", "AI result", "Status", "Actions"]} rows={rows.map((scan) => ({ key: scan.scanId, cells: [<span className="font-semibold text-ink">{scan.scanId}</span>, scan.patientName, dateText(scan.date), (scan.format || "").toUpperCase(), scan.result ? <span>{scan.result}<small className="block text-muted">{scan.confidence == null ? "" : `${(scan.confidence * 100).toFixed(1)}% confidence`}</small></span> : "—", <Status status={scan.status} />, <span className="flex flex-wrap items-center gap-x-3 gap-y-2"><a className="font-semibold text-primary underline-offset-4 hover:underline" href={`/api/scans/${encodeURIComponent(scan.scanId)}/preview`} target="_blank" rel="noreferrer">View original</a><Button secondary disabled={busy} onClick={() => scan.aiAnalysis ? viewAnalysis(scan.scanId) : analyze(scan.scanId)}>{scan.aiAnalysis ? "View analysis" : "Analyze"}</Button><Link className="font-semibold text-primary underline-offset-4 hover:underline" to={`/doctor/reports?scan=${encodeURIComponent(scan.scanId)}`}>Draft report</Link></span>] }))} empty={loading ? "Loading..." : "No MRI examinations have been uploaded yet."} />{analysisError && <Alert>{analysisError}</Alert>}{analysis && <section className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-ink">AI analysis · {analysis.scanId}</h2>{analysis.isMock && <strong className="block rounded-xl border-2 border-danger bg-danger px-4 py-4 text-base font-bold leading-6 text-white shadow-lg ring-4 ring-danger/15">{analysis.mockDisclaimer || "MOCK AI RESPONSE — NOT A REAL ANALYSIS OR MEDICAL RESULT"}</strong>}<p className="text-sm text-ink">Prediction: {analysis.prediction?.predictedClass || "Unavailable"} · Confidence: {analysis.prediction?.confidence == null ? "Unavailable" : `${(analysis.prediction.confidence * 100).toFixed(1)}%`}</p><p className="text-xs text-muted">Model: {analysis.model?.name || "Unavailable"} · {analysis.model?.version || ""}</p><ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">{(analysis.classProbabilities || []).map((item) => <li className="rounded-lg bg-page px-3 py-2 text-sm text-ink" key={item.className}>{item.className}: {(item.probability * 100).toFixed(1)}%</li>)}</ul>{analysis.gradCamUrl && <img className="max-h-[480px] w-full rounded-xl border border-line object-contain" src={analysis.gradCamUrl} alt="Grad-CAM attention overlay. Explainability aid, not validated tumor segmentation." />}</section>}</div>;
}

export function ReportWorkspace() {
  const { data: reports, error, loading, setData } = useLoad("/reports", "reports");
  const { data: scans, setData: setScans } = useLoad("/scans", "scans");
  const { showToast } = useToast();
  const queryScan = new URLSearchParams(window.location.search).get("scan") || "";
  const [scanId, setScanId] = useState(queryScan);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const report = reports?.find((item) => item.scanId === scanId);
    if (report) {
      setDoctorNotes(report.doctorNotes || "");
      setRecommendation(report.recommendation || "");
    }
  }, [reports, scanId]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request("/reports", { method: "POST", body: JSON.stringify({ scanId, doctorNotes, recommendation }) });
      const selectedScan = scans?.find((scan) => scan.scanId === scanId);
      const savedReport = {
        ...result.report,
        patientName: selectedScan?.patientName || "",
        patientId: selectedScan?.patientId || "",
        format: selectedScan?.format || "",
        aiAnalysis: selectedScan?.aiAnalysis || null,
        updatedAt: result.report.updatedAt || new Date().toISOString(),
      };
      setData((current) => [savedReport, ...(current || []).filter((item) => item.scanId !== scanId)]);
      setPreview(savedReport);
      showToast("Report draft saved.");
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusy(false);
    }
  }

  async function finalize(report) {
    setBusy(true);
    try {
      const result = await request(`/reports/${encodeURIComponent(report.id)}/finalize`, { method: "PATCH" });
      setData((current) => (current || []).map((item) => item.id === report.id ? { ...item, ...result } : item));
      setScans((current) => (current || []).map((scan) => scan.scanId === result.scanId ? { ...scan, status: result.scanStatus || "completed" } : scan));
      setPreview((current) => current?.id === report.id ? { ...current, ...result } : current);
      showToast("Report finalized and PDF stored securely.");
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusy(false);
    }
  }

  const filtered = (reports || []).filter((report) => `${report.id} ${report.patientName} ${report.scanId}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6 print:space-y-0"><div className="print:hidden"><h1 className="text-2xl font-semibold tracking-tight text-ink">Clinical reports</h1><p className="mt-1 text-sm text-muted">Review analysis results and manage report drafts.</p></div><Alert>{error}</Alert><form className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm print:hidden sm:p-6" onSubmit={save}><div><h2 className="text-lg font-semibold text-ink">Draft report</h2><p className="mt-1 text-sm leading-6 text-muted">Saved AI findings from this scan are included when available.</p></div><label className="grid gap-2 text-[13px] font-semibold text-ink">Examination<select className={fieldClass} required value={scanId} onChange={(event) => setScanId(event.target.value)}><option value="">Select an examination</option>{(scans || []).map((scan) => <option key={scan.scanId} value={scan.scanId}>{scan.scanId} — {scan.patientName}</option>)}</select></label><Field label="Clinical notes" name="doctorNotes" value={doctorNotes} onChange={(event) => setDoctorNotes(event.target.value)} type="textarea" /><Field label="Recommendation" name="recommendation" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} type="textarea" /><div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || (!doctorNotes.trim() && !recommendation.trim())}>{busy ? "Saving..." : "Save draft"}</Button><Button secondary disabled={!scanId} onClick={() => setPreview({ scanId, doctorNotes, recommendation, doctorName: "Draft preview", status: "draft", aiAnalysis: scans?.find((scan) => scan.scanId === scanId)?.aiAnalysis })}>Printable preview</Button></div></form><section className="space-y-3 print:hidden"><div><h2 className="text-lg font-semibold text-ink">Saved reports</h2><p className="mt-1 text-sm text-muted">Finalize a reviewed draft to store a private PDF.</p></div><SearchBox value={query} onChange={setQuery} placeholder="Search reports" />{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading reports...</p>}<Table headings={["Report", "Patient", "Scan", "AI finding", "Updated", "Status", "Actions"]} rows={filtered.map((report) => ({ key: report.id, cells: [report.id, report.patientName, report.scanId, report.aiAnalysis ? `${report.aiAnalysis.predictedClass} · ${(report.aiAnalysis.confidence * 100).toFixed(1)}%` : "No verified AI result", dateText(report.updatedAt), <Status status={report.status} />, <span className="flex flex-wrap gap-2">{report.status === "finalized" ? <a className="font-semibold text-primary underline-offset-4 hover:underline" href={`/api/reports/${encodeURIComponent(report.id)}/pdf`} target="_blank" rel="noreferrer">Open PDF</a> : <><button className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => { setScanId(report.scanId); setPreview(report); }}>Preview</button><button className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-deep disabled:opacity-50" disabled={busy} onClick={() => finalize(report)}>Finalize</button></>}</span>] }))} /></section>{preview && <article className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm print:my-0 print:rounded-none print:border-0 print:p-0 print:shadow-none"><div className="flex flex-wrap gap-3 print:hidden"><Button secondary onClick={() => setPreview(null)}>Close preview</Button>{preview.status === "finalized" && preview.id && <a className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-semibold text-primary" href={`/api/reports/${encodeURIComponent(preview.id)}/pdf`} target="_blank" rel="noreferrer">Open stored PDF</a>}<Button onClick={() => window.print()}>Print preview</Button>{preview.status !== "finalized" && preview.id && <Button disabled={busy} onClick={() => finalize(preview)}>{busy ? "Finalizing..." : "Finalize report"}</Button>}</div><header className="border-b border-line pb-4"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">BrainScan AI · Clinical report {preview.status === "finalized" ? "finalized" : "draft"}</span><h2 className="mt-2 text-2xl font-semibold text-ink">MRI examination report</h2></header><p className="text-sm text-muted">Report: {preview.id || "Unsaved draft"} · Scan: {preview.scanId}</p><p className="text-sm text-muted">Patient: {preview.patientName || scans?.find((scan) => scan.scanId === preview.scanId)?.patientName || "—"}</p><section><h3 className="text-sm font-semibold text-ink">AI-assisted finding</h3>{preview.aiAnalysis ? <><p className="mt-2 text-sm font-medium text-ink">{preview.aiAnalysis.predictedClass} · {(preview.aiAnalysis.confidence * 100).toFixed(1)}% confidence</p><p className="mt-1 text-xs text-muted">{preview.aiAnalysis.modelName} · {preview.aiAnalysis.modelVersion} · {dateText(preview.aiAnalysis.analyzedAt)}</p></> : <p className="mt-2 text-sm leading-6 text-muted">No verified AI finding is attached to this report.</p>}<p className="mt-1 text-xs text-muted">Model confidence is not a clinical probability.</p></section><section><h3 className="text-sm font-semibold text-ink">Clinical notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{preview.doctorNotes || "No notes recorded."}</p></section><section><h3 className="text-sm font-semibold text-ink">Recommendation</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{preview.recommendation || "No recommendation recorded."}</p></section>{preview.status === "finalized" && <p className="text-xs text-muted">Finalized {dateText(preview.finalizedAt)} · Stored PDF available via Open stored PDF.</p>}<p className="border-t border-line pt-4 text-xs text-muted">Prepared by {preview.doctorName || "clinician"} · {preview.status === "finalized" ? "Finalized report" : "Draft only"}</p><p className="rounded-lg bg-soft px-3 py-2 text-xs leading-5 text-deep">{preview.status === "finalized" ? "AI supports clinician review and does not replace professional medical judgment." : "Draft only. This is not a final medical report or diagnosis."}</p></article>}</div>;
}
