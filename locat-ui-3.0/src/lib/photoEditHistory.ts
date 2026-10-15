import {defaultPhotoEdit,type PhotoEdit} from './photoEditing';
export const PHOTO_UNDO_LIMIT=100;
export type PhotoEditHistory={past:PhotoEdit[];present:PhotoEdit;future:PhotoEdit[]};
export type PhotoEditAction={type:'edit';update:PhotoEdit|((previous:PhotoEdit)=>PhotoEdit)}|{type:'undo'}|{type:'redo'};
export function createPhotoEditHistory():PhotoEditHistory{return {past:[],present:defaultPhotoEdit(),future:[]};}
/** Immutable edit parameters only: no image copies, object URLs or persistent storage. */
export function photoEditHistory(state:PhotoEditHistory,action:PhotoEditAction):PhotoEditHistory{
 if(action.type==='undo'){if(!state.past.length)return state;return {past:state.past.slice(0,-1),present:state.past.at(-1)!,future:[state.present,...state.future]};}
 if(action.type==='redo'){if(!state.future.length)return state;return {past:[...state.past,state.present].slice(-PHOTO_UNDO_LIMIT),present:state.future[0],future:state.future.slice(1)};}
 const next=typeof action.update==='function'?action.update(state.present):action.update;
 if(JSON.stringify(next)===JSON.stringify(state.present))return state;
 return {past:[...state.past,state.present].slice(-PHOTO_UNDO_LIMIT),present:next,future:[]};
}
