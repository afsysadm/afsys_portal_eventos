interface StepperProps {
  steps: string[];
  current: number;        // índice da etapa atual
  skipped?: number[];     // índices pulados (ex.: holerite quando sem CNPJ)
}

export function Stepper({ steps, current, skipped = [] }: StepperProps) {
  const total = steps.length;
  const pct = Math.round(((current) / (total - 1)) * 100);

  return (
    <div className="wz-steps" aria-label="Progresso da inscrição">
      <div className="wz-progress">
        <div className="wz-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <ol className="wz-steplist">
        {steps.map((s, i) => {
          const state =
            skipped.includes(i) ? 'skip' : i < current ? 'done' : i === current ? 'now' : 'todo';
          return (
            <li key={s} className={`wz-stepitem ${state}`}>
              <span className="dot">{i < current && !skipped.includes(i) ? '✓' : i + 1}</span>
              <span className="lbl">{s}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
