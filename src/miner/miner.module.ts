import { Module } from '@nestjs/common';
import MinerService from './miner.service';
import { MinerController } from './miner.controller';

@Module({
  imports: [],
  controllers: [MinerController],
  providers: [MinerService],
})
export class MinerModule {}