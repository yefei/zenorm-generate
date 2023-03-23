import { promises as fs } from 'fs';
import * as path from 'path';

export function cwdPath(p: string): string {
  if (p.startsWith('./')) {
    return path.join(process.cwd(), p.slice(2));
  }
  return p;
}

export function checkFileDir(dir: string) {
  return fs.mkdir(dir, { recursive: true });
}

export function fileExists(f: string) {
  return fs.access(f).then(() => true, e => false);
}

/**
 * 文件不存在则创建并写入内容
 * @param filename 
 * @param getContent 
 */
export async function notExistsPut(filename: string, getContent: () => string | Promise<string>) {
  if (!await fileExists(filename)) {
    await fs.writeFile(filename, await getContent());
    return true;
  }
  return false;
}

export function currentDatetime() {
  return new Date().toLocaleString();
}
