import Link from "next/link";
import { BookOpen, UserCog, GraduationCap } from "lucide-react";

const CARTOES = [
  {
    href: "/lms/materias",
    icon: BookOpen,
    title: "LMS",
    description: "Matérias, capítulos, aulas, provas e correção automática do curso náutico.",
  },
  {
    href: "/alunos",
    icon: UserCog,
    title: "Alunos",
    description: "Cadastro de alunos, matrículas, pedidos de pagamento e acesso ao portal.",
  },
  {
    href: "/area-de-estudos",
    icon: GraduationCap,
    title: "Área de Estudos",
    description: "Materiais liberados por serviço contratado e progresso de cada cliente.",
  },
];

export default function EscolaPage() {
  return (
    <div className="space-y-gutter">
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Escola Náutica</h1>
        <p className="text-body-md text-on-surface-variant">
          Módulo de ensino: materiais, aulas, provas, alunos e área de estudos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <c.icon size={22} />
            </span>
            <div>
              <h2 className="font-display text-title-md font-semibold text-primary">{c.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
