/**
 * Validadores de datos peruanos.
 */

/**
 * Valida un RUC peruano de 11 dígitos con su dígito verificador (módulo 11).
 * Prefijos válidos: 10 (persona natural), 15, 17, 20 (persona jurídica).
 */
export function validarRuc(ruc: string): boolean {
  if (!/^\d{11}$/.test(ruc)) {
    return false;
  }
  const prefijo = ruc.slice(0, 2);
  if (!["10", "15", "17", "20"].includes(prefijo)) {
    return false;
  }
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < factores.length; i++) {
    suma = suma + Number(ruc[i]) * factores[i];
  }
  const resto = 11 - (suma % 11);
  const digito = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return digito === Number(ruc[10]);
}

/** Completa un RUC de 10 dígitos con su dígito verificador (útil para la semilla). */
export function completarRuc(base10: string): string {
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < factores.length; i++) {
    suma = suma + Number(base10[i]) * factores[i];
  }
  const resto = 11 - (suma % 11);
  const digito = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return `${base10}${digito}`;
}

/** Distritos de Lima Metropolitana atendidos. */
export const DISTRITOS_LIMA = [
  "San Isidro", "Miraflores", "Santiago de Surco", "San Borja", "La Molina", "Barranco",
  "Jesús María", "Lince", "Magdalena del Mar", "Pueblo Libre", "San Miguel", "Surquillo",
  "Cercado de Lima", "La Victoria", "Breña", "Chorrillos", "Los Olivos", "San Martín de Porres",
  "Independencia", "Comas", "Ate", "Santa Anita", "San Juan de Lurigancho", "Callao",
] as const;
