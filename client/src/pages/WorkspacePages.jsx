import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../api/http.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

const dateText = (date) => date ? new Date(date).toLocaleDateString() : "—";
const errorText = (error) => error?.message || "Something went wrong. Please try again.";
const inputClass = "mt-1.5 block min-h-11 w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10";

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

function SearchBox({ value, onChange, placeholder }) {
  return <label className="relative block w-full sm:max-w-sm"><span className="sr-only">{placeholder}</span><svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.8" cy="8.8" r="5.7" stroke="currentColor" strokeWidth="1.5"/><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><input className="min-h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-sm outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function StatusPill({ status }) {
  const label = status.replaceAll("_", " ");
  const tone = ["active", "completed", "complete"].includes(label) ? "bg-soft text-deep" : ["inactive", "failed"].includes(label) ? "bg-danger/10 text-danger" : "bg-page text-muted";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}><span className="mr-1.5 mt-1 size-1.5 rounded-full bg-current" />{label}</span>;
}

function DataTable({ headings, rows, empty = "No records found." }) {
  return <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm"><table className="w-full border-collapse text-left text-sm"><thead className="bg-soft text-[11px] uppercase tracking-[.08em] text-muted"><tr>{headings.map((heading) => <th className="whitespace-nowrap px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr className="border-t border-line text-ink transition-colors hover:bg-page/70" key={row.key ?? index}>{row.cells.map((cell, cellIndex) => <td className="px-4 py-3.5 align-middle" key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="px-4 py-8 text-center text-sm text-muted" colSpan={headings.length}>{empty}</td></tr>}</tbody></table></div>;
}

function Metric({ title, value, note }) {
  return <article className="rounded-2xl border border-line bg-white p-5 shadow-sm"><span className="text-xs font-semibold text-muted">{title}</span><strong className="mt-2 block text-3xl font-semibold tracking-tight text-deep">{value}</strong><span className="mt-1 block text-xs text-muted">{note}</span></article>;
}

function Field({ label, name, value, onChange, type = "text", required = false, options, ...props }) {
  return <label className="mb-4 block text-[13px] font-semibold text-ink">{label}{options ? <select className={inputClass} name={name} value={value || ""} onChange={onChange} required={required}><option value="">Choose...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : type === "textarea" ? <textarea className={`${inputClass} min-h-28 resize-y`} name={name} value={value || ""} onChange={onChange} required={required} {...props} /> : <input className={inputClass} name={name} type={type} value={value || ""} onChange={onChange} required={required} {...props} />}</label>;
}

function ScanTrend({ points = [] }) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const chartWidth = 700;
  const chartHeight = 100;
  const slot = points.length ? chartWidth / points.length : chartWidth;
  return <section className="panel trend-panel"><div className="panel-heading"><div><div className="heading-title"><h2>MRI upload activity</h2></div><p>Actual saved scans · last 14 days</p></div><span className="count-pill">UTC</span></div><div className="px-4"><svg className="h-[118px] w-full" viewBox={`0 0 ${chartWidth} 120`} preserveAspectRatio="none" role="img" aria-label="Daily MRI uploads for the last 14 days"><path d={`M0 ${chartHeight}H${chartWidth}`} stroke="var(--line)" strokeWidth="1"/>{points.map((point, index) => { const barHeight = Math.max(3, point.count / max * 82); return <g key={point.date}><rect x={index * slot + slot * 0.28} y={chartHeight - barHeight} width={slot * 0.44} height={barHeight} rx="3" fill="var(--green)"><title>{point.date}: {point.count} uploads</title></rect><text x={index * slot + slot / 2} y="115" textAnchor="middle" fill="var(--muted)" fontSize="9">{point.date.slice(8)}</text></g>; })}</svg></div><p className="trend-caption">Daily scan uploads. Empty dates are shown as zero; no estimated activity is included.</p></section>;
}

function AdminData({ path, keyName, title, headings, mapRow }) {
  const { data, error, loading } = useLoad(path, keyName);
  const [query, setQuery] = useState("");
  const rows = (data || []).filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Alert>{error}</Alert><SearchBox value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} />{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading {title.toLowerCase()}...</p>}<DataTable headings={headings} rows={rows.map((item, index) => ({ key: item.id || item.scanId || index, cells: mapRow(item) }))} empty={loading ? "Loading..." : query ? "No matching records." : "No records found."} /></div>;
}

export function AdminHome() {
  const { data, error, loading } = useLoad("/admin/overview", "overview");
  const metrics = [["Doctors", data?.doctors, `${data?.activeDoctors ?? 0} active`], ["Patients", data?.patients, "Across doctor accounts"], ["MRI scans", data?.scans, `${data?.pendingScans ?? 0} awaiting analysis`], ["Report drafts", data?.reports, "Report persistence"]];
  return <div className="space-y-6"><Alert>{error}</Alert>{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading platform data...</p>}<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([title, value, note]) => <Metric key={title} title={title} value={value ?? "—"} note={note} />)}</div><ScanTrend points={data?.scanTrend || []} /><div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-line bg-white p-5 shadow-sm"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">AI service</span><h2 className="mt-2 font-semibold text-ink">Not connected</h2><p className="mt-2 text-sm leading-6 text-muted">A clearly labeled mock response is used until the Python service is configured.</p></section><section className="rounded-2xl border border-line bg-soft p-5"><h2 className="font-semibold text-deep">Clinical reminder</h2><p className="mt-2 text-sm leading-6 text-deep">AI supports clinician review. It does not replace professional medical judgment.</p></section></div></div>;
}

export function AdminDoctors() {
  const { data, error, loading, setData } = useLoad("/admin/doctors", "doctors");
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  async function toggle(doctor) {
    setBusyId(doctor.id);
    try {
      const result = await request(`/admin/doctors/${encodeURIComponent(doctor.id)}`, { method: "PATCH", body: JSON.stringify({ isActive: !doctor.isActive }) });
      setData((current) => current.map((item) => item.id === doctor.id ? { ...item, isActive: result.isActive } : item));
      showToast("Doctor access updated.");
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusyId("");
    }
  }
  const doctors = (data || []).filter((doctor) => `${doctor.name} ${doctor.email} ${doctor.clinic}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><Alert>{error}</Alert><SearchBox value={query} onChange={setQuery} placeholder="Search doctors" />{loading && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">Loading doctors...</p>}<DataTable headings={["Doctor", "Email", "Clinic", "Patients", "Scans", "Reports", "Account access"]} rows={doctors.map((doctor) => ({ key: doctor.id, cells: [<span className="font-semibold text-ink">{doctor.name}<small className="mt-1 block font-normal text-muted">{doctor.specialization}</small></span>, doctor.email, doctor.clinic || "—", doctor.patientCount, doctor.scanCount, doctor.reportCount, <span className="flex flex-wrap items-center gap-2"><StatusPill status={doctor.isActive ? "active" : "inactive"} /><button className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50 ${doctor.isActive ? "border-danger/30 text-danger hover:bg-danger/10" : "border-primary/30 text-primary hover:bg-soft"}`} disabled={busyId === doctor.id} onClick={() => toggle(doctor)}>{busyId === doctor.id ? "Updating..." : doctor.isActive ? "Deactivate" : "Activate"}</button></span>] }))} empty={loading ? "Loading doctors..." : "No doctor accounts found."} /></div>;
}

export function AdminPatients() { return <AdminData path="/admin/patients" keyName="patients" title="patients" headings={["Patient", "ID", "Gender", "Doctor", "Examinations", "Created"]} mapRow={(patient) => [<span className="font-semibold text-ink">{patient.name}</span>, patient.id, patient.gender, patient.doctorName, patient.examinations, dateText(patient.createdAt)]} />; }
export function AdminScans() { return <AdminData path="/admin/scans" keyName="scans" title="scans" headings={["Scan", "Patient", "Doctor", "Format", "Size", "Status", "Created"]} mapRow={(scan) => [<span className="font-semibold text-ink">{scan.scanId}</span>, `${scan.patientName} (${scan.patientId})`, scan.doctorName, scan.format, `${Math.round(scan.fileSize / 1024)} KB`, <StatusPill status={scan.status} />, dateText(scan.createdAt)]} />; }
export function AdminReports() { return <AdminData path="/admin/reports" keyName="reports" title="reports" headings={["Report", "Patient", "Scan", "Doctor", "Status", "Updated"]} mapRow={(report) => [<span className="font-semibold text-ink">{report.id}</span>, report.patientId, report.scanId, report.doctorName, <StatusPill status={report.status} />, dateText(report.updatedAt)]} />; }
export function AdminAudit() { return <AdminData path="/audit-logs" keyName="entries" title="audit entries" headings={["Time", "Actor", "Action", "Entity", "Record"]} mapRow={(entry) => [dateText(entry.createdAt), entry.actorName, entry.action.replaceAll(".", " "), entry.entityType, entry.entityId]} />; }

export function ModelInsights() {
  const { data, error, loading } = useLoad("/admin/overview", "overview");
  return <div className="space-y-5"><Alert>{error}</Alert><section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">Model status</span><h2 className="mt-2 text-xl font-semibold text-ink">AI service not connected</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">The analysis route returns a clearly marked mock response until the Python service is configured. No model evaluation metrics are available.</p>{loading && <p className="mt-4 text-sm text-muted">Loading scan totals...</p>}<div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"><Metric title="Stored MRI scans" value={data?.scans ?? "—"} note="Across doctor accounts"/><Metric title="Awaiting analysis" value={data?.pendingScans ?? "—"} note="AI service unavailable"/></div></section><section className="rounded-2xl border border-line bg-soft p-5"><h2 className="font-semibold text-deep">Clinical safety</h2><p className="mt-2 text-sm leading-6 text-deep">Mock results are simulated, are not real medical results, and must not guide clinical decisions.</p></section></div>;
}

export function AccountSettings() {
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", medicalRegistrationNumber: user?.medicalRegistrationNumber || "", specialization: user?.specialization || "", clinic: user?.clinic || "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  async function submit(event, path, body, reset) {
    event.preventDefault();
    setBusy(true);
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      await refreshSession();
      showToast("Account settings updated.");
      reset?.();
    } catch (cause) {
      showToast(errorText(cause), "error");
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-5"><section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold text-ink">Professional profile</h2><p className="mb-5 mt-1 text-sm text-muted">Manage the clinician details shown in your workspace.</p><form className="grid grid-cols-1 gap-x-5 sm:grid-cols-2" onSubmit={(event) => submit(event, "/auth/update-user", profile)}>{Object.keys(profile).map((name) => <Field key={name} label={name.replace(/([A-Z])/g, " $1")} name={name} value={profile[name]} onChange={(event) => setProfile({ ...profile, [name]: event.target.value })} />)}<button className="min-h-11 w-fit rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-deep disabled:opacity-50" disabled={busy}>Save profile</button></form><p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">Email changes are unavailable until verification email delivery is configured.</p></section><section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold text-ink">Password and security</h2><p className="mb-5 mt-1 text-sm text-muted">Changing your password revokes other active sessions.</p><form onSubmit={(event) => submit(event, "/auth/change-password", password, () => setPassword({ currentPassword: "", newPassword: "" }))}><div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2"><Field label="Current password" name="currentPassword" type="password" required value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /><Field label="New password" name="newPassword" type="password" required minLength={8} value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></div><button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-deep disabled:opacity-50" disabled={busy}>Update password</button></form></section></div>;
}
