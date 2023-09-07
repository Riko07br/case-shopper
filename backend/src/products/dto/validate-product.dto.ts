export class ValidateProductDto {
    code?: number = -1;
    name?: string = "";
    oldPrice?: number = 0;
    newPrice?: number = 0;
    err?: string = "";
    csvLine?: number = 1;
}
