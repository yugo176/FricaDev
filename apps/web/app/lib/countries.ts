export const COUNTRY_NAMES: Record<string, string> = {
  DZ: 'Algérie',
  BJ: 'Bénin',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  CM: 'Cameroun',
  CF: 'Centrafrique',
  KM: 'Comores',
  CG: 'Congo',
  CI: 'Côte d’Ivoire',
  DJ: 'Djibouti',
  GA: 'Gabon',
  GN: 'Guinée',
  GQ: 'Guinée équatoriale',
  MG: 'Madagascar',
  ML: 'Mali',
  MA: 'Maroc',
  MR: 'Mauritanie',
  NE: 'Niger',
  CD: 'RD Congo',
  RW: 'Rwanda',
  SN: 'Sénégal',
  SC: 'Seychelles',
  TD: 'Tchad',
  TG: 'Togo',
  TN: 'Tunisie',
};

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} j`;
}
