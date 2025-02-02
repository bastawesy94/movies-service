import { Genre } from "src/genres/genre.entity";
import { Entity, Column, ManyToMany, JoinTable, PrimaryColumn } from "typeorm";

@Entity("movies")
export class Movie {
  @PrimaryColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  overview: string;

  @Column()
  release_date: string;

  @Column({ nullable: true })
  poster_path: string;

  @Column({ type: "float", default: 0 })
  vote_average: number;
  @ManyToMany(() => Genre, (genre) => genre.movies, { cascade: true })
  @JoinTable({
    name: "movie_genres",
    joinColumn: { name: "movie_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "genre_id", referencedColumnName: "id" },
  })
  genres: Genre[];
}