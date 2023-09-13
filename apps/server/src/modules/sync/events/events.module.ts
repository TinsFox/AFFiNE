import { Module } from '@nestjs/common';

import { DocModule } from '../../doc';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [DocModule.forFeature()],
  providers: [EventsGateway],
})
export class EventsModule {}
