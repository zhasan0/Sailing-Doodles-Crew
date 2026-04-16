import { useEffect } from 'react';

export default function DarkModeHandler() {
  useEffect(() => {
    // Always use dark mode — the app is designed as a dark UI
    document.documentElement.classList.add('dark');
  }, []);

  return null;
}