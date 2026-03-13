import { useState, useEffect, useRef, useCallback } from "react";
import {
  ref, set, get, onValue, off, remove, update,
} from "firebase/database";
import { db } from "../firebase";
import { initGame, applyPlay, applyPickUp, sortCards } from "../game/engine";

// ── Identité persistante par onglet ──────────────────────────────────────────
function getMyUid() {
  let uid = sessionStorage.getItem("shithead_uid");
  if (!uid) {
    uid = crypto.randomUUID();
    sessionStorage.setItem("shithead_uid", uid);
  }
  return uid;
}

const MY_UID = getMyUid();
const SESSION_ROOM_KEY = "shithead_room"; // { rid, slot } persisté au refresh

// ── Firebase supprime les tableaux vides — on les restaure ───────────────────
function sanitizeState(s) {
  if (!s) return s;
  return {
    ...s,
    pile:    s.pile    || [],
    discard: s.discard || [],
    log:     s.log     || [],
    players: (s.players || []).map(p => ({
      ...p,
      handCards:     p.handCards     || [],
      faceUpCards:   p.faceUpCards   || [],
      faceDownCards: p.faceDownCards || [],
    })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function saveSession(rid, slot) {
  sessionStorage.setItem(SESSION_ROOM_KEY, JSON.stringify({ rid, slot }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_ROOM_KEY);
}

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_ROOM_KEY)); }
  catch { return null; }
}

export default function useOnlineGame() {
  const [roomId, setRoomId]           = useState(null);
  const [roomStatus, setRoomStatus]   = useState(null);
  const [roomPlayers, setRoomPlayers] = useState({});
  const [maxPlayers, setMaxPlayers]   = useState(null);
  const [isHost, setIsHost]           = useState(false);
  const [mySlot, setMySlot]           = useState(null);
  const [state, setState]             = useState(null);
  const [error, setError]             = useState(null);
  const [aborted, setAborted]         = useState(false);

  const roomIdRef  = useRef(null);
  const mySlotRef  = useRef(null);
  const isHostRef  = useRef(false);
  const unsubsRef  = useRef([]);
  const writingRef = useRef(false);

  // ── Cleanup all Firebase listeners ─────────────────────────────────────────
  const cleanupListeners = useCallback(() => {
    unsubsRef.current.forEach(unsub => unsub());
    unsubsRef.current = [];
  }, []);

  // ── Subscribe to a room ────────────────────────────────────────────────────
  const subscribeRoom = useCallback((rid) => {
    cleanupListeners();

    const roomRef = ref(db, `games/${rid}`);
    const unsub = onValue(roomRef, snap => {
      const data = snap.val();
      if (!data) return;

      setRoomStatus(data.status);
      setMaxPlayers(data.maxPlayers);

      const players = data.players || {};
      setRoomPlayers(players);

      if (players[MY_UID] !== undefined) {
        const slot = players[MY_UID].slot;
        setMySlot(slot);
        mySlotRef.current = slot;
      }

      setIsHost(data.hostUid === MY_UID);
      isHostRef.current = data.hostUid === MY_UID;

      if (data.state) setState(sanitizeState(data.state));
      if (data.aborted) setAborted(true);

      // Host : tous les acks dealing reçus → lancer la partie
      if (data.status === "dealing" && isHostRef.current && data.dealDone && !writingRef.current) {
        const playerCount = Object.keys(players).length;
        const ackCount    = Object.keys(data.dealDone).length;
        if (ackCount >= playerCount) {
          writingRef.current = true;
          const names = Object.values(players)
            .sort((a, b) => a.slot - b.slot)
            .map(p => p.name);
          const initialState = initGame(names);
          initialState.players.forEach(p => { p.setupConfirmed = false; });
          update(ref(db, `games/${rid}`), { state: initialState, status: "playing" })
            .finally(() => { writingRef.current = false; });
        }
      }

      // Host : tous les setup confirmés → démarrer le jeu
      if (data.status === "playing" && data.state && data.state.status === "setup"
          && isHostRef.current && !writingRef.current) {
        const allConfirmed = data.state.players.every(p => p.setupConfirmed);
        if (allConfirmed) {
          writingRef.current = true;
          const newState = { ...data.state, status: "playing" };
          set(ref(db, `games/${rid}/state`), newState)
            .finally(() => { writingRef.current = false; });
        }
      }
    });

    unsubsRef.current.push(() => off(roomRef, "value", unsub));
  }, [cleanupListeners]);

  // ── Auto-reconnexion au refresh ────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;

    const { rid, slot } = saved;

    // Vérifie que la room existe encore et que notre slot y est toujours
    get(ref(db, `games/${rid}`)).then(snap => {
      const data = snap.val();
      if (!data || !data.players?.[MY_UID]) {
        clearSession();
        return;
      }
      // Rétablir l'état local
      setRoomId(rid);
      roomIdRef.current = rid;
      setMySlot(slot);
      mySlotRef.current = slot;
      subscribeRoom(rid);
    }).catch(() => clearSession());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionnellement vide : s'exécute une seule fois au montage

  // ── createRoom ─────────────────────────────────────────────────────────────
  const createRoom = useCallback(async (pseudo, max) => {
    setError(null);
    const rid = randomCode();
    const roomData = {
      hostUid:    MY_UID,
      maxPlayers: max,
      status:     "waiting",
      players:    { [MY_UID]: { name: pseudo, slot: 0 } },
    };
    await set(ref(db, `games/${rid}`), roomData);

    setRoomId(rid);
    roomIdRef.current = rid;
    setIsHost(true);
    isHostRef.current = true;
    setMySlot(0);
    mySlotRef.current = 0;

    saveSession(rid, 0);
    subscribeRoom(rid);
    return rid;
  }, [subscribeRoom]);

  // ── joinRoom ───────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (pseudo, code) => {
    setError(null);
    const rid = code.toUpperCase();
    const snap = await get(ref(db, `games/${rid}`));
    if (!snap.val()) { setError("Code invalide"); return; }
    const data = snap.val();
    if (data.status !== "waiting") { setError("Partie déjà commencée"); return; }
    const currentCount = Object.keys(data.players || {}).length;
    if (currentCount >= data.maxPlayers) { setError("Salle pleine"); return; }

    const slot = currentCount;
    await set(ref(db, `games/${rid}/players/${MY_UID}`), { name: pseudo, slot });

    setRoomId(rid);
    roomIdRef.current = rid;
    setIsHost(false);
    isHostRef.current = false;
    setMySlot(slot);
    mySlotRef.current = slot;

    saveSession(rid, slot);
    subscribeRoom(rid);
  }, [subscribeRoom]);

  // ── abortGame (host only) ──────────────────────────────────────────────────
  const abortGame = useCallback(async () => {
    const rid = roomIdRef.current;
    if (!rid || !isHostRef.current) return;
    await set(ref(db, `games/${rid}/aborted`), true);
  }, []);

  // ── startGame (host only) ──────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const rid = roomIdRef.current;
    if (!rid || !isHostRef.current) return;
    await update(ref(db, `games/${rid}`), { status: "dealing", dealDone: null });
  }, []);

  // ── ackDealDone ────────────────────────────────────────────────────────────
  const ackDealDone = useCallback(async () => {
    const rid = roomIdRef.current;
    if (!rid) return;
    await set(ref(db, `games/${rid}/dealDone/${MY_UID}`), true);
  }, []);

  // ── pushSwap ───────────────────────────────────────────────────────────────
  const pushSwap = useCallback(async (handId, fuId) => {
    const rid  = roomIdRef.current;
    const slot = mySlotRef.current;
    if (!rid) return;
    const snap = await get(ref(db, `games/${rid}/state`));
    const cur  = snap.val();
    if (!cur) return;
    const ns = JSON.parse(JSON.stringify(cur));
    const p  = ns.players[slot];
    const hi = p.handCards.findIndex(c => c.id === handId);
    const fi = p.faceUpCards.findIndex(c => c.id === fuId);
    if (hi !== -1 && fi !== -1) {
      [p.handCards[hi], p.faceUpCards[fi]] = [p.faceUpCards[fi], p.handCards[hi]];
      p.handCards = sortCards(p.handCards);
    }
    await set(ref(db, `games/${rid}/state`), ns);
  }, []);

  // ── pushConfirmSetup ───────────────────────────────────────────────────────
  const pushConfirmSetup = useCallback(async () => {
    const rid  = roomIdRef.current;
    const slot = mySlotRef.current;
    if (!rid) return;
    const snap = await get(ref(db, `games/${rid}/state`));
    const cur  = snap.val();
    if (!cur) return;
    const ns = JSON.parse(JSON.stringify(cur));
    ns.players[slot].setupConfirmed = true;
    await set(ref(db, `games/${rid}/state`), ns);
  }, []);

  // ── pushPlay ───────────────────────────────────────────────────────────────
  const pushPlay = useCallback(async (cards) => {
    const rid = roomIdRef.current;
    if (!rid) return;
    const snap = await get(ref(db, `games/${rid}/state`));
    const cur  = snap.val();
    if (!cur) return;
    const ns = applyPlay(sanitizeState(cur), cards);
    await set(ref(db, `games/${rid}/state`), ns);
  }, []);

  // ── pushPickUp ─────────────────────────────────────────────────────────────
  const pushPickUp = useCallback(async () => {
    const rid = roomIdRef.current;
    if (!rid) return;
    const snap = await get(ref(db, `games/${rid}/state`));
    const cur  = snap.val();
    if (!cur) return;
    const ns = applyPickUp(sanitizeState(cur));
    await set(ref(db, `games/${rid}/state`), ns);
  }, []);

  // ── leaveRoom ──────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const rid = roomIdRef.current;
    if (rid && MY_UID) {
      await remove(ref(db, `games/${rid}/players/${MY_UID}`));
    }
    cleanupListeners();
    clearSession();
    setRoomId(null);
    setRoomStatus(null);
    setRoomPlayers({});
    setMaxPlayers(null);
    setIsHost(false);
    setMySlot(null);
    setState(null);
    setError(null);
    setAborted(false);
    roomIdRef.current  = null;
    mySlotRef.current  = null;
    isHostRef.current  = false;
    writingRef.current = false;
  }, [cleanupListeners]);

  // Cleanup on unmount
  useEffect(() => () => { cleanupListeners(); }, [cleanupListeners]);

  return {
    myUid: MY_UID, mySlot, isHost,
    roomId, roomStatus, roomPlayers, maxPlayers,
    state, error, aborted,
    createRoom, joinRoom, startGame, abortGame,
    ackDealDone,
    pushSwap, pushConfirmSetup,
    pushPlay, pushPickUp,
    leaveRoom,
  };
}
