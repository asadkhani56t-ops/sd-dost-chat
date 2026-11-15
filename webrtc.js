
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  onValue,
  onChildAdded,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const db = getDatabase(getApp());

let callId = null;
let peer = null;
let localStream = null;
let remoteStream = null;
let callType = "voice";
let callSide = null;
let muted = false;
let cameraDisabled = false;
let candidateUnsubscribers = [];
let callUnsubscribers = [];
let incomingUnsubscribe = null;
let pendingCandidates = [];

const $ = id => document.getElementById(id);

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

function status(message) {
  const element = $(callType === "video"
    ? "videoCallStatus"
    : "voiceCallStatus");

  if (element) element.textContent = message;
}

function showCallPage() {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  $("page-" + callType + "-call")?.classList.remove("hidden");
}

async function getLocalMedia(type) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone/Camera requires HTTPS");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video"
  });
}

function stopListeners() {
  candidateUnsubscribers.forEach(fn => fn());
  callUnsubscribers.forEach(fn => fn());

  candidateUnsubscribers = [];
  callUnsubscribers = [];
}

function createConnection(side) {
  peer = new RTCPeerConnection(rtcConfig);
  callSide = side;
  remoteStream = new MediaStream();
  pendingCandidates = [];

  peer.ontrack = event => {
    const stream = event.streams[0];

    stream.getTracks().forEach(track => {
      if (!remoteStream.getTracks().some(t => t.id === track.id)) {
        remoteStream.addTrack(track);
      }
    });

    if (callType === "video") {
      const video = $("remoteVideo");
      if (video) {
        video.srcObject = remoteStream;
        video.play().catch(() => {});
      }
    } else {
      const audio = $("remoteAudio");
      if (audio) {
        audio.srcObject = remoteStream;
        audio.play().catch(() => {});
      }
    }
  };

  peer.onicecandidate = async event => {
    if (!event.candidate || !callId) return;

    const path = `calls/${callId}/${side}Candidates`;

    try {
      await push(ref(db, path), event.candidate.toJSON());
    } catch (error) {
      console.error("Candidate save error:", error);
    }
  };

  peer.onconnectionstatechange = () => {
    if (!peer) return;

    if (peer.connectionState === "connected") {
      status("Connected");
    } else if (peer.connectionState === "connecting") {
      status("Connecting...");
    } else if (peer.connectionState === "failed") {
      status("Connection failed. TURN server may be required.");
    } else if (peer.connectionState === "disconnected") {
      status("Connection interrupted");
    }
  };

  return peer;
}

async function addPendingCandidates() {
  if (!peer?.remoteDescription) return;

  const candidates = [...pendingCandidates];
  pendingCandidates = [];

  for (const candidate of candidates) {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("ICE error:", error);
    }
  }
}

function listenCandidates(path) {
  const unsubscribe = onChildAdded(ref(db, path), async snapshot => {
    const candidate = snapshot.val();

    if (!candidate || !peer) return;

    if (!peer.remoteDescription) {
      pendingCandidates.push(candidate);
      return;
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("ICE candidate:", error);
    }
  });

  candidateUnsubscribers.push(unsubscribe);
}

function watchCallStatus(id) {
  const unsubscribe = onValue(ref(db, `calls/${id}/status`), snapshot => {
    const value = snapshot.val();

    if (value === "rejected") {
      status("Call rejected");
      cleanup(false);
    }

    if (value === "ended") {
      status("Call ended");
      cleanup(false);
    }
  });

  callUnsubscribers.push(unsubscribe);
}

// OUTGOING CALL
export async function startCall(friendUid, friendName, type = "voice") {
  if (callId || peer) {
    throw new Error("A call is already active");
  }

  if (!friendUid || !window.currentUserUid) {
    throw new Error("User information missing");
  }

  callType = type;

  try {
    localStream = await getLocalMedia(type);

    const callRef = push(ref(db, "calls"));
    callId = callRef.key;

    await set(callRef, {
      caller: window.currentUserUid,
      callee: friendUid,
      callerName: "User",
      type,
      status: "ringing",
      createdAt: Date.now()
    });

    createConnection("caller");

    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });

    if (type === "video" && $("localVideo")) {
      $("localVideo").srcObject = localStream;
    }

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    await update(ref(db, `calls/${callId}`), {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    listenCandidates(`calls/${callId}/calleeCandidates`);
    watchCallStatus(callId);

    const answerListener = onValue(
      ref(db, `calls/${callId}/answer`),
      async snapshot => {
        if (!snapshot.exists() || !peer || peer.remoteDescription) return;

        try {
          await peer.setRemoteDescription(
            new RTCSessionDescription(snapshot.val())
          );

          await addPendingCandidates();
        } catch (error) {
          console.error("Answer error:", error);
          status("Could not connect call");
        }
      }
    );

    callUnsubscribers.push(answerListener);

    if ($("voiceCallName")) {
      $("voiceCallName").textContent = friendName || "Friend";
    }

    showCallPage();
    status("Calling...");
    return callId;

  } catch (error) {
    await cleanup(true);
    throw error;
  }
}

// INCOMING CALLS
export function listenForCalls(uid) {
  if (incomingUnsubscribe) incomingUnsubscribe();

  incomingUnsubscribe = onChildAdded(ref(db, "calls"), snapshot => {
    const call = snapshot.val();

    if (
      !call ||
      call.callee !== uid ||
      call.status !== "ringing" ||
      call.answer
    ) return;

    callId = snapshot.key;
    callType = call.type || "voice";

    if ($("incomingCaller")) {
      $("incomingCaller").textContent =
        "Incoming call from " + (call.callerName || "Friend");
    }

    $("incomingCallBox")?.classList.remove("hidden");
  });
}

// ACCEPT CALL
export async function acceptCall() {
  if (!callId || peer) return;

  try {
    const snapshot = await get(ref(db, `calls/${callId}`));

    if (!snapshot.exists()) {
      throw new Error("Call not found");
    }

    const call = snapshot.val();

    if (call.status !== "ringing" || !call.offer) {
      throw new Error("Call is no longer available");
    }

    callType = call.type || "voice";
    localStream = await getLocalMedia(callType);

    createConnection("callee");

    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
    });

    if (callType === "video" && $("localVideo")) {
      $("localVideo").srcObject = localStream;
    }

    await peer.setRemoteDescription(
      new RTCSessionDescription(call.offer)
    );

    await addPendingCandidates();

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    await update(ref(db, `calls/${callId}`), {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: "accepted"
    });

    listenCandidates(`calls/${callId}/callerCandidates`);
    watchCallStatus(callId);

    $("incomingCallBox")?.classList.add("hidden");

    if ($("voiceCallName")) {
      $("voiceCallName").textContent = call.callerName || "Friend";
    }

    showCallPage();
    status("Connecting...");

  } catch (error) {
    status(error.message);
    await cleanup(true);
    throw error;
  }
}

// REJECT CALL
export async function rejectCall() {
  if (!callId) return;

  const id = callId;

  try {
    await update(ref(db, `calls/${id}`), {
      status: "rejected"
    });
  } finally {
    await cleanup(false);
  }
}

// CLEANUP
async function cleanup(updateServer = true) {
  const id = callId;

  stopListeners();

  if (peer) {
    peer.ontrack = null;
    peer.onicecandidate = null;
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

  if (id && updateServer) {
    try {
      await update(ref(db, `calls/${id}`), {
        status: "ended"
      });
    } catch (error) {
      console.error(error);
    }
  }

  callId = null;
  callSide = null;
  pendingCandidates = [];
  muted = false;
  cameraDisabled = false;

  $("incomingCallBox")?.classList.add("hidden");

  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  $("page-calls")?.classList.remove("hidden");
}

// END CALL
export async function endCall() {
  await cleanup(true);
}

// MICROPHONE MUTE
export function toggleMute() {
  if (!localStream) return false;

  muted = !muted;

  localStream.getAudioTracks().forEach(track => {
    track.enabled = !muted;
  });

  return muted;
}

// CAMERA ON / OFF
export function toggleCamera() {
  if (!localStream) return false;

  cameraDisabled = !cameraDisabled;

  localStream.getVideoTracks().forEach(track => {
    track.enabled = !cameraDisabled;
  });

  return cameraDisabled;
}

console.log("SD DOST CHAT WebRTC loaded");
