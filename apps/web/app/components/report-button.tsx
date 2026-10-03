import { useFetcher } from 'react-router';
import { Check, Flag } from 'lucide-react';
import { REPORT_REASON_LABELS, REPORT_REASONS } from '@fricadev/shared';
import { Button, FormError, Textarea, buttonClass } from './ui';

/** Signaler un contenu : menu déroulant natif (fonctionne sans bibliothèque JavaScript). */
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'POST' | 'COMMENT';
  targetId: string;
}) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string | null }>();

  if (fetcher.data?.ok) {
    return (
      <span className="inline-flex items-center gap-1 px-2 text-xs text-stone-500">
        <Check size={13} className="text-brand-600" aria-hidden /> Signalement envoyé
      </span>
    );
  }

  return (
    <details className="group relative">
      <summary
        className={buttonClass(
          'ghost',
          'sm',
          'cursor-pointer list-none text-stone-500 [&::-webkit-details-marker]:hidden',
        )}
      >
        <Flag size={14} aria-hidden /> Signaler
      </summary>
      <fetcher.Form
        method="post"
        className="card absolute right-0 z-30 mt-2 w-80 animate-fade-up space-y-4 p-4 shadow-pop"
      >
        <input type="hidden" name="intent" value="report" />
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <fieldset>
          <legend className="text-sm font-semibold">Pourquoi signales-tu ce contenu ?</legend>
          <div className="mt-2.5 space-y-1">
            {REPORT_REASONS.map((reason, i) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  defaultChecked={i === 0}
                  className="accent-brand-600"
                />
                {REPORT_REASON_LABELS[reason]}
              </label>
            ))}
          </div>
        </fieldset>
        <Textarea
          name="details"
          rows={2}
          maxLength={500}
          className="text-sm"
          placeholder="Précisions (facultatif)"
        />
        <FormError>{fetcher.data?.error}</FormError>
        <Button className="w-full" loading={fetcher.state !== 'idle'}>
          Envoyer le signalement
        </Button>
      </fetcher.Form>
    </details>
  );
}
