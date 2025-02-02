import { IsString, IsOptional, IsDateString, IsArray, IsNumber } from "class-validator";

export class CreateMovieDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsDateString()
  release_date: string;

  @IsOptional()
  @IsString()
  poster_path?: string;

  @IsOptional()
  @IsNumber()
  vote_average?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  genres?: number[];
}
