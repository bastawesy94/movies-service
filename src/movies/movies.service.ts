import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import axios from "axios";
import { Movie } from "./movie.entity";
import { Genre } from "src/genres/genre.entity";
import { RedisService } from "src/utils/redis.service";
import { SearchMovieDto } from "src/dto/search-movie.dto";
import { RateMovieDto } from "src/dto/rate-movie.dto";
import { AddToWatchlistDto } from "src/dto/watch-list-dto";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
    path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV}`),
});

const TMDB_API_KEY = process.env.THE_MOVIE_DB_API_KEY;
const TMDB_BASE_URL = process.env.THE_MOVIE_DB_URL;
const THE_MOVIE_DB_API_TOKEN = process.env.THE_MOVIE_DB_API_TOKEN;

@Injectable()
export class MoviesService {

    constructor(
        private readonly redisService: RedisService,
        @InjectRepository(Movie) private movieRepository: Repository<Movie>,
        @InjectDataSource()
        private dataSource: DataSource

    ) { }

    async create(movieData): Promise<Movie> {
        const id = this.generateRandomId();
        movieData.id = id;
        return await this.movieRepository.save(movieData);
    }

    async findAll(page = 1, limit = 10): Promise<Movie[]> {
        return await this.movieRepository.find({
            relations: ["genres"],
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    async findOne(id: number): Promise<Movie> {
        return await this.movieRepository.findOne({ where: { id }, relations: ["genres"] });
    }

    async update(id: number, movieData): Promise<Movie> {
        await this.movieRepository.update(id, movieData);
        return this.findOne(id);
    }

    async delete(id: number): Promise<void> {
        await this.movieRepository.delete(id);
    }
    async syncMoviesAndGenres(pages: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Fetch genres from TMDb
            const { data: genreData } = await axios.get(
                `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`,
            );

            // Save genres to the database
            const genreMap = new Map<number, Genre>();
            console.log("Genres from API:", genreData.genres);
            for (const genre of genreData.genres) {
                let genreEntity = await queryRunner.manager.findOne(Genre, { where: { id: genre.id } });

                if (!genreEntity) {
                    genreEntity = queryRunner.manager.create(Genre, {
                        id: genre.id,
                        name: genre.name,
                    });

                    await queryRunner.manager.save(Genre, genreEntity);
                }
                genreMap.set(genre.id, genreEntity);
            }

            // Fetch popular movies
            for (let i = 1; i <= pages; i++) {
                const { data } = await axios.get(
                    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${i}`,
                );

                for (const movie of data.results) {
                    let movieEntity = await queryRunner.manager.findOne(Movie, { where: { id: movie.id } });

                    if (!movieEntity) {
                        movieEntity = queryRunner.manager.create(Movie, {
                            id: movie.id,
                            title: movie.title || "Untitled Movie",
                            overview: movie.overview,
                            release_date: movie.release_date,
                            poster_path: movie.poster_path,
                            vote_average: movie.vote_average,
                        });

                        await queryRunner.manager.save(Movie, movieEntity);
                    }

                    // Assign genres after ensuring both entities exist
                    if (movie.genre_ids?.length) {
                        movieEntity.genres = movie.genre_ids
                            .map((genreId: number) => genreMap.get(genreId))
                            .filter((genre) => genre !== undefined) as Genre[];

                        await queryRunner.manager.save(Movie, movieEntity);
                    }
                }
            }

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error syncing movies and genres:", error);
        } finally {
            await queryRunner.release();
        }
    }
    generateRandomId(): number {
        return Math.floor(Math.random() * 1000000);
    }

    async searchMovies(params: SearchMovieDto) {
        const cacheKey = `movies:${JSON.stringify(params)}`;
        const cachedData = await this.redisService.get(cacheKey);

        if (cachedData) {
            console.log('Returning cached data');
            return JSON.parse(cachedData);
        }

        const query = this.movieRepository.createQueryBuilder('movie');

        if (params.title) {
            query.andWhere('movie.title ILIKE :title', { title: `%${params.title}%` });
        }

        if (params.genre) {
            query.innerJoin('movie.genres', 'genre').andWhere('genre.name = :genre', { genre: params.genre });
        }

        const page = params.page || 1;
        const limit = params.limit || 10;
        const movies = await query.skip((page - 1) * limit).take(limit).getMany();

        await this.redisService.set(cacheKey, movies, Number(process.env.REDIS_TTL));

        return movies;
    }

    async rateMovie(movieId: number, dto: RateMovieDto) {
        try {
            const response = await axios.post(
                `${TMDB_BASE_URL}/movie/${movieId}/rating`,
                { value: dto.rating },
                {
                    headers: {
                        'Authorization': `Bearer ${THE_MOVIE_DB_API_TOKEN}`,
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json',
                    }
                }
            );

            return { message: 'Rating submitted successfully', data: response.data };
        } catch (error) {
            console.error('Error submitting rating:', error.response?.data || error.message);
            throw new Error('Failed to submit rating');
        }
    }

    async addToWatchlist(movieId: number, dto: AddToWatchlistDto) {
        try {
            const response = await axios.post(
                `${TMDB_BASE_URL}/account/${process.env.TMDB_ACCOUNT_ID}/watchlist`,
                {
                    media_type: 'movie',
                    media_id: movieId,
                    watchlist: dto.watchlist,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${THE_MOVIE_DB_API_TOKEN}`,
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json',
                    }
                }
            );

            return { message: 'Movie watchlist status updated successfully', data: response.data };
        } catch (error) {
            console.error('Error adding to watchlist:', error.response?.data || error.message);
            throw new Error('Failed to update watchlist status');
        }
    }
}
