import { AFRICAN_COUNTRY_CODES } from '@fricadev/shared';
import { Field, Input, Select, Textarea } from './ui';
import { COUNTRY_NAMES } from '~/lib/countries';
import type { FieldErrors } from '~/lib/forms.server';

interface ProfileFieldsProps {
  defaults: {
    handle?: string;
    displayName?: string;
    countryCode?: string | null;
    skills?: string[];
    bio?: string | null;
  };
  errors?: FieldErrors;
}

/** Champs du profil, partagés par la création de profil et les paramètres. */
export function ProfileFields({ defaults, errors = {} }: ProfileFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Pseudo"
          htmlFor="handle"
          hint="Lettres minuscules, chiffres ou _ (3 à 30)."
          error={errors.handle?.[0]}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
              @
            </span>
            <Input
              id="handle"
              name="handle"
              required
              defaultValue={defaults.handle}
              pattern="[a-z0-9_]{3,30}"
              title="Entre 3 et 30 caractères : lettres minuscules, chiffres ou _"
              className="pl-8"
              autoComplete="username"
            />
          </div>
        </Field>
        <Field label="Nom affiché" htmlFor="displayName" error={errors.displayName?.[0]}>
          <Input
            id="displayName"
            name="displayName"
            required
            minLength={2}
            maxLength={60}
            defaultValue={defaults.displayName}
            autoComplete="name"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pays" htmlFor="countryCode" optional>
          <Select id="countryCode" name="countryCode" defaultValue={defaults.countryCode ?? ''}>
            <option value="">Choisir…</option>
            {AFRICAN_COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {COUNTRY_NAMES[code]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Compétences" htmlFor="skills" hint="Séparées par des virgules." optional>
          <Input
            id="skills"
            name="skills"
            defaultValue={defaults.skills?.join(', ')}
            placeholder="react, laravel, flutter"
          />
        </Field>
      </div>

      <Field label="Bio" htmlFor="bio" optional error={errors.bio?.[0]}>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          defaultValue={defaults.bio ?? ''}
          placeholder="Dev full-stack à Dakar, passionné d’open source."
        />
      </Field>
    </div>
  );
}
