import * as Docker from "dockerode";
import { exec, spawn } from "child_process";

class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async deploy({ image, repository }: { image: string; repository: string }) {
    await this.getImage({ image, repository });

    let PORT = 3000;
    let IS_PORT_IN_USE = true; 
    let LIMIT_PORT = 3010;     

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
        return { tunnelUrl: tunnelUrl };
    } else {
        console.log(`Nenhuma porta disponível encontrada entre 3000 e ${LIMIT_PORT}.`);
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
  }

   async executeDockerContainer( {image,repository,port}:{image:string,repository:string, port:number}) {
    
    const dockerRunCommand = `docker run --cap-drop=ALL --cap-add=NET_RAW --cap-add=NET_BIND_SERVICE --rm -p ${port}:3000 -d ${repository}/${image}`;

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
  
      tunnel.stderr.on('data', (data) => {
        console.error(`Erro no túnel: ${data}`);
        reject(new Error(data.toString()));
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
      exec(`lsof -i :${port}`, (err, stdout, stderr) => {
        if (err) {
          resolve(false);
        } else {
          resolve(stdout.length > 0);
        }
      });
    });
  }

}

export default DockerService;
