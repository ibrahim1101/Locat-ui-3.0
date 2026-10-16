/** Browser copies are for small media. Large videos should stay file-backed or on the server. */
export const MAX_BROWSER_IMPORT_BYTES = 256 * 1024 * 1024;
const advice = 'For video, use Open video without copying. Large media can also stream from an authorized server media folder.';
export function mediaStorageError(error: unknown): Error {
  const name=error&&typeof error==='object'&&'name' in error?String(error.name):'';
  return ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(name)
    ? new Error('Browser storage is full. No files in this batch were saved. '+advice)
    : error instanceof Error ? error : new Error('Media could not be saved. '+advice);
}
export async function checkMediaImport(files: readonly Pick<File,'size'|'name'>[]): Promise<void> {
  const bytes=files.reduce((total,file)=>total+file.size,0);
  if(files.some(file=>!Number.isSafeInteger(file.size)||file.size<0||file.size>MAX_BROWSER_IMPORT_BYTES)||bytes>MAX_BROWSER_IMPORT_BYTES)
    throw new Error('Browser import is limited to 256 MiB per file and per batch. '+advice);
  let estimate:StorageEstimate|undefined;
  try{estimate=await navigator.storage?.estimate?.();}catch{/* Estimates are optional; the atomic write still reports actual quota failures. */}
  if(typeof estimate?.quota==='number'&&typeof estimate.usage==='number'&&Number.isFinite(estimate.quota)&&Number.isFinite(estimate.usage)
    &&estimate.quota-estimate.usage<bytes*1.1+16*1024*1024)
    throw new Error('Not enough estimated browser storage for this import. Nothing was copied. '+advice);
}
