/** Regroupement par date (notifications, « Mon activité »), comme GitHub : aujourd'hui, hier, cette semaine, plus ancien. */
export function dateGroup(iso: string, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  if (days < 7) return 'Cette semaine';
  if (days < 31) return 'Ce mois-ci';
  return 'Plus ancien';
}
