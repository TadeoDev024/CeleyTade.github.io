// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey:"AIzaSyDnm7xpjFtaqwYeCRJG0ms8QR7J9k010Tk",
  authDomain:"juegoadivinalacancion-5152e.firebaseapp.com",
  projectId:"juegoadivinalacancion-5152e",
  storageBucket:"juegoadivinalacancion-5152e.firebasestorage.app",
  messagingSenderId:"543704119927",
  appId:"1:543704119927:web:613939b3ffee9dab25e472",
  measurementId:"G-TYSK5TJCMZ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- VARIABLES GLOBALES ---
let player; 
let currentSongId = "";
let score1 = 0;
let score2 = 0;

// --- FUNCIONES YOUTUBE ---
function onYouTubeIframeAPIReady(){
  player = new YT.Player('player', {
    height: '100%', 
    width: '100%',
    videoId: '', 
    playerVars: { 
      'controls': 1, 
      'disablekb': 1, 
      'rel': 0,
      'modestbranding': 1
    }, 
    events:{ 
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// ✨ FUNCIÓN DE SEGURIDAD PARA LIMPIAR DATOS ✨
function getCleanID(val) {
  if (!val) return null;
  // Si el dato es un "objeto" (la versión rota), sacamos solo el ID
  if (typeof val === 'object' && val.id) {
    return val.id;
  }
  // Si es texto normal, lo devolvemos tal cual
  return val;
}

function onPlayerReady(event) {
  db.ref('game/song').once('value', s => {
      // Usamos la función de seguridad aquí
      const id = getCleanID(s.val());
      
      if(id) {
          currentSongId = id;
          player.loadVideoById(currentSongId);
          db.ref('game/play').once('value', p => {
             if(!p.val()) player.pauseVideo();
          });
      }
  });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        db.ref('game/play').set(false);
    }
}

// --- LOGICA DE JUEGO ---

function extractYouTubeID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function addSong() {
  const url = document.getElementById("song-url").value.trim();
  const id = extractYouTubeID(url);
  
  if (!id) return alert("❌ Link inválido.");
  
  // Guardamos solo el ID (Texto simple) para limpiar la base de datos
  db.ref('game/song').set(id);
  db.ref('game/lastClick').set(null);
  db.ref('game/play').set(true);

  document.getElementById("song-url").value = "";
}

// --- ESCUCHAS DE FIREBASE ---

db.ref('game/song').on('value', s=>{
  // Usamos la función de seguridad también aquí
  const id = getCleanID(s.val());
  
  if(!id) return;
  
  currentSongId = id;
  if(player && player.loadVideoById) {
      player.loadVideoById(currentSongId);
  }
  document.getElementById("message").innerText = "🎶 Canción lista...";
});

// Play/Pause Simple
function togglePlay(){ 
    db.ref('game/play').once('value', s => {
        db.ref('game/play').set(!s.val());
    });
}

db.ref('game/play').on('value', s=>{
  const shouldPlay = s.val();
  if(player && player.playVideo) {
    if(shouldPlay) player.playVideo(); 
    else player.pauseVideo();
  }
});

// Botones Cele/Tade
let canPress = true;
function playerPressed(num) {
  if (!canPress) return; 
  db.ref('game/lastClick').set({ player: num });
  db.ref('game/play').set(false);
}

function resetButtons() {
  db.ref('game/lastClick').set(null);
  document.getElementById("message").innerText = "🔄 ¡Sigan jugando!";
}

db.ref('game/lastClick').on('value', snap => {
  const d = snap.val();
  if (!d) {
    canPress = true;
    return;
  }
  canPress = false;
  const nombre = d.player === 1 ? "💗 Cele" : "💙 Tade";
  document.getElementById("message").innerText = `🚨 ¡${nombre} paró la música!`;
});

// Puntuaciones
function addPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) + 1); }
function subtractPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) - 1); }

db.ref('game/score1').on('value', s=>{ score1=s.val()||0; document.getElementById("score1").innerText=score1; });
db.ref('game/score2').on('value', s=>{ score2=s.val()||0; document.getElementById("score2").innerText=score2; });