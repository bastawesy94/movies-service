import { Controller, Get, Post, Body, Param, Put, Delete, Query, UsePipes } from "@nestjs/common";
import { MoviesService } from "./movies.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { JoiValidationPipe } from "src/pipes/joi-validation.pipe";
import { CreateMovieDto } from "src/dto/create-movie.dto";
import { Movie } from "./movie.entity";
import { createMovieSchema } from "src/dto/validation.schema";
import { SearchMovieDto } from "src/dto/search-movie.dto";
import { RateMovieDto } from "src/dto/rate-movie.dto";
import { AddToWatchlistDto } from "src/dto/watch-list-dto";

@ApiTags("Movies")
@Controller("movies")
export class MoviesController {
    constructor(private readonly moviesService: MoviesService) { }

    @ApiOperation({ summary: "Create a new movie" })
    @ApiResponse({ status: 201, description: "The movie has been successfully created." })
    @ApiResponse({ status: 400, description: "Bad request." })
    @Post()
    @UsePipes(new JoiValidationPipe(createMovieSchema))
    async create(@Body() createMovieDto: CreateMovieDto): Promise<Movie> {
        return this.moviesService.create(createMovieDto);
    }

    @ApiOperation({ summary: "Get all movies (paginated)" })
    @ApiResponse({ status: 200, description: "Returns a paginated list of movies." })
    @Get()
    async findAll(
        @Query("page") page = 1,
        @Query("limit") limit = 10
    ): Promise<Movie[]> {
        return this.moviesService.findAll(page, limit);
    }

    @ApiOperation({ summary: "Get a single movie by ID" })
    @ApiResponse({ status: 200, description: "Returns a movie by ID." })
    @ApiResponse({ status: 404, description: "Movie not found." })
    @Get(":id")
    async findOne(@Param("id") id: number): Promise<Movie> {
        return this.moviesService.findOne(id);
    }

    @ApiOperation({ summary: "Update a movie by ID" })
    @ApiResponse({ status: 200, description: "The movie has been successfully updated." })
    @ApiResponse({ status: 404, description: "Movie not found." })
    @Put(":id")
    async update(@Param("id") id: number, @Body() updateMovieDto: CreateMovieDto): Promise<Movie> {
        return this.moviesService.update(id, updateMovieDto);
    }

    @ApiOperation({ summary: "Delete a movie by ID" })
    @ApiResponse({ status: 204, description: "The movie has been successfully deleted." })
    @ApiResponse({ status: 404, description: "Movie not found." })
    @Delete(":id")
    async delete(@Param("id") id: number): Promise<void> {
        return this.moviesService.delete(id);
    }

    @ApiOperation({ summary: "Sync movies from TMDB (paginated)" })
    @ApiResponse({ status: 200, description: "Movies successfully synced!" })
    @Post('movies')
    async syncMovies(@Query("page") pages = 5) {
        await this.moviesService.syncMoviesAndGenres(pages);
        return { message: 'Movies and genres synced successfully' };
    }

    @Post('search')
    @ApiBody({ type: SearchMovieDto })
    async searchMovies(@Body() searchParams: SearchMovieDto) {
        return this.moviesService.searchMovies(searchParams);
    }

    @Post(':movieId/rate')
    async rateMovie(
        @Param('movieId') movieId: number,
        @Body() dto: RateMovieDto,
    ) {
        return this.moviesService.rateMovie(movieId, dto);
    }

    @Post(':movieId/watchlist')
    async addToWatchlist(
        @Param('movieId') movieId: number,
        @Body() dto: AddToWatchlistDto,
    ) {
        return this.moviesService.addToWatchlist(movieId, dto);
    }
}
