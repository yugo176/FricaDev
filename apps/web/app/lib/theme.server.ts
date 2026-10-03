export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Thème choisi par le visiteur (cookie simple, pas besoin d'être connecté). */
export function getTheme(request: Request): Theme {
  const match = /(?:^|;\s*)fd_theme=(system|light|dark)/.exec(request.headers.get('Cookie') ?? '');
  return (match?.[1] as Theme | undefined) ?? 'system';
}

export function themeCookie(theme: Theme) {
  return `fd_theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
