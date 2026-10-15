export const MEDIA_TAG_LIMIT=20,MEDIA_TAG_LENGTH=40;
export function parseMediaTags(input:string):string[]{
 const tags:string[]=[],seen=new Set<string>();
 for(const part of input.split(',')){
  const tag=part.trim();if(!tag)continue;
  if(tag.length>MEDIA_TAG_LENGTH||[...tag].some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127))throw new Error('Each tag must be 1–40 characters without control characters.');
  const key=tag.toLowerCase();if(seen.has(key))continue;seen.add(key);tags.push(tag);
  if(tags.length>MEDIA_TAG_LIMIT)throw new Error('Use at most 20 tags per photo.');
 }
 return tags;
}
export function readMediaTags(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 try{return parseMediaTags(value.filter((tag):tag is string=>typeof tag==='string').slice(0,MEDIA_TAG_LIMIT).join(','));}catch{return [];}
}
export function matchesMediaSearch(item:{name:string;album:string;tags?:string[]},query:string){const needle=query.trim().toLowerCase();return [item.name,item.album,...readMediaTags(item.tags)].some(value=>value.toLowerCase().includes(needle));}
