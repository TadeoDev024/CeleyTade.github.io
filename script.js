// --- CONFIGURACIÓN FIREBASE ---
// (Tu configuración no cambia)
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

function onPlayerReady(event) {
  // Al cargar, revisamos si ya hay una canción guardada
  db.ref('game/song').once('value', s => {
      const id = s.val();
      if(id) {
          currentSongId = id;
          player.loadVideoById(currentSongId);
          // Verificar si debería estar sonando
          db.ref('game/play').once('value', p => {
             if(!p.val()) player.pauseVideo();
          });
      }
  });
}

function onPlayerStateChange(event) {
    // Si el video termina, avisamos a la base de datos
    if (event.data === YT.PlayerState.ENDED) {
        db.ref('game/play').set(false);
    }
}

// --- LOGICA DE JUEGO (Recibir Video) ---

function extractYouTubeID(url) {
  // Esta es la expresión regular "todoterreno" que funciona mejor
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function addSong() {
  const url = document.getElementById("song-url").value.trim();
  const id = extractYouTubeID(url);
  
  if (!id) return alert("❌ Link inválido. Usa un link normal de YouTube.");
  
  // 1. Subir ID de la canción (Lógica simple)
  db.ref('game/song').set(id);
  // 2. Resetear turnos
  db.ref('game/lastClick').set(null);
  // 3. Dar Play automático (Usando el sistema simple de true/false)
  db.ref('game/play').set(true);

  // Limpiar el input
  document.getElementById("song-url").value = "";
}

// --- ESCUCHAS DE FIREBASE ---

// 1. Cambio de Canción
db.ref('game/song').on('value', s=>{
  const id = s.val(); 
  if(!id) return;
  
  currentSongId = id;
  // Solo cargamos el video, sin inventos raros de tiempo
  if(player && player.loadVideoById) {
      player.loadVideoById(currentSongId);
  }
  document.getElementById("message").innerText = "🎶 Canción lista...";
});

// 2. Play/Pause (Simple)
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

// 3. Botones Cele/Tade
let canPress = true;
function playerPressed(num) {
  if (!canPress) return; 
  // Guardar quién fue y PAUSAR
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


// 4. Puntuaciones
function addPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) + 1); }
function subtractPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) - 1); }

db.ref('game/score1').on('value', s=>{ score1=s.val()||0; document.getElementById("score1").innerText=score1; });
db.ref('game/score2').on('value', s=>{ score2=s.val()||0; document.getElementById("score2").innerText=score2; });