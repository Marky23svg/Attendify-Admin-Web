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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL - Blue Section with Logo */}
      <div className="relative lg:w-3/5 bg-[#0066FF] flex flex-col items-center justify-center p-10 lg:p-16 overflow-hidden">
        {/* Decorative curved lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
          viewBox="0 0 800 800"
          fill="none"
        >
          <circle cx="400" cy="400" r="200" stroke="white" strokeWidth="1" />
          <circle cx="400" cy="400" r="320" stroke="white" strokeWidth="1" />
          <circle cx="400" cy="400" r="460" stroke="white" strokeWidth="1" />
          <circle cx="400" cy="400" r="600" stroke="white" strokeWidth="1" />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center -mt-30">
          <img
            src={logo}
            alt="Attendify"
            className="w-24 h-24 lg:w-28 lg:h-28 object-contain mb-6 -ml-73"
          />
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight text-left -ml-41">
            Hello
            <br />
            Attendify!
          </h1>
          <p className="mt-6 text-base lg:text-lg text-white/80 max-w-sm leading-relaxed text-left">
            Skip repetitive and manual attendance tasks. Get highly productive
            through automation and save tons of time!
          </p>
        </div>

        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/50">
  © {new Date().getFullYear()} Attendify. All rights reserved.
</p>
      </div>

      {/* RIGHT PANEL - White Section with Form */}
      <div className="lg:w-2/5 flex items-center justify-center bg-white p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Small logo / brand name at top */}
          <div className="mb-20 -mt-14">
            <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
              Attendify
            </h2>
          </div>

          <div className="mb-8">
            <h3 className="text-3xl font-extrabold text-[#0F1E36] tracking-tight">
              Welcome Back Admin!
            </h3>
          
          </div>

          {banner && (
            <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{banner}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#0F1E36] text-white font-bold rounded-2xl py-4 px-6 hover:bg-[#1E3A5F] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {submitting ? (
                <>
                  <LogIn size={18} className="animate-pulse" />
                  Logging in…
                </>
              ) : (
                <>
                  Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            
          </form>
        </div>
      </div>
    </div>
  );
}