// The porch light card's form pieces, shared by its views (src/porch-light.jsx, src/porch-residents.jsx).
import React, {useState} from 'react';

export function Field({label, hint, ...props}) {
  return (
    <label className="porch-field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SecretField({label, hint, value, onChange, autoComplete, autoFocus}) {
  const [shown, setShown] = useState(false);
  return (
    <label className="porch-field">
      <span>{label}</span>
      <span className="porch-secret">
        <input type={shown ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} autoFocus={autoFocus} spellCheck="false" autoCapitalize="off" />
        <button type="button" onClick={() => setShown(v => !v)} aria-pressed={shown}>{shown ? '藏起' : '显示'}</button>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const passwordHint = '至少 6 个字，中文一个字算一个。全角和半角算同一个字。';

// Runs a form's request: shows the server's words when it says no.
export function useAsk() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ask = async (job, done) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await job();
      done?.();
    } catch (err) {
      setError(err?.message || '没有成功，再试一次。');
    } finally {
      setBusy(false);
    }
  };
  return {busy, error, ask, setError};
}
