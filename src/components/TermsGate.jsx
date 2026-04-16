import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Anchor } from 'lucide-react';

export default function TermsGate({ onAccepted }) {
  const [accepting, setAccepting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    await base44.auth.updateMe({ terms_accepted: true });
    onAccepted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Terms of Use</h2>
            <p className="text-slate-400 text-sm">Please read and accept to continue</p>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-6 text-slate-300 text-sm space-y-4 leading-relaxed"
          onScroll={handleScroll}
          style={{ minHeight: 0 }}
        >
          <p className="font-semibold text-white">Sailing Doodles Community — Terms of Use & Community Guidelines</p>
          <p>By using the Sailing Doodles app, you agree to these terms. Please read them carefully before accessing community features.</p>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="font-semibold text-red-400 mb-1">⚠️ Zero Tolerance Policy</p>
            <p className="text-red-300">We have a strict zero-tolerance policy for objectionable content and abusive behavior. Any user found posting hate speech, threats, sexual content, harassment, bullying, or discriminatory content will be <strong>immediately and permanently banned</strong> without warning. This applies to all areas of the app including posts, comments, chat, forum, and direct messages.</p>
          </div>

          <p className="font-medium text-white">1. Prohibited Content</p>
          <p>You agree NOT to post, share, or transmit any content that is:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Sexually explicit, obscene, or pornographic</li>
            <li>Hateful, threatening, or incites violence</li>
            <li>Bullying, harassment, or targeted abuse of any individual</li>
            <li>Discriminatory based on race, religion, gender, sexual orientation, nationality, or disability</li>
            <li>Spam, misinformation, or deliberately deceptive</li>
            <li>Illegal or violates any applicable laws</li>
          </ul>

          <p className="font-medium text-white">2. User-Generated Content</p>
          <p>You retain ownership of content you submit. By posting content, you grant Sailing Doodles a license to display and distribute that content within the app. We reserve the right to remove any content that violates these terms at any time without notice.</p>

          <p className="font-medium text-white">3. Reporting Objectionable Content</p>
          <p>Every post, comment, reply, chat message, forum thread, and direct message includes a Report button. You are encouraged to report any content you find objectionable or abusive. All reports are reviewed by our moderation team. We may remove content and suspend or permanently ban accounts at our sole discretion.</p>

          <p className="font-medium text-white">4. Blocking Abusive Users</p>
          <p>You may block any user at any time using the Block option available on all content. Blocked users' content will be immediately hidden from your view across the entire app — including feed, forum, chat, and messages.</p>

          <p className="font-medium text-white">5. Content Filtering</p>
          <p>This app uses automated content filtering to detect and block abusive language. Attempts to circumvent the filter may result in immediate account suspension.</p>

          <p className="font-medium text-white">6. Account Termination</p>
          <p>We reserve the right to suspend or terminate accounts immediately and without notice for any violation of these terms, particularly for posting objectionable content, engaging in harassment, or abusing other members.</p>

          <p className="font-medium text-white">7. Privacy</p>
          <p>Your email and profile information are stored securely. We do not sell your personal data to third parties.</p>

          <p className="font-medium text-white">8. Disclaimer</p>
          <p>This app is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service or content posted by other users.</p>

          <p className="text-slate-500 text-xs mt-4">Last updated: March 2026</p>
        </div>

        <div className="p-4 border-t border-slate-800">
          {!scrolledToBottom && (
            <p className="text-xs text-slate-500 text-center mb-3">Scroll to the bottom to accept</p>
          )}
          <Button
            onClick={handleAccept}
            disabled={!scrolledToBottom || accepting}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40"
          >
            {accepting ? 'Saving...' : 'I Accept the Terms of Use'}
          </Button>
        </div>
      </div>
    </div>
  );
}