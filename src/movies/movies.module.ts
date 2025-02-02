import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './movie.entity';
import { Genre } from 'src/genres/genre.entity';
import { RedisService } from 'src/utils/redis.service';

@Module({
    imports: [TypeOrmModule.forFeature([Movie, Genre])],
    controllers: [MoviesController],
    providers: [MoviesService, RedisService],
    exports: [MoviesService, RedisService]
})
export class MoviesModule { }
