
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, sendPasswordResetEmail,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, push, update, remove,
  onValue, query, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  startCall, listenForCalls, acceptCall, rejectCall,
  endCall, toggleMute, toggleCamera
} from "./webrtc.js";

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

let user = null;
let friendUid = null;
let friendName = "";
let chatId = null;
let groupId = null;
let messageListener = null;
let recording = null;
let recordedChunks = [];
let localAudioUrl = null;
let authMode = "login";

function toast(message) {
  const el = $("toast");
  if (!el) {
    alert(message);
    return;
  }
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(page =>
    page.classList.add("hidden")
  );

  $("page-" + name)?.classList.remove("hidden");

  document.querySelectorAll("#tabs [data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });
}

function stopMessageListener() {
  if (messageListener) {
    messageListener();
    messageListener = null;
  }
}

function chatKey(a, b) {
  return [a, b].sort().join("_");
}

function displayMessages(path, boxId) {
  stopMessageListener();

  messageListener = onValue(
    query(ref(db, path), limitToLast(100)),
    snapshot => {
      const box = $(boxId);
      if (!box) return;

      box.innerHTML = "";

      snapshot.forEach(item => {
        const msg = item.val();
        const row = document.createElement("div");
        row.className = msg.uid === user.uid
          ? "my-message"
          : "other-message";

        const name = document.createElement("strong");
        name.textContent = (msg.name || "User") + ": ";

        const text = document.createElement("span");
        text.textContent = msg.text || "";

        row.append(name, text);
        box.appendChild(row);
      });

      box.scrollTop = box.scrollHeight;
    },
    error => toast(error.message)
  );
}

// NAVIGATION
document.querySelectorAll("#tabs [data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// LOGIN / SIGNUP MODE
$("switchAuth")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";

  if ($("authTitle")) {
    $("authTitle").textContent =
      authMode === "login" ? "Login" : "Create Account";
  }

  if ($("authBtn")) {
    $("authBtn").textContent =
      authMode === "login" ? "Login" : "Sign Up";
  }

  $("nameWrap")?.classList.toggle("hidden", authMode === "login");

  if ($("switchAuth")) {
    $("switchAuth").textContent =
      authMode === "login"
        ? "Create new account"
        : "Already have an account? Login";
  }
});

// AUTH
$("authBtn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;
  const name = $("name")?.value.trim();

  if (!email || !password) return toast("Email اور Password درج کریں");
  if (password.length < 6) return toast("Password کم از کم 6 حروف کا ہو");

  const button = $("authBtn");
  button.disabled = true;

  try {
    if (authMode === "signup") {
      if (!name) throw new Error("اپنا نام درج کریں");

      const result = await createUserWithEmailAndPassword(
        auth, email, password
      );

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
    toast(error.message);
  } finally {
    button.disabled = false;
  }
});

// FORGOT PASSWORD
$("forgotBtn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  if (!email) return toast("Email درج کریں");

  try {
    await sendPasswordResetEmail(auth, email);
    toast("Password reset email بھیج دی گئی");
  } catch (error) {
    toast(error.message);
  }
});

// AUTH STATE
onAuthStateChanged(auth, async currentUser => {
  stopMessageListener();
  user = currentUser;

  $("authScreen")?.classList.toggle("hidden", !!user);
  $("appScreen")?.classList.toggle("hidden", !user);

  if (!user) return;

  window.currentUserUid = user.uid;

  $("headerUser") && (
    $("headerUser").textContent = user.displayName || "SD User"
  );

  $("profileName") && (
    $("profileName").textContent = user.displayName || "User"
  );

  $("profileEmail") && (
    $("profileEmail").textContent = user.email || ""
  );

  $("profileUid") && (
    $("profileUid").textContent = user.uid
  );

  $("avatar") && (
    $("avatar").textContent =
      (user.displayName || "U").charAt(0).toUpperCase()
  );

  try {
    const profileRef = ref(db, "publicProfiles/" + user.uid);
    const profile = await get(profileRef);

    if (!profile.exists()) {
      await set(profileRef, {
        name: user.displayName || "User",
        uid: user.uid,
        createdAt: Date.now()
      });
    }

    listenForCalls(user.uid);
    loadFriends();
    loadRequests();
    loadGroups();
    loadBlocked();
    loadProfileSettings();
    showPage("chats");
  } catch (error) {
    toast("Database: " + error.message);
  }
});

// LOGOUT
$("logout")?.addEventListener("click", async () => {
  try {
    stopMessageListener();
    await signOut(auth);
  } catch (error) {
    toast(error.message);
  }
});

// PROFILE
$("copyUid")?.addEventListener("click", async () => {
  if (!user) return;

  try {
    await navigator.clipboard.writeText(user.uid);
    toast("UID copied");
  } catch {
    toast("Your UID: " + user.uid);
  }
});

$("saveProfile")?.addEventListener("click", async () => {
  const name = $("editProfileName")?.value.trim();
  if (!name) return toast("Name درج کریں");

  try {
    await updateProfile(user, { displayName: name });
    await update(ref(db, "publicProfiles/" + user.uid), { name });

    $("profileName").textContent = name;
    $("headerUser").textContent = name;
    $("avatar").textContent = name.charAt(0).toUpperCase();

    toast("Profile updated");
  } catch (error) {
    toast(error.message);
  }
});

// ADD FRIEND
$("addFriend")?.addEventListener("click", async () => {
  const uid = $("friendUid")?.value.trim();

  if (!uid || uid === user.uid) {
    return toast("درست Friend UID درج کریں");
  }

  try {
    const profile = await get(ref(db, "publicProfiles/" + uid));
    if (!profile.exists()) throw new Error("User نہیں ملا");

    const already = await get(ref(db, `friends/${user.uid}/${uid}`));
    if (already.exists()) throw new Error("یہ پہلے سے دوست ہے");

    await set(ref(db, `friendRequests/${uid}/${user.uid}`), {
      uid: user.uid,
      name: user.displayName || "User",
      createdAt: Date.now()
    });

    $("friendUid").value = "";
    toast("Friend request sent");
  } catch (error) {
    toast(error.message);
  }
});

// FRIENDS
function loadFriends() {
  onValue(ref(db, "friends/" + user.uid), async snapshot => {
    const list = $("friendsList");
    const chats = $("chatList");
    if (!list || !chats) return;

    list.innerHTML = "";
    chats.innerHTML = "";

    if (!snapshot.exists()) {
      list.textContent = "No friends yet";
      chats.textContent = "Add friends to start chatting";
      return;
    }

    for (const uid of Object.keys(snapshot.val())) {
      const profile = await get(ref(db, "publicProfiles/" + uid));
      const person = profile.val() || { name: "Friend" };

      const button = document.createElement("button");
      button.textContent = person.name || "Friend";
      button.addEventListener("click", () =>
        openChat(uid, person.name || "Friend")
      );

      list.appendChild(button);

      const chatButton = button.cloneNode(true);
      chatButton.addEventListener("click", () =>
        openChat(uid, person.name || "Friend")
      );
      chats.appendChild(chatButton);
    }
  });
}

// FRIEND REQUESTS
function loadRequests() {
  onValue(ref(db, "friendRequests/" + user.uid), snapshot => {
    const list = $("requestsList");
    if (!list) return;

    list.innerHTML = "";

    if (!snapshot.exists()) {
      list.textContent = "No pending requests";
      return;
    }

    snapshot.forEach(item => {
      const uid = item.key;
      const request = item.val();

      const row = document.createElement("div");
      const name = document.createElement("span");
      name.textContent = request.name || "User";

      const accept = document.createElement("button");
      accept.textContent = "Accept";
      accept.addEventListener("click", () => acceptFriend(uid, request.name));

      const reject = document.createElement("button");
      reject.textContent = "Reject";
      reject.addEventListener("click", async () => {
        try {
          await remove(ref(db, `friendRequests/${user.uid}/${uid}`));
        } catch (error) {
          toast(error.message);
        }
      });

      row.append(name, accept, reject);
      list.appendChild(row);
    });
  });
}

async function acceptFriend(uid, name) {
  try {
    const updates = {};

    updates[`friends/${user.uid}/${uid}`] = {
      uid,
      name: name || "Friend",
      since: Date.now()
    };

    updates[`friends/${uid}/${user.uid}`] = {
      uid: user.uid,
      name: user.displayName || "User",
      since: Date.now()
    };

    updates[`friendRequests/${user.uid}/${uid}`] = null;

    await update(ref(db), updates);
    toast("Friend added");
  } catch (error) {
    toast(error.message);
  }
}

// PRIVATE CHAT
async function openChat(uid, name) {
  friendUid = uid;
  friendName = name;
  chatId = chatKey(user.uid, uid);
  groupId = null;

  $("activeChat")?.classList.remove("hidden");
  $("activeGroup")?.classList.add("hidden");
  $("chatTitle") && ($("chatTitle").textContent = name);

  try {
    const updates = {};
    updates[`chats/${chatId}/members/${user.uid}`] = true;
    updates[`chats/${chatId}/members/${uid}`] = true;
    updates[`chatMembers/${user.uid}/${chatId}`] = true;
    updates[`chatMembers/${uid}/${chatId}`] = true;

    await update(ref(db), updates);
    displayMessages(`chats/${chatId}/messages`, "messages");
    showPage("chats");
  } catch (error) {
    toast(error.message);
  }
}

async function sendPrivateMessage() {
  const text = $("messageInput")?.value.trim();
  if (!text || !chatId) return;

  try {
    await push(ref(db, `chats/${chatId}/messages`), {
      uid: user.uid,
      name: user.displayName || "User",
      text,
      createdAt: Date.now()
    });

    $("messageInput").value = "";
  } catch (error) {
    toast(error.message);
  }
}

$("sendMessage")?.addEventListener("click", sendPrivateMessage);
$("messageInput")?.addEventListener("keydown", event => {
  if (event.key === "Enter") sendPrivateMessage();
});

$("backChats")?.addEventListener("click", () => {
  stopMessageListener();
  chatId = null;
  friendUid = null;
  $("activeChat")?.classList.add("hidden");
});

// GROUPS
$("createGroup")?.addEventListener("click", async () => {
  const name = $("groupName")?.value.trim();
  const rawMembers = $("groupMembers")?.value.trim();

  if (!name) return toast("Group name درج کریں");

  try {
    const members = new Set([user.uid]);

    if (rawMembers) {
      rawMembers.split(",").map(x => x.trim()).filter(Boolean)
        .forEach(uid => members.add(uid));
    }

    for (const uid of members) {
      if (uid === user.uid) continue;

      const check = await get(ref(db, `friends/${user.uid}/${uid}`));
      if (!check.exists()) {
        throw new Error("صرف اپنے friends کو شامل کریں");
      }
    }

    const groupRef = push(ref(db, "groups"));
    const memberMap = {};

    members.forEach(uid => memberMap[uid] = true);

    await set(groupRef, {
      name,
      owner: user.uid,
      members: memberMap,
      createdAt: Date.now()
    });

    for (const uid of members) {
      await set(ref(db, `userGroups/${uid}/${groupRef.key}`), true);
    }

    $("groupName").value = "";
    $("groupMembers").value = "";
    toast("Group created");
  } catch (error) {
    toast(error.message);
  }
});

function loadGroups() {
  onValue(ref(db, "userGroups/" + user.uid), async snapshot => {
    const list = $("groupList");
    if (!list) return;

    list.innerHTML = "";

    if (!snapshot.exists()) {
      list.textContent = "No groups yet";
      return;
    }

    for (const id of Object.keys(snapshot.val())) {
      const result = await get(ref(db, "groups/" + id));
      if (!result.exists()) continue;

      const group = result.val();
      const button = document.createElement("button");
      button.textContent = group.name || "Group";
      button.addEventListener("click", () => openGroup(id, group.name));
      list.appendChild(button);
    }
  });
}

function openGroup(id, name) {
  groupId = id;
  chatId = null;

  $("activeGroup")?.classList.remove("hidden");
  $("activeChat")?.classList.add("hidden");
  $("groupTitle") && ($("groupTitle").textContent = name || "Group");

  displayMessages(`groups/${id}/messages`, "groupMessages");
  showPage("groups");
}

$("sendGroupMessage")?.addEventListener("click", async () => {
  const text = $("groupMessageInput")?.value.trim();
  if (!text || !groupId) return;

  try {
    await push(ref(db, `groups/${groupId}/messages`), {
      uid: user.uid,
      name: user.displayName || "User",
      text,
      createdAt: Date.now()
    });

    $("groupMessageInput").value = "";
  } catch (error) {
    toast(error.message);
  }
});

// VOICE / VIDEO CALLS
$("voiceCallBtn")?.addEventListener("click", async () => {
  if (!friendUid) return toast("پہلے Friend کی Chat کھولیں");

  try {
    await startCall(friendUid, friendName, "voice");
  } catch (error) {
    toast("Voice call: " + error.message);
  }
});

$("videoCallBtn")?.addEventListener("click", async () => {
  if (!friendUid) return toast("پہلے Friend کی Chat کھولیں");

  try {
    await startCall(friendUid, friendName, "video");
  } catch (error) {
    toast("Video call: " + error.message);
  }
});

$("incomingAccept")?.addEventListener("click", async () => {
  try {
    await acceptCall();
  } catch (error) {
    toast(error.message);
  }
});

$("incomingReject")?.addEventListener("click", rejectCall);
$("acceptVoiceCall")?.addEventListener("click", acceptCall);
$("acceptVideoCall")?.addEventListener("click", acceptCall);
$("rejectVoiceCall")?.addEventListener("click", rejectCall);
$("rejectVideoCall")?.addEventListener("click", rejectCall);
$("endVoiceCall")?.addEventListener("click", endCall);
$("endVideoCall")?.addEventListener("click", endCall);
$("muteVoiceCall")?.addEventListener("click", toggleMute);
$("muteVideoCall")?.addEventListener("click", toggleMute);
$("cameraToggle")?.addEventListener("click", toggleCamera);

// VOICE RECORDING PREVIEW
$("startRecording")?.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recording = new MediaRecorder(stream);

    recording.ondataavailable = event => {
      if (event.data.size) recordedChunks.push(event.data);
    };

    recording.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });

      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
      localAudioUrl = URL.createObjectURL(blob);

      const preview = $("voicePreview");
      if (preview) {
        preview.src = localAudioUrl;
        preview.controls = true;
      }

      stream.getTracks().forEach(track => track.stop());
      if ($("recordStatus")) $("recordStatus").textContent =
        "Recording preview ready";
    };

    recording.start();
    if ($("recordStatus")) $("recordStatus").textContent = "Recording...";
    toast("Recording started");
  } catch (error) {
    toast("Microphone permission: " + error.message);
  }
});

$("stopRecording")?.addEventListener("click", () => {
  if (recording && recording.state !== "inactive") {
    recording.stop();
  }
});

$("recordBtn")?.addEventListener("click", () => {
  showPage("voice");
});

// MEDIA PICKER PREVIEW
$("attachBtn")?.addEventListener("click", () => $("mediaPicker")?.click());

$("mediaPicker")?.addEventListener("change", () => {
  const file = $("mediaPicker").files?.[0];
  if (!file) return;

  const preview = $("mediaPreview");
  if (!preview) return;

  preview.textContent = file.name;
  toast("File selected. Upload storage is not connected yet.");
});

$("mediaLibraryPicker")?.addEventListener("change", () => {
  const file = $("mediaLibraryPicker").files?.[0];
  if (file && $("mediaLibrary")) {
    $("mediaLibrary").textContent = file.name;
  }
});

// BLOCKED USERS
function loadBlocked() {
  onValue(ref(db, `blocked/${user.uid}`), snapshot => {
    const list = $("blockedList") || $("blockedContacts");
    if (!list) return;

    list.innerHTML = "";

    if (!snapshot.exists()) {
      list.textContent = "No blocked users";
      return;
    }

    snapshot.forEach(item => {
      const row = document.createElement("div");
      row.textContent = item.key;

      const unblock = document.createElement("button");
      unblock.textContent = "Unblock";
      unblock.addEventListener("click", () =>
        remove(ref(db, `blocked/${user.uid}/${item.key}`))
          .then(() => toast("User unblocked"))
          .catch(error => toast(error.message))
      );

      row.appendChild(unblock);
      list.appendChild(row);
    });
  });
}

// PRIVACY SETTINGS
$("savePrivacy")?.addEventListener("click", async () => {
  try {
    await set(ref(db, `userSettings/${user.uid}/privacy`), {
      showOnline: $("showOnline")?.checked ?? true,
      showProfile: $("showProfile")?.checked ?? true,
      allowRequests: $("allowRequests")?.checked ?? true,
      readReceipts: $("readReceipts")?.checked ?? true
    });

    toast("Privacy settings saved");
  } catch (error) {
    toast(error.message);
  }
});

// CHAT SETTINGS
$("saveChatSettings")?.addEventListener("click", async () => {
  try {
    await set(ref(db, `userSettings/${user.uid}/chat`), {
      enterToSend: $("enterToSend")?.checked ?? true,
      messagePreview: $("messagePreview")?.checked ?? true
    });

    toast("Chat settings saved");
  } catch (error) {
    toast(error.message);
  }
});

// LOAD SETTINGS
async function loadProfileSettings() {
  try {
    const result = await get(ref(db, `userSettings/${user.uid}`));
    if (!result.exists()) return;

    const data = result.val();

    if (data.privacy) {
      for (const [key, value] of Object.entries(data.privacy)) {
        if ($(key)) $(key).checked = !!value;
      }
    }

    if (data.chat) {
      for (const [key, value] of Object.entries(data.chat)) {
        if ($(key)) $(key).checked = !!value;
      }
    }
  } catch (error) {
    console.error(error);
  }
}

// LOCAL CHAT LOCK - NOT ENCRYPTION
$("enableChatLock")?.addEventListener("change", () => {
  $("chatLockPin")?.classList.toggle(
    "hidden",
    !$("enableChatLock").checked
  );
});

$("unlockChat")?.addEventListener("click", () => {
  const pin = $("chatLockPin")?.value;
  if (!pin || pin.length < 4) return toast("کم از کم 4 ہندسوں کا PIN درج کریں");

  sessionStorage.setItem("sdChatPinSet", "yes");
  toast("Local PIN option saved for this session");
});

// ACCOUNT
$("changePassword")?.addEventListener("click", () => {
  toast("Password change کے لیے Forgot Password استعمال کریں");
});

$("deleteAccount")?.addEventListener("click", () => {
  toast("Account deletion کو محفوظ طریقے سے الگ مرحلے میں بنانا ہوگا");
});

// STORAGE
$("clearLocalMedia")?.addEventListener("click", () => {
  if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
  localAudioUrl = null;

  if ($("voicePreview")) $("voicePreview").removeAttribute("src");
  if ($("storageInfo")) $("storageInfo").textContent = "Local preview cleared";

  toast("Local preview cleared");
});

console.log("SD DOST CHAT app.js loaded");
