import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: (user: { id: string; name: string; email: string }) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H1',location:'Auth.tsx:36',message:'Auth submit start',data:{mode,hasSupabaseUrl:Boolean(supabaseUrl),hasAnonKey:Boolean(supabaseAnonKey),emailLength:formData.email.length,passwordLength:formData.password.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    if (!supabaseUrl || !supabaseAnonKey) {
      setAuthError('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const newErrors = {
      email: '',
      password: '',
      name: '',
    };

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup' && !formData.name) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);

    if (!newErrors.email && !newErrors.password && (!newErrors.name || mode === 'login')) {
      const withTimeout = async <T,>(promise: Promise<T>, ms = 10000) => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Auth request timed out. Check your Supabase connection.'));
          }, ms);
        });

        try {
          return await Promise.race([promise, timeout]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      };

      setIsSubmitting(true);
      try {

        if (mode === 'signup') {
          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H1',location:'Auth.tsx:90',message:'Auth signup request',data:{emailLength:formData.email.length},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          const { data, error } = await withTimeout(supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { name: formData.name } },
          }));

          // #region agent log
          fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H1',location:'Auth.tsx:115',message:'Auth signup response',data:{hasError:Boolean(error),hasSession:Boolean(data?.session),hasUser:Boolean(data?.user)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log

          if (error) {
            setAuthError(error.message);
            return;
          }

          const postSessionUser = data?.session?.user;
          if (!postSessionUser) {
            setAuthError('Check your email to confirm your account.');
            return;
          }

          if (postSessionUser.email) {
            onAuthSuccess({
              id: postSessionUser.id,
              name: formData.name || postSessionUser.email.split('@')[0],
              email: postSessionUser.email,
            });
          }
          return;
        }

        // #region agent log
        fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H3',location:'Auth.tsx:116',message:'Auth login request',data:{emailLength:formData.email.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }), 10000);

        if (error) {
          setAuthError(error.message);
          return;
        }

        const signedInUser = data?.user ?? data?.session?.user;
        if (signedInUser?.email) {
          onAuthSuccess({
            id: signedInUser.id,
            name: signedInUser.user_metadata?.name || signedInUser.email.split('@')[0],
            email: signedInUser.email,
          });
          return;
        }

        setAuthError('Unable to start a session. Please try again.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed.';

        // #region agent log
        fetch('http://127.0.0.1:7281/ingest/2037fe9d-b26b-4b11-8a4f-175b0797c134',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1940d4'},body:JSON.stringify({sessionId:'1940d4',runId:'auth-debug',hypothesisId:'H9',location:'Auth.tsx:136',message:'Auth submit error',data:{mode,errorMessage:message},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

        setAuthError(message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 smooth-scroll flex items-center justify-center p-4 safe-bottom">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-slide-down">
          <img
            src="/kinetic-snacks-logo-horizontal.png"
            alt="Kinetic Snacks"
            className="h-16 sm:h-20"
          />
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 border border-stone-100 animate-scale-in">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="text-slate-600 text-sm">
              {mode === 'login'
                ? 'Sign in to continue your fitness journey'
                : 'Create an account to start moving better'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all text-slate-900 placeholder:text-slate-400 ${
                      errors.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-stone-200 focus:border-orange-500 focus:ring-orange-500'
                    } focus:outline-none focus:ring-2`}
                    placeholder="Enter your name"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all text-slate-900 placeholder:text-slate-400 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-stone-200 focus:border-orange-500 focus:ring-orange-500'
                  } focus:outline-none focus:ring-2`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 transition-all text-slate-900 placeholder:text-slate-400 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-stone-200 focus:border-orange-500 focus:ring-orange-500'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    autoComplete="off"
                    className="w-4 h-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target group w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-smooth hover:shadow-xl shadow-lg flex items-center justify-center gap-2 disabled:from-slate-400 disabled:to-slate-500"
            >
              {isSubmitting ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {authError && (
              <p className="text-sm text-red-600 text-center">{authError}</p>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button className="touch-target flex items-center justify-center gap-2 px-4 py-3 border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 rounded-xl transition-all font-medium text-slate-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="hidden sm:inline">Google</span>
            </button>
            <button className="touch-target flex items-center justify-center gap-2 px-4 py-3 border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 rounded-xl transition-all font-medium text-slate-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </button>
          </div>

          {/* Terms */}
          {mode === 'signup' && (
            <p className="text-xs text-center text-slate-500 mt-6">
              By creating an account, you agree to our{' '}
              <button className="text-orange-600 hover:text-orange-700 font-medium">
                Terms of Service
              </button>{' '}
              and{' '}
              <button className="text-orange-600 hover:text-orange-700 font-medium">
                Privacy Policy
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
