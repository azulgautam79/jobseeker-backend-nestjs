import { Module } from '@nestjs/common';
import { SavedJobsController } from './savedJobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedJob, SavedJobSchema } from './schemas/savedJob.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { SavedJobsService } from './savedJobs.service';
import { AppLoggerModule } from '../../common/logger/logger.module';
import { TraceModule } from '../../common/telemetry/tracing/trace.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedJob.name, schema: SavedJobSchema },
      { name: Job.name, schema: JobSchema },
    ]),
    AppLoggerModule,
    TraceModule
  ],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
})
export class SavedJobsModule {}
