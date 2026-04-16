import { useEffect } from 'react';

export default function Base44RemovalHelper() {
  useEffect(() => {
    // Aggressive removal of Base44 edit button on every render
    const removeBase44 = () => {
      // Direct DOM removal
      document.querySelectorAll('[class*="base44"], [id*="base44"], [class*="Base44"]').forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      });

      // Check for any button with edit functionality
      const allButtons = document.querySelectorAll('button');
      allButtons.forEach(btn => {
        const text = btn.innerText?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        const title = btn.getAttribute('title')?.toLowerCase() || '';
        
        if (text.includes('edit') || ariaLabel.includes('base44') || title.includes('base44')) {
          btn.style.display = 'none';
          btn.style.visibility = 'hidden';
          btn.style.pointerEvents = 'none';
        }
      });

      // Remove fixed positioned iframes
      document.querySelectorAll('iframe[style*="fixed"]').forEach(el => {
        el.style.display = 'none';
      });
    };

    // Run immediately
    removeBase44();

    // Run on mutation (for dynamically added elements)
    const observer = new MutationObserver(() => {
      removeBase44();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style']
    });

    return () => observer.disconnect();
  }, []);

  return null;
}