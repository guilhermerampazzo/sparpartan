"use client";

export function ImprimirButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm font-medium text-primary hover:bg-surface-container-low"
    >
      🖨️ Imprimir
    </button>
  );
}
