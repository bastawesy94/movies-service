import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { default as Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: Number(process.env.REDIS_PORT) || 6379,
        });

        this.client.on('error', (err) => console.error('Redis Error:', err));
    }

    async onModuleInit() {
        console.log('Redis connected');
    }

    async onModuleDestroy() {
        await this.client.quit();
        console.log('Redis disconnected');
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: any, ttl: number = 600): Promise<void> {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}
