import type { CodeLanguage } from '@fricadev/shared';

/** Nom affiché et couleur de chaque langage (couleurs usuelles, comme sur GitHub). */
export const LANGUAGE_UI: Record<CodeLanguage, { label: string; color: string }> = {
  javascript: { label: 'JavaScript', color: '#f1e05a' },
  typescript: { label: 'TypeScript', color: '#3178c6' },
  python: { label: 'Python', color: '#3572A5' },
  php: { label: 'PHP', color: '#4F5D95' },
  dart: { label: 'Dart', color: '#00B4AB' },
  kotlin: { label: 'Kotlin', color: '#A97BFF' },
  java: { label: 'Java', color: '#b07219' },
  go: { label: 'Go', color: '#00ADD8' },
  rust: { label: 'Rust', color: '#dea584' },
  csharp: { label: 'C#', color: '#178600' },
  sql: { label: 'SQL', color: '#e38c00' },
  bash: { label: 'Bash', color: '#89e051' },
  html: { label: 'HTML', color: '#e34c26' },
  css: { label: 'CSS', color: '#663399' },
};
