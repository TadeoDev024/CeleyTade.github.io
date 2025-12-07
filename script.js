// --- CONFIGURACIÓN DE FIREBASE ---
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
let isPlaying = false;
let currentSong = { id: "", title: "" };
let score1 = 0;
let score2 = 0;

// --- FUNCIONES YOUTUBE ---
function onYouTubeIframeAPIReady(){
  player = new YT.Player('player', {
    height: '315',
    width: '560',
    videoId: '', // Se carga dinámicamente
    playerVars: { 
      'controls': 1, // Mostrar controles
      'disablekb': 1, // Desactivar teclado
      'rel': 0 // Sin videos relacionados al final
    }, 
    events:{ 
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  // Sincronizar si ya había una canción sonando al entrar
  db.ref('game/song').once('value', s => {
      if(s.val()) {
          currentSong = s.val();
          player.loadVideoById(currentSong.id);
      }
  });
}

function onPlayerStateChange(event) {
    // Si termina el video, avisar a Firebase
    if (event.data === YT.PlayerState.ENDED) {
        db.ref('game/play').set(false);
    }
}

// --- LÓGICA DE CARGA DE CANCIONES (MANUAL) ---
function extractYouTubeID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function addSong() {
  const url = document.getElementById("song-url").value.trim();
  const name = document.getElementById("song-name").value.trim() || "Canción Secreta";
  const id = extractYouTubeID(url);
  
  if (!id) return alert("❌ Link inválido de YouTube");
  
  const newSong = { id: id, title: name };
  
  // 1. Subir nueva canción
  db.ref('game/song').set(newSong);
  // 2. Ocultar respuesta
  db.ref('game/reveal').set(""); 
  // 3. Resetear turnos
  db.ref('game/lastClick').set(null);
  // 4. Dar Play automático
  db.ref('game/play').set(true);

  // Limpiar inputs
  document.getElementById("song-url").value = "";
  document.getElementById("song-name").value = "";
}

// --- SINCRONIZACIÓN FIREBASE (EL CEREBRO DEL JUEGO) ---

// 1. Escuchar cambio de canción
db.ref('game/song').on('value', s=>{
  const v = s.val(); 
  if(!v) return;
  currentSong = v;
  if(player && player.loadVideoById) {
      player.loadVideoById(currentSong.id);
  }
  document.getElementById("message").innerText = "🎶 Nueva canción cargada...";
});

// 2. Escuchar Play/Pause
function togglePlay(){ 
    db.ref('game/play').once('value', s => {
        db.ref('game/play').set(!s.val());
    });
}

db.ref('game/play').on('value', s=>{
  const shouldPlay = s.val();
  isPlaying = shouldPlay;
  
  if(player && player.playVideo) {
    if(shouldPlay) player.playVideo(); 
    else player.pauseVideo();
  }
});

// 3. Escuchar Botones (Cele/Tade)
let canPress = true;
function playerPressed(num) {
  if (!canPress) return; 
  // Al presionar: Guardar quién fue, guardar el momento, y PAUSAR LA MÚSICA
  db.ref('game/lastClick').set({ player: num, time: Date.now() });
  db.ref('game/play').set(false);
}

function resetButtons() {
  db.ref('game/lastClick').set(null);
  document.getElementById("message").innerText = "🔄 ¡Turno reseteado! Sigan jugando.";
}

db.ref('game/lastClick').on('value', snap => {
  const d = snap.val();
  if (!d) {
    canPress = true;
    return;
  }
  canPress = false;
  const nombre = d.player === 1 ? "💗 Cele" : "💙 Tade";
  document.getElementById("message").innerText = `🚨 ¡${nombre} presionó primero! ⏸️`;
});

// 4. Escuchar Revelar Nombre
function revealSong(){ 
    db.ref('game/reveal').set(currentSong.title); 
}

db.ref('game/reveal').on('value', s=>{
  const title = s.val();
  const el = document.getElementById("song-title");
  if(title) { 
      el.innerText = title; 
      el.style.filter = "none"; 
  } else { 
      el.innerText = "???"; 
      el.style.filter = "blur(10px)"; 
  }
});

// 5. Puntuaciones
function addPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) + 1); }
function subtractPoint(n){ db.ref('game/score'+n).transaction(score => (score || 0) - 1); }

db.ref('game/score1').on('value', s=>{ score1=s.val()||0; document.getElementById("score1").innerText=score1; });
db.ref('game/score2').on('value', s=>{ score2=s.val()||0; document.getElementById("score2").innerText=score2; });