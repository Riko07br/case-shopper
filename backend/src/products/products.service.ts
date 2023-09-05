import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Readable } from "stream";
import * as papa from "papaparse";

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) {}

    uploadFile(file: Express.Multer.File) {
        const stream = Readable.from(file.buffer);

        return new Promise((resolve, reject) => {
            papa.parse(stream, {
                header: false, // deixar false para examinar todas as linhas sem retornar erro no inicio
                delimiter: ",",
                worker: true,
                complete: function (results) {
                    resolve(results.data);
                },
                error(err) {
                    reject(err);
                },
            });
        });
    }

    async validadeFile(results: Array<Array<string | number>>) {
        // validar campos (headers)
        if (results[0][0] != "product_code" || results[0][1] != "new_price") {
            throw new HttpException(
                [
                    {
                        column: 0,
                        line: 0,
                        err: "Cabeçalho inválido, utilize 'product_code' e 'new_price' respectivamente",
                    },
                ],
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }

        let errorObj: { column: number; line: number; err?: string }[] = [];

        for (let i = 1; i < results.length; i++) {
            //caso o array nao esteja completo ou não tenha números
            if (results[i][0] == undefined || Number.isNaN(results[i][0])) {
                errorObj.push({
                    column: 0,
                    line: i,
                    err: "Código do produto não é um número válido",
                });
                continue;
            }

            if (results[i][1] == undefined || Number.isNaN(results[i][1])) {
                errorObj.push({
                    column: 1,
                    line: i,
                    err: "Preço do produto não é um número válido",
                });
                continue;
            }

            //o código precisa ser inteiro
            const productCode: number = Number(results[i][0]);
            if (!Number.isInteger(productCode)) {
                errorObj.push({
                    column: 0,
                    line: i,
                    err: "Código do produto precisa ser um número inteiro",
                });
                continue;
            }

            const newPrice: number = Number(results[i][1]);

            //procura no banco de dados
            const product = await this.prisma.products.findFirst({
                where: { code: productCode },
            });

            //caso o produto não exista
            if (!product) {
                errorObj.push({
                    column: 0,
                    line: i,
                    err: "Produto inexistente",
                });
                continue;
            }
            //Impede preços de venda menores que o custo
            const dbCostPrice: number = product.cost_price.toNumber();

            if (newPrice < dbCostPrice) {
                errorObj.push({
                    column: 1,
                    line: i,
                    err:
                        "Preço de venda R$ " +
                        newPrice.toFixed(2) +
                        " menor que o custo R$ " +
                        dbCostPrice.toFixed(2),
                });
                continue;
            }

            //Impede variações maior que 10% do valor salvo
            const dbSalesPrice: number = product.sales_price.toNumber();

            if (
                newPrice > dbSalesPrice * 1.1 ||
                newPrice < dbSalesPrice * 0.9
            ) {
                errorObj.push({
                    column: 1,
                    line: i,
                    err:
                        "Variação de preço maior que 10%, min: R$ " +
                        (dbSalesPrice * 0.9).toFixed(2) +
                        " max: R$ " +
                        (dbSalesPrice * 1.1).toFixed(2) +
                        " utilizado: R$ " +
                        newPrice.toFixed(2),
                });
                continue;
            }

            /*TODO: Estabeleceu-se a regra que, ao reajustar o preço de um pacote, o mesmo arquivo deve
             * conter os reajustes dos preços dos componentes do pacote de modo que o preço final da
             * soma dos componentes seja igual ao preço do pacote.
             * O preço de custo dos pacotes também deve ser atualizado como a soma dos
             * custos dos seus componentes
             */
        }

        if (errorObj.length > 0)
            throw new HttpException(errorObj, HttpStatus.UNPROCESSABLE_ENTITY);

        return results;
    }
}
