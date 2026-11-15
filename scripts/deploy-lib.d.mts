export interface DeployConfig {
  host: string;
  user: string;
  port: number;
  remoteDir: string;
  keyFile: string | null;
  password: string | null;
  siteUrl: string | null;
}
export function parseEnv(text: string): Record<string, string>;
export function readConfig(env: Record<string, string | undefined>): DeployConfig;
export function listFiles(dir: string): string[];
export function orderForUpload(files: string[]): string[];
export function buildBatch(files: string[], localDir: string, remoteDir: string): string;
export function judgeSite(r: { indexStatus: number; swStatus: number; swCacheControl: string | null }): { ok: boolean; text: string }[];
