import { IsBoolean } from 'class-validator';

export class AddToWatchlistDto {
    @IsBoolean()
    watchlist: boolean;
}
