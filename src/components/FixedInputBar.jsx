import React from 'react';

export default function FixedInputBar({ children }) {
  return (
    <div 
      className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-border max-w-lg mx-auto"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}