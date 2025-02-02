import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMovieDto {
    @ApiPropertyOptional({ example: 'Inception', description: 'Search by movie title (optional)' })
    title?: string;

    @ApiPropertyOptional({ example: 'Sci-Fi', description: 'Search by genre name (optional)' })
    genre?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number for pagination (default: 1)' })
    page?: number;

    @ApiPropertyOptional({ example: 10, description: 'Number of items per page (default: 10)' })
    limit?: number;
}
