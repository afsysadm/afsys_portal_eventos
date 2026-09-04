import type { CriancaForm } from '../../types/inscricao';
import {
  VINCULOS_CRIANCA,
  FAIXAS_CRIANCA,
  MAX_CRIANCAS,
} from '../../types/inscricao';
import { TextField, ChoiceField } from './fields';

// ---------------------------------------------------------------------------
// EDITOR DE CRIANÇAS/DEPENDENTES
//
// Usado em dois lugares com as MESMAS regras: a etapa "Crianças" do wizard e a
// edição pela consulta da inscrição. Os erros chegam indexados por posição +
// campo (`crianca_0_nome`), no formato de `validarCriancas`.
// ---------------------------------------------------------------------------

interface Props {
  criancas: CriancaForm[];
  errors: Record<string, string>;
  onAlterar: (i: number, patch: Partial<CriancaForm>) => void;
  onAdicionar: () => void;
  onRemover: (i: number) => void;
  // Na inscrição a primeira criança é obrigatória e não pode ser removida; na
  // edição a lista já existe e qualquer uma pode sair (o servidor recusa vazia).
  permiteRemoverPrimeira?: boolean;
}

export function CriancasEditor({
  criancas,
  errors,
  onAlterar,
  onAdicionar,
  onRemover,
  permiteRemoverPrimeira = false,
}: Props) {
  return (
    <>
      <p className="wz-note wz-crianca-aviso">
        <b>Atenção:</b> na retirada do prêmio, será obrigatório apresentar documento que comprove
        o parentesco com a criança inscrita.
      </p>

      {criancas.map((c, i) => (
        <div className="wz-crianca" key={i}>
          <div className="wz-crianca-head">
            <span className="wz-crianca-num">Criança {i + 1}</span>
            {(i > 0 || permiteRemoverPrimeira) && (
              <button type="button" className="wz-crianca-rm" onClick={() => onRemover(i)}>
                Remover
              </button>
            )}
          </div>
          <TextField
            label="Nome"
            value={c.nome}
            onChange={(v) => onAlterar(i, { nome: v })}
            placeholder="Nome da criança"
            error={errors[`crianca_${i}_nome`]}
          />
          <ChoiceField
            label="Vínculo"
            options={VINCULOS_CRIANCA}
            value={c.vinculo}
            onChange={(v) => onAlterar(i, { vinculo: v as CriancaForm['vinculo'] })}
            error={errors[`crianca_${i}_vinculo`]}
          />
          <ChoiceField
            label="Faixa etária"
            options={FAIXAS_CRIANCA}
            value={c.faixaEtaria}
            onChange={(v) => onAlterar(i, { faixaEtaria: v as CriancaForm['faixaEtaria'] })}
            error={errors[`crianca_${i}_faixaEtaria`]}
          />
        </div>
      ))}

      {errors.criancas && <p className="wz-err wz-err-block">{errors.criancas}</p>}

      {criancas.length < MAX_CRIANCAS ? (
        <button type="button" className="wz-btn-ghost wz-crianca-add" onClick={onAdicionar}>
          + Adicionar outra criança
        </button>
      ) : (
        <p className="wz-note">
          Você atingiu o limite de <b>{MAX_CRIANCAS} crianças</b> por inscrição.
        </p>
      )}
    </>
  );
}
