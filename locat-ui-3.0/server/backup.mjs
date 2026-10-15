import {createServerBackup} from './createBackup.mjs';
try{
 if(process.argv.length!==3)throw new Error('Usage: npm run backup:server -- <new-backup.sqlite>');
 const report=await createServerBackup(process.env.LOCAT_DATABASE_FILE ?? './server/data/locat.sqlite',process.argv[2]);
 // Preserve the original path-only stdout contract for existing scripts.
 console.log(report.destination);
}catch(error){console.error('Server backup failed: '+error.message);process.exitCode=1;}
