import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from './movies/movies.module';
import { GenresModule } from './genres/genres.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { SettingsModule } from './settings/settings.module';
import { RedisService } from './utils/redis.service';

dotenv.config({
  path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV}`),
});

console.log("############ DB URL:", process.env.DATABASE_URL);
@Module({
  imports: [
    MoviesModule,
    GenresModule,
    SettingsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],

})
export class AppModule { }
