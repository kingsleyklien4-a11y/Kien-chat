const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Klien Chat</title><style>
*{box-sizing:border-box}body{margin:0;background:#0e1621;color:#fff;font:16px system-ui;height:100dvh}.app{height:100dvh;max-width:800px;margin:auto;display:flex;flex-direction:column;background:#17212b}header{padding:14px;display:flex;gap:12px;align-items:center;border-bottom:1px solid #2b3a49}.logo{background:#2aabee;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:22px}.sub{font-size:12px;color:#9aabba}#status{margin-left:auto;font-size:12px;color:#9aabba}.bar,.send{display:flex;gap:8px;padding:10px;border-bottom:1px solid #2b3a49}input{min-width:0;background:#0e1621;color:#fff;border:1px solid #35485b;border-radius:12px;padding:12px;font:inherit}#name{width:38%}#room{flex:1}#messages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:9px}.msg{align-self:flex-start;background:#243442;padding:10px 12px;border-radius:14px;max-width:90%;overflow-wrap:anywhere}.who{color:#69c7f5;font-size:12px;font-weight:bold;margin-bottom:4px}.time{font-size:10px;color:#a6b4c2;text-align:right;margin-top:5px}.system{align-self:center;color:#a6b4c2;font-size:12px;background:#1c2b38;border-radius:12px;padding:5px 10px}.send{border-top:1px solid #2b3a49;border-bottom:0;padding-bottom:max(12px,env(safe-area-inset-bottom))}#text{flex:1}button{border:0;border-radius:12px;background:#2aabee;color:#fff;padding:0 18px;font:inherit;font-weight:bold}.note{font-size:11px;color:#9aabba;padding:0 12px 10px}@media(min-width:700px){.app{height:94dvh;margin:3dvh auto;border:1px solid #2b3a49;border-radius:18px;overflow:hidden}}</style></head><body><main class="app"><header><div class="logo">➤</div><div><b>Klien Chat</b><div class="sub">Public real-time chat</div></div><div id="status">Connecting…</div></header><div class="bar"><input id="name" maxlength="24" placeholder="Your name"><input id="room" maxlength="32" value="general" placeholder="Room name"></div><div id="messages"><div class="system">Welcome! Choose a name and send a message.</div></div><div class="note">Anyone who chooses the same room can read its messages. Don't share private information.</div><form id="form" class="send"><input id="text" maxlength="1500" placeholder="Message…" autocomplete="off"><button>Send</button></form></main><script>
const $=x=>document.getElementById(x);let ws;
function add(m){let d=document.createElement('div');if(m.type==='system'){d.className='system';d.textContent=m.text}else{d.className='msg';let n=document.createElement('div');n.className='who';n.textContent=m.name||'Guest';let t=document.createElement('div');t.textContent=m.text;let tm=document.createElement('div');tm.className='time';tm.textContent=new Date(m.time||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});d.append(n,t,tm)}$('messages').append(d);$('messages').scrollTop=$('messages').scrollHeight}
function connect(){let room=($('room').value.trim()||'general').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32)||'general';$('room').value=room;if(ws)ws.close();$('messages').innerHTML='';ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws?room='+encodeURIComponent(room));ws.onopen=()=>{$('status').textContent='Connected';add({type:'system',text:'Connected to #'+room})};ws.onmessage=e=>{try{let m=JSON.parse(e.data);if(m.type==='history')m.messages.forEach(add);else add(m)}catch{}};ws.onclose=()=>{$('status').textContent='Disconnected'};ws.onerror=()=>{$('status').textContent='Connection error'}}
$('form').onsubmit=e=>{e.preventDefault();let text=$('text').value.trim();if(!text)return;if(!ws||ws.readyState!==1){add({type:'system',text:'Not connected. Refresh and retry.'});return}ws.send(JSON.stringify({name:$('name').value.trim()||'Guest',text}));$('text').value=''};$('room').onchange=connect;$('name').value=localStorage.getItem('klien-name')||'';$('name').onchange=()=>localStorage.setItem('klien-name',$('name').value.slice(0,24));connect();
</script></body></html>`;

export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/health") return Response.json({ok:true,app:"Klien Chat"});
  if (url.pathname === "/ws") {
   if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", {status:426});
   const room=(url.searchParams.get("room")||"general").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,32)||"general";
   return env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(room)).fetch(request);
  }
  if (url.pathname === "/" || url.pathname === "/index.html") return new Response(PAGE,{headers:{"content-type":"text/html;charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
  return new Response("Not found",{status:404});
 }
};

export class ChatRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.sockets=new Set()}
 async fetch(request){
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];server.accept();this.sockets.add(server);
  server.addEventListener("message",e=>{this.handleMessage(server,e.data)});
  server.addEventListener("close",()=>this.sockets.delete(server));server.addEventListener("error",()=>this.sockets.delete(server));
  server.send(JSON.stringify({type:"history",messages:(await this.ctx.storage.get("history"))||[]}));
  return new Response(null,{status:101,webSocket:client});
 }
 async handleMessage(sender,raw){
  if(typeof raw!=="string"||raw.length>5000)return;let x;try{x=JSON.parse(raw)}catch{return}
  const text=String(x.text||"").trim().slice(0,1500),name=String(x.name||"Guest").trim().slice(0,24)||"Guest";if(!text)return;
  const m={type:"message",name,text,time:Date.now()},history=(await this.ctx.storage.get("history"))||[];history.push(m);await this.ctx.storage.put("history",history.slice(-100));
  const encoded=JSON.stringify(m);for(const s of this.sockets){try{s.send(encoded)}catch{this.sockets.delete(s)}}
 }
}
