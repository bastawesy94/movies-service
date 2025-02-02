import { IsNumber, Min, Max } from 'class-validator';

export class RateMovieDto {
    @Min(0)
    @Max(10)
    rating: number;
}
