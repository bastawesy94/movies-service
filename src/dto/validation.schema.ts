import * as Joi from "joi";

export const createMovieSchema = Joi.object({
  title: Joi.string().min(1).required(),
  overview: Joi.string().optional(),
  release_date: Joi.string().isoDate().required(),
  poster_path: Joi.string().optional(),
  vote_average: Joi.number().min(0).max(10).optional(),
  genres: Joi.array().items(Joi.number()).optional(),
});
