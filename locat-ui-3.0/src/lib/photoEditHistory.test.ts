import {expect,it} from 'vitest';
import {defaultPhotoEdit} from './photoEditing';
import {createPhotoEditHistory,photoEditHistory,PHOTO_UNDO_LIMIT} from './photoEditHistory';
it('restores annotations and geometry across reset, undo and redo without mutating earlier snapshots',()=>{
 const initial=createPhotoEditHistory(),edited=photoEditHistory(initial,{type:'edit',update:old=>({...old,geometry:{...old.geometry,crop:'square'},texts:[{text:'Caption',color:'#ffffff',size:5,x:0.1,y:0.2}]})}),reset=photoEditHistory(edited,{type:'edit',update:defaultPhotoEdit()});
 const undone=photoEditHistory(reset,{type:'undo'});expect(undone.present).toEqual(edited.present);expect(photoEditHistory(undone,{type:'redo'}).present).toEqual(defaultPhotoEdit());expect(initial.present.texts).toEqual([]);expect(initial.present.geometry.crop).toBe('original');
});
it('discards redo after a new edit and ignores changes that leave the image unchanged',()=>{
 const initial=createPhotoEditHistory(),one=photoEditHistory(initial,{type:'edit',update:old=>({...old,brightness:150})}),undone=photoEditHistory(one,{type:'undo'}),branch=photoEditHistory(undone,{type:'edit',update:old=>({...old,contrast:130})});expect(branch.future).toEqual([]);expect(photoEditHistory(branch,{type:'redo'})).toBe(branch);expect(photoEditHistory(branch,{type:'edit',update:old=>({...old})})).toBe(branch);
});
it('bounds history and stops at the oldest retained state rather than claiming unlimited undo',()=>{
 let state=createPhotoEditHistory();for(let index=1;index<=125;index++)state=photoEditHistory(state,{type:'edit',update:old=>({...old,geometry:{...old.geometry,turns:index%4}})});expect(state.past).toHaveLength(PHOTO_UNDO_LIMIT);const oldest=state.past[0];for(let index=0;index<125;index++)state=photoEditHistory(state,{type:'undo'});expect(state.present).toEqual(oldest);expect(state.past).toEqual([]);expect(state.future).toHaveLength(PHOTO_UNDO_LIMIT);
});
