import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from './ui';

/** Partage natif du téléphone (WhatsApp, Telegram…), sinon copie du lien. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split('#')[0]!;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Partage annulé : rien à faire.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copie ce lien :', url);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={share}
      icon={
        copied ? (
          <Check size={14} className="text-brand-600" aria-hidden />
        ) : (
          <Share2 size={14} aria-hidden />
        )
      }
    >
      <span className="hidden sm:inline">{copied ? 'Lien copié' : 'Partager'}</span>
      <span className="sr-only sm:hidden">Partager</span>
    </Button>
  );
}
