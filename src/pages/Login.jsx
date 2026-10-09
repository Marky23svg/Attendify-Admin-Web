import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import Field from '../components/Field';
import logo from '../assets/Attendify-logo-white.png';

const CARD_SHADOW = '0 2px 8px rgba(15, 30, 54, 0.08)';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};

    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    setSubmitting(true);
    const { error, profile } = await signIn(email.trim(), password);

    if (error) {
      setErrors(
        /invalid/i.test(error.message)
          ? { password: 'Incorrect email or password' }
          : {},
      );
      if (!/invalid/i.test(error.message))
        setBanner(error.message);
      setSubmitting(false);
      return;
    }

    if (profile?.role === 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }

    await signOut();
    setBanner(
      profile
        ? 'This account does not have admin access.'
        : 'Could not load your profile. Check the profiles table policies.'
    );
    setSubmitting(false);
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7FB] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#0066FF] opacity-[0.06] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#0066FF] opacity-[0.05] blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-10 w-64 h-64 rounded-full bg-[#F45B69] opacity-[0.05] blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div
          className="bg-white rounded-3xl p-8 sm:p-10"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-[#0066FF] flex items-center justify-center shadow-[0_4px_16px_rgba(0,102,255,0.16)]">
              <img src={logo} alt="Attendify" className="w-22 h-22 object-contain" />
            </div>
            <h1 className="mt-5 text-3xl font-extrabold text-[#0066FF] tracking-tight">
              Attendify
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">Sign in to continue</p>
          </div>

          {banner && (
            <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{banner}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              id="email"
              type="email"
              label="Email"
              icon={Mail}
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              disabled={submitting}
              error={errors.email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              icon={Lock}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              error={errors.password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-gray-400 hover:text-[#0F1E36] transition"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#0066FF] text-white font-bold rounded-2xl py-4 px-6 shadow-[0_4px_12px_rgba(0,102,255,0.30)] hover:bg-[#0052CC] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {submitting ? (
                <>
                  <LogIn size={18} className="animate-pulse" />
                  Logging in…
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Attendify Admin · Authorised personnel only
        </p>
      </div>
    </div>
  );
}
