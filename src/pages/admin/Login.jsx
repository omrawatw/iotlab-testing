import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      const message = err.code === 'auth/invalid-credential'
        ? 'Incorrect email or password.'
        : err.message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} className="panel" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--signal)', marginBottom: 8 }}>{'// admin access'}</div>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Sign in</h1>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--led-red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button className="btn btn--primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ fontSize: 12, marginTop: 20, color: 'var(--text-faint)' }}>
          Admin accounts are provisioned manually in Firebase — there's no public sign-up.
        </p>
      </form>
    </div>
  );
}
