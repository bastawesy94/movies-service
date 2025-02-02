import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { MoviesService } from 'src/movies/movies.service';
import { Movie } from 'src/movies/movie.entity';
import { RedisService } from 'src/utils/redis.service';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SearchMovieDto } from 'src/dto/search-movie.dto';
import { RateMovieDto } from 'src/dto/rate-movie.dto';
import { AddToWatchlistDto } from 'src/dto/watch-list-dto';

dotenv.config({
    path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV}`),
});

const TMDB_API_KEY = process.env.THE_MOVIE_DB_API_KEY;
const TMDB_BASE_URL = process.env.THE_MOVIE_DB_URL;
const THE_MOVIE_DB_API_TOKEN = process.env.THE_MOVIE_DB_API_TOKEN;

jest.mock('axios');

describe('MoviesService', () => {
    let service: MoviesService;
    let movieRepository: Repository<Movie>;
    let dataSource: DataSource;
    let redisService: RedisService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MoviesService,
                {
                    provide: getRepositoryToken(Movie),
                    useValue: {
                        save: jest.fn(),
                        find: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn().mockReturnValue({
                            connect: jest.fn(),
                            startTransaction: jest.fn(),
                            commitTransaction: jest.fn(),
                            rollbackTransaction: jest.fn(),
                            release: jest.fn(),
                            manager: {
                                findOne: jest.fn(),
                                create: jest.fn(),
                                save: jest.fn(),
                            },
                        }),
                    },
                },
                {
                    provide: RedisService,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<MoviesService>(MoviesService);
        movieRepository = module.get<Repository<Movie>>(getRepositoryToken(Movie));
        dataSource = module.get<DataSource>(DataSource);
        redisService = module.get<RedisService>(RedisService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a movie with a generated ID', async () => {
            const movieData = { title: 'Test Movie', overview: 'Test Overview' };
            const savedMovie: any = { id: 123, ...movieData };

            jest.spyOn(movieRepository, 'save').mockResolvedValue(savedMovie);

            const result = await service.create(movieData);

            expect(movieRepository.save).toHaveBeenCalledWith(movieData);
            expect(result).toEqual(savedMovie);
        });
    });

    describe('findAll', () => {
        it('should return paginated movies', async () => {
            const movies: any = [{ id: 1, title: 'Movie 1' }, { id: 2, title: 'Movie 2' }];
            jest.spyOn(movieRepository, 'find').mockResolvedValue(movies);

            const result = await service.findAll(1, 10);

            expect(movieRepository.find).toHaveBeenCalledWith({
                relations: ['genres'],
                skip: 0,
                take: 10,
            });
            expect(result).toEqual(movies);
        });
    });

    describe('findOne', () => {
        it('should return a movie by ID', async () => {
            const movie:any = { id: 1, title: 'Test Movie' };
            jest.spyOn(movieRepository, 'findOne').mockResolvedValue(movie);

            const result = await service.findOne(1);

            expect(movieRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['genres'],
            });
            expect(result).toEqual(movie);
        });
    });

    describe('update', () => {
        it('should update a movie and return the updated entity', async () => {
            const movieData = { title: 'Updated Movie' };
            const updatedMovie: any = { id: 1, ...movieData };

            jest.spyOn(movieRepository, 'update').mockResolvedValue(undefined);
            jest.spyOn(service, 'findOne').mockResolvedValue(updatedMovie);

            const result = await service.update(1, movieData);

            expect(movieRepository.update).toHaveBeenCalledWith(1, movieData);
            expect(service.findOne).toHaveBeenCalledWith(1);
            expect(result).toEqual(updatedMovie);
        });
    });

    describe('delete', () => {
        it('should delete a movie', async () => {
            jest.spyOn(movieRepository, 'delete').mockResolvedValue(undefined);

            await service.delete(1);

            expect(movieRepository.delete).toHaveBeenCalledWith(1);
        });
    });

    describe('syncMoviesAndGenres', () => {
        it('should sync movies and genres from TMDb', async () => {
            const genreData = { genres: [{ id: 1, name: 'Action' }] };
            const movieData = { results: [{ id: 1, title: 'Movie 1', genre_ids: [1] }] };

            jest.spyOn(axios, 'get')
                .mockResolvedValueOnce({ data: genreData })
                .mockResolvedValueOnce({ data: movieData });

            const queryRunner = dataSource.createQueryRunner();
            jest.spyOn(queryRunner.manager, 'findOne').mockResolvedValue(null);
            jest.spyOn(queryRunner.manager, 'create').mockImplementation((entity, data) => data);
            jest.spyOn(queryRunner.manager, 'save').mockResolvedValue({});

            await service.syncMoviesAndGenres(1);

            expect(axios.get).toHaveBeenCalledWith(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
            expect(axios.get).toHaveBeenCalledWith(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=1`);
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
        });
    });

    describe('searchMovies', () => {
        it('should return cached data if available', async () => {
            const params: SearchMovieDto = { title: 'Test' };
            const cachedData = [{ id: 1, title: 'Cached Movie' }];

            jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(cachedData));

            const result = await service.searchMovies(params);

            expect(redisService.get).toHaveBeenCalledWith(`movies:${JSON.stringify(params)}`);
            expect(result).toEqual(cachedData);
        });

        it('should query the database and cache the result if no cached data is available', async () => {
            const params: SearchMovieDto = { title: 'Test' };
            const movies = [{ id: 1, title: 'Test Movie' }];

            jest.spyOn(redisService, 'get').mockResolvedValue(null);
            jest.spyOn(movieRepository, 'createQueryBuilder').mockReturnValue({
                andWhere: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(movies),
            } as any);

            const result = await service.searchMovies(params);

            expect(redisService.set).toHaveBeenCalledWith(
                `movies:${JSON.stringify(params)}`,
                movies,
                Number(process.env.REDIS_TTL),
            );
            expect(result).toEqual(movies);
        });
    });

    describe('rateMovie', () => {
        it('should submit a rating to TMDb', async () => {
            const dto: RateMovieDto = { rating: 8.5 };
            const response = { data: { success: true } };

            jest.spyOn(axios, 'post').mockResolvedValue(response);

            const result = await service.rateMovie(1, dto);

            expect(axios.post).toHaveBeenCalledWith(
                `${TMDB_BASE_URL}/movie/1/rating`,
                { value: dto.rating },
                {
                    headers: {
                        'Authorization': `Bearer ${THE_MOVIE_DB_API_TOKEN}`,
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json',
                    },
                },
            );
            expect(result).toEqual({ message: 'Rating submitted successfully', data: response.data });
        });
    });

    describe('addToWatchlist', () => {
        it('should add a movie to the watchlist on TMDb', async () => {
            const dto: AddToWatchlistDto = { watchlist: true };
            const response = { data: { success: true } };

            jest.spyOn(axios, 'post').mockResolvedValue(response);

            const result = await service.addToWatchlist(1, dto);

            expect(axios.post).toHaveBeenCalledWith(
                `${TMDB_BASE_URL}/account/${process.env.TMDB_ACCOUNT_ID}/watchlist`,
                {
                    media_type: 'movie',
                    media_id: 1,
                    watchlist: dto.watchlist,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${THE_MOVIE_DB_API_TOKEN}`,
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json',
                    },
                },
            );
            expect(result).toEqual({ message: 'Movie watchlist status updated successfully', data: response.data });
        });
    });
});