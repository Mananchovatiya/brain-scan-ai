import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { ArrowMark, BrainMark, ShieldMark } from "../components/Brand.jsx";

function AuthLayout({ children }) {
  return <main className="grid min-h-screen grid-cols-1 bg-white min-[701px]:grid-cols-[minmax(360px,.92fr)_minmax(480px,1.08fr)]">
    <section className="relative isolate hidden min-h-screen flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_8%_88%,#235b46_0,transparent_52%),linear-gradient(145deg,#173c31,#102f27)] px-[7%] py-9 text-white min-[701px]:flex">
      <Link to="/login" className="relative z-[1] flex w-fit items-center gap-3 text-lg font-bold tracking-tight text-white no-underline"><span className="grid size-9 place-items-center rounded-xl bg-white/10 text-white"><BrainMark /></span><span>brain<span className="font-normal text-[#c1d8cb]">scan</span><i className="ml-1.5 rounded bg-white/10 px-1.5 py-1 align-[2px] text-[9px] not-italic tracking-wider text-white/80">AI</i></span></Link>
      <div className="relative z-[1] my-auto max-w-xl py-[12vh]"><span className="flex items-center gap-2 text-[10px] font-bold tracking-[.16em] text-white/75"><span className="size-1.5 rounded-full bg-[#a5c8b1]" /> DOCTOR-CENTRIC MRI WORKSPACE</span><h1 className="my-6 font-display text-[clamp(36px,4.2vw,58px)] font-normal leading-[1.08] tracking-tight">Clarity for every<br />scan. Confidence in<br /><em className="font-normal text-[#a5c5a8]">every decision.</em></h1><p className="max-w-sm text-sm leading-7 text-white/75">One thoughtful workspace for the people who care for patients.</p><div className="my-8 h-px w-11 bg-white/30" /><div className="flex items-start gap-3 text-sm leading-6 text-white/85"><span className="font-display text-4xl leading-none text-[#a5c8b1]">“</span><p>AI assists the clinician.<br />The clinician makes the call.</p></div></div>
      <div className="relative z-[1] flex items-center gap-2 text-xs text-white/65"><ShieldMark /> Research prototype · Not a diagnostic device</div>
      <div className="pointer-events-none absolute -right-48 top-[18%] -z-[1] size-[500px] rounded-full border border-white/10 shadow-[0_0_0_60px_#c8e0d010,0_0_0_120px_#c8e0d00b,0_0_0_180px_#c8e0d007]" />
    </section>
    <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12"><div className="w-full max-w-[460px]"><Link to="/login" className="mb-7 flex w-fit items-center gap-2.5 text-sm font-bold text-deep no-underline min-[701px]:hidden"><span className="grid size-9 place-items-center rounded-xl bg-soft text-primary"><BrainMark /></span>BrainScan AI</Link>{children}</div></section>
  </main>;
}

const fieldClass = "min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink shadow-sm outline-none transition duration-150 placeholder:text-muted/75 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelClass = "grid gap-2 text-[13px] font-semibold text-ink";

export function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { signIn, signUp, busy } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (isRegister && values.password !== values.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      const user = isRegister
        ? await signUp({
          name: String(values.name).trim(),
          email: String(values.email).trim().toLowerCase(),
          password: values.password,
          phone: String(values.phone || "").trim(),
          medicalRegistrationNumber: String(values.registration || "").trim(),
          specialization: String(values.specialization).trim(),
          clinic: String(values.clinic).trim(),
        })
        : await signIn({ email: String(values.email).trim().toLowerCase(), password: values.password });
      showToast(isRegister ? "Doctor account created" : "Signed in successfully");
      navigate(location.state?.from || (user.role === "admin" ? "/admin" : "/doctor"), { replace: true });
    } catch (cause) {
      setError(cause.message || "We could not reach the authentication service. Please try again.");
    }
  }

  return <AuthLayout><section className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_55px_-38px_rgba(23,60,49,.32)] sm:p-8"><div className="mb-7"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{isRegister ? "Doctor registration" : "Welcome back"}</span><h2 className="mt-2 text-[25px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">{isRegister ? "Create your account" : "Sign in to your workspace"}</h2><p className="mt-2 text-sm leading-6 text-muted">{isRegister ? "Set up your clinician profile to get started." : "Enter your credentials to access your clinic."}</p></div><form className="grid gap-5" onSubmit={submit}>
    <label className={labelClass}>Work email<input className={fieldClass} name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@clinic.com" /></label>
    {isRegister && <><label className={labelClass}>Full name<input className={fieldClass} name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Dr. Alex Morgan" /></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Specialization<input className={fieldClass} name="specialization" required minLength={2} maxLength={120} placeholder="Neurology" /></label><label className={labelClass}>Medical registration<input className={fieldClass} name="registration" required minLength={1} maxLength={80} placeholder="Registration no." /></label></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className={labelClass}>Hospital / clinic<input className={fieldClass} name="clinic" required minLength={2} maxLength={160} placeholder="Clinic name" /></label><label className={labelClass}>Phone number<input className={fieldClass} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="Optional" /></label></div></>}
    <label className={labelClass}>Password<input className={fieldClass} name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} maxLength={128} required placeholder={isRegister ? "At least 8 characters" : "Enter your password"} /></label>
    {isRegister ? <label className={labelClass}>Confirm password<input className={fieldClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Re-enter your password" /></label> : <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted"><label className="flex items-center gap-2"><input className="size-4 accent-primary" type="checkbox" name="remember" defaultChecked /> Keep me signed in</label><Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/forgot-password">Forgot password?</Link></div>}
    {error && <div className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-3 text-[13px] leading-5 text-danger" role="alert">{error}</div>}
    <button className="flex min-h-11 items-center justify-between rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-deep active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55" type="submit" disabled={busy}>{busy ? "Please wait..." : isRegister ? "Create doctor account" : "Sign in"}<ArrowMark /></button>
  </form><p className="mt-6 text-center text-[13px] text-muted">{isRegister ? "Already have an account?" : "New to BrainScan AI?"} <Link className="font-semibold text-primary underline-offset-4 hover:underline" to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create a doctor account"}</Link></p><div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-xs leading-5 text-muted"><ShieldMark /> Your account is secured with encrypted sessions. Use de-identified data for academic demonstrations.</div></section></AuthLayout>;
}

export function RecoveryPage({ reset = false }) {
  return <AuthLayout><section className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_55px_-38px_rgba(23,60,49,.32)] sm:p-8"><Link to="/login" className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-lg text-[13px] font-semibold text-primary underline-offset-4 hover:underline"><span aria-hidden="true">←</span> Back to sign in</Link><div className="mb-7"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Password recovery</span><h2 className="mt-2 text-[25px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">{reset ? "Reset email unavailable" : "Password reset unavailable"}</h2><p className="mt-2 text-sm leading-6 text-muted">Password reset delivery is not configured until a verified email provider is connected.</p></div><div className="mb-6 flex gap-3 rounded-xl border border-line bg-soft p-4 text-[13px] leading-6 text-ink"><ShieldMark /><span><b className="font-semibold text-deep">Your account remains protected.</b><br />Ask your BrainScan AI administrator for help recovering access. No reset email has been sent.</span></div><Link to="/login" className="flex min-h-11 items-center justify-between rounded-lg bg-primary px-4 text-sm font-semibold text-white no-underline transition duration-150 hover:bg-deep">Return to sign in <ArrowMark /></Link></section></AuthLayout>;
}
