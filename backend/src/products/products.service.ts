import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Readable } from "stream";
import * as papa from "papaparse";
import { Product } from "./dto";

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
            const exep: Product = {
                code: -1,
                err: "Cabeçalho inválido, utilize 'product_code' e 'new_price' respectivamente",
            };
            throw new HttpException([exep], HttpStatus.UNPROCESSABLE_ENTITY);
        }

        let response: Product[] = [];
        let hasErrors: boolean = false;

        for (let i = 1; i < results.length; i++) {
            let currentProduct: Product = new Product();
            currentProduct.csvLine = i;

            //caso o array nao esteja completo ou não tenha números
            if (results[i][0] == undefined || Number.isNaN(results[i][0])) {
                currentProduct.err = "Código do produto não é um número válido";
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            if (results[i][1] == undefined || Number.isNaN(results[i][1])) {
                currentProduct.err = "Preço do produto não é um número válido";
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            const newPrice: number = Number(results[i][1]);
            currentProduct.newPrice = newPrice;

            //o código precisa ser inteiro
            const productCode: number = Number(results[i][0]);
            if (!Number.isInteger(productCode)) {
                currentProduct.err =
                    "Código do produto precisa ser um número inteiro";
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            currentProduct.code = productCode;

            //procura no banco de dados
            const product = await this.prisma.products.findFirst({
                where: { code: productCode },
            });

            //caso o produto não exista
            if (!product) {
                currentProduct.err = "Produto inexistente";
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            const dbCostPrice: number = product.cost_price.toNumber();
            const dbSalesPrice: number = product.sales_price.toNumber();
            currentProduct.oldPrice = dbSalesPrice;
            currentProduct.name = product.name;

            //Impede preços de venda menores que o custo
            if (newPrice < dbCostPrice) {
                currentProduct.err =
                    "Preço de venda R$ " +
                    newPrice.toFixed(2) +
                    " menor que o custo R$ " +
                    dbCostPrice.toFixed(2);
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            //Impede variações maiores que 10% do valor salvo
            if (
                newPrice > dbSalesPrice * 1.1 ||
                newPrice < dbSalesPrice * 0.9
            ) {
                currentProduct.err =
                    "Variação de preço maior que 10%, min: R$ " +
                    (dbSalesPrice * 0.9).toFixed(2) +
                    " max: R$ " +
                    (dbSalesPrice * 1.1).toFixed(2) +
                    " utilizado: R$ " +
                    newPrice.toFixed(2);
                hasErrors = true;

                response.push(currentProduct);
                continue;
            }

            response.push(currentProduct);
        }

        // Validação de packs e produtos
        for (let i = 0; i < response.length; i++) {
            // Pula esse produto se já houver erro
            if (response[i].err !== "") continue;

            const product = await this.prisma.products.findFirst({
                where: { code: response[i].code },
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
                        !response.find(
                            (v) =>
                                v.code === Number(productsInPack[j].product_id)
                        )
                    ) {
                        hasAllProductsInPack = false;
                        missingProductsIds +=
                            productsInPack[j].product_id.toString() + " ";
                    }
                }

                if (!hasAllProductsInPack) {
                    response[i].err =
                        "Pack de produtos incompleto, IDs de produto não presentes no arquivo: " +
                        missingProductsIds;
                    hasErrors = true;
                }
            }

            if (packsWithProduct.length > 0) {
                let hasAllPacks: boolean = true;
                let missingPacksIds: string = "";

                for (let j = 0; j < packsWithProduct.length; j++) {
                    if (
                        !response.find(
                            (v) =>
                                v.code === Number(packsWithProduct[j].pack_id)
                        )
                    ) {
                        hasAllPacks = false;
                        missingPacksIds +=
                            packsWithProduct[j].pack_id.toString() + " ";
                    }
                }

                if (!hasAllPacks) {
                    response[i].err =
                        "O produto está presente em mais packs, IDs de pack não presentes no arquivo: " +
                        missingPacksIds;
                    hasErrors = true;
                }
            }
        }

        if (hasErrors)
            throw new HttpException(response, HttpStatus.UNPROCESSABLE_ENTITY);

        return response;
    }
}
