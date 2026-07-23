import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas/job.schema';
import {
  Application,
  ApplicationSchema,
} from '../applications/schemas/application.schema';
import { SavedJob, SavedJobSchema } from '../savedJobs/schemas/savedJob.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RedisModule } from '../redis/redis.module';
import { JobCacheService } from './job-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: SavedJob.name, schema: SavedJobSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RedisModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobCacheService],
})
export class JobsModule {}
