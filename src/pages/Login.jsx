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

    if (!email.trim()) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address';
    }

    if (!password) {
      next.password = 'Password is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const { error, profile } = await signIn(
        email.trim(),
        password
      );

      if (error) {
        if (/invalid/i.test(error.message)) {
          setErrors({
            password: 'Incorrect email or password',
          });
        } else {
          setBanner(error.message);
        }
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
    } catch {
      setBanner('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen min-h-[100dvh] w-full flex flex-col lg:flex-row bg-white">

      {/* LEFT PANEL — BRANDING */}
      <section
        className="relative isolate overflow-hidden bg-[#0066FF] text-white
          flex flex-col justify-center
          min-h-[220px] sm:min-h-[260px]
          px-6 py-8
          sm:px-10 sm:py-10
          lg:min-h-screen lg:w-[55%] lg:px-12 lg:py-12
          xl:w-[58%] xl:px-20"
      >
        {/* Decorative white circles with low opacity */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full pointer-events-none"
          viewBox="0 0 800 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <g
            stroke="white"
            strokeWidth="1.2"
            strokeOpacity="0.08"
          >
            <circle cx="400" cy="400" r="200" />
            <circle cx="400" cy="400" r="320" />
            <circle cx="400" cy="400" r="460" />
            <circle cx="400" cy="400" r="600" />
          </g>
        </svg>

        {/* Brand content */}
        <div
          className="relative z-10 w-full max-w-xl mx-auto
            lg:-translate-y-4"
        >
          <img
            src={logo}
            alt="Attendify logo"
            className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24
              object-contain mb-4 sm:mb-5 lg:mb-8"
          />

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
              font-extrabold leading-tight tracking-tight"
          >
            Hello
            <br />
            Attendify!
          </h1>

          <p
            className="mt-3 sm:mt-4 lg:mt-6
              text-sm sm:text-base lg:text-lg
              text-white/85 max-w-md leading-relaxed"
          >
            Skip repetitive and manual attendance tasks. Get highly
            productive through automation and save tons of time!
          </p>
        </div>

        {/* Copyright */}
        <p
          className="relative z-10 mt-6 lg:mt-0
            text-[11px] sm:text-xs text-white/65
            lg:absolute lg:bottom-6 lg:left-6 lg:right-6
            lg:text-center"
        >
          © {new Date().getFullYear()} Attendify. All rights reserved.
        </p>
      </section>

      {/* RIGHT PANEL — LOGIN FORM */}
      <section
        className="flex flex-1 items-center justify-center
          bg-white px-5 py-8
          sm:px-8 sm:py-10
          md:px-12
          lg:w-[45%] lg:flex-none lg:px-8 lg:py-12
          xl:w-[42%] xl:px-12"
      >
        <div className="w-full max-w-md mx-auto">

          {/* Brand */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <h2
              className="text-xl sm:text-2xl font-extrabold
                text-[#0F1E36] tracking-tight"
            >
              Attendify
            </h2>

            <div className="mt-2 h-1 w-10 rounded-full bg-[#0066FF]" />
          </div>

          {/* Heading */}
          <div className="mb-7 sm:mb-8">
            <h3
              className="text-2xl sm:text-3xl lg:text-3xl
                font-extrabold text-[#0F1E36] tracking-tight"
            >
              Welcome Back Admin!
            </h3>

            <p
              className="mt-2 text-sm sm:text-base
                text-gray-500 leading-relaxed"
            >
              Sign in to access your administration dashboard.
            </p>
          </div>

          {/* Error banner */}
          {banner && (
            <div
              role="alert"
              className="flex items-start gap-2.5
                bg-[#FEE9EB] text-[#DC2626]
                text-sm rounded-xl px-4 py-3.5 mb-5
                break-words"
            >
              <AlertCircle
                size={18}
                className="shrink-0 mt-0.5"
              />
              <span>{banner}</span>
            </div>
          )}

          {/* Login form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 sm:space-y-6"
          >
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
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  email: undefined,
                }));
              }}
            />

            <Field
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              icon={Lock}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              error={errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                }));
              }}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  aria-pressed={showPassword}
                  className="text-gray-400 hover:text-[#0F1E36]
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-[#0066FF]
                    rounded-md transition-colors"
                >
                  {showPassword
                    ? <EyeOff size={18} />
                    : <Eye size={18} />}
                </button>
              }
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-12
                flex items-center justify-center gap-2
                bg-[#0F1E36] text-white font-bold
                rounded-xl sm:rounded-2xl
                py-3.5 px-5
                hover:bg-[#1E3A5F]
                active:scale-[0.99]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0066FF]
                focus-visible:ring-offset-2
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
                mt-2"
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

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Secure administrator access
          </p>
        </div>
      </section>
    </main>
  );
}