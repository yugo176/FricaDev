/** Affiche du HTML déjà nettoyé côté serveur (voir markdown.server.ts). */
export function Markdown({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div className={`prose-fricadev ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
