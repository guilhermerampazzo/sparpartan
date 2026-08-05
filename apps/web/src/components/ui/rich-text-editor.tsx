"use client";

import { useCallback, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
} from "lucide-react";

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-primary-container text-on-primary-container"
          : "text-outline hover:bg-surface-container-low hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

async function uploadImagem(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("arquivo", file);
  const resposta = await fetch("/api/lms/upload-imagem", {
    method: "POST",
    body: formData,
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.error ?? "Falha ao enviar imagem.");
  return dados.url as string;
}

function Toolbar({ editor }: { editor: Editor }) {
  const imagemInputRef = useRef<HTMLInputElement>(null);

  const definirLink = useCallback(() => {
    const anterior = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", anterior ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const escolherImagem = useCallback(() => {
    imagemInputRef.current?.click();
  }, []);

  const enviarImagem = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const url = await uploadImagem(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (erro) {
        window.alert(erro instanceof Error ? erro.message : "Falha ao enviar imagem.");
      }
    },
    [editor]
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container-lowest px-2 py-1.5">
      <ToolbarButton
        title="Negrito"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        title="Itálico"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        title="Lista com marcadores"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        title="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={definirLink}>
        <LinkIcon size={16} />
      </ToolbarButton>
      <ToolbarButton title="Inserir imagem" onClick={escolherImagem}>
        <ImageIcon size={16} />
      </ToolbarButton>
      <input
        ref={imagemInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={enviarImagem}
      />
    </div>
  );
}

/**
 * Editor de texto rico (Tiptap) para conteúdo de aula/questão do LMS.
 *
 * Tiptap só roda no cliente, então o HTML gerado é espelhado num
 * `<input type="hidden">` a cada alteração — é esse input, não o editor em
 * si, que viaja no `FormData` até a Server Action que processa o `<form>`
 * ao redor deste componente.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  variaveis = [],
}: {
  name: string;
  defaultValue?: string;
  /** Variáveis clicáveis (ex.: templates de e-mail) — insere `{{nome}}` no cursor. */
  variaveis?: { nome: string; etiqueta: string }[];
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ImageExtension.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-3 py-2 text-sm text-primary focus:outline-none min-h-[160px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (hiddenInputRef.current) hiddenInputRef.current.value = editor.getHTML();
    },
  });

  const inserirVariavel = useCallback(
    (nome: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${nome}}}`).run();
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface">
        <div className="min-h-[160px] px-3 py-2 text-sm text-outline">Carregando editor...</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface focus-within:border-primary">
      <Toolbar editor={editor} />
      {variaveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-outline-variant bg-surface-container-lowest px-2 py-1.5">
          <span className="font-mono-caps text-[10px] uppercase tracking-wide text-outline">
            Inserir variável:
          </span>
          {variaveis.map((v) => (
            <button
              key={v.nome}
              type="button"
              title={`Inserir {{${v.nome}}} — ${v.etiqueta}`}
              onClick={() => inserirVariavel(v.nome)}
              className="rounded-pill border border-outline-variant bg-surface px-2 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              {`{{${v.nome}}}`}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
      <input ref={hiddenInputRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  );
}
