
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, push, onValue, update, remove,
  query, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjQ41eCIrZpli6oERkCGam4T7js7HxQsM",
  authDomain: "sd-dost-chat.firebaseapp.com",
  databaseURL: "https://sd-dost-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sd-dost-chat",
  storageBucket: "sd-dost-chat.firebasestorage.app",
  messagingSenderId: "828889822031",
  appId: "1:828889822031:web:c9c0224384915d63b38b3a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = id => document.getElementById(id);

let currentUser = null;
let currentChatId = null;
let currentGroupId = null;
let authMode = "login";
let activeListeners = [];

function showToast(message) {
  const el = $("toast");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
  } else {
    alert(message);
  }
}

function listen(path, callback) {
  const databaseRef = ref(db, path);
  const unsubscribe = onValue(databaseRef, snapshot => callback(snapshot.val()));
  activeListeners.push(unsubscribe);
  return unsubscribe;
}

function clearListeners() {
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

// PAGE NAVIGATION
function openPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const selected = $("page-" + page);
  if (selected) selected.classList.remove("hidden");

  document.querySelectorAll("#tabs button, #tabs [data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
}

document.querySelectorAll("#tabs [data-page]").forEach(btn => {
  btn.addEventListener("click", () => openPage(btn.dataset.page));
});

// AUTH MODE
$("switchAuth")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  if ($("authTitle")) $("authTitle").textContent =
    authMode === "login" ? "Login" : "Create Account";
  if ($("authBtn")) $("authBtn").textContent =
    authMode === "login" ? "Login" : "Sign Up";
  $("nameWrap")?.classList.toggle("hidden", authMode === "login");
  if ($("switchAuth")) $("switchAuth").textContent =
    authMode === "login" ? "Create new account" : "Already have an account? Login";
  if ($("authMsg")) $("authMsg").textContent = "";
});

// LOGIN / SIGNUP
$("authBtn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;
  const name = $("name")?.value.trim();

  if (!email || !password) {
    showToast("Email اور Password درج کریں");
    return;
  }

  try {
    if (authMode === "signup") {
      if (!name) return showToast("اپنا نام درج کریں");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await set(ref(db, "publicProfiles/" + result.user.uid), {
        name,
        uid: result.user.uid,
        createdAt: Date.now()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showToast(error.message);
  }
});

// FORGOT PASSWORD
$("forgotBtn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  if (!email) return showToast("پہلے Email درج کریں");
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("Password reset email بھیج دی گئی");
  } catch (error) {
    showToast(error.message);
  }
});

// AUTH STATE
onAuthStateChanged(auth, async user => {
  clearListeners();
  currentUser = user;

  $("authScreen")?.classList.toggle("hidden", !!user);
  $("appScreen")?.classList.toggle("hidden", !user);

  if (!user) return;

  $("headerUser") && ($("headerUser").textContent = user.displayName || "SD User");
  $("profileName") && ($("profileName").textContent = user.displayName || "User");
  $("profileEmail") && ($("profileEmail").textContent = user.email || "");
  $("profileUid") && ($("profileUid").textContent = user.uid);
  $("avatar") && ($("avatar").textContent = (user.displayName || "U")[0].toUpperCase());

  const profileRef = ref(db, "publicProfiles/" + user.uid);
  const profile = await get(profileRef);
  if (!profile.exists()) {
    await set(profileRef, {
      name: user.displayName || "User",
      uid: user.uid,
      createdAt: Date.now()
    });
  }

  loadFriends();
  loadRequests();
  loadGroups();
  openPage("chats");
});

// LOGOUT
$("logout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Logged out");
  } catch (error) {
    showToast(error.message);
  }
});

// COPY UID
$("copyUid")?.addEventListener("click", async () => {
  if (!currentUser) return;
  try {
    await navigator.clipboard.writeText(currentUser.uid);
    showToast("UID copied");
  } catch {
    showToast("UID: " + currentUser.uid);
  }
});

// EDIT PROFILE
$("saveProfile")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const name = $("editProfileName")?.value.trim();
  if (!name) return showToast("Name درج کریں");

  try {
    await updateProfile(currentUser, { displayName: name });
    await update(ref(db, "publicProfiles/" + currentUser.uid), { name });
    $("profileName").textContent = name;
    $("headerUser").textContent = name;
    showToast("Profile updated");
  } catch (error) {
    showToast(error.message);
  }
});

// SEND FRIEND REQUEST
$("addFriend")?.addEventListener("click", async () => {
  if (!currentUser) return;
  const friendUid = $("friendUid")?.value.trim();

  if (!friendUid || friendUid === currentUser.uid) {
    return showToast("درست دوست کا UID درج کریں");
  }

  try {
    const profileSnap = await get(ref(db, "publicProfiles/" + friendUid));
    if (!profileSnap.exists()) return showToast("یہ UID نہیں ملا");

    const alreadyFriend = await get(ref(db, `friends/${currentUser.uid}/${friendUid}`));
    if (alreadyFriend.exists()) return showToast("یہ پہلے سے دوست ہے");

    await set(ref(db, `friendRequests/${friendUid}/${currentUser.uid}`), {
      uid: currentUser.uid,
      name: currentUser.displayName || "User",
      createdAt: Date.now()
    });

    $("friendUid").value = "";
    showToast("Friend request sent");
  } catch (error) {
    showToast(error.message);
  }
});

// LOAD FRIENDS
function loadFriends() {
  listen("friends/" + currentUser.uid, async data => {
    const list = $("friendsList");
    const chats = $("chatList");
    if (!list || !chats) return;

    list.innerHTML = "";
    chats.innerHTML = "";

    if (!data) {
      list.textContent = "No friends yet";
      chats.textContent = "Add friends to start chatting";
      return;
    }

    for (const uid of Object.keys(data)) {
      const snap = await get(ref(db, "publicProfiles/" + uid));
      const person = snap.val() || { name: data[uid].name || "Friend" };

      const friendButton = document.createElement("button");
      friendButton.textContent = person.name + " · Open chat";
      friendButton.addEventListener("click", () => startChat(uid, person.name));
      list.appendChild(friendButton);

      const chatButton = document.createElement("button");
      chatButton.textContent = person.name;
      chatButton.addEventListener("click", () => startChat(uid, person.name));
      chats.appendChild(chatButton);
    }
  });
}

// LOAD FRIEND REQUESTS
function loadRequests() {
  listen("friendRequests/" + currentUser.uid, data => {
    const list = $("requestsList");
    if (!list) return;
    list.innerHTML = "";

    if (!data) {
      list.textContent = "No pending requests";
      return;
    }

    Object.entries(data).forEach(([senderUid, request]) => {
      const row = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = request.name || "User";

      const accept = document.createElement("button");
      accept.textContent = "Accept";
      accept.addEventListener("click", () => acceptRequest(senderUid, request.name));

      const reject = document.createElement("button");
      reject.textContent = "Reject";
      reject.addEventListener("click", () =>
        remove(ref(db, `friendRequests/${currentUser.uid}/${senderUid}`))
          .then(() => showToast("Request rejected"))
          .catch(error => showToast(error.message))
      );

      row.append(name, accept, reject);
      list.appendChild(row);
    });
  });
}

async function acceptRequest(uid, name) {
  try {
    const myName = currentUser.displayName || "User";
    const updates = {};
    updates[`friends/${currentUser.uid}/${uid}`] = {
      uid, name: name || "Friend", since: Date.now()
    };
    updates[`friends/${uid}/${currentUser.uid}`] = {
      uid: currentUser.uid, name: myName, since: Date.now()
    };
    updates[`friendRequests/${currentUser.uid}/${uid}`] = null;

    await update(ref(db), updates);
    showToast("Friend added");
  } catch (error) {
    showToast(error.message);
  }
}

// PRIVATE CHAT
function makeChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function startChat(friendUid, friendName) {
  currentChatId = makeChatId(currentUser.uid, friendUid);
  currentGroupId = null;

  $("activeChat")?.classList.remove("hidden");
  $("chatTitle") && ($("chatTitle").textContent = friendName);
  openPage("chats");

  const chatId = currentChatId;
  const updates = {};
  updates[`chats/${chatId}/members/${currentUser.uid}`] = true;
  updates[`chats/${chatId}/members/${friendUid}`] = true;
  updates[`chatMembers/${currentUser.uid}/${chatId}`] = true;
  updates[`chatMembers/${friendUid}/${chatId}`] = true;

  try {
    await update(ref(db), updates);
    loadMessages(chatId, "messages");
  } catch (error) {
    showToast(error.message);
  }
}

function loadMessages(chatId, messageNode) {
  clearMessageListener();
  const messageRef = query(
    ref(db, `chats/${chatId}/${messageNode}`),
    limitToLast(100)
  );

  const unsubscribe = onValue(messageRef, snapshot => {
    const box = $("messages");
    if (!box) return;
    box.innerHTML = "";

    snapshot.forEach(child => {
      const msg = child.val();
      const row = document.createElement("div");
      row.className = msg.uid === currentUser.uid ? "my-message" : "other-message";
      row.textContent = (msg.name || "User") + ": " + (msg.text || "");
      box.appendChild(row);
    });

    box.scrollTop = box.scrollHeight;
  });

  messageUnsubscribe = unsubscribe;
}

let messageUnsubscribe = null;
function clearMessageListener() {
  if (messageUnsubscribe) {
    messageUnsubscribe();
    messageUnsubscribe = null;
  }
}

async function sendChatMessage() {
  const text = $("messageInput")?.value.trim();
  if (!text || !currentChatId) return;

  try {
    await push(ref(db, `chats/${currentChatId}/messages`), {
      uid: currentUser.uid,
      name: currentUser.displayName || "User",
      text,
      createdAt: Date.now()
    });
    $("messageInput").value = "";
  } catch (error) {
    showToast(error.message);
  }
}

$("sendMessage")?.addEventListener("click", sendChatMessage);
$("messageInput")?.addEventListener("keydown", event => {
  if (event.key === "Enter") sendChatMessage();
});

$("backChats")?.addEventListener("click", () => {
  $("activeChat")?.classList.add("hidden");
  currentChatId = null;
  clearMessageListener();
});

// GROUPS
$("createGroup")?.addEventListener("click", async () => {
  const name = $("groupName")?.value.trim();
  const memberText = $("groupMembers")?.value.trim();
  if (!name) return showToast("Group name درج کریں");

  try {
    const members = new Set([currentUser.uid]);
    if (memberText) {
      memberText.split(",").map(x => x.trim()).filter(Boolean)
        .forEach(uid => members.add(uid));
    }

    for (const uid of members) {
      if (uid === currentUser.uid) continue;
      const isFriend = await get(ref(db, `friends/${currentUser.uid}/${uid}`));
      if (!isFriend.exists()) throw new Error("صرف اپنے friends کو group میں شامل کریں");
    }

    const groupRef = push(ref(db, "groups"));
    const groupId = groupRef.key;
    const memberMap = {};
    members.forEach(uid => memberMap[uid] = true);

    await set(groupRef, {
      name,
      owner: currentUser.uid,
      members: memberMap,
      createdAt: Date.now()
    });

    for (const uid of members) {
      await set(ref(db, `userGroups/${uid}/${groupId}`), true);
    }

    $("groupName").value = "";
    $("groupMembers").value = "";
    showToast("Group created");
  } catch (error) {
    showToast(error.message);
  }
});

function loadGroups() {
  listen("userGroups/" + currentUser.uid, async data => {
    const list = $("groupList");
    if (!list) return;
    list.innerHTML = "";

    if (!data) {
      list.textContent = "No groups yet";
      return;
    }

    for (const groupId of Object.keys(data)) {
      const snap = await get(ref(db, "groups/" + groupId));
      const group = snap.val();
      if (!group) continue;

      const btn = document.createElement("button");
      btn.textContent = group.name || "Group";
      btn.addEventListener("click", () => openGroup(groupId, group.name));
      list.appendChild(btn);
    }
  });
}

async function openGroup(groupId, name) {
  currentGroupId = groupId;
  currentChatId = null;
  $("activeGroup")?.classList.remove("hidden");
  $("groupTitle") && ($("groupTitle").textContent = name || "Group");
  openPage("groups");
  clearMessageListener();

  const unsubscribe = onValue(
    query(ref(db, `groups/${groupId}/messages`), limitToLast(100)),
    snapshot => {
      const box = $("groupMessages");
      if (!box) return;
      box.innerHTML = "";
      snapshot.forEach(child => {
        const msg = child.val();
        const row = document.createElement("div");
        row.textContent = (msg.name || "User") + ": " + (msg.text || "");
        box.appendChild(row);
      });
      box.scrollTop = box.scrollHeight;
    }
  );
  messageUnsubscribe = unsubscribe;
}

$("sendGroupMessage")?.addEventListener("click", async () => {
  const text = $("groupMessageInput")?.value.trim();
  if (!text || !currentGroupId) return;

  try {
    await push(ref(db, `groups/${currentGroupId}/messages`), {
      uid: currentUser.uid,
      name: currentUser.displayName || "User",
      text,
      createdAt: Date.now()
    });
    $("groupMessageInput").value = "";
  } catch (error) {
    showToast(error.message);
  }
});

// BACK BUTTONS / BASIC PLACEHOLDERS
$("recordBtn")?.addEventListener("click", () =>
  showToast("Voice messages کا کوڈ اگلے مرحلے میں شامل ہوگا")
);
$("attachBtn")?.addEventListener("click", () =>
  $("mediaPicker")?.click()
);
$("voiceCallBtn")?.addEventListener("click", () =>
  showToast("Voice calling اگلے مرحلے میں webrtc.js سے جوڑی جائے گی")
);
$("videoCallBtn")?.addEventListener("click", () =>
  showToast("Video calling اگلے مرحلے میں webrtc.js سے جوڑی جائے گی")
);
$("startRecording")?.addEventListener("click", () =>
  showToast("Voice recording اگلے مرحلے میں شامل ہوگی")
);
$("stopRecording")?.addEventListener("click", () =>
  showToast("Recording ابھی فعال نہیں")
);
$("savePrivacy")?.addEventListener("click", () =>
  showToast("Privacy settings محفوظ کرنے کا اگلا مرحلہ باقی ہے")
);
$("saveChatSettings")?.addEventListener("click", () =>
  showToast("Chat settings محفوظ کرنے کا اگلا مرحلہ باقی ہے")
);

$("incomingAccept")?.addEventListener("click", () =>
  showToast("Calling ابھی setup نہیں ہوئی")
);
$("incomingReject")?.addEventListener("click", () =>
  $("incomingCallBox")?.classList.add("hidden")
);

$("acceptVoiceCall")?.addEventListener("click", () =>
  showToast("Voice calling ابھی setup نہیں ہوئی")
);
$("rejectVoiceCall")?.addEventListener("click", () =>
  openPage("calls")
);
$("endVoiceCall")?.addEventListener("click", () =>
  openPage("calls")
);
$("acceptVideoCall")?.addEventListener("click", () =>
  showToast("Video calling ابھی setup نہیں ہوئی")
);
$("rejectVideoCall")?.addEventListener("click", () =>
  openPage("calls")
);
$("endVideoCall")?.addEventListener("click", () =>
  openPage("calls")
);

console.log("SD DOST CHAT app.js loaded");
