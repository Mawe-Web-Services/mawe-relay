import * as Docker from "dockerode";
import { exec, spawn } from "child_process";
import { platform } from "os";
import { v4 as uuidv4 } from 'uuid';
import { IHibernateResponse } from "./interfaces/IHibernateResponse";
import { IActivateResponse } from "./interfaces/IActivateResponse";

class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async deploy({ image, repository }: { image: string; repository: string}) {
    const applicationId = uuidv4();
    const imageId = await this.getImage({ image, repository });

    let PORT = 1024;
    let IS_PORT_IN_USE = true; 
    let LIMIT_PORT = 49151;

    while (IS_PORT_IN_USE && PORT <= LIMIT_PORT) {
        IS_PORT_IN_USE = await this.isPortInUse(PORT);
        if (!IS_PORT_IN_USE) {
            break;
        }
        PORT++; 
    }

    if (PORT <= LIMIT_PORT) {
        await this.executeDockerContainer({ image, repository, port: PORT });
        const tunnelUrl = await this.createTunnel(PORT);
        return { tunnelUrl: tunnelUrl, applicationId: applicationId, imageId:imageId};
    } else {
        console.log(`Nenhuma porta disponível encontrada entre 1024 e ${LIMIT_PORT}.`);
    }
}

  async getImage({image,repository}:{image:string,repository:string}){
    const imageAPI = this.docker.getImage(`${repository}/${image}`);
    const imageExists = await imageAPI.inspect().catch(() => false);

    if (!imageExists) {
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Image "${repository}/${image}" not locally found. Downloading...`
      );

      await new Promise<void>((resolve, reject) => {
        this.docker.pull(`${repository}/${image}`, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          this.docker.modem.followProgress(stream, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
      console.log(
        "\x1b[32m%s\x1b[0m",
        `Image "${repository}/${image}" successfully downloaded!`
      );
      
    }
    const imageDetails = await imageAPI.inspect();
    return imageDetails.Id;
  }

   async executeDockerContainer( {
    image,
    repository,
    port
  }:
    {
      image:string,
      repository:string, 
      port:number
    }) {
    
    const dockerRunCommand = `docker run --cap-drop=ALL --cap-add=NET_RAW --cap-add=NET_BIND_SERVICE --rm -p ${port}:3003 -d ${repository}/${image}`;

    return await new Promise((resolve, reject) => {
      exec(dockerRunCommand, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async createTunnel(port: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const tunnel = spawn('npx', ['lt', '--port', `${port}`]);
  
      tunnel.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('your url is:')) {
          const url = output.split('your url is:')[1].trim();
          console.log(`Túnel criado com sucesso: ${url}`);
          resolve(url);
        }
      });
  
      tunnel.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`O processo de túnel fechou com código: ${code}`));
        }
      });
    });
  }

  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const osPlatform = platform();
      let command: string;
  
      if (osPlatform === "darwin" || osPlatform === "linux") {
        command = `lsof -i :${port}`;
      } else if (osPlatform === "win32") {
        command = `netstat -aon | findstr :${port}`;
      } else {
        reject(new Error("Unsupported OS"));
        return;
      }
  
      exec(command, (err, stdout, stderr) => {
        if (err) {
          resolve(false);
        } else {
          resolve(stdout.length > 0);
        }
      });
    });
  }

  async hibernate({ imageId }: { imageId: string }): Promise<IHibernateResponse> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          ancestor: [imageId],
        },
      });

  
      if (containers.length > 0) {
        console.log(
          "\x1b[32m%s\x1b[0m",
          `Container(s) found for Image ID "${imageId}":`
        );
  
        for (const container of containers) {
          const containerAPI = this.docker.getContainer(container.Id);
          
          await containerAPI.stop();
          console.log(
            "\x1b[32m%s\x1b[0m",
            `Container ID: ${container.Id} stopped.`
          );

          console.log(
            "\x1b[32m%s\x1b[0m",
            `service from this image ID: ${imageId} in hibernating.`
          );

          return { status: "SUCCESS", code: 200 };

        }
      } else {
        console.log(
          "\x1b[33m%s\x1b[0m",
          `No containers found for Image ID "${imageId}".`
        );
        return { status: "ERROR", code: 404 };
      }
  
      
    } catch (error) {
      console.error("\x1b[31m%s\x1b[0m", "Error:", error);
      return { status: "ERROR", code: 500 };
    }
  }

  async activate({ imageId }: { imageId: string }): Promise<IActivateResponse> {
    try {
      let PORT = 1024;
      let IS_PORT_IN_USE = true; 
      const LIMIT_PORT = 49151;
  
      while (IS_PORT_IN_USE && PORT <= LIMIT_PORT) {
        IS_PORT_IN_USE = await this.isPortInUse(PORT);
        if (!IS_PORT_IN_USE) {
          break;
        }
        PORT++; 
      }
  
      if (PORT > LIMIT_PORT) {
        console.log(`Nenhuma porta disponível encontrada entre 1024 e ${LIMIT_PORT}.`);
        return { status: "ERROR", code: 500, tunnelUrl: "" };
      }
  
      const dockerRunCommand = `docker run --cap-drop=ALL --cap-add=NET_RAW --cap-add=NET_BIND_SERVICE --rm -p ${PORT}:3003 -d ${imageId}`;
  
       await new Promise<string>((resolve, reject) => {
        exec(dockerRunCommand, (err, stdout, stderr) => {
          if (err) {
            console.log("error container", stderr)
            reject(err);
          } else {
            resolve(stdout.trim()); 
          }
        });
      });
  

      const tunnelUrl = await this.createTunnel(PORT);
  
      return {
        status: "SUCCESS",
        code: 200,
        tunnelUrl: tunnelUrl,
      };
  
    } catch (error) {
      console.error("\x1b[31m%s\x1b[0m", "Error during activation:", error);
      return { status: "ERROR", code: 500, tunnelUrl: "" };
    }
  }

}

export default DockerService;
