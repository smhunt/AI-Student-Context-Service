import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  database: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '80px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28 }}>StudentContext AI</h1>
      <p style={{ color: '#666' }}>Sprint 1 — Foundation</p>

      <div style={{
        marginTop: 24,
        padding: 20,
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        background: '#fafafa',
      }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>API Health Check</h2>
        {error && <p style={{ color: '#d32f2f' }}>Error: {error}</p>}
        {health && (
          <div>
            <p>Status: <strong style={{ color: health.status === 'healthy' ? '#2e7d32' : '#d32f2f' }}>{health.status}</strong></p>
            <p>Database: <strong style={{ color: health.database === 'connected' ? '#2e7d32' : '#d32f2f' }}>{health.database}</strong></p>
          </div>
        )}
        {!health && !error && <p style={{ color: '#999' }}>Loading...</p>}
      </div>

      <p style={{ marginTop: 24, fontSize: 14, color: '#999' }}>
        v0.1.0 — EcoWorks Web Architecture Inc.
      </p>
    </div>
  );
}
