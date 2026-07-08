// Validações e máscaras de campos brasileiros.

export function onlyDigits(s: string): string {
  return (s || '').replace(/\D+/g, '');
}

// ----- Máscaras -----

export function maskCPF(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskCNPJ(s: string): string {
  const d = onlyDigits(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function maskPhone(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^\((\d{2})\)\s(\d{4})(\d)/, '($1) $2-$3');
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^\((\d{2})\)\s(\d{5})(\d)/, '($1) $2-$3');
}

// ----- Validações -----

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10]);
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base: string, pesos: number[]) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj, p1);
  const d2 = calc(cnpj, p2);
  return d1 === parseInt(cnpj[12]) && d2 === parseInt(cnpj[13]);
}

export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

// ----- Holerite -----
// Validação apenas de UX: o servidor revalida extensão, tamanho e o MIME real
// (via finfo). HEIC/HEIF costumam chegar com type vazio ou octet-stream, por
// isso a checagem é pela extensão do nome do arquivo.

export const HOLERITE_TIPOS = ['PDF', 'JPG', 'JPEG', 'PNG', 'HEIC', 'HEIF'];
export const HOLERITE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const HOLERITE_EXT = /\.(pdf|jpe?g|png|heic|heif)$/i;

// Retorna uma mensagem de erro (string) ou null quando o arquivo é aceitável.
export function validarHolerite(file: File): string | null {
  if (!HOLERITE_EXT.test(file.name)) {
    return 'Formato não aceito. Envie PDF, JPG, JPEG, PNG, HEIC ou HEIF.';
  }
  if (file.size > HOLERITE_MAX_BYTES) {
    return 'Arquivo muito grande. O tamanho máximo é 10 MB.';
  }
  return null;
}
