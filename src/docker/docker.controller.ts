import { Controller, Post, Body } from '@nestjs/common';
import DockerService from './docker.service';
import { IDeployResponse } from './interfaces/IDeployResponse';

@Controller('docker')
export class DockerController {
  constructor(private readonly dockerService: DockerService) {}

  @Post('deploy')
  async deployImage(@Body() body: { imageName: string, repository:string }): Promise<IDeployResponse> {
    const { imageName, repository } = body;
    if (!imageName) {
      throw new Error('Image name is required');
    }

    try {
      const response = await this.dockerService.deploy({image: imageName, repository: repository});
      return response;
    } catch (error) {
      console.error('Error deploying image:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}
