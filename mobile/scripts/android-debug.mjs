import {access,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const tools=path.join(root,'.privado/toolchains');
const local=await readdir(tools).catch(()=>[]);
const candidates=[process.env.SG_MOBILE_JAVA_HOME,process.env.JAVA_HOME,...local.filter(name=>name.startsWith('jdk-21')).map(name=>path.join(tools,name,'Contents/Home'))].filter(Boolean);
let java;
for(const candidate of candidates){try{await access(path.join(candidate,'bin/java'));java=candidate;break;}catch{/* Try next configured JDK. */}}
if(!java)throw new Error('Configure SG_MOBILE_JAVA_HOME with a JDK 21 installation.');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(homedir(),'Library/Android/sdk');
await access(path.join(sdk,'platforms/android-36/android.jar'));
const child=spawn('./gradlew',['assembleDebug','--no-daemon'],{
 cwd:path.join(root,'mobile/android'),stdio:'inherit',env:{...process.env,JAVA_HOME:java,ANDROID_HOME:sdk},
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
