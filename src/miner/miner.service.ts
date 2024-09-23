import * as crypto from 'crypto';

class MinerService {
  /**
   * Método que gera hashs a partir de uma query e um nonce crescente
   * até que o hash tenha o número de zeros iniciais igual à dificuldade.
   * 
   * @param param0 - Um objeto contendo a query e a dificuldade.
   * @returns O hash gerado e o nonce utilizado.
   */
  public async sendHash({ query, dificulty }: { query: string; dificulty: number }): Promise<{ hash: string; nonce: number }> {
    let nonce = 0;
    let hash = '';
    const targetPrefix = '0'.repeat(dificulty);

    const mine = async (): Promise<{ hash: string; nonce: number }> => {
      return new Promise((resolve) => {
        const iterate = () => {
          const data = query + nonce;
          hash = this.generateHash(data);

          if (hash.startsWith(targetPrefix)) {
            resolve({ hash, nonce });
          } else {
            nonce++;
            setImmediate(iterate);
          }
        };
        iterate();
      });
    };

    return mine();
  }


  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
export default MinerService