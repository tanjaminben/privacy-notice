import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=process.argv.indexOf('--output-root');
if(index>=0&&!process.argv[index+1])throw Error('--output-root requires a directory');
const root=index<0?repo:path.resolve(process.argv[index+1]);
const assets=spawnSync(process.execPath,[path.join(repo,'scripts/verify-assets.mjs'),'--root',root],{stdio:'inherit'});
if(assets.status!==0)process.exit(assets.status||1);
// Carry included shared dependencies into an isolated output, without private files.
if(root!==repo){
  const snapshot=JSON.parse(await fs.readFile(path.join(repo,'SOURCE-SNAPSHOT.json'),'utf8'));
  for(const file of snapshot.files.filter(f=>f.path.startsWith('site/'))){
    const destination=path.join(root,file.path);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await fs.copyFile(path.join(repo,file.path),destination);
  }
}
await import('../packages/privacy-notice/build.mjs');
