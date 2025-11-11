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

let score1=0, score2=0, isPlaying=false;
let player;
const playlist=[
  {id:"dQw4w9WgXcQ", title:"Canción Misteriosa 1"},
  {id:"3JZ4pnNtyxQ", title:"Canción Misteriosa 2"},
  {id:"L_jWHffIx5E", title:"Canción Misteriosa 3"}
];
let currentSong=playlist[0];

// --- YouTube API ---
function onYouTubeIframeAPIReady(){
  player = new YT.Player('player', {
    videoId:currentSong.id,
    events:{ 'onReady':()=>player.pauseVideo(), 'onStateChange': syncProgress }
  });
}

function syncProgress(event){
  if(event.data === YT.PlayerState.PLAYING) updateProgress();
}
function updateProgress(){
  if(player && player.getCurrentTime){
    const pct=(player.getCurrentTime()/player.getDuration())*100;
    document.getElementById("progress").style.width=pct+"%";
    if(isPlaying) requestAnimationFrame(updateProgress);
  }
}

// --- Botones ---
// --- 🔹 Control de turnos ---
let canPress = true;

// Alguien presiona su botón
function playerPressed(num) {
  if (!canPress) return; // si ya hay alguien que presionó, no hacer nada

  // Registrar quién presionó y pausar video
  db.ref('game/lastClick').set({
    player: num,
    time: Date.now()
  });
  db.ref('game/play').set(false);
}

// Resetear el turno para volver a habilitar ambos botones
function resetButtons() {
  db.ref('game/lastClick').set(null); // borra en Firebase
  db.ref('game/play').set(true); // vuelve a reproducir el video
}

// Escuchar cambios de turno desde Firebase
db.ref('game/lastClick').on('value', snap => {
  const d = snap.val();

  if (!d) {
    // Si no hay turno guardado, habilitar ambos y mostrar mensaje
    canPress = true;
    document.getElementById("message").innerText = "🎵 Nuevo turno: ¡a jugar!";
    return;
  }

  // Si hay un jugador que presionó, mostrar quién fue
  canPress = false;
  document.getElementById("message").innerText =
    d.player === 1
      ? "💗 ¡Cele presionó primero! ⏸️"
      : "💙 ¡Tade presionó primero! ⏸️";
});

// --- Puntajes ---
function addPoint(n){ db.ref('game/score'+n).set((n===1?++score1:++score2)); }
// CORREGIDO:
function subtractPoint(n){ db.ref('game/score'+n).set((n===1?--score1:--score2)); }
db.ref('game/score1').on('value', s=>{score1=s.val()||0; document.getElementById("score1").innerText=score1;});
db.ref('game/score2').on('value', s=>{score2=s.val()||0; document.getElementById("score2").innerText=score2;});

// --- Sincronizar Reproductor ---
function togglePlay(){ db.ref('game/play').set(!isPlaying); }
db.ref('game/play').on('value', s=>{
  const v=s.val();
  if(player){
    if(v) player.playVideo(); else player.pauseVideo();
    isPlaying=v;
  }
});

function nextSong(){
  const next=playlist[Math.floor(Math.random()*playlist.length)];
  db.ref('game/song').set(next);
}
db.ref('game/song').on('value', s=>{
  const v=s.val(); if(!v) return;
  currentSong=v;
  if(player) player.loadVideoById(currentSong.id);
  document.getElementById("song-title").innerText="";
});

function revealSong(){ db.ref('game/reveal').set(currentSong.title); }
db.ref('game/reveal').on('value', s=>{
  const title=s.val();
  if(title) document.getElementById("song-title").innerText=title;
});
// --- Extraer ID de YouTube ---
function extractYouTubeID(url) {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// --- Agregar nueva canción ---
// (Esta función se queda porque la usa el formulario de ARRIBA)
function addSong() {
  const url = document.getElementById("song-url").value.trim();
  const name = document.getElementById("song-name").value.trim() || "Canción Misteriosa";
  const id = extractYouTubeID(url);

  if (!id) {
    alert("❌ URL de YouTube no válida");
    return;
  }

  const newSong = { id, title: name };

  // Guardar en Firebase playlist
  db.ref('playlist').push(newSong);

  // Actualizar video actual y reproducir
  db.ref('game/song').set(newSong);
  db.ref('game/play').set(true);

  // Limpiar campos
  document.getElementById("song-url").value = "";
  document.getElementById("song-name").value = "";
}

// --- Limpiar playlist ---
// (Función y listener eliminados porque borramos el botón)

// --- Sincronizar playlist desde Firebase ---
db.ref('playlist').on('value', snap => {
  const list = snap.val();
  const ul = document.getElementById("playlist");
  ul.innerHTML = "";
  if (list) {
    Object.values(list).forEach(song => {
      const li = document.createElement("li");
      li.innerText = song.title;
      ul.appendChild(li);
    });
  }
});