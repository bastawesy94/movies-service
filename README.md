Movies Service
Overview
This project provides an API for managing movies, including rating movies, adding them to a watchlist, and retrieving movie details. It utilizes PostgreSQL as the database, Redis for caching, and Adminer for database management.

Services
1. API Service (api)
Description: The main API service for handling movie-related operations.
Build Context: Root directory (.)
Exposed Ports: 8080:8080
Depends on: postgres
2. Database (postgres)
Description: PostgreSQL database for storing movie data.
Build Context: ./postgres
Exposed Ports: 5432:5432
Environment Variables:
POSTGRES_DB: movies_db
POSTGRES_USER: admin
POSTGRES_PASSWORD: <secure-password>
Persistent Storage: Data is stored in the postgres-data volume.
3. Adminer (adminer)
Description: Web-based database management tool for PostgreSQL.
Build Context: ./adminer
Exposed Ports: 8000:8000
Depends on: postgres
4. Redis (redis)
Description: In-memory data store used for caching API responses.
Build Context: ./redis
Exposed Ports: 6379:6379
Getting Started
Prerequisites
Docker & Docker Compose installed
Running the Services
```bash
docker-compose up --build
```
Stopping the Services
```bash
docker-compose down
```

Environment Variables
Configure API and database settings inside a .env file.
API Endpoints
Rate a Movie: POST /movies/:id/rate
Add to Watchlist: POST /movies/:id/watchlist
Search Movies: POST /movies/search