import {
    Body,
    Controller,
    Post,
    Req,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateProductDto } from "./dto";

@Controller("products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    // Upload do CSV
    @Post("upload")
    @UseInterceptors(FileInterceptor("csv_file"))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        let results;

        try {
            // Realiza o parse do CSV
            results = await this.productsService.uploadFile(file);
        } catch (err) {
            return this.productsService.throwError(err);
        }

        // Faz a validacao dos dados
        return await this.productsService.validadeFile(
            results as Array<Array<string | number>>
        );
    }

    // Atualiza os registros
    @Post("update")
    async updateProducts(@Body() dto: Array<UpdateProductDto>) {
        return await this.productsService.updateProducts(dto);
    }
}
