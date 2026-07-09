interface StepperProps {
  steps: string[];
  current: number;        // índice da etapa atual
  skipped?: number[];     // índices pulados (ex.: holerite quando sem CNPJ)
}

// Progresso da inscrição exibido dentro da faixa azul: barra segmentada
// (linhas finas brancas — preenchidas = branco sólido, vazias/puladas =
// branco translúcido) + rótulo "Etapa N de T · Nome".
export function Stepper({ steps, current, skipped = [] }: StepperProps) {
  const total = steps.length;

  return (
    <div className="wz-steps" aria-label="Progresso da inscrição">
      <div className="wz-progress">
        {steps.map((s, i) => {
          const cls = skipped.includes(i) ? 'skip' : i <= current ? 'on' : '';
          return <span key={s} className={`seg ${cls}`} />;
        })}
      </div>
      <div className="wz-step-meta">
        Etapa {current + 1} de {total} · {steps[current]}
      </div>
    </div>
  );
}
