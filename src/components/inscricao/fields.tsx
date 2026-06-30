import type { ChangeEvent, ReactNode } from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  hint?: ReactNode;
  autoFocus?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode = 'text',
  hint,
  autoFocus,
}: TextFieldProps) {
  return (
    <label className="wz-field">
      <span className="wz-label">{label}</span>
      <input
        className={'wz-input' + (error ? ' err' : '')}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      {hint && !error && <span className="wz-hint">{hint}</span>}
      {error && <span className="wz-err">{error}</span>}
    </label>
  );
}

interface ChoiceFieldProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

// Botões grandes (cards) — bom para toque no celular.
export function ChoiceField({ label, options, value, onChange, error }: ChoiceFieldProps) {
  return (
    <div className="wz-field">
      <span className="wz-label">{label}</span>
      <div className="wz-choices">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={'wz-choice' + (value === opt ? ' on' : '')}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <span className="wz-err">{error}</span>}
    </div>
  );
}

interface FileFieldProps {
  label: string;
  fileName: string;
  onPick: (file: File | null) => void;
  error?: string;
  hint?: ReactNode;
}

export function FileField({ label, fileName, onPick, error, hint }: FileFieldProps) {
  return (
    <div className="wz-field">
      <span className="wz-label">{label}</span>
      <label className={'wz-file' + (error ? ' err' : '')}>
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <span className="wz-file-ico">📷</span>
        <span className="wz-file-txt">
          {fileName ? fileName : 'Toque para enviar a imagem (foto ou print)'}
        </span>
      </label>
      {hint && !error && <span className="wz-hint">{hint}</span>}
      {error && <span className="wz-err">{error}</span>}
    </div>
  );
}
