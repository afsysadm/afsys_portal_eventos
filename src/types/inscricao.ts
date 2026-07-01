// Tipos do fluxo de inscrição (wizard).
// As chaves do payload espelham exatamente o que o módulo afsys_inscricoes
// espera (ver services/inscricao.ts).

export type StatusInscricao = 'INSCRITO' | 'PENDENTE HOLERITE' | 'PENDENCIA CNPJ';
export type SimNao = 'Sim' | 'Não';

export interface InscricaoForm {
  lgpd: boolean;              // aceite LGPD (true = "Autorizo")
  cpf: string;               // mascarado: 000.000.000-00
  nomeCompleto: string;
  whatsapp: string;          // mascarado: (00) 00000-0000
  cidade: string;
  querSindicalizar: SimNao | '';
  temCnpj: SimNao | '';
  cnpj: string;              // mascarado: 00.000.000/0000-00
  empresaNome: string;
  possuiHolerite: SimNao | '';
  holeriteArquivo: File | null;
  holeriteNome: string;      // nome do arquivo (exibição/mock)
}

export function novoForm(): InscricaoForm {
  return {
    lgpd: false,
    cpf: '',
    nomeCompleto: '',
    whatsapp: '',
    cidade: '',
    querSindicalizar: '',
    temCnpj: '',
    cnpj: '',
    empresaNome: '',
    possuiHolerite: '',
    holeriteArquivo: null,
    holeriteNome: '',
  };
}

// Resultado da checagem de CPF (na integração, virá do backend:
// busca de inscrição existente + enriquecimento na base AFSYS).
export interface CpfCheckResult {
  found: boolean;             // já existe inscrição para este CPF?
  status?: string;            // status da inscrição existente (se found)
  protocolo?: string;         // protocolo existente (se found)
  // enriquecimento (preenchido pelo backend na fase de integração)
  nomeAfsys?: string;
  empresaAfsys?: string;
}

export interface SubmitResult {
  protocolo: string;
  status: StatusInscricao;
  jaInscrito?: boolean;
}
