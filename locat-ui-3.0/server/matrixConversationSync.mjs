const fail=message=>{throw Object.assign(new Error(message),{status:502});};
export const conversationStateTypes=new Set(['m.room.member','m.room.encryption','m.room.create','m.room.power_levels','m.room.join_rules','m.room.history_visibility','m.room.tombstone']);
export function scopedConversationRooms(value,roomIds){
 const allowed=new Set(roomIds),rooms={};
 const events=(container,timeline=false,ephemeral=false)=>{if(container===undefined)return undefined;if(!container||typeof container!=='object'||!Array.isArray(container.events))fail('Invalid conversation sync events');return {...container,events:container.events.filter(event=>event&&(ephemeral?event.type==='m.receipt':conversationStateTypes.has(event.type)||timeline&&event.type==='m.room.encrypted'))};};
 for(const kind of ['join','invite','leave']){
  const section=value?.[kind];if(section!==undefined&&(!section||typeof section!=='object'||Array.isArray(section)))fail('Invalid conversation sync rooms');
  rooms[kind]={};for(const [id,room] of Object.entries(section??{})){
   if(!allowed.has(id))continue;if(!room||typeof room!=='object'||Array.isArray(room))fail('Invalid conversation sync room');
   const ephemeral=room.ephemeral===undefined?{events:[]}:events(room.ephemeral,false,true);
   rooms[kind][id]={...room,state:events(room.state),invite_state:events(room.invite_state),timeline:events(room.timeline,true),ephemeral,account_data:{events:[]}};
  }
 }
 return rooms;
}
