import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DockerModule } from './docker/docker.module';
import { MinerModule } from './miner/miner.module';

@Module({
  imports: [DockerModule, MinerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
