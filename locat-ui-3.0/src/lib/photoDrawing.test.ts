import {expect,it} from 'vitest';
import {photoPointerPoint,PHOTO_POINT_LIMIT,PHOTO_STROKE_LIMIT} from './photoDrawing';
it('maps scaled canvas coordinates and clamps captured pointers to image bounds',()=>{
 const rect={left:10,top:20,width:200,height:100};
 expect(photoPointerPoint(110,70,rect)).toEqual({x:0.5,y:0.5});
 expect(photoPointerPoint(-100,500,rect)).toEqual({x:0,y:1});
 expect(PHOTO_POINT_LIMIT).toBe(1000);expect(PHOTO_STROKE_LIMIT).toBe(100);
});
it('rejects invalid or unmeasured canvas geometry',()=>{
 for(const value of [NaN,Infinity,-Infinity])expect(photoPointerPoint(value,0,{left:0,top:0,width:10,height:10})).toBeNull();
 for(const width of [0,-1,NaN])expect(photoPointerPoint(1,1,{left:0,top:0,width,height:10})).toBeNull();
});
