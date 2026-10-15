export const PHOTO_STROKE_LIMIT=100,PHOTO_POINT_LIMIT=1000;
export function photoPointerPoint(x:number,y:number,rect:{left:number;top:number;width:number;height:number}){
 if(![x,y,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)return null;
 return {x:Math.max(0,Math.min(1,(x-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(y-rect.top)/rect.height))};
}
