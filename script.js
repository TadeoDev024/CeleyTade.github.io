const CLIENT_ID = "9842a2b6d00a46b386ba48973447035f"; 
const REDIRECT_URI = "https://CeleyTade.github.io/"; // Ej: https://celeytade.github.io/
const YOUTUBE_API_KEY = "AIzaSyBT6Mtka2ESW2Q7fsLNIgDqRAa8o54_lIM";
const SPOTIFY_PLAYLIST_ID = "5YS3pMDzrVjG8Hehl5a8dl"; // El código raro de la URL de tu playlist
/* ===================================== */

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
let spotifyToken = "";
let gamePlaylist = []; // Aquí vivirá la playlist de Spotify
let currentSong = { id: "dQw4w9WgXcQ", title: "Esperando..." };

// --- 1. Autenticación con Spotify ---
function authorizeSpotify() {
  const scope = "playlist-read-private playlist-read-collaborative";
  const url = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}`;
  window.location.href = url;
}

// Al cargar la página, revisamos si volvimos de Spotify con el token
window.onload = () => {
  const hash = window.location.hash;
  if (hash.includes("access_token")) {
    // ¡Tenemos token!
    spotifyToken = new URLSearchParams(hash.substring(1)).get("access_token");
    window.location.hash = ""; // Limpiar URL
    document.getElementById("login-section").style.display = "none";
    document.getElementById("game-area").style.display = "block";
    loadSpotifyPlaylist();
  }
};

// --- 2. Cargar Playlist de Spotify ---
async function loadSpotifyPlaylist() {
  if (!spotifyToken) return;
  document.getElementById("message").innerText = "⏳ Cargando playlist de Spotify...";
  
  try {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?limit=100`, {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    });
    const data = await res.json();
    
    // Guardamos las canciones en nuestra lista
    gamePlaylist = data.items.map(item => ({
      title: item.track.name + " - " + item.track.artists[0].name
    }));

    document.getElementById("message").innerText = `✅ ¡${gamePlaylist.length} canciones cargadas!`;
    updatePlaylistUI();
    
  } catch (e) {
    alert("Error cargando playlist. Revisa tu ID de Playlist.");
    console.error(e);
  }
}

// Actualiza la lista visual
function updatePlaylistUI() {
  const ul = document.getElementById("playlist");
  ul.innerHTML = "";
  gamePlaylist.forEach(song => {
    const li = document.createElement("li");
    li.innerText = song.title;
    ul.appendChild(li);
  });
}

// --- 3. Buscar en YouTube y Reproducir ---
async function nextSong() {
  if (gamePlaylist.length === 0) {
    alert("¡Primero conecta Spotify o espera a que cargue!");
    return;
  }

  // Elegir canción al azar
  const randomSong = gamePlaylist[Math.floor(Math.random() * gamePlaylist.length)];
  document.getElementById("message").innerText = `🔎 Buscando: ${randomSong.title}...`;

  try {
    // Buscar en YouTube
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(randomSong.title)}&type=video&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) throw new Error("No video found");

    const videoId = data.items[0].id.videoId;

    // Actualizar Firebase (el juego real)
    const newSong = { id: videoId, title: randomSong.title };
    db.ref('game/song').set(newSong);
    db.ref('game/reveal').set(""); 
    db.ref('game/play').set(true); 
    db.ref('game/lastClick').set(null);

  } catch (e) {
    console.error(e);
    alert("Error buscando en YouTube. Intenta de nuevo.");
  }
}


// --- Lógica del Juego (YouTube + Firebase) ---
function onYouTubeIframeAPIReady(){
  player = new YT.Player('player', {
    videoId:currentSong.id,
    playerVars: { 'controls': 1 }, // Controles activados
    events:{ 'onReady':()=>player.pauseVideo(), 'onStateChange': syncProgress }
  });
}

function syncProgress(event){ if(event.data === YT.PlayerState.PLAYING) updateProgress(); }
function updateProgress(){
  if(player && player.getCurrentTime){
    const pct=(player.getCurrentTime()/player.getDuration())*100;
    document.getElementById("progress").style.width=pct+"%";
    if(isPlaying) requestAnimationFrame(updateProgress);
  }
}

let canPress = true;
function playerPressed(num) {
  if (!canPress) return; 
  db.ref('game/lastClick').set({ player: num, time: Date.now() });
  db.ref('game/play').set(false);
}

function resetButtons() {
  db.ref('game/lastClick').set(null);
  db.ref('game/play').set(true);
}

db.ref('game/lastClick').on('value', snap => {
  const d = snap.val();
  if (!d) {
    canPress = true;
    document.getElementById("message").innerText = "🎵 Nuevo turno: ¡a jugar!";
    return;
  }
  canPress = false;
  document.getElementById("message").innerText = d.player === 1 ? "💗 ¡Cele presionó primero! ⏸️" : "💙 ¡Tade presionó primero! ⏸️";
});

function addPoint(n){ db.ref('game/score'+n).set((n===1?++score1:++score2)); }
function subtractPoint(n){ db.ref('game/score'+n).set((n===1?--score1:--score2)); }
db.ref('game/score1').on('value', s=>{score1=s.val()||0; document.getElementById("score1").innerText=score1;});
db.ref('game/score2').on('value', s=>{score2=s.val()||0; document.getElementById("score2").innerText=score2;});

function togglePlay(){ db.ref('game/play').set(!isPlaying); }
db.ref('game/play').on('value', s=>{
  const v=s.val();
  if(player && player.playVideo) {
    if(v) player.playVideo(); else player.pauseVideo();
    isPlaying=v;
  }
});

db.ref('game/song').on('value', s=>{
  const v=s.val(); if(!v) return;
  currentSong=v;
  if(player && player.loadVideoById) player.loadVideoById(currentSong.id);
  document.getElementById("song-title").innerText="";
});

function revealSong(){ db.ref('game/reveal').set(currentSong.title); }
db.ref('game/reveal').on('value', s=>{
  const title=s.val();
  const el = document.getElementById("song-title");
  if(title) { el.innerText=title; el.style.filter="none"; }
  else { el.innerText="Canción Oculta"; el.style.filter="blur(5px)"; }
});

// Función Manual (Backup)
function extractYouTubeID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function addSong() {
  const url = document.getElementById("song-url").value.trim();
  const name = document.getElementById("song-name").value.trim() || "Canción Manual";
  const id = extractYouTubeID(url);
  if (!id) return alert("Link inválido");
  
  const newSong = { id, title: name };
  db.ref('game/song').set(newSong);
  db.ref('game/play').set(true);
}