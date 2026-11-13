const $ = (id) => document.getElementById(id);
const pages = ["home","chats","chatroom","friends","requests","groups","calls","voice-call","video-call","voice","media","profile","settings","account-settings","privacy","security","blocked","notifications","chat-settings","storage","forgot"];
let isLogin = false;
let currentUser = {name:"SD User", email:"demo@example.com"};
let friends = [];
let requests = [];
let groups = [];
let currentChat = "Friend";
let toastTimer;

function toast(message){
  const el=$("toast"); if(!el) return;
  el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2400);
}
function openPage(name){
  if(!pages.includes(name)) name="home";
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const page=$("page-"+name); if(page) page.classList.add("active");
  document.querySelectorAll("[data-page].nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  const titles={"home":"Home","chats":"Messages","chatroom":"Private chat","friends":"Friends","requests":"Friend requests","groups":"Group chats","calls":"Calls","voice-call":"Voice call","video-call":"Video call","voice":"Voice messages","media":"Photos & videos","profile":"My profile","settings":"Settings","account-settings":"Account settings","privacy":"Privacy settings","security":"Security","blocked":"Blocked contacts","notifications":"Notifications","chat-settings":"Chat settings","storage":"Media & storage","forgot":"Forgot password"};
  $("topTitle").textContent=titles[name]||"SD DOST CHAT";
  document.querySelector(".sidebar")?.classList.remove("open");
  if(name==="profile") updateProfile();
  if(name==="friends") renderFriends();
  if(name==="requests") renderRequests();
  if(name==="groups") renderGroups();
  if(name==="chats") renderChats();
  window.scrollTo({top:0,behavior:"smooth"});
}
function updateProfile(){
  const name=currentUser.name||"SD User", email=currentUser.email||"";
  ["sideName","profileName","detailName"].forEach(id=>{if($(id)) $(id).textContent=name;});
  ["profileEmail","detailEmail","accountEmail"].forEach(id=>{if($(id)) $(id).textContent=email;});
  $("profileAvatar").textContent=name.slice(0,2).toUpperCase();
  $("topTitle").textContent="My profile";
  $("homeGreeting").textContent="Hello, "+name+"!";
}
function showApp(){
  $("authScreen").classList.add("hidden"); $("appShell").classList.remove("hidden");
  updateProfile(); openPage("home");
}
function showAuth(){
  $("appShell").classList.add("hidden"); $("authScreen").classList.remove("hidden");
}
function setAuthMode(login){
  isLogin=login;
  $("signupFields").classList.toggle("hidden",login);
  $("authSubmit").textContent=login?"Log in":"Create account";
  $("toggleAuth").textContent=login?"Create a new account":"Already have an account? Log in";
  $("password").autocomplete=login?"current-password":"new-password";
  $("authMessage").textContent="";
}
$("toggleAuth").addEventListener("click",()=>setAuthMode(!isLogin));
$("authSubmit").addEventListener("click",()=>{
  const email=$("email").value.trim(), password=$("password").value, name=$("displayName").value.trim();
  if(!email||!password||(!isLogin&&!name)){ $("authMessage").textContent="Please fill in all required fields."; return; }
  if(password.length<6){ $("authMessage").textContent="Password must be at least 6 characters."; return; }
  currentUser={name:isLogin?(name||email.split("@")[0]):name,email};
  $("authMessage").textContent=""; showApp();
  toast("Design preview opened. Firebase will be connected later.");
});
$("forgotPassword").addEventListener("click",()=>{
  $("forgotEmail").value=$("email").value.trim(); showApp(); openPage("forgot");
});
$("forgotForm").addEventListener("submit",e=>{
  e.preventDefault(); const email=$("forgotEmail").value.trim();
  $("forgotFeedback").textContent=email?"Preview: password reset will be sent after Firebase connection.":"Enter your email address.";
});
$("logout").addEventListener("click",()=>{showAuth();setAuthMode(true);toast("Logged out of preview.");});
$("changePassword").addEventListener("click",()=>{$("accountFeedback").textContent="Password reset will be connected with Firebase later.";});

document.addEventListener("click",e=>{
  const target=e.target.closest("[data-page]");
  if(target){ e.preventDefault(); openPage(target.dataset.page); }
});
$("mobileMenu").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));

function renderFriends(){
  $("friendCount").textContent=friends.length+" friends";
  $("friendsList").innerHTML=friends.length?friends.map((f,i)=>`<div class="settings-row"><span class="avatar">${escapeHTML(f.slice(0,2).toUpperCase())}</span><span><b>${escapeHTML(f)}</b><small>Preview friend</small></span><button class="btn secondary" data-chat="${i}">Message</button></div>`).join(""):`<div class="empty-state compact"><div class="empty-symbol">♧</div><h3>No friends added</h3><p>Your accepted friends will appear here.</p></div>`;
}
function renderRequests(){
  $("requestList").innerHTML=requests.length?requests.map((r,i)=>`<div class="settings-row"><span class="avatar">${escapeHTML(r.slice(0,2).toUpperCase())}</span><span><b>${escapeHTML(r)}</b><small>Wants to connect</small></span><button class="btn primary" data-accept="${i}">Accept</button></div>`).join(""):`<div class="empty-state"><div class="empty-symbol">✉</div><h3>No new requests</h3><p>New friend invitations will appear here.</p></div>`;
}
function renderGroups(){
  $("groupList").innerHTML=groups.length?groups.map(g=>`<div class="settings-row"><span class="avatar">◎</span><span><b>${escapeHTML(g)}</b><small>Preview group</small></span><span class="status-pill">Created</span></div>`).join(""):`<div class="empty-state compact"><div class="empty-symbol">◎</div><h3>No groups yet</h3><p>Groups you create will appear here.</p></div>`;
}
function renderChats(){
  $("chatList").innerHTML=friends.length?friends.map((f,i)=>`<button class="settings-row chat-open" data-chat="${i}"><span class="avatar">${escapeHTML(f.slice(0,2).toUpperCase())}</span><span><b>${escapeHTML(f)}</b><small>Tap to open private chat</small></span><i>›</i></button>`).join(""):`<div class="empty-state"><div class="empty-symbol">▤</div><h3>No conversations yet</h3><p>Add a friend to start a private conversation.</p><button class="btn primary" data-page="friends">Find friends</button></div>`;
}
$("friendForm").addEventListener("submit",e=>{
  e.preventDefault(); const name=$("friendName").value.trim();
  if(!name){$("friendFeedback").textContent="Enter a name first.";return;}
  if(friends.includes(name)){ $("friendFeedback").textContent="This person is already in your preview friends list.";return;}
  requests.push(name); $("friendName").value=""; $("friendFeedback").textContent="Demo request created. Open Friend requests to accept it."; toast("Friend request added to preview."); 
});
$("requestList").addEventListener("click",e=>{
  const b=e.target.closest("[data-accept]"); if(!b)return;
  const idx=Number(b.dataset.accept), name=requests.splice(idx,1)[0]; if(name&&!friends.includes(name))friends.push(name);
  renderRequests(); toast(name+" added to your preview friends."); 
});
$("friendsList").addEventListener("click",e=>{
  const b=e.target.closest("[data-chat]"); if(!b)return; startChat(friends[Number(b.dataset.chat)]);
});
$("chatList").addEventListener("click",e=>{
  const b=e.target.closest("[data-chat]"); if(!b)return; startChat(friends[Number(b.dataset.chat)]);
});
function startChat(name){
  currentChat=name||"Friend"; $("chatRoomTitle").textContent=currentChat; $("chatRoomName").textContent=currentChat; openPage("chatroom");
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("messageForm").addEventListener("submit",e=>{
  e.preventDefault(); const input=$("messageInput"), value=input.value.trim(); if(!value)return;
  const bubble=document.createElement("div"); bubble.className="bubble sent"; bubble.textContent=value;
  $("messageArea").appendChild(bubble); input.value=""; $("messageArea").scrollTop=$("messageArea").scrollHeight;
});
$("groupForm").addEventListener("submit",e=>{
  e.preventDefault(); const name=$("groupName").value.trim(); if(!name){$("groupFeedback").textContent="Enter a group name.";return;}
  groups.push(name); $("groupName").value=""; $("groupFeedback").textContent="Group created in this design preview."; renderGroups(); toast("Group created.");
});
$("chatSearch").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase();
  document.querySelectorAll("#chatList [data-chat]").forEach(el=>el.style.display=el.textContent.toLowerCase().includes(q)?"flex":"none");
});
$("mediaPicker").addEventListener("change",e=>{
  const file=e.target.files[0], preview=$("mediaPreview"); preview.innerHTML="";
  if(!file)return;
  const url=URL.createObjectURL(file), el=document.createElement(file.type.startsWith("video/")?"video":"img");
  el.src=url; if(el.tagName==="VIDEO"){el.controls=true;} preview.appendChild(el);
});
async function testMedia(kind,statusId){
  const status=$(statusId);
  if(!navigator.mediaDevices?.getUserMedia){status.textContent="This browser does not support media permission testing.";return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia(kind==="video"?{audio:true,video:true}:{audio:true});
    stream.getTracks().forEach(t=>t.stop()); status.textContent="Permission granted on this device. Real calls are not connected yet.";
  }catch(err){status.textContent="Permission not granted or unavailable. You can allow it in browser settings.";}
}
$("voiceCallAction").addEventListener("click",()=>testMedia("audio","voiceCallStatus"));
$("videoCallAction").addEventListener("click",()=>testMedia("video","videoCallStatus"));
$("recordButton").addEventListener("click",()=>testMedia("audio","recordStatus"));
document.querySelectorAll(".switch input").forEach(input=>input.addEventListener("change",()=>toast(input.checked?"Option turned on in preview.":"Option turned off in preview.")));

setAuthMode(false);
