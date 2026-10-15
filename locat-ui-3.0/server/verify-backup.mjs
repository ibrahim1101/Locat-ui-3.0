import {verifyServerBackup} from './verifyBackup.mjs';
try{if(!process.argv[2]||process.argv.length>4)throw new Error('Usage: npm run verify:backup -- <backup.sqlite> [expected-sha256]');console.log(JSON.stringify(await verifyServerBackup(process.argv[2],{expectedSha256:process.argv[3]}),null,2));}
catch(error){console.error('Backup verification failed: '+error.message);process.exitCode=1;}
