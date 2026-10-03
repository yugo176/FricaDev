export function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3.5 dark:border-stone-800 dark:bg-stone-950/40">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}
