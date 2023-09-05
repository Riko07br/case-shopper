import { Injectable } from "@nestjs/common";
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
                    //this.validadeFile(results);
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
        }

        let errorObj: { column: number; line: number; err?: string }[] = [];

        // Os códigos de produtos informados existem?
        for (let i = 1; i < results.length; i++) {
            for (let j = 0; j < 2; j++) {
                //caso o array nao esteja completo
                if (results[i][j] == undefined) {
                    errorObj.push({ column: j, line: i, err: "Posição vazia" });
                    continue;
                }
                const productCode: number = Number(results[i][0]);
                const product = await this.prisma.products.findFirst({
                    where: { code: productCode },
                });

                if (!product) {
                    errorObj.push({
                        column: j,
                        line: i,
                        err: "Produto inexistente",
                    });
                }
            }
        }
        console.log(errorObj);
        //Os preços estão preenchidos e são valores numéricos validos?

        //O arquivo respeita as regras levantadas na seção CENARIO?

        return results;
    }
}
