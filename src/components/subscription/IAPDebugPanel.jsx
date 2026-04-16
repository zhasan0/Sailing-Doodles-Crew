import React, { useState, useRef, useEffect } from 'react';
import { useIAPLogs } from '@/hooks/useIAPLogger';

export default function IAPDebugPanel() {
  const [visible, setVisible] = useState(false);
  const logs = useIAPLogs();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (visible && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, visible]);

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 12, zIndex: 9999, maxWidth: 340 }}>
      <button
        onClick={() => setVisible(v => !v)}
        style={{
          background: '#1e293b',
          color: '#94a3b8',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 11,
          marginBottom: 4,
          display: 'block',
          marginLeft: 'auto',
          cursor: 'pointer',
        }}
      >
        {visible ? 'Hide IAP Logs' : '🔍 IAP Debug'}
      </button>

      {visible && (
        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 8,
          height: 220,
          overflowY: 'auto',
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#e2e8f0',
          width: 320,
        }}>
          {logs.length === 0 ? (
            <p style={{ color: '#64748b' }}>No IAP logs yet.</p>
          ) : (
            logs.map((line, i) => (
              <div key={i} style={{
                padding: '1px 0',
                color: line.includes('ERROR') || line.includes('FAILED') || line.includes('error')
                  ? '#f87171'
                  : line.includes('success') || line.includes('verified') || line.includes('APPROVED')
                  ? '#4ade80'
                  : '#e2e8f0',
                wordBreak: 'break-word',
              }}>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}