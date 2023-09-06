// Objeto a ser devolvido em caso de erro em alguma celula
export class ValidationErrorDto {
    cel: { row: number; col: number };
    desc?: string;
}
