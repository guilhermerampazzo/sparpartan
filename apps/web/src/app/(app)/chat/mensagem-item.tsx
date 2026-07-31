"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X, Check, Paperclip } from "lucide-react";
import { editarMensagem, apagarMensagem } from "./actions";

type Mensagem = {
  id: string;
  usuarioNome: string;
  corpo: string;
  criadoEm: Date;
  editadaEm: Date | null;
  apagadaEm: Date | null;
  anexoCaminho?: string | null;
  anexoNome?: string | null;
};

const EXTENSOES_IMAGEM = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function ehImagem(nome?: string | null) {
  if (!nome) return false;
  const lower = nome.toLowerCase();
  return EXTENSOES_IMAGEM.some((ext) => lower.endsWith(ext));
}

export function MensagemItem({ mensagem, minha }: { mensagem: Mensagem; minha: boolean }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(mensagem.corpo);
  const [pending, startTransition] = useTransition();

  if (mensagem.apagadaEm) {
    return (
      <li className={`flex ${minha ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[70%] rounded-lg border border-dashed border-outline-variant px-3 py-2 text-body-sm italic text-outline">
          Mensagem apagada
        </div>
      </li>
    );
  }

  function salvar() {
    const corpo = texto.trim();
    if (!corpo) return;
    const formData = new FormData();
    formData.set("id", mensagem.id);
    formData.set("corpo", corpo);
    startTransition(async () => {
      await editarMensagem(formData);
      setEditando(false);
    });
  }

  function apagar() {
    if (!confirm("Apagar esta mensagem?")) return;
    const formData = new FormData();
    formData.set("id", mensagem.id);
    startTransition(async () => {
      await apagarMensagem(formData);
    });
  }

  return (
    <li className={`flex ${minha ? "justify-end" : "justify-start"}`}>
      <div
        className={`group max-w-[70%] rounded-lg px-3 py-2 ${
          minha ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
        }`}
      >
        {!minha && (
          <p className="font-mono-caps text-[10px] uppercase opacity-70">{mensagem.usuarioNome}</p>
        )}

        {editando ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              autoFocus
              className="w-full rounded-md border border-outline-variant bg-surface px-2 py-1 text-body-sm text-primary outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTexto(mensagem.corpo);
                  setEditando(false);
                }}
                className="rounded p-1 opacity-80 hover:opacity-100"
                aria-label="Cancelar"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={pending}
                className="rounded p-1 opacity-80 hover:opacity-100"
                aria-label="Salvar"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {mensagem.corpo && <p className="whitespace-pre-wrap text-body-md">{mensagem.corpo}</p>}
            {mensagem.anexoCaminho && (
              <div className="mt-2">
                {ehImagem(mensagem.anexoNome) ? (
                  <a href={`/api/chat/${mensagem.id}/anexo`} target="_blank" rel="noreferrer">
                    <img
                      src={`/api/chat/${mensagem.id}/anexo`}
                      alt={mensagem.anexoNome ?? "Anexo"}
                      className="max-h-48 rounded-md border border-outline-variant object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={`/api/chat/${mensagem.id}/anexo`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-body-sm underline opacity-90 hover:opacity-100"
                  >
                    <Paperclip size={12} /> {mensagem.anexoNome ?? "Anexo"}
                  </a>
                )}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[10px] opacity-60">
                {new Date(mensagem.criadoEm).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
                {mensagem.editadaEm ? " (editada)" : ""}
              </p>
              {minha && (
                <span className="ml-auto flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="opacity-80 hover:opacity-100"
                    aria-label="Editar mensagem"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={apagar}
                    disabled={pending}
                    className="opacity-80 hover:opacity-100"
                    aria-label="Apagar mensagem"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
