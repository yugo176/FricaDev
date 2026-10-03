/** Texte brut court tiré du Markdown, pour les aperçus (fil, recherche, balises meta). */
export function excerpt(markdown: string, length = 280): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    // Balises HTML brutes (non affichées dans la page) : rien à faire dans un extrait.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>/gi, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Les intertitres ne disent rien du contenu : retirés de l'extrait.
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/[*_>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** Début du premier bloc de code d'un Markdown (aperçu des publications « Code »). */
export function codePreview(markdown: string, maxLines = 8): string | null {
  const match = /```[^\n]*\n([\s\S]*?)```/.exec(markdown);
  if (!match?.[1]) return null;
  const lines = match[1].trimEnd().split('\n');
  return lines.length > maxLines ? `${lines.slice(0, maxLines).join('\n')}\n…` : lines.join('\n');
}
