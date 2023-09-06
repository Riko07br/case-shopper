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

        let validObjs: { line: number; productId: number }[] = [];
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

            validObjs.push({ line: i, productId: productCode });
        }

        // Validação de packs e produtos
        for (let i = 0; i < validObjs.length; i++) {
            const product = await this.prisma.products.findFirst({
                where: { code: validObjs[i].productId },
                include: {
                    packs_packs_pack_idToproducts: true, //produtos que fazem parte do pack
                    packs_packs_product_idToproducts: true, //packs que tem o produto dentro
                },
            });

            const productsInPack = product.packs_packs_pack_idToproducts;
            const packsWithProduct = product.packs_packs_product_idToproducts;

            // Considerando que se trata de um pack, valida se todos os produtos estão presentes
            if (productsInPack.length > 0) {
                let hasAllProductsInPack: boolean = true;
                let missingProductsIds: string = "";

                for (let j = 0; j < productsInPack.length; j++) {
                    if (
                        validObjs.find(
                            (v) =>
                                v.productId ===
                                Number(productsInPack[j].product_id)
                        ) == undefined
                    ) {
                        hasAllProductsInPack = false;
                        missingProductsIds +=
                            productsInPack[j].product_id.toString() + " ";
                    }
                }

                if (!hasAllProductsInPack) {
                    errorObj.push({
                        column: 0,
                        line: validObjs[i].line,
                        err:
                            "Pack de produtos incompleto, IDs de produto não presentes no arquivo: " +
                            missingProductsIds,
                    });
                }
            }

            if (packsWithProduct.length > 0) {
                let hasAllPacks: boolean = true;
                let missingPacksIds: string = "";

                for (let j = 0; j < packsWithProduct.length; j++) {
                    if (
                        validObjs.find(
                            (v) =>
                                v.productId ===
                                Number(packsWithProduct[j].pack_id)
                        ) == undefined
                    ) {
                        hasAllPacks = false;
                        missingPacksIds +=
                            packsWithProduct[j].pack_id.toString() + " ";
                    }
                }

                if (!hasAllPacks) {
                    errorObj.push({
                        column: 0,
                        line: validObjs[i].line,
                        err:
                            "O produto está presente em mais packs, IDs de pack não presentes no arquivo: " +
                            missingPacksIds,
                    });
                }
            }
        }

        if (errorObj.length > 0)
            throw new HttpException(errorObj, HttpStatus.UNPROCESSABLE_ENTITY);

        //TODO: formatar resposta com todos os campos

        return results;
    }
}
