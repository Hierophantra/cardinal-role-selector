import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    // Persist the viewer role for the tab so admin can navigate into a
    // partner hub and still see the "Back to Trace Hub" link, even after
    // internal nav strips ?admin=1 from the URL.
    const setRole = (role) => {
      try { sessionStorage.setItem('cardinal-role', role); } catch {}
    };

    if (trimmed === import.meta.env.VITE_THEO_KEY) {
      setRole('theo');
      navigate('/hub/theo');
    } else if (trimmed === import.meta.env.VITE_JERRY_KEY) {
      setRole('jerry');
      navigate('/hub/jerry');
    } else if (trimmed === import.meta.env.VITE_ADMIN_KEY) {
      setRole('admin');
      navigate('/admin/hub');
    } else if (trimmed === import.meta.env.VITE_TEST_KEY) {
      setRole('test');
      navigate('/hub/test');
    } else {
      setError("That code doesn't match. Try again.");
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card login-card--light fade-in" onSubmit={submit}>
        <img src="/logo.png" alt="Cardinal Roofing & Renovations" />
        <h1>Role Definition Tool</h1>
        <div className="subtitle">Cardinal Roofing &amp; Renovations</div>
        <label htmlFor="access">Enter your access code</label>
        <input
          className="input--light"
          id="access"
          type="password"
          autoFocus
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="••••••••"
        />
        {error && <div className="error">{error}</div>}
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
        >
          Enter
        </button>
      </form>
    </div>
  );
}
