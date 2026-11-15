
import {
  getDatabase, ref, push, set, get, update,
  onValue, onChildAdded, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjQ41eCIrZpli6oERkCGam4T7js7HxQsM",
  authDomain: "sd-dost-chat.firebaseapp.com",
  databaseURL: "https://sd-dost-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sd-dost-chat",
  storageBucket: "sd-dost-chat.firebasestorage.app",
  messagingSenderId: "828889822031",
  appId: "1:828889822031:web:c9c0224384915d63b38b3a"
};

// Use the same Firebase app as app.js
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const db = getDatabase(getApp());

let callId = null;
let peer = null;
let localStream = null;
let remoteStream = null;
let incomingUnsubscribe = null;
let candidateUnsubscribers = [];
let currentCallType = "voice";
let muted = false;
let cameraOff = false;

const $ = id => document.getElementById(id);

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function callStatus(message) {
  const el = $(currentCallType === "video" ?
    "videoCallStatus" : "voiceCallStatus");
  if (el) el.textContent = message;
}

function showCallPage(type) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.add("hidden")
  );

  const page = $("page-" + type + "-call");
  if (page) page.classList.remove("hidden");
}

async function getMedia(type) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("HTTPS پر کھولیں اور Microphone/Camera اجازت دیں");
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video"
  });
}

function createPeer() {
  peer = new RTCPeerConnection(rtcConfig);
  remoteStream = new MediaStream();

  peer.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });

    if (currentCallType === "video") {
      $("remoteVideo").srcObject = remoteStream;
    } else {
      $("remoteAudio").srcObject = remoteStream;
      $("remoteAudio").play().catch(() => {});
    }
  };

  peer.onicecandidate = async event => {
    if (!event.candidate || !callId) return;

    const side = peer.__side;
    const path = `calls/${callId}/${side}Candidates`;

    await push(ref(db, path), event.candidate.toJSON());
  };

  peer.onconnectionstatechange = () => {
    if (!peer) return;

    if (peer.connectionState === "connected") {
      callStatus("Connected");
    } else if (peer.connectionState === "failed") {
      callStatus("Connection failed. End and try again.");
    } else if (peer.connectionState === "disconnected") {
      callStatus("Connection interrupted");
    }
  };

  return peer;
}

function watchCandidates(path) {
  const candidatesRef = ref(db, path);

  const unsubscribe = onChildAdded(candidatesRef, async snapshot => {
    if (!peer || !peer.remoteDescription) return;

    try {
      await peer.addIceCandidate(
        new RTCIceCandidate(snapshot.val())
      );
    } catch (error) {
      console.error("ICE candidate error:", error);
    }
  });

  candidateUnsubscribers.push(unsubscribe);
}

async function waitForRemoteDescription() {
  return new Promise(resolve => {
    const check = () => {
      if (peer?.remoteDescription) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// START OUTGOING CALL
export async function startCall(friendUid, friendName, type = "voice") {
  if (callId) throw new Error("A call is already active");

  currentCallType = type;

  try {
    localStream = await getMedia(type);
    createPeer();

    peer.__side = "caller";

    localStream.getTracks().forEach(track =>
      peer.addTrack(track, localStream)
    );

    if (type === "video") {
      $("localVideo").srcObject = localStream;
    }

    const newCall = push(ref(db, "calls"));
    callId = newCall.key;

    await set(newCall, {
      caller: window.currentUserUid || "",
      callee: friendUid,
      type,
      status: "ringing",
      createdAt: Date.now()
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    await update(ref(db, "calls/" + callId), {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    watchCandidates(`calls/${callId}/calleeCandidates`);

    if ($("voiceCallName")) $("voiceCallName").textContent = friendName;
    if ($("videoCallStatus")) $("videoCallStatus").textContent = "Calling...";
    showCallPage(type);

    onValue(ref(db, `calls/${callId}/answer`), async snapshot => {
      if (!snapshot.exists() || !peer || peer.remoteDescription) return;

      await peer.setRemoteDescription(
        new RTCSessionDescription(snapshot.val())
      );
    });

    onValue(ref(db, `calls/${callId}/status`), snapshot => {
      if (snapshot.val() === "rejected" || snapshot.val() === "ended") {
        endCall();
      }
    });

    return callId;
  } catch (error) {
    await endCall();
    throw error;
  }
}

// LISTEN FOR INCOMING CALLS
export function listenForCalls(uid) {
  if (incomingUnsubscribe) incomingUnsubscribe();

  incomingUnsubscribe = onChildAdded(ref(db, "calls"), snapshot => {
    const call = snapshot.val();

    if (
      call &&
      call.callee === uid &&
      call.status === "ringing" &&
      !call.answer
    ) {
      callId = snapshot.key;
      currentCallType = call.type || "voice";

      if ($("incomingCaller")) {
        $("incomingCaller").textContent =
          "Incoming call from " + (call.callerName || "User");
      }

      $("incomingCallBox")?.classList.remove("hidden");
    }
  });
}

// ACCEPT INCOMING CALL
export async function acceptCall() {
  if (!callId) return;

  try {
    const snap = await get(ref(db, "calls/" + callId));
    if (!snap.exists()) throw new Error("Call no longer exists");

    const call = snap.val();
    currentCallType = call.type || "voice";

    localStream = await getMedia(currentCallType);
    createPeer();
    peer.__side = "callee";

    localStream.getTracks().forEach(track =>
      peer.addTrack(track, localStream)
    );

    if (currentCallType === "video") {
      $("localVideo").srcObject = localStream;
    }

    await peer.setRemoteDescription(
      new RTCSessionDescription(call.offer)
    );

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    await update(ref(db, "calls/" + callId), {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: "accepted"
    });

    watchCandidates(`calls/${callId}/callerCandidates`);

    $("incomingCallBox")?.classList.add("hidden");
    showCallPage(currentCallType);
    callStatus("Connecting...");
  } catch (error) {
    console.error(error);
    callStatus(error.message);
    await endCall();
  }
}

// REJECT INCOMING CALL
export async function rejectCall() {
  if (!callId) return;

  await update(ref(db, "calls/" + callId), {
    status: "rejected"
  });

  $("incomingCallBox")?.classList.add("hidden");
  callId = null;
}

// END CALL
export async function endCall() {
  const oldCallId = callId;

  candidateUnsubscribers.forEach(unsubscribe => unsubscribe());
  candidateUnsubscribers = [];

  if (peer) {
    peer.close();
    peer = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if ($("localVideo")) $("localVideo").srcObject = null;
  if ($("remoteVideo")) $("remoteVideo").srcObject = null;
  if ($("remoteAudio")) $("remoteAudio").srcObject = null;

  if (oldCallId) {
    try {
      await update(ref(db, "calls/" + oldCallId), {
        status: "ended"
      });
    } catch (error) {
      console.error(error);
    }
  }

  callId = null;
  $("incomingCallBox")?.classList.add("hidden");
  showCallPage("calls");
}

// MUTE MICROPHONE
export function toggleMute() {
  if (!localStream) return;

  muted = !muted;
  localStream.getAudioTracks().forEach(track => {
    track.enabled = !muted;
  });

  return muted;
}

// CAMERA ON / OFF
export function toggleCamera() {
  if (!localStream) return;

  cameraOff = !cameraOff;
  localStream.getVideoTracks().forEach(track => {
    track.enabled = !cameraOff;
  });

  return cameraOff;
}

console.log("SD DOST CHAT WebRTC module loaded");
      
