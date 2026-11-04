/** Two-digit zero padding: 7 → '07'. Used for day keys, section numbers and clock times. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');
