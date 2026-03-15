import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:5001';
  return `http://${host}:5001`;
};

const API_BASE_URL = resolveApiBaseUrl();

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googlePending, setGooglePending] = useState(false);

  const pageTitle = useMemo(
    () => (mode === 'login' ? 'Sign in to CryptoPredictPro' : 'Create your account'),
    [mode]
  );

  useEffect(() => {
    const savedUser = localStorage.getItem('cryptoUser');
    if (savedUser) navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedMode = searchParams.get('mode');
    if (location.pathname === '/sign-up' || requestedMode === 'signup') setMode('signup');
    else setMode('login');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!googleClientId) return;
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      setGoogleReady(!!window.google?.accounts?.oauth2);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(!!window.google?.accounts?.oauth2);
    script.onerror = () => setError('Unable to load Google sign-in script.');
    document.body.appendChild(script);
  }, [googleClientId]);

  const persistAuth = (user) => {
    localStorage.setItem('cryptoUser', JSON.stringify(user));
    localStorage.setItem('authToken', `token_${Date.now()}`);
    localStorage.setItem(
      'authSession',
      JSON.stringify({
        refreshedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    );
  };

  const updateMode = (nextMode, { clearFeedback = true } = {}) => {
    setMode(nextMode);
    if (clearFeedback) {
      setError('');
      setSuccess('');
    }
    navigate(nextMode === 'signup' ? '/sign-up' : '/login', { replace: true });
  };

  const handleCredentialAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup') {
      if (!name.trim()) return setError('Full name is required.');
      if (password.length < 6) return setError('Password must be at least 6 characters.');
      if (password !== confirmPassword) return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, { timeout: 15000 });
      const data = response.data;

      if (!data.success) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      if (mode === 'signup') {
        setSuccess('Account created successfully. Please sign in.');
        setPassword('');
        setConfirmPassword('');
        updateMode('login', { clearFeedback: false });
        return;
      }

      persistAuth(data.user);
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setError(errMsg || `Cannot connect to server at ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setError('');
    setSuccess('');

    if (!googleClientId) {
      setError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setError('Google sign-in is still loading. Try again in a moment.');
      return;
    }

    setLoading(true);
    setGooglePending(true);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse) => {
        setGooglePending(false);
        if (tokenResponse?.error) {
          setLoading(false);
          setError(tokenResponse.error_description || 'Google sign-in failed.');
          return;
        }

        try {
          const resp = await axios.post(
            `${API_BASE_URL}/api/auth/google`,
            { access_token: tokenResponse.access_token },
            { timeout: 15000 }
          );

          if (!resp.data?.success) {
            setError(resp.data?.error || 'Google authentication failed.');
            setLoading(false);
            return;
          }

          persistAuth(resp.data.user);
          navigate('/dashboard');
        } catch (err) {
          setError(err.response?.data?.error || `Cannot connect to server at ${API_BASE_URL}.`);
        } finally {
          setLoading(false);
        }
      }
      ,
      error_callback: (oauthError) => {
        setGooglePending(false);
        setLoading(false);
        if (oauthError?.type === 'popup_closed') {
          setError('Google sign-in was canceled.');
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      }
    });

    client.requestAccessToken();
  };

  useEffect(() => {
    // If popup is closed without callback, ensure UI is never stuck in loading state.
    if (!googlePending) return;

    const releaseIfStuck = () => {
      setTimeout(() => {
        setGooglePending((isPending) => {
          if (isPending) {
            setLoading(false);
          }
          return false;
        });
      }, 250);
    };

    window.addEventListener('focus', releaseIfStuck, { once: true });
    return () => window.removeEventListener('focus', releaseIfStuck);
  }, [googlePending]);

  return (
    <div className="min-h-screen bg-[#030712] text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[-12%] left-[-8%] h-[32rem] w-[32rem] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[34rem] w-[34rem] rounded-full bg-cyan-400/10 blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link to="/" className="text-sm text-white/70 hover:text-white transition-colors">
              Back to home
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <h1 className="text-2xl font-bold tracking-tight mb-1">{pageTitle}</h1>
            <p className="text-sm text-white/65 mb-6">
              {mode === 'login' ? 'Use your credentials or Google account.' : 'Sign up with email/password or Google.'}
            </p>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-white/10 mb-6">
              <button
                type="button"
                onClick={() => updateMode('login')}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  mode === 'login' ? 'bg-white text-[#030712]' : 'text-white/70 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => updateMode('signup')}
                className={`rounded-md py-2 text-sm font-medium transition ${
                  mode === 'signup' ? 'bg-white text-[#030712]' : 'text-white/70 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <form onSubmit={handleCredentialAuth} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/60">Full Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/70"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs uppercase tracking-wide text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/70"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/60">Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 pr-12 text-sm outline-none focus:border-cyan-300/70"
                    placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Your password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-xs text-white/70 hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/60">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-300/70"
                    placeholder="Repeat password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-white/50 text-xs">
              <div className="h-px flex-1 bg-white/15" />
              OR
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || !googleReady}
              className="w-full rounded-lg border border-white/20 bg-white/10 py-2.5 text-sm font-medium hover:bg-white/15 transition disabled:opacity-50"
            >
              {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </button>
            {!googleClientId && (
              <p className="mt-2 text-xs text-amber-300/90">
                Set `VITE_GOOGLE_CLIENT_ID` in `.env` to enable Google account selection.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
