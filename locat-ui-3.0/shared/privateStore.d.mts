export type PrivateModule="vault"|"secrets";
export type PrivateEnvelope={v:1;iv:string;data:string};
export type PrivateConfig={v:1;storeId:string;salt:string;iterations:number;wrappedKey:PrivateEnvelope};
export type PrivateEntry=({kind:"file";name:string;folder:string;mime:string;bytes:number;data:string}|{kind:"credential";name:string;folder:string;username:string;password:string;url:string;note:string})&{createdAt:number};
export const PRIVATE_QUOTA:number,PRIVATE_MAX_OBJECTS:number,PRIVATE_FILE_LIMIT:number,PRIVATE_CIPHER_LIMIT:number,PRIVATE_KDF_ITERATIONS:number;
export function isPrivateId(value:unknown):boolean;
export function validateEnvelope(value:unknown):PrivateEnvelope;
export function validateConfig(value:unknown):PrivateConfig;
export function validateEntry(value:unknown):PrivateEntry;
export type PrivateBackup={format:"locat-ui3-private-backup-v1";scope:{userId:string;module:PrivateModule};config:PrivateConfig;objects:{id:string;revision:number;envelope:PrivateEnvelope}[]};
export function validateBackup(value:unknown,userId:string,module:PrivateModule):PrivateBackup;

export function samePrivateConfig(a:PrivateConfig,b:PrivateConfig):boolean;
