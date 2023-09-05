import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { ProductsModule } from "./products/products.module";
import { MulterModule } from "@nestjs/platform-express";

@Module({
    imports: [
        PrismaModule,
        ConfigModule.forRoot({ isGlobal: true }),
        ProductsModule,
        MulterModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
