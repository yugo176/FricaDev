import {
  CODE_LANGUAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_STAGES,
  type ProjectStage,
} from '@fricadev/shared';
import { Code2, Github, Globe, Users } from 'lucide-react';
import { LANGUAGE_UI } from '~/lib/languages';
import type { ComposerState } from './post-form-model';
import { Field, Input, Select, Textarea, cn } from './ui';

type Set = <K extends keyof ComposerState>(key: K, value: ComposerState[K]) => void;
type Props = { state: ComposerState; set: Set; error?: string };

const STAGE_HINTS: Record<ProjectStage, string> = {
  IDEA: 'Sur le papier',
  PROTOTYPE: 'Ça tourne en local',
  BETA: 'Des premiers utilisateurs',
  LIVE: 'Ouvert à tous',
};

/** Projet : pitch, avancement, liens et recherche de coéquipiers. */
export function ProjectFields({ state, set, error, mode }: Props & { mode: 'create' | 'edit' }) {
  return (
    <div className="space-y-5">
      <Field
        label="Le pitch en une phrase"
        htmlFor="pitch"
        hint={`Ce que ton projet résout, pour qui. ${140 - state.pitch.length} caractères restants.`}
      >
        <Input
          id="pitch"
          name="pitch"
          maxLength={140}
          value={state.pitch}
          onChange={(e) => set('pitch', e.target.value)}
          placeholder="Commander au resto du campus et payer en mobile money, sans attendre."
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800 dark:text-stone-200">
          Où en est le projet ?
        </legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROJECT_STAGES.map((stage, i) => {
            const active = state.stage === stage;
            return (
              <label
                key={stage}
                className={cn(
                  'flex cursor-pointer flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition',
                  active
                    ? 'border-brand-600 ring-4 ring-brand-600/10'
                    : 'border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700',
                )}
              >
                <input
                  type="radio"
                  name="stage"
                  value={stage}
                  checked={active}
                  onChange={() => set('stage', stage)}
                  className="sr-only"
                />
                <span className="flex gap-[3px]" aria-hidden>
                  {PROJECT_STAGES.map((s, j) => (
                    <span
                      key={s}
                      className={cn(
                        'h-1 w-3 rounded-full',
                        j <= i ? 'bg-brand-400' : 'bg-stone-200 dark:bg-stone-700',
                      )}
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold">{PROJECT_STAGE_LABELS[stage]}</span>
                <span className="text-xs text-stone-500">{STAGE_HINTS[stage]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lien du code" htmlFor="repoUrl" optional>
          <div className="relative">
            <Github
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <Input
              id="repoUrl"
              name="repoUrl"
              type="url"
              inputMode="url"
              pattern="https://.*"
              value={state.repoUrl}
              onChange={(e) => set('repoUrl', e.target.value)}
              placeholder="https://github.com/toi/projet"
              className="pl-10"
            />
          </div>
        </Field>
        <Field label="Lien de la démo" htmlFor="demoUrl" optional>
          <div className="relative">
            <Globe
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <Input
              id="demoUrl"
              name="demoUrl"
              type="url"
              inputMode="url"
              pattern="https://.*"
              value={state.demoUrl}
              onChange={(e) => set('demoUrl', e.target.value)}
              placeholder="https://mon-projet.app"
              className="pl-10"
            />
          </div>
        </Field>
      </div>
      {error && <p className="field-error">{error}</p>}

      {mode === 'create' && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 px-3.5 py-3 transition hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700">
          <input
            type="checkbox"
            name="lookingForTeam"
            checked={state.lookingForTeam}
            onChange={(e) => set('lookingForTeam', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span className="text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Users size={15} className="text-brand-600 dark:text-brand-400" aria-hidden /> Je
              cherche des coéquipiers
            </span>
            <span className="text-stone-500">
              Juste après la publication, tu pourras décrire le poste recherché.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

/** Question guidée : trois champs qui deviennent un énoncé clair (intertitres, bloc de code). */
export function QuestionFields({ state, set }: Props) {
  return (
    <div className="space-y-5">
      <input type="hidden" name="guided" value="question" />
      <Field
        label="Ce que tu essaies de faire"
        htmlFor="goal"
        hint="Le contexte : ton objectif, ta stack, ce qui doit se passer."
      >
        <Textarea
          id="goal"
          name="goal"
          rows={4}
          required
          value={state.goal}
          onChange={(e) => set('goal', e.target.value)}
          placeholder="J’intègre le paiement Wave dans une API Laravel. Le webhook doit créditer le compte de l’utilisateur une seule fois…"
        />
      </Field>
      <Field label="Ce que tu as déjà essayé" htmlFor="tried" optional>
        <Textarea
          id="tried"
          name="tried"
          rows={3}
          value={state.tried}
          onChange={(e) => set('tried', e.target.value)}
          placeholder="J’ai ajouté un verrou en base, mais le webhook arrive parfois deux fois en même temps…"
        />
      </Field>
      <Field
        label="Message d’erreur ou code"
        htmlFor="error"
        optional
        hint="Colle le message exact ou le morceau de code concerné : il sera affiché en police de code."
      >
        <Textarea
          id="error"
          name="error"
          rows={5}
          value={state.error}
          onChange={(e) => set('error', e.target.value)}
          spellCheck={false}
          placeholder="SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry…"
          className="font-mono text-[13px]"
        />
      </Field>
    </div>
  );
}

/** Extrait de code : langage, code et explication. */
export function CodeFields({ state, set, guided }: Props & { guided: boolean }) {
  return (
    <div className="space-y-5">
      <Field label="Langage" htmlFor="language">
        <div className="relative">
          <Code2
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <Select
            id="language"
            name="language"
            value={state.language}
            onChange={(e) => set('language', e.target.value as ComposerState['language'])}
            className="pl-10"
          >
            <option value="">Choisir…</option>
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_UI[lang].label}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      {guided && (
        <>
          <input type="hidden" name="guided" value="code" />
          <Field label="Le code" htmlFor="code">
            <Textarea
              id="code"
              name="code"
              rows={10}
              required
              value={state.code}
              onChange={(e) => set('code', e.target.value)}
              spellCheck={false}
              placeholder={'export function formatFcfa(montant: number) {\n  // …\n}'}
              className="bg-stone-950 font-mono text-[13px] leading-relaxed text-emerald-100 placeholder:text-stone-500 dark:bg-black/40"
            />
          </Field>
          <Field
            label="À quoi il sert"
            htmlFor="explanation"
            hint="Une ou deux phrases : le problème résolu, comment l’utiliser."
          >
            <Textarea
              id="explanation"
              name="explanation"
              rows={3}
              value={state.explanation}
              onChange={(e) => set('explanation', e.target.value)}
              placeholder="Affiche un montant en francs CFA avec les espaces au bon endroit, sans décimales."
            />
          </Field>
        </>
      )}
    </div>
  );
}

/** Article : sous-titre facultatif ; le temps de lecture est calculé automatiquement. */
export function ArticleFields({ state, set }: Props) {
  return (
    <Field
      label="Sous-titre"
      htmlFor="subtitle"
      optional
      hint="Une phrase qui donne envie de lire la suite."
    >
      <Input
        id="subtitle"
        name="subtitle"
        maxLength={200}
        value={state.subtitle}
        onChange={(e) => set('subtitle', e.target.value)}
        placeholder="Ce que j’ai appris en déployant mon API sur un VPS à Dakar."
      />
    </Field>
  );
}
