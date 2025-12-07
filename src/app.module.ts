import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentModule } from './document/document.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DocumentModule,
  ],
})
export class AppModule {}
