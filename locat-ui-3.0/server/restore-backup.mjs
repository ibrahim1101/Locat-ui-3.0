import {restoreServerBackup} from './restoreBackup.mjs';
try{
 if(process.argv.length!==5)throw new Error('Usage: npm run restore:server -- <backup.sqlite> <new-destination.sqlite> <expected-sha256>');
 console.log(JSON.stringify(await restoreServerBackup(process.argv[2],process.argv[3],{expectedSha256:process.argv[4]}),null,2));
}catch(error){console.error('Backup restore failed: '+error.message);process.exitCode=1;}
