import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as moment from 'moment';
import * as cron from 'node-cron';  // For scheduling the cron job
import { Movie } from 'src/movies/movie.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class SettingsService implements OnModuleInit {

    constructor(private dataSource: DataSource) { }

    private TMDB_API_KEY = 'd1d1c88bb254cd56008110e5e861a296';
    private TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    async onModuleInit() {
        // Schedule the cron job to run every day at midnight
        cron.schedule('0 0 * * *', async () => {
            console.log('Cron job triggered for movie sync!');
            try {
                const lastSynced = await this.getLastSyncedDate(); // Fetch the last sync date from DB
                const updatedMovies = await this.fetchUpdatedMovies(lastSynced);
                console.log("*** updatedMovies ------>", updatedMovies)
                // Apply updates to local DB
                await this.applyMovieUpdates(updatedMovies);

                // Update the last synced date
                await this.setLastSyncDate(new Date());

            } catch (error) {
                console.error('Error during cron job execution:', error);
            }
        });
    }

    private async getLastSyncedDate(): Promise<Date> {
        // Fetch last synced date from the database
        const result: any = await this.dataSource.manager.findOne('settings', {
            where: { key: 'last_fetched_at' },
        });

        return result ? new Date(result.value) : new Date(0); // Return a default date if no record found
    }

    private async fetchUpdatedMovies(lastSynced: Date | null) {
        let startDate: string;

        // Use Moment.js to validate and format lastSynced date
        if (!lastSynced || !moment(lastSynced).isValid()) {
            // If valid, format it to YYYY-MM-DD
            startDate = moment(lastSynced).format('YYYY-MM-DD');
        } else {
            // Fallback to a default date if lastSynced is invalid or null
            startDate = '2012-10-05'; // Use a fallback date
        }

        console.log("Fetching updated movies since start_date --->", startDate);

        try {
            // Fetch updated movies from TMDb API with the correctly formatted start_date
            const { data } = await axios.get(
                `${this.TMDB_BASE_URL}/movie/changes?api_key=${this.TMDB_API_KEY}&start_date=${startDate}`
            );

            console.log(`Fetched updated movies after ${startDate}`);
            return data.results; // List of updated movies
        } catch (error) {
            console.error("Error fetching updated movies:", error);
            throw new Error("Failed to fetch updated movies");
        }
    }

    private async applyMovieUpdates(updatedMovies: any[]) {
        for (const movie of updatedMovies) {
            const movieEntity = await this.dataSource.manager.findOne(Movie, { where: { id: movie.id } });

            // If movie doesn't exist, create a new movie entity
            if (!movieEntity) {
                const newMovie = this.dataSource.manager.create(Movie, {
                    id: movie.id,
                    title: movie.title || 'Untitled Movie', // Ensure a default title if missing
                    overview: movie.overview || 'No overview available', // Default value if no overview
                    release_date: movie.release_date || '1970-01-01', // Default value if no release date
                    poster_path: movie.poster_path || '', // Default empty string if no poster path
                    vote_average: movie.vote_average || 0, // Default 0 if no vote average
                });

                await this.dataSource.manager.save(Movie, newMovie);
            } else {
                // Update movie if it already exists
                movieEntity.title = movie.title || 'Untitled Movie';
                movieEntity.overview = movie.overview || 'No overview available';
                movieEntity.release_date = movie.release_date || '1970-01-01';
                movieEntity.poster_path = movie.poster_path || '';
                movieEntity.vote_average = movie.vote_average || 0;

                await this.dataSource.manager.save(Movie, movieEntity);
            }
        }
    }

    private async setLastSyncDate(date: Date) {
        // Provide the 'key' as the conflictPathsOrOptions to specify the conflict condition
        await this.dataSource.manager.upsert('settings', {
            where: { key: 'last_fetched_at' },
            values: { key: 'last_fetched_at', value: date.toISOString() },
        }, ['key']);  // Here, 'key' is the field used to check for conflicts
    }
}
