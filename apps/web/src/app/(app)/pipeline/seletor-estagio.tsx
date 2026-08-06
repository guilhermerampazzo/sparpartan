"use client";

/** Select de estágio do quadro — precisa ser client por causa do onChange. */
export function SeletorEstagio({
  oportunidadeId,
  estagioAtual,
  estagios,
  action,
}: {
  oportunidadeId: string;
  estagioAtual: string;
  estagios: { key: string; label: string; emoji: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="oportunidadeId" value={oportunidadeId} />
      <select
        name="novoEstagio"
        defaultValue={estagioAtual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-md border border-outline-variant bg-surface px-2 py-1 text-[11px] text-primary outline-none focus:border-primary"
      >
        {estagios.map((e) => (
          <option key={e.key} value={e.key}>
            {e.emoji} {e.label}
          </option>
        ))}
      </select>
    </form>
  );
}
