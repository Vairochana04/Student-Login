import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../server/', import.meta.url));
const env = {...process.env, PORT:process.env.PORT || '8092'};
let cmd, args;
if (spawnSync('javac',['-version']).status === 0) {
 const result = spawnSync('javac',['-encoding','UTF-8','Server.java'],{cwd,stdio:'inherit'});
 if (result.status !== 0) process.exit(result.status || 1);
 cmd='java';args=['-Dfile.encoding=UTF-8','-cp','.','Server'];
} else {
 cmd=['python3','python','py'].find(c=>spawnSync(c,['--version']).status===0);
 if (!cmd) { console.error('Install JDK 17+ (recommended) or Python 3, then run npm run backend again.');process.exit(1); }
 args=['server.py'];
}
console.log('API backend on port '+env.PORT+'. Open the frontend URL from npm run dev.');
const child=spawn(cmd,args,{cwd,env,stdio:'inherit'});
child.on('error',e=>{console.error(e.message);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code || 0});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
