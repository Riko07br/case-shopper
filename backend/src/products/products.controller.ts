import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    //upar o ar
    @Post("upload")
    @UseInterceptors(FileInterceptor("csv_file"))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        //return "test";
        const results = await this.productsService.uploadFile(file);
        //return results;
        return await this.productsService.validadeFile(
            results as Array<Array<string | number>>
        );
    }
}
