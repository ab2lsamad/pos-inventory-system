import { Module } from '@nestjs/common';
import { CompensationController } from './compensation.controller';
import { CompensationService } from './compensation.service';

@Module({
  controllers: [CompensationController],
  providers: [CompensationService],
})
export class CompensationModule {}
