import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Readable } from "stream";
import * as papa from "papaparse";
import { ValidateProductDto, UpdateProductDto } from "./dto";

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
            const exep: ValidateProductDto = {
                code: -1,
                err: "Cabeçalho inválido, utilize 'product_code' e 'new_price' respectivamente",
            };
            throw new HttpException([exep], HttpStatus.UNPROCESSABLE_ENTITY);
        }

        let response: ValidateProductDto[] = [];
        let hasErrors: boolean = false;

        for (let i = 1; i < results.length; i++) {
            let currentProduct: ValidateProductDto = new ValidateProductDto();
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

            const productsInPack: Array<parsedPack> = this.parsePacks(
                product.packs_packs_product_idToproducts
            );
            const packsWithProduct: Array<parsedPack> = this.parsePacks(
                product.packs_packs_pack_idToproducts
            );

            // Considerando que se trata de um pack, valida por meio dos PRODUTOS presentes------------
            if (productsInPack.length > 0) {
                let hasErrorProd: boolean = false;
                let missingPacks: string = "";

                for (let j = 0; j < productsInPack.length; j++) {
                    const pack = productsInPack[j];

                    const packFound = response.find(
                        (v) => v.code == pack.pack_id
                    );

                    if (!packFound) {
                        hasErrorProd = true;
                        missingPacks += pack.pack_id.toString() + " ";
                    }
                }

                // Caso não tenha todos os produtos do pack
                if (hasErrorProd) {
                    response[i].err +=
                        "PACKS não presentes no arquivo: " + missingPacks;
                    hasErrors = true;
                    continue;
                }
            }

            // Considerando que se trata de um pack, valida por meio dos PACKS presentes=================
            if (packsWithProduct.length > 0) {
                let hasErrorPack: boolean = false;
                let missingProds: string = "";
                let prodTotal: number = 0;

                for (let j = 0; j < packsWithProduct.length; j++) {
                    const pack = packsWithProduct[j];

                    const productFound = response.find(
                        (v) => v.code == pack.product_id
                    );

                    if (!productFound) {
                        hasErrorPack = true;
                        missingProds += pack.product_id.toString() + " ";
                        continue;
                    }

                    prodTotal += productFound.newPrice * pack.qty;
                }

                if (hasErrorPack) {
                    response[i].err =
                        "PRODUTOS não presentes no arquivo: " + missingProds;
                    hasErrors = true;
                    continue;
                }

                const packTotal = response.find(
                    (p) => packsWithProduct[0].pack_id == p.code
                );

                if (!this.isEqual(prodTotal, packTotal.newPrice)) {
                    response[i].err =
                        "Soma pack: " +
                        this.parseToPrice(prodTotal) +
                        " Valor no arquivo: " +
                        this.parseToPrice(packTotal.newPrice);
                    hasErrors = true;
                }
            }
        }

        if (hasErrors)
            throw new HttpException(response, HttpStatus.UNPROCESSABLE_ENTITY);

        return response;
    }

    async updateProducts(updateProductDtos: Array<UpdateProductDto>) {
        for (let i = 0; i < updateProductDtos.length; i++) {
            await this.prisma.products.update({
                where: { code: updateProductDtos[i].code },
                data: {
                    sales_price: updateProductDtos[i].newPrice,
                },
            });
        }

        return HttpStatus.ACCEPTED;
    }

    // Converte os packs do prisma em objecto utilizavel
    parsePacks(prismaPack: Array<any>): Array<parsedPack> {
        let parsed: parsedPack[] = [];

        for (let i = 0; i < prismaPack.length; i++) {
            const el = prismaPack[i];
            parsed.push({
                id: Number(el.id),
                pack_id: Number(el.pack_id),
                product_id: Number(el.product_id),
                qty: Number(el.qty),
            });
        }
        return parsed;
    }

    parseToPrice(val: number): string {
        return "R$ " + val.toFixed(2);
    }
    isEqual(val1: number, val2: number): boolean {
        return Math.abs(val1 - val2) < 0.001;
    }
}

interface parsedPack {
    id: number;
    pack_id: number;
    product_id: number;
    qty: number;
}
