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

// --- VARIABLES ---
let player; 
let currentSongId = "";
let score1 = 0;
let score2 = 0;

// --- YOUTUBE API ---
function onYouTubeIframeAPIReady(){
  player = new YT.Player('player', {
    height: '100%', 
    width: '100%',
    videoId: '', 
    playerVars: { 
      'controls': 1,      // Permitir ver controles
      'disablekb': 0,     // Permitir teclado
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
  // Cargar canción inicial si existe
  db.ref('game/song').once('value', s => {
      const id = s.val();
      if(id) {
          currentSongId = id;
          player.loadVideoById(currentSongId);
      }
  });
}

// Detectar si el video termina solo
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        db.ref('game/status').update({ isPlaying: false });
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
  
  // Guardar nueva canción
  db.ref('game/song').set(id);
  // Resetear turnos
  db.ref('game/lastClick').set(null);
  // Iniciar reproducción desde 0
  db.ref('game/status').set({
      isPlaying: true,
      timestamp: 0 
  });

  document.getElementById("song-url").value = "";
}

// --- SINCRONIZACIÓN AVANZADA ---

// 1. Escuchar cambio de canción
db.ref('game/song').on('value', s=>{
  const id = s.val(); 
  if(!id) return;
  currentSongId = id;
  if(player && player.loadVideoById) {
      player.loadVideoById(currentSongId);
  }
  document.getElementById("message").innerText = "🎶 Nueva canción cargada...";
});

// 2. Play/Pause con TIEMPO
function togglePlay(){ 
    if(!player || !player.getCurrentTime) return;

    db.ref('game/status').once('value', s => {
        const status = s.val() || { isPlaying: false };
        const newExito = !status.isPlaying;
        const currentTime = player.getCurrentTime(); // Tomar tiempo actual

        // Enviar a Firebase: "Ponte en Play/Pause en el segundo X"
        db.ref('game/status').set({
            isPlaying: newExito,
            timestamp: currentTime
        });
    });
}

// Escuchar cambios de estado (Play/Pause/Tiempo)
db.ref('game/status').on('value', s=>{
  const status = s.val();
  if(!status || !player || !player.seekTo) return;
  
  // Si Firebase dice que hay que reproducir
  if(status.isPlaying) {
      // Importante: Saltamos al segundo que dice Firebase
      // para que ambos estén igualados.
      // (Solo si la diferencia es grande para evitar saltos pequeños)
      const diff = Math.abs(player.getCurrentTime() - status.timestamp);
      if(diff > 1) {
          player.seekTo(status.timestamp);
      }
      player.playVideo();
  } else {
      player.pauseVideo();
  }
});

// 3. Botones Cele/Tade
let canPress = true;
function playerPressed(num) {
  if (!canPress) return; 
  
  db.ref('game/lastClick').set({ player: num });
  
  // Pausar para todos
  if(player) {
      db.ref('game/status').update({
          isPlaying: false,
          timestamp: player.getCurrentTime()
      });
  }
}

function resetButtons() {
  db.ref('game/lastClick').set(null);
  document.getElementById("message").innerText = "🔄 ¡Sigan jugando!";
  // Opcional: Auto-play al resetear
  // togglePlay(); 
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