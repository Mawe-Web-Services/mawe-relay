import { Controller, Post, Body } from '@nestjs/common';
import DockerService from './docker.service';
import { IDeployResponse } from './interfaces/IDeployResponse';
import { IHibernateResponse } from './interfaces/IHibernateResponse';

@Controller('docker')
export class DockerController {
  constructor(private readonly dockerService: DockerService) {}

  @Post('deploy')
  async deployImage(@Body() body: { 
    imageName: string, 
    repository:string, 
  }): Promise<IDeployResponse> {
    const { imageName, repository } = body;

    if (!imageName || !repository) {
      throw new Error('ImageName, repository propertie is required');
    }



    try {
      const response = await this.dockerService.deploy({image: imageName, repository: repository});
      return response;
    } catch (error) {
      console.error('Error deploying image:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  @Post('hibernate')
  async hibernateService(@Body() body: { 
    imageId: string, 
  }): Promise<IHibernateResponse> {
    const { imageId} = body;



    try {
      const response = await this.dockerService.hibernate({imageId: imageId});
      console.log(imageId);
      return response;
    } catch (error) {
      console.error('Error deploying image:', error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}
