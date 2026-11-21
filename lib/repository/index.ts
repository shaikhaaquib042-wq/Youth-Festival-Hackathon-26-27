import { JsonFileRepository } from './json-file';
import { Repository } from './interface';

// Singleton instance for server-side Next.js route handlers
let repositoryInstance: Repository | null = null;

export function getRepository(): Repository {
  if (!repositoryInstance) {
    repositoryInstance = new JsonFileRepository();
  }
  return repositoryInstance;
}
