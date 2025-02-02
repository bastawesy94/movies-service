import { Movie } from "src/movies/movie.entity";
import { Entity, Column, ManyToMany, PrimaryColumn } from "typeorm";

@Entity("genres")
export class Genre {
    @PrimaryColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @ManyToMany(() => Movie, (movie) => movie.genres)
    movies: Movie[];
}