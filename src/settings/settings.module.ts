import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from 'src/genres/genre.entity';
import { Settings } from './settings.entity';
import { SettingsService } from './settings.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Settings])], // Initialize ScheduleModule,
    providers: [SettingsService],
    exports: [SettingsService]
})
export class SettingsModule { }
