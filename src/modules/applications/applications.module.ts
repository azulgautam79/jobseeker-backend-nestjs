import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { MailModule } from '../mail/mail.module';
import { AppLoggerModule } from '../../common/logger/logger.module';
import { TraceModule } from '../../common/telemetry/tracing/trace.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
    ]),
    MailModule,
    AppLoggerModule,
    TraceModule
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
