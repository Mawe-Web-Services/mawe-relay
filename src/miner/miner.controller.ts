import { Controller, Post, Body } from '@nestjs/common';
import MinerService from './miner.service';
import { IMinerResponse } from './interface/IMinerResponse';

@Controller('miner')
export class MinerController {
  constructor(private readonly minerService: MinerService) {}

  @Post()
  async deployImage(@Body() body: { query: string, dificulty:number }): Promise<IMinerResponse> {
    const { query, dificulty } = body;
    if (!query || !dificulty) {
      throw new Error('Image name is required');
    }

    try {
      const response = await this.minerService.sendHash({query: query, dificulty: dificulty});
      return response;
    } catch (error) {
      throw new Error(`Miner failed: ${error.message}`);
    }
  }
}
