interface StepperProps {
  steps: string[];
  current: number;        // índice da etapa atual
  skipped?: number[];     // índices pulados (ex.: holerite quando sem CNPJ)
}

// Progresso da inscrição, exibido na coluna azul do wizard. Renderiza os dois
// formatos e o CSS mostra um por breakpoint:
//  - desktop (≥900px): lista vertical das etapas (número + nome).
//  - mobile  (<900px): barra segmentada horizontal + "Etapa N de T · Nome".
export function Stepper({ steps, current, skipped = [] }: StepperProps) {
  const total = steps.length;

  return (
    <div className="wz-steps" aria-label="Progresso da inscrição">
      {/* desktop: lista vertical */}
      <ol className="wz-steplist">
        {steps.map((s, i) => {
          const state =
            skipped.includes(i) ? 'skip' : i < current ? 'done' : i === current ? 'now' : 'todo';
          return (
            <li key={s} className={`wz-stepitem ${state}`}>
              <span className="num">{state === 'done' ? '✓' : i + 1}</span>
              <span className="lbl">{s}</span>
            </li>
          );
        })}
      </ol>

      {/* mobile: barra segmentada + rótulo */}
      <div className="wz-progress" aria-hidden="true">
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
