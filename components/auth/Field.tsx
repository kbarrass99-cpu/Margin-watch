export const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 aria-[invalid=true]:border-red-400';

export default function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-xs text-zinc-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
