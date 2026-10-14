import { openDatabase } from './database.mjs';
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node server/backup.mjs <new-backup.sqlite>');
const db = openDatabase(process.env.LOCAT_DATABASE_FILE ?? './server/data/locat.sqlite');
try { console.log(await db.backupTo(destination)); } finally { db.close(); }
