import { useState } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import { BrainMark } from "./components/Brand.jsx";
import { ToastProvider, useToast } from "./components/Toast.jsx";
import { AuthPage, RecoveryPage } from "./pages/AuthPages.jsx";
import { AccountSettings, AdminAudit, AdminDoctors, AdminHome, AdminPatients, AdminReports, AdminScans, ModelInsights } from "./pages/WorkspacePages.jsx";
import { DoctorHome, PatientWorkspace, ReportWorkspace, ScanWorkspace } from "./pages/DoctorScreens.jsx";

function LoadingScreen() {
  return <main className="grid min-h-screen place-content-center justify-items-center gap-3 bg-page text-sm text-muted" aria-live="polite"><span className="grid size-10 place-items-center rounded-xl bg-soft text-primary"><BrainMark /></span><span>Loading secure workspace...</span></main>;
}

function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/doctor"} replace />;
  }
  return <Outlet />;
}

const doctorNavigation = [
  ["Overview", "/doctor", true],
  ["Patients", "/doctor/patients"],
  ["MRI examinations", "/doctor/scans"],
  ["Reports", "/doctor/reports"],
  ["Account settings", "/account/settings"],
];
const adminNavigation = [
  ["System overview", "/admin", true],
  ["Doctor management", "/admin/doctors"],
  ["Patient monitoring", "/admin/patients"],
  ["Scan monitoring", "/admin/scans"],
  ["Reports", "/admin/reports"],
  ["Model insights", "/admin/model-insights"],
  ["Audit log", "/admin/audit-log"],
  ["Account settings", "/account/settings"],
];

function SignOutButton() {
  const { signOut, busy } = useAuth();
  const { showToast } = useToast();
  async function submit() {
    try {
      await signOut();
    } catch (error) {
      showToast(error.message || "Unable to sign out.", "error");
    }
  }
  return <button className="min-h-10 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50" onClick={submit} disabled={busy}>Sign out</button>;
}

function WorkspaceLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const navigation = user.role === "admin" ? adminNavigation : doctorNavigation;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><BrainMark /></span><span>brain<span className="brand-light">scan</span><i>AI</i></span><button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div>
      <div className="clinic-switch"><span className="clinic-avatar">{(user.clinic || "My clinic").split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase()}</span><span className="clinic-copy"><b>{user.clinic || "My clinic"}</b><small>{user.specialization || (user.role === "admin" ? "Administration" : "Clinician workspace")}</small></span></div>
      <div className="side-scroll"><p className="nav-label">{user.role === "admin" ? "Manage" : "Workspace"}</p><nav aria-label={user.role === "admin" ? "Administration" : "Doctor workspace"}>{navigation.map(([label, to, exact]) => <NavLink key={to} end={exact} to={to} onClick={() => setMobileNav(false)} className={({ isActive }) => `nav-link ${isActive ? "selected" : ""}`}><NavIcon label={label} /><span>{label}</span></NavLink>)}</nav></div>
      <div className="sidebar-bottom"><div className="usage-card"><div className="usage-title"><span>AI analyses</span><span>—</span></div><div className="usage-track"><span /></div><small>AI processing is not connected</small><button onClick={() => setMobileNav(false)}>Service status <span aria-hidden="true">→</span></button></div><div className="profile"><span className="doctor-avatar">{user.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase()}</span><span className="doctor-copy"><b>{user.name}</b><small>{user.role === "admin" ? "Administrator" : user.specialization || "Clinician"}</small></span><SignOutButton /></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><span /><span /><span /></button><div className="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><b>{navigation.find(([, to, exact]) => exact ? location.pathname === to : location.pathname.startsWith(to))?.[0] || "Account settings"}</b></div><div className="top-actions"><div className="system-status service-offline"><span />AI service not connected</div><span className="top-divider" /><span className="help-button">{user.name}</span></div></header><div className="page-content"><div className="workspace-view">{children}</div><footer className="disclaimer">BrainScan AI is an academic decision-support prototype and is not a substitute for professional medical judgment.</footer></div></main>
  </div>;
}

function NavIcon({ label }) {
  const paths = label.includes("Patient") ? <><circle cx="8" cy="7" r="3"/><path d="M2.5 17c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M14 5.5a2.5 2.5 0 0 1 0 4.8M15 13c1.5.3 2.4 1.3 2.7 3"/></> : label.includes("MRI") || label.includes("Scan") ? <><path d="M10 2.5c-4 0-6.5 3.2-6.5 7.5s2.5 7.5 6.5 7.5 6.5-3.2 6.5-7.5S14 2.5 10 2.5Z"/><path d="M10 3v14M6 6c1 .3 1.5 1.2 1.5 2.2M14 6c-1 .3-1.5 1.2-1.5 2.2M6 14c1-.3 1.5-1.2 1.5-2.2M14 14c-1-.3-1.5-1.2-1.5-2.2"/></> : label.includes("Report") ? <><path d="M5 2.5h7l4 4V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"/><path d="M12 2.5v4h4M7 10h6M7 13h6M7 16h4"/></> : label.includes("Audit") ? <><path d="M10 2.5 16 5v4.2c0 3.5-2.5 6.5-6 8.3-3.5-1.8-6-4.8-6-8.3V5l6-2.5Z"/><path d="m7.3 9.8 1.8 1.8 3.7-4"/></> : label.includes("Doctor") ? <><circle cx="10" cy="6" r="3"/><path d="M4 17c.5-3.1 2.5-4.7 6-4.7s5.5 1.6 6 4.7M10 13v4m-2-2h4"/></> : label.includes("Setting") ? <><circle cx="10" cy="10" r="3"/><path d="m8.5 2.8.5-1h2l.5 1 1.2.7 1-.3 1.4 1.4-.3 1 .7 1.2 1 .5v2l-1 .5-.7 1.2.3 1-1.4 1.4-1-.3-1.2.7-.5 1h-2l-.5-1-1.2-.7-1 .3-1.4-1.4.3-1-.7-1.2-1-.5v-2l1-.5.7-1.2-.3-1 1.4-1.4 1 .3 1.2-.7Z"/></> : <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></>;
  return <svg className="nav-icon size-[18px] shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
}

function WorkspacePlaceholder({ title }) {
  return <section className="space-y-3 rounded-2xl border border-line bg-white p-6 shadow-sm"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">Workspace route ready</span><h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1><p className="text-sm leading-6 text-muted">The feature screen will be ported from the original BrainScan interface in Step 9.</p></section>;
}

function DoctorLayout() {
  return <WorkspaceLayout><Outlet /></WorkspaceLayout>;
}

function AdminLayout() {
  return <WorkspaceLayout><Outlet /></WorkspaceLayout>;
}

function AccountLayout() {
  return <WorkspaceLayout><AccountSettings /></WorkspaceLayout>;
}

function RoleLanding() {
  const { user } = useAuth();
  return <Navigate to={user.role === "admin" ? "/admin" : "/doctor"} replace />;
}

function NotFound() {
  return <main className="grid min-h-screen place-content-center bg-page p-6 text-ink"><div><span className="text-xs font-bold uppercase tracking-[.2em] text-primary">BrainScan AI</span><h1 className="my-3 text-3xl font-semibold">Page not found</h1><Link className="font-semibold text-primary underline underline-offset-4" to="/">Return to workspace</Link></div></main>;
}

function AppRoutes() {
  return <Routes>
    <Route element={<PublicOnlyRoute />}><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /></Route>
    <Route path="/forgot-password" element={<RecoveryPage />} />
    <Route path="/reset-password" element={<RecoveryPage reset />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]} />}><Route element={<DoctorLayout />}><Route index element={<DoctorHome />} /><Route path="patients" element={<PatientWorkspace />} /><Route path="patients/:patientId" element={<PatientWorkspace />} /><Route path="scans" element={<ScanWorkspace />} /><Route path="reports" element={<ReportWorkspace />} /></Route></Route>
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]} />}><Route element={<AdminLayout />}><Route index element={<AdminHome />} /><Route path="doctors" element={<AdminDoctors />} /><Route path="patients" element={<AdminPatients />} /><Route path="scans" element={<AdminScans />} /><Route path="reports" element={<AdminReports />} /><Route path="model-insights" element={<ModelInsights />} /><Route path="audit-log" element={<AdminAudit />} /></Route></Route>
      <Route path="/account/settings" element={<AccountLayout />} />
      <Route path="/" element={<RoleLanding />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>;
}

export default function App() {
  return <BrowserRouter><ToastProvider><AuthProvider><AppRoutes /></AuthProvider></ToastProvider></BrowserRouter>;
}
