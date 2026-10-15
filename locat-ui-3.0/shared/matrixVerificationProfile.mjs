export function verificationSyncFilter(){return {room:{rooms:[]},presence:{types:[]},account_data:{types:[]}};}
export const verificationEventTypes=new Set(['request','ready','start','accept','key','mac','done','cancel'].map(name=>'m.key.verification.'+name));
