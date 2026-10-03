import { z } from 'zod';

/** Codes ISO 3166-1 alpha-2 des 25 pays éligibles au CADEV ; la liste s'étendra à toute l'Afrique. */
export const AFRICAN_COUNTRY_CODES = [
  'DZ',
  'BJ',
  'BF',
  'BI',
  'CM',
  'CF',
  'KM',
  'CG',
  'CI',
  'DJ',
  'GA',
  'GN',
  'GQ',
  'MG',
  'ML',
  'MA',
  'MR',
  'NE',
  'CD',
  'RW',
  'SN',
  'SC',
  'TD',
  'TG',
  'TN',
] as const;

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, 'Entre 3 et 30 caractères : lettres, chiffres ou _');

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(500).optional(),
  countryCode: z.enum(AFRICAN_COUNTRY_CODES).optional(),
  skills: z.array(z.string().trim().toLowerCase().max(32)).max(20).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
