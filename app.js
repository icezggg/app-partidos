const API_URL = "https://script.google.com/macros/s/AKfycbwG-jkQ120wbMnNokuBCnHrQZtp3BG6sXxwvNyTxPOkvZH0kKdDpiDkKE8UyY5gjrux/exec";
let DB = {}; let photosMap = {};
let voteID = localStorage.getItem('tecsports_voter_id');
if(!voteID) { voteID = 'voter_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('tecsports_voter_id', voteID); }
let currentSeason = '2'; let currentProfileSeason = 'hist'; let currentDuelSeason = 'hist';
let duelP1Name = null; let duelP2Name = null;
let adminSection = 'menu'; let adminPassword = null;
let adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] };
let teamGenPlayers = [];
let cardGenData = { name: '', ovr: 75, pos: 'DC', stats: { rit: 75, tir: 75, pas: 75, reg: 75, def: 75, fis: 75 }, photo: '' };
let teamGenSeason = 'hist';
let teamGenCriteria = 'OVERALL';
let currentUser = localStorage.getItem('tecsports_user') || null;

function updateAuthButtons() {
    const btnPc = document.getElementById('auth-btn-pc');
    const btnMobile = document.getElementById('auth-btn-mobile');
    
    [btnPc, btnMobile].forEach(btn => {
        if(!btn) return;
        if(currentUser) {
            btn.innerText = "Cerrar Sesión";
            btn.setAttribute('onclick', 'openLogoutModal()');
            btn.classList.remove('text-green-400', 'hover:text-green-300');
            btn.classList.add('text-red-400', 'hover:text-red-300');
        } else {
            btn.innerText = "Ingresar";
            btn.setAttribute('onclick', 'openLoginModal()');
            btn.classList.remove('text-red-400', 'hover:text-red-300');
            btn.classList.add('text-green-400', 'hover:text-green-300');
        }
    });
}

const n = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
    return isNaN(str) || str === '' ? 0 : Number(str);
};
const getPhoto = (name) => photosMap[name] || "https://via.placeholder.com/150";

const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    try { const d = new Date(dateStr); if (isNaN(d.getTime())) return ''; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } catch (e) { return ''; }
};

function getSeasonData(seasonKey) {
    if (seasonKey === 't1' || seasonKey === '1') return DB['TEMP 1'] || DB['Temp 1'] || DB['TEMP1'] || [];
    if (seasonKey === 't2' || seasonKey === '2') return DB['TEMP 2'] || DB['Temp 2'] || DB['TEMP2'] || [];
    return DB['HISTORICA'] || [];
}

const generateFifaStats = (p) => {
    if(!p) return [50, 50, 50, 50, 50, 50];
    const pj = Math.max(1, n(p.PARTIDOS || p.PJ || p['PARTIDOS ']));
    const victorias = n(p.VICTORIAS || p.PG || p['VICTORIAS ']);
    const goles = n(p.GOLES || p.Goles || p.G || p['GOLES ']);
    const mvps = n(p["MVP'S"] || p.MVP || p.MVPS || p["MVP'S "]);
    const promedio = n(p.PROMEDIO || p.Promedio || p.Prom || p['PROMEDIO ']);
    const wr = victorias / pj; 
    const ratio = goles / pj; 
    const wrFactor = wr > 1 ? (wr / 100) : wr;
    const calc = (val, min, max) => Math.min(max, Math.max(min, Math.round(val)));
    const pos = String(p.POSICION || p['POSICION '] || 'DC').toUpperCase();
    let mod = [0, 0, 0, 0, 0, 0];
    if (pos.includes('GK')) mod = [-10, -30, -10, -20, 15, 0];
    else if (pos.includes('DF')) mod = [-5, -15, -5, -10, 15, 10];
    else if (pos.includes('CM') || pos.includes('MD') || pos.includes('MCO')) mod = [0, 0, 10, 5, 0, 0];
    else if (pos.includes('W') || pos.includes('LW') || pos.includes('RW')) mod = [10, 0, 0, 10, -15, -5];
    else if (pos.includes('DC')) mod = [0, 10, -5, 5, -20, 10];
    const rit = calc(45 + (promedio * 3) + (wrFactor * 10) + ((mvps / pj) * 15) + mod[0], 50, 99);
    const tir = calc(40 + (ratio * 22) + ((mvps / pj) * 12) + (promedio * 1.5) + mod[1], 50, 99);
    const pas = calc(42 + (promedio * 3.5) + (wrFactor * 12) + mod[2], 50, 99);
    const reg = calc(42 + (promedio * 3) + ((mvps / pj) * 20) + (ratio * 5) + mod[3], 50, 99);
    const def = calc(50 + (promedio * 3.5) + (wrFactor * 10) - (ratio * 12) + mod[4], 40, 99);
    const fis = calc(45 + (promedio * 3.2) + (wrFactor * 10) + (pj * 0.6) + (mvps * 1.2) + mod[5], 50, 99);
    return [rit, tir, pas, reg, def, fis];
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha N/D';
    try { const d = new Date(dateStr); if (isNaN(d.getTime())) return dateStr; return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; } catch (e) { return dateStr; }
};

const getPitchX = (posStr, team) => {
    const pos = String(posStr || 'DC').toUpperCase();
    let x = team === 1 ? 30 : 70;
    if(pos.includes('GK')) x = team === 1 ? 5 : 95;
    else if(pos.includes('DF')) x = team === 1 ? 15 : 85;
    else if(pos.includes('CM') || pos.includes('MD') || pos.includes('MCO')) x = team === 1 ? 28 : 72; // Medio campo un poco más atrás
    else if(pos.includes('W') || pos.includes('LW') || pos.includes('RW')) x = team === 1 ? 38 : 62; // Extremos un poco más atrás
    else if(pos.includes('DC')) x = team === 1 ? 44 : 56; // Delanteros separados del centro para que no se pisen con el otro equipo
    return x;
};

function getCardType(ovr) { if(ovr >= 94) return 'toty'; if(ovr >= 75) return 'gold'; if(ovr >= 68) return 'silver'; return 'bronze'; }
function getOvrColor(ovr) { if(ovr >= 94) return 'text-cyan-400'; if(ovr >= 75) return 'text-yellow-400'; if(ovr >= 68) return 'text-gray-300'; return 'text-orange-600'; }

function toggleDrawer() {
    const drawer = document.getElementById('drawer');
    const isOpen = drawer.classList.toggle('drawer-open');
    document.body.classList.toggle('no-scroll', isOpen);
}

function calculateRecords() {
    const matches = DB['PARTIDOS'] || [];
    const details = DB['DETALLE_PARTIDO'] || [];
    let records = { biggestWin: null, winStreak: { name: '-', val: 0 }, bestForm: { name: '-', val: 0 } };
    let maxDiff = 0, maxTotal = 0;
    matches.forEach(m => {
        const g1 = n(m.Goles_E1 || m['Goles E1'] || m['Goles Equipo 1']);
        const g2 = n(m.Goles_E2 || m['Goles E2'] || m['Goles Equipo 2']);
        const diff = Math.abs(g1 - g2);
        const total = g1 + g2;
        if (diff > maxDiff || (diff === maxDiff && total > maxTotal)) { maxDiff = diff; maxTotal = total; records.biggestWin = m; }
    });
    const matchDetailsMap = {};
    details.forEach(d => { if(!matchDetailsMap[d.ID_Partido]) matchDetailsMap[d.ID_Partido] = []; matchDetailsMap[d.ID_Partido].push(d); });
    const playerHistory = {};
    matches.forEach(m => {
        const dets = matchDetailsMap[m.ID_Partido] || [];
        const g1 = n(m.Goles_E1 || m['Goles E1'] || m['Goles Equipo 1']);
        const g2 = n(m.Goles_E2 || m['Goles E2'] || m['Goles Equipo 2']);
        dets.forEach(d => {
            if(!playerHistory[d.Jugador]) playerHistory[d.Jugador] = [];
            const team = String(d.Equipo).includes('1') ? 1 : 2;
            let res = d.Resultado;
            if(!res) {
                if (team === 1) res = g1 > g2 ? 'Ganó' : (g1 < g2 ? 'Perdió' : 'Empató');
                else res = g2 > g1 ? 'Ganó' : (g2 < g1 ? 'Perdió' : 'Empató');
            }
            playerHistory[d.Jugador].push({ res: String(res).trim(), nota: n(d.Nota) });
        });
    });
    for(const player in playerHistory) {
        const history = playerHistory[player];
        let streak = 0;
        for(let i = history.length - 1; i >= 0; i--) { 
            if(String(history[i].res).toLowerCase().includes('gan')) streak++; 
            else break; 
        }
        if(streak > records.winStreak.val) records.winStreak = { name: player, val: streak };
        const last3 = history.slice(-3);
        if(last3.length > 0) {
            const avg = last3.reduce((sum, p) => sum + p.nota, 0) / last3.length;
            if(avg > records.bestForm.val) records.bestForm = { name: player, val: avg.toFixed(2) };
        }
    }
    return records;
}

function getTeammatesAndRivals(playerName) {
    const matches = DB['PARTIDOS'] || [];
    const details = DB['DETALLE_PARTIDO'] || [];
    let teammates = {}; let rivals = {}; let stadiumStats = {};
    const matchDetailsMap = {};
    details.forEach(d => { if(!matchDetailsMap[d.ID_Partido]) matchDetailsMap[d.ID_Partido] = []; matchDetailsMap[d.ID_Partido].push(d); });
    matches.forEach(m => {
        const dets = matchDetailsMap[m.ID_Partido] || [];
        const me = dets.find(d => d.Jugador === playerName);
        if(!me) return;
        const myTeam = String(me.Equipo).includes('1') ? 1 : 2;
        const g1 = n(m.Goles_E1 || m['Goles E1'] || m['Goles Equipo 1']);
        const g2 = n(m.Goles_E2 || m['Goles E2'] || m['Goles Equipo 2']);
        let iWon = false;
        if (myTeam === 1) iWon = g1 > g2;
        else iWon = g2 > g1;
        let iLost = false;
        if (myTeam === 1) iLost = g1 < g2;
        else iLost = g2 < g1;
        let est = m.Estadio || m.Cancha || m['Estadio '] || m.ESTADIO || '';
        if(!est) {
            for(let k in m) {
                if (k.toUpperCase().includes('ESTADIO') || k.toUpperCase().includes('CANCHA')) {
                    est = m[k]; break;
                }
            }
        }
        if(!est) est = 'St. Diego';
        if(!stadiumStats[est]) stadiumStats[est] = { pj: 0, pg: 0, goles: 0 };
        stadiumStats[est].pj++; if(iWon) stadiumStats[est].pg++; stadiumStats[est].goles += n(me.Goles);
        dets.forEach(d => {
            if(d.Jugador === playerName) return;
            const theirTeam = String(d.Equipo).includes('1') ? 1 : 2;
            if(theirTeam === myTeam) {
                if(!teammates[d.Jugador]) teammates[d.Jugador] = { wins: 0, total: 0 };
                teammates[d.Jugador].total++; if(iWon) teammates[d.Jugador].wins++;
            } else {
                if(!rivals[d.Jugador]) rivals[d.Jugador] = { losses: 0, total: 0 };
                rivals[d.Jugador].total++; if(iLost) rivals[d.Jugador].losses++;
            }
        });
    });
    let bestMate = { name: '-', wr: 0 };
    for(const t in teammates) {
        if(teammates[t].total >= 2 && teammates[t].wins > 0) {
            const wr = (teammates[t].wins / teammates[t].total) * 100;
            if(wr > bestMate.wr) bestMate = { name: t, wr: wr.toFixed(0) };
        }
    }
    let worstRival = { name: '-', lr: 0 };
    for(const r in rivals) {
        if(rivals[r].total >= 2 && rivals[r].losses > 0) {
            const lr = (rivals[r].losses / rivals[r].total) * 100;
            if(lr > worstRival.lr) worstRival = { name: r, lr: lr.toFixed(0) };
        }
    }
    return { bestMate, worstRival, stadiumStats };
}

async function loadData() {
    try {
        const cachedDB = localStorage.getItem('tecSportsDB');
        if(cachedDB) {
            DB = JSON.parse(cachedDB);
            processPhotos(DB);
            document.getElementById('loader').style.display = 'none';
            document.getElementById('app-body').style.display = 'block';
            const initialRoute = getRouteFromUrl();
            showView(initialRoute.view, initialRoute.param); // Usa la ruta de la URL
        }
        
        const res = await fetch(API_URL + '?t=' + Date.now());
        DB = await res.json();
        localStorage.setItem('tecSportsDB', JSON.stringify(DB));
        processPhotos(DB);
        
        if(!cachedDB) {
            document.getElementById('loader').style.display = 'none';
            document.getElementById('app-body').style.display = 'block';
            const initialRoute = getRouteFromUrl();
            showView(initialRoute.view, initialRoute.param);
        } else {
            // Si ya estaba renderizada, la actualizamos silenciosamente
            const currentView = document.querySelector('.sidebar-link.active')?.getAttribute('onclick').match(/'([^']+)'/)[1] || 'home';
            showView(currentView);
        }
    } catch (e) {
        document.getElementById('loader').innerHTML = '<p class="text-red-500 font-bold p-4 text-center">Error de conexión.</p>';
    }
}

function processPhotos(dbData) {
    photosMap = {};
    if(dbData['FOTOS']) {
        dbData['FOTOS'].forEach(row => {
            if(row.JUGADOR && row.FOTO_ID) {
                let size = 'sz=w150';
                if(['LOGO', 'ESQUINA', 'ORO', 'PLATA', 'BRONCE', 'TOTY'].includes(row.JUGADOR)) size = 'sz=w500';
                const url = `https://drive.google.com/thumbnail?id=${row.FOTO_ID}&${size}`;
                photosMap[row.JUGADOR] = url;
                if(row.JUGADOR === 'LOGO') {
                    document.querySelectorAll('.app-logo').forEach(img => img.src = url);
                }
            }
        });
    }
    updateAuthButtons();
}

function showView(view, param = null) {
    const app = document.getElementById('app-view');
    if(Object.keys(DB).length === 0) return;
    
    document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
    if(document.querySelector(`a[onclick="showView('${view}')"]`)) document.querySelector(`a[onclick="showView('${view}')"]`).classList.add('active');
    
    if(view === 'home') {
        const inicioData = DB['INICIO'] || [];
        const lastMatch = DB['PARTIDOS'] && DB['PARTIDOS'].length > 0 ? DB['PARTIDOS'][DB['PARTIDOS'].length - 1] : null;
        const records = calculateRecords();
        const esquinaBg = photosMap['ESQUINA'] || 'https://via.placeholder.com/1920x1080?text=TecSports';

        // LÓGICA DE VOTACIÓN
        // LÓGICA DE VOTACIÓN RESTRINGIDA
        const votes = DB['VOTACIONES'] || [];
        const alreadyVoted = votes.some(v => v.ID_Partido == lastMatch?.ID_Partido && v.Votador == currentUser);
        const votingOpen = lastMatch && (!lastMatch.MVP || lastMatch.MVP === '');
        
        let voteBanner = '';
        if(votingOpen) {
            const matchDetails = (DB['DETALLE_PARTIDO'] || []).filter(d => d.ID_Partido == lastMatch.ID_Partido);
            const playedInMatch = currentUser && matchDetails.some(d => d.Jugador === currentUser);
            
            if(playedInMatch && !alreadyVoted) {
                voteBanner = `<button onclick="openVoteModal('${lastMatch.ID_Partido}')" class="w-full mb-8 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-black py-4 rounded-xl text-lg uppercase tracking-wide animate-pulse">🗳️ ¡Votá al MVP y las Notas del último partido!</button>`;
            } else if(playedInMatch && alreadyVoted) {
                voteBanner = `<div class="w-full mb-8 bg-gray-800 text-gray-400 font-bold py-4 rounded-xl text-center">✅ Ya registraste tu voto. ¡Gracias!</div>`;
            } else if(!currentUser) {
                voteBanner = `<div class="w-full mb-8 bg-gray-800 text-gray-400 font-bold py-4 rounded-xl text-center">Ingresá con tu usuario para votar al MVP</div>`;
            }
        }

        let matchCardHTML = '<div class="glass p-8 rounded-2xl border border-white/10 h-full flex items-center justify-center"><p class="text-gray-500">No hay partidos cargados aún.</p></div>';
        if (lastMatch) {
            const details = (DB['DETALLE_PARTIDO'] || []).filter(d => d.ID_Partido == lastMatch.ID_Partido);
            const e1 = details.filter(d => String(d.Equipo).includes('1'));
            const e2 = details.filter(d => String(d.Equipo).includes('2'));
            const formatScorers = (teamArray) => {
                const scorers = teamArray.filter(p => n(p.Goles) > 0).map(p => `${p.Jugador} (${n(p.Goles)})`);
                return scorers.length > 0 ? scorers.join('<br>') : 'Sin goles';
            };
            const scorers1 = formatScorers(e1);
            const scorers2 = formatScorers(e2);

            matchCardHTML = `
                <div onclick="showView('matchDetail', '${lastMatch.ID_Partido}')" class="last-match-card glow-blue h-full">
                    <div class="last-match-bg" style="background-image: url('${esquinaBg}')"></div>
                    <div class="last-match-content py-4">
                        <div class="flex justify-end items-center mb-2">
                            <span class="text-xs font-bold uppercase tracking-widest text-gray-300 bg-black/50 px-2 py-1 rounded">${formatDate(lastMatch.Fecha)}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 md:gap-4 items-start text-center mb-2">
                            <div class="flex flex-col items-center">
                                <h3 class="pt-0 text-3xl md:text-5xl font-display uppercase text-blue-400 mb-1 md:mb-2">EQUIPO 1</h3>
                                <div class="text-xs md:text-sm text-gray-200 min-h-[40px]">${scorers1}</div>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="bg-black/60 border border-white/10 rounded-xl md:rounded-2xl px-3 md:px-6 py-1 md:py-2 mb-2 md:mb-4">
                                    <div class="flex items-center gap-2 md:gap-6">
                                        <span class="text-5xl md:text-8xl font-black text-blue-400 drop-shadow-lg">${lastMatch.Goles_E1}</span>
                                        <span class="text-2xl md:text-4xl text-gray-500">-</span>
                                        <span class="text-5xl md:text-8xl font-black text-red-400 drop-shadow-lg">${lastMatch.Goles_E2}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col items-center mt-1 md:mt-2">
                                    <img src="${getPhoto(lastMatch.MVP)}" class="w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-yellow-400 object-cover mb-1 shadow-lg shadow-yellow-500/20">
                                    <span class="text-[10px] md:text-xs font-bold uppercase tracking-widest text-yellow-400 mb-1">MVP del Partido</span>
                                    <p class="text-xs md:text-sm font-bold text-white">🎩 ${lastMatch.MVP || 'Pendiente'}</p>
                                </div>
                            </div>
                            <div class="flex flex-col items-center">
                                <h3 class="pt-0 text-3xl md:text-5xl font-display uppercase text-red-400 mb-1 md:mb-2">EQUIPO 2</h3>
                                <div class="text-xs md:text-sm text-gray-200 min-h-[40px]">${scorers2}</div>
                            </div>
                        </div>
                        <div class="text-right mt-2">
                            <span class="text-xs font-bold uppercase tracking-widest text-gray-400 bg-black/50 px-2 py-1 rounded">🏟️ ${lastMatch.Estadio || 'St. Diego'}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const topScorers = inicioData.slice().sort((a,b) => n(b.GOLES||b.Goles) - n(a.GOLES||a.Goles)).slice(0, 10);

        app.innerHTML = `
            <div class="flex flex-col gap-8">
                ${voteBanner}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 flex flex-col">
                        <h2 class="text-xl font-display uppercase tracking-wide text-gray-300 mb-4 border-l-4 border-blue-800 pl-3">Último Partido</h2>
                        <div class="flex-grow">${matchCardHTML}</div>
                    </div>
                    <div class="lg:col-span-1 flex flex-col">
                        <h2 class="text-xl font-display uppercase tracking-wide text-gray-300 mb-4 border-l-4 border-blue-800 pl-3">Goleadores (Top 10)</h2>
                        <div class="glass rounded-2xl overflow-hidden border border-white/10 glow-blue flex-grow">
                            <table class="w-full text-sm">
                                <thead class="bg-white/5 text-gray-500 uppercase text-xs border-b border-white/10">
                                    <tr><th class="p-3 text-left">Jugador</th><th class="p-3 text-center">PJ</th><th class="p-3 text-center text-blue-400">GOLES</th></tr>
                                </thead>
                                <tbody>
                                    ${topScorers.map((j, i) => {
                                        const nombre = j.JUGADOR || Object.values(j)[0];
                                        const pj = n(j.PJ || j['PARTIDOS']);
                                        const goles = n(j.GOLES || j['Goles']);
                                        let rowColor = i === 0 ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : i === 2 ? 'bg-orange-700/10' : '';
                                        return `<tr onclick="showView('playerProfile', '${nombre}')" class="cursor-pointer border-b border-white/5 ${rowColor} hover:bg-white/5 transition"><td class="p-3 font-semibold text-white">${i+1}. ${nombre}</td><td class="p-3 text-center text-gray-400">${pj}</td><td class="p-3 text-center font-black text-blue-400">${goles}</td></tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col md:flex-row justify-center gap-6">
                    <div onclick="${records.biggestWin ? `showView('matchDetail', '${records.biggestWin.ID_Partido}')` : ''}" class="stat-record w-full md:w-1/3 justify-center glow-yellow bg-black/40 cursor-pointer hover:scale-105 transition">
                        <div class="text-2xl">🥇</div>
                        <div class="text-center"><p class="text-xs text-gray-500 uppercase">Mayor Goleada</p><p class="text-lg font-bold text-white">${records.biggestWin ? records.biggestWin.Goles_E1 + '-' + records.biggestWin.Goles_E2 : '-'}</p></div>
                    </div>
                    <div onclick="${records.winStreak.name !== '-' ? `showView('playerProfile', '${records.winStreak.name}')` : ''}" class="stat-record w-full md:w-1/3 justify-center glow-blue bg-black/40 cursor-pointer hover:scale-105 transition">
                        <div class="text-2xl">🔥</div>
                        <div class="text-center"><p class="text-xs text-gray-500 uppercase">Racha Victorias</p><p class="text-base font-bold text-blue-400">${records.winStreak.name} (${records.winStreak.val})</p></div>
                    </div>
                    <div onclick="${records.bestForm.name !== '-' ? `showView('playerProfile', '${records.bestForm.name}')` : ''}" class="stat-record w-full md:w-1/3 justify-center glow-cyan bg-black/40 cursor-pointer hover:scale-105 transition">
                        <div class="text-2xl">📈</div>
                        <div class="text-center"><p class="text-xs text-gray-500 uppercase">Mejor Forma</p><p class="text-base font-bold text-cyan-400">${records.bestForm.name} (${records.bestForm.val})</p></div>
                    </div>
                </div>
                <div>
                    <h2 class="text-2xl font-display uppercase tracking-wide text-gray-300 mb-4 border-l-4 border-blue-800 pl-3">Tabla de Posiciones</h2>
                    <div class="glass rounded-2xl overflow-hidden border border-white/10">
                        <table class="w-full text-sm">
                            <thead class="bg-white/5 text-gray-500 uppercase text-xs border-b border-white/10">
                                <tr><th class="p-3 text-left">Jugador</th><th class="p-3 text-center">PJ</th><th class="p-3 text-center">PG</th><th class="p-3 text-center">PE</th><th class="p-3 text-center">PP</th><th class="p-3 text-center">Goles</th><th class="p-3 text-center text-blue-400">PTS</th></tr>
                            </thead>
                            <tbody>
                                ${inicioData.map((j, i) => {
                                    const nombre = j.JUGADOR || Object.values(j)[0];
                                    const pj = n(j.PJ || j['PARTIDOS']); const pg = n(j.PG || j['VICTORIAS']); const pe = n(j.PE || j['EMPATES']); const pp = n(j.PP || j['DERROTAS']);
                                    const goles = n(j.GOLES || j['Goles']); const pts = n(j.PTS || j['Puntos']);
                                    let rowColor = i === 0 ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : i === 2 ? 'bg-orange-700/10' : '';
                                    return `<tr onclick="showView('playerProfile', '${nombre}')" class="cursor-pointer border-b border-white/5 ${rowColor} hover:bg-white/5 transition"><td class="p-3 font-semibold text-white">${i+1}. ${nombre}</td><td class="p-3 text-center text-gray-400">${pj}</td><td class="p-3 text-center text-blue-400">${pg}</td><td class="p-3 text-center text-gray-400">${pe}</td><td class="p-3 text-center text-red-400">${pp}</td><td class="p-3 text-center text-gray-400">${goles}</td><td class="p-3 text-center font-black text-blue-400">${pts}</td></tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    else if(view === 'matchDetail') {
        const match = DB['PARTIDOS'].find(m => m.ID_Partido == param);
        const details = (DB['DETALLE_PARTIDO'] || []).filter(d => d.ID_Partido == param);
        const e1 = details.filter(d => String(d.Equipo).includes('1'));
        const e2 = details.filter(d => String(d.Equipo).includes('2'));
        const groupAndMap = (team, teamNum) => {
            const groups = {};
            team.forEach(p => {
                const histPlayer = (DB['HISTORICA'] || []).find(h => String(h.JUGADOR).trim() === String(p.Jugador).trim());
                const pos = String(histPlayer ? histPlayer.POSICION : 'DC').toUpperCase();
                if(!groups[pos]) groups[pos] = []; groups[pos].push(p);
            });
            let html = '';
            for(const pos in groups) {
                const x = getPitchX(pos, teamNum);
                const playersInPos = groups[pos];
                playersInPos.forEach((p, idx) => {
                    let y = 50;
                    if(playersInPos.length === 1) { if (pos.includes('L')) y = 75; else if (pos.includes('R')) y = 25; else y = 50; } 
                    else { y = 50 + ((idx - (playersInPos.length - 1) / 2) * 25); }
                    const isMvp = match.MVP === p.Jugador;
                    html += `<div class="player-pin flex flex-col items-center" style="left: ${x}%; top: ${y}%;" onclick="showView('playerProfile', '${p.Jugador}')"><div class="w-10 h-10 md:w-14 md:h-14 rounded-full ${teamNum === 1 ? 'bg-blue-500/20 border-blue-400' : 'bg-red-500/20 border-red-400'} border-2 flex items-center justify-center text-xs md:text-sm font-black text-white backdrop-blur ${isMvp ? 'ring-4 ring-yellow-400 border-yellow-400' : ''}">${pos}</div><span class="text-[8px] md:text-xs font-bold mt-1 bg-black/70 px-1 rounded text-white max-w-[60px] md:max-w-[100px] truncate block">${p.Jugador}</span></div>`;
                });
            }
            return html;
        };
        app.innerHTML = `
            <button onclick="showView('home')" class="btn-back"><- Volver</button>
            <div class="glass rounded-2xl p-4 md:p-6 mb-8 border border-white/10 text-center relative">
                <div class="absolute top-4 left-4 text-xs text-gray-500 font-bold uppercase bg-black/50 px-2 py-1 rounded">${formatDate(match.Fecha)}</div>
                <div class="flex justify-between items-center mt-4">
                    <div class="text-center flex-1"><p class="text-2xl md:text-4xl font-black text-blue-400">EQUIPO 1</p></div>
                    <div class="bg-black px-4 md:px-8 py-2 md:py-4 rounded-xl mx-2 md:mx-4 neon-glow border border-white/10"><span class="text-4xl md:text-6xl font-black text-blue-400">${match.Goles_E1}</span><span class="text-2xl md:text-4xl font-bold text-gray-600 mx-1 md:mx-2">-</span><span class="text-4xl md:text-6xl font-black text-white">${match.Goles_E2}</span></div>
                    <div class="text-center flex-1"><p class="text-2xl md:text-4xl font-black text-red-400">EQUIPO 2</p></div>
                </div>
                <div class="mt-4 flex items-center justify-center space-x-2 text-yellow-400"><span class="text-xl">🎩</span><p class="font-bold text-lg">MVP: ${match.MVP}</p></div>
            </div>
            <div class="pitch rounded-3xl p-4 relative w-full aspect-[16/9] mb-8 overflow-hidden">
                <div class="pitch-line-center"></div><div class="pitch-circle-center"></div><div class="pitch-box-left"></div><div class="pitch-box-right"></div><div class="pitch-goal-left"></div><div class="pitch-goal-right"></div>
                ${groupAndMap(e1, 1)} ${groupAndMap(e2, 2)}
            </div>
            <div class="flex flex-col md:flex-row gap-6">
                <div class="flex-1 w-full md:w-1/2">
                    <h3 class="text-xl font-black mb-3 text-blue-400 border-l-4 border-blue-500 pl-3">Equipo 1</h3>
                    <div class="space-y-2">${e1.map(p => `<div onclick="showView('playerProfile', '${p.Jugador}')" class="glass p-3 rounded-xl flex items-center justify-between ${match.MVP === p.Jugador ? 'border border-yellow-400 bg-yellow-500/10' : ''} cursor-pointer hover:bg-white/10 transition"><div class="flex items-center gap-3"><img src="${getPhoto(p.Jugador)}" class="w-8 h-8 rounded-full object-cover"><span class="font-semibold text-sm ${match.MVP === p.Jugador ? 'text-yellow-400' : 'text-white'}">${p.Jugador} ${match.MVP === p.Jugador ? '🎩' : ''}</span></div><div class="flex gap-4 text-sm font-bold"><span class="text-blue-400">⚽ ${n(p.Goles)}</span><span class="text-yellow-400">⭐ ${p.Nota}</span></div></div>`).join('')}</div>
                </div>
                <div class="flex-1 w-full md:w-1/2">
                    <h3 class="text-xl font-black mb-3 text-red-400 border-l-4 border-red-500 pl-3">Equipo 2</h3>
                    <div class="space-y-2">${e2.map(p => `<div onclick="showView('playerProfile', '${p.Jugador}')" class="glass p-3 rounded-xl flex items-center justify-between ${match.MVP === p.Jugador ? 'border border-yellow-400 bg-yellow-500/10' : ''} cursor-pointer hover:bg-white/10 transition"><div class="flex items-center gap-3"><img src="${getPhoto(p.Jugador)}" class="w-8 h-8 rounded-full object-cover"><span class="font-semibold text-sm ${match.MVP === p.Jugador ? 'text-yellow-400' : 'text-white'}">${p.Jugador} ${match.MVP === p.Jugador ? '🎩' : ''}</span></div><div class="flex gap-4 text-sm font-bold"><span class="text-blue-400">⚽ ${n(p.Goles)}</span><span class="text-yellow-400">⭐ ${p.Nota}</span></div></div>`).join('')}</div>
                </div>
            </div>
        `;
    }
    else if(view === 'players') {
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-1">Plantel</h1>
            <p class="text-gray-500 mb-6">Toca un jugador para ver su perfil completo</p>
            <div class="glass p-4 rounded-xl mb-8 flex flex-col md:flex-row items-center gap-4">
                <div class="flex items-center gap-3 w-full md:flex-grow">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input type="text" id="search-players-input" oninput="filterPlayers(this.value)" placeholder="Buscar jugador..." class="bg-transparent text-white w-full outline-none text-lg">
                </div>
                <div class="flex items-center gap-2 w-full md:w-auto">
                    <span class="text-gray-400 text-sm uppercase font-bold">Ordenar por:</span>
                    <select id="sort-players-select" onchange="handlePlayerSortChange()" class="bg-gray-900 text-white p-2 rounded-lg outline-none border border-white/10">
                        <option value="default">Por Defecto</option>
                        <option value="name">Nombre</option>
                        <option value="ovr">Overall</option>
                        <option value="pos">Posición</option>
                    </select>
                </div>
            </div>
            <div id="players-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${renderPlayersGrid('', 'default')}
            </div>
        `;
    }
    else if(view === 'playerProfile') {
        const hist = DB['HISTORICA'].find(j => j.JUGADOR === param);
        if(!hist) return showView('players');
        const tempData = getSeasonData(currentProfileSeason);
        const s = tempData.find(j => j.JUGADOR === param) || hist;
        const ovr = n(s.OVERALL);
        const cardType = getCardType(ovr);
        const fifaStats = generateFifaStats(s); 
        const { bestMate, worstRival, stadiumStats } = getTeammatesAndRivals(param); 
        const templateName = { 'bronze': 'BRONCE', 'silver': 'PLATA', 'gold': 'ORO', 'toty': 'TOTY' }[cardType];
        const cardBg = photosMap[templateName] || "https://via.placeholder.com/300x420?text=Falta+ID";
        const txtColor = cardType === 'toty' ? '#ffffff' : '#000000';
        const cardHTML = `
            <div style="width: 280px; height: 392px; position: relative; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin: 0 auto;">
                <img src="${cardBg}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;">
                <div style="position: absolute; top: 60px; left: 62px; text-align: center; color: ${txtColor};">
                    <p style="font-size: 2.2rem; font-weight: 900; line-height: 1; font-family: 'Oswald', sans-serif;">${ovr}</p>
                    <p style="font-size: 1rem; font-weight: 700; margin-top: 2px;">${hist.POSICION}</p>
                </div>
                <div style="position: absolute; top: 80px; left: 51%; transform: translateX(-50%); width: 100px; height: 115px;">
                    <img src="${getPhoto(hist.JUGADOR)}" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
                </div>
                <p style="position: absolute; top: 210px; left: 50%; transform: translateX(-50%); font-size: 1rem; font-weight: 900; text-transform: uppercase; color: ${txtColor}; white-space: nowrap;">${hist.JUGADOR}</p>
                <div style="position: absolute; bottom: 65px; width: 100%; display: flex; justify-content: center; gap: 40px; color: ${txtColor}; font-weight: 900; font-size: 0.9rem; font-family: 'Oswald', sans-serif;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">RIT</span><span>${fifaStats[0]}</span></div>
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">TIR</span><span>${fifaStats[1]}</span></div>
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">PAS</span><span>${fifaStats[2]}</span></div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">REG</span><span>${fifaStats[3]}</span></div>
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">DEF</span><span>${fifaStats[4]}</span></div>
                        <div style="display: flex; justify-content: space-between; width: 60px;"><span style="opacity: 0.8">FIS</span><span>${fifaStats[5]}</span></div>
                    </div>
                </div>
            </div>
        `;
        let stadiosHtml = '';
        if (Object.keys(stadiumStats).length > 0) {
            let stadiosItems = '';
            for(const est in stadiumStats) { const st = stadiumStats[est]; stadiosItems += `<div class="stat-record"><div class="text-xl">🏟️</div><div><p class="text-xs text-gray-500 uppercase">${est}</p><p class="text-sm font-bold text-white">${st.pg}V / ${st.pj}PJ | ⚽ ${st.goles}</p></div></div>`; }
            stadiosHtml = `<h3 class="text-xl font-black mb-3 text-white border-l-4 border-blue-500 pl-3 mt-8">Estadísticas por Estadio</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">${stadiosItems}</div>`;
        }
        app.innerHTML = `
            <button onclick="showView('players')" class="btn-back"><- Volver</button>
            <h2 class="text-5xl font-black text-white mb-8 text-center md:text-left uppercase">${hist.JUGADOR}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
                <div class="flex justify-center">${cardHTML}</div>
                <div class="flex justify-center">
                    <div style="width: 100%; max-width: 350px; aspect-ratio: 1;">
                        <canvas id="radarChart"></canvas>
                    </div>
                </div>
                <div class="space-y-4 w-full max-w-xs mx-auto md:mx-0">
                    ${[['RITMO', fifaStats[0]], ['TIRO', fifaStats[1]], ['PASE', fifaStats[2]], ['REGATE', fifaStats[3]], ['DEFENSA', fifaStats[4]], ['FISICO', fifaStats[5]]].map(stat => `
                        <div class="flex items-center gap-4">
                            <span class="text-sm font-bold text-gray-400 w-20">${stat[0]}</span>
                            <div class="flex-grow bg-gray-800 rounded-full h-3.5">
                                <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-3.5 rounded-full" style="width: ${stat[1]}%"></div>
                            </div>
                            <span class="text-xl font-black text-white w-10 text-right">${stat[1]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="flex gap-2 mb-6">
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 'hist')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 'hist' ? 'bg-blue-800 text-white' : 'glass text-gray-400'}">Histórica</button>
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 't1')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 't1' ? 'bg-blue-800 text-white' : 'glass text-gray-400'}">Temp 1</button>
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 't2')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 't2' ? 'bg-blue-800 text-white' : 'glass text-gray-400'}">Temp 2</button>
            </div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-blue-800 pl-3">ESTADISTICAS</h3>
            <div class="grid grid-cols-3 gap-3 mb-6">
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-blue-400">${n(s.GOLES)}</p><p class="text-xs text-gray-500 uppercase">Goles</p></div>
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-white">${n(s.PARTIDOS)}</p><p class="text-xs text-gray-500 uppercase">Partidos</p></div>
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-yellow-400">${n(s["MVP'S"])}</p><p class="text-xs text-gray-500 uppercase">MVPs</p></div>
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-blue-400">${n(s.VICTORIAS)}</p><p class="text-xs text-gray-500 uppercase">Victorias</p></div>
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-red-400">${n(s.DERROTAS)}</p><p class="text-xs text-gray-500 uppercase">Derrotas</p></div>
                <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-cyan-400">${n(s.PROMEDIO)}</p><p class="text-xs text-gray-500 uppercase">Promedio</p></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="stat-record"><div class="text-2xl">🤝</div><div><p class="text-xs text-gray-500 uppercase">Mejor Compañero</p><p class="text-lg font-bold text-blue-400">${bestMate.name} (${bestMate.wr}% WR)</p></div></div>
                <div class="stat-record"><div class="text-2xl">😈</div><div><p class="text-xs text-gray-500 uppercase">Peor Rival</p><p class="text-lg font-bold text-red-400">${worstRival.name} (${worstRival.lr}% Derrotas)</p></div></div>
            </div>
            ${stadiosHtml}
        `;
        if(window.radarChartInstance) window.radarChartInstance.destroy();
        const ctx = document.getElementById('radarChart').getContext('2d');
        window.radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['RITMO', 'TIRO', 'PASE', 'REGATE', 'DEFENSA', 'FISICO'],
                datasets: [{
                    label: 'Stats', data: fifaStats,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 2,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                scales: { r: { suggestedMin: 0, suggestedMax: 99, ticks: { display: false, stepSize: 20 }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#9ca3af', font: { size: 13, family: 'Oswald' } } } },
                plugins: { legend: { display: false } }
            }
        });
    }
    else if(view === 'seasons') {
        const tempData = getSeasonData(currentSeason === 'hist' ? 'hist' : currentSeason);
        const matches = (DB['PARTIDOS'] || []).filter(m => currentSeason === 'hist' ? true : String(m.Temporada) === String(currentSeason));
        let maxOvr = {n:'-', v:0}, maxGoles = {n:'-', v:0}, maxPj = {n:'-', v:0}, maxProm = {n:'-', v:0}, maxPg = {n:'-', v:0}, maxPp = {n:'-', v:0}, maxMvp = {n:'-', v:0};
        tempData.forEach(p => {
            if(n(p.OVERALL) > maxOvr.v) maxOvr = {n:p.JUGADOR, v:n(p.OVERALL)};
            if(n(p.GOLES) > maxGoles.v) maxGoles = {n:p.JUGADOR, v:n(p.GOLES)};
            if(n(p.PARTIDOS) > maxPj.v) maxPj = {n:p.JUGADOR, v:n(p.PARTIDOS)};
            if(n(p.PROMEDIO) > maxProm.v) maxProm = {n:p.JUGADOR, v:n(p.PROMEDIO).toFixed(2)};
            if(n(p.VICTORIAS) > maxPg.v) maxPg = {n:p.JUGADOR, v:n(p.VICTORIAS)};
            if(n(p.DERROTAS) > maxPp.v) maxPp = {n:p.JUGADOR, v:n(p.DERROTAS)};
            if(n(p["MVP'S"]) > maxMvp.v) maxMvp = {n:p.JUGADOR, v:n(p["MVP'S"])};
        });
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-6">Temporadas</h1>
            <div class="flex gap-2 mb-8">${['hist', '1', '2'].map(t => `<button onclick="changeSeason('${t}')" class="flex-1 py-3 rounded-xl font-bold transition ${currentSeason == t ? 'bg-blue-800 text-white' : 'glass text-gray-400'}">${t === 'hist' ? 'Histórica' : 'Temp ' + t}</button>`).join('')}</div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-yellow-500 pl-3">Placas de la Temporada</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                <div class="stat-record bg-cyan-500/10 p-3"><div class="text-xl">💎</div><div><p class="text-[10px] text-gray-500 uppercase">Mejor Overall</p><p class="text-sm font-bold text-cyan-400 truncate">${maxOvr.n} <span class="hidden md:inline">(${maxOvr.v})</span></p></div></div>
                <div class="stat-record bg-blue-500/10 p-3"><div class="text-xl">⚽</div><div><p class="text-[10px] text-gray-500 uppercase">Bota de Oro</p><p class="text-sm font-bold text-blue-400 truncate">${maxGoles.n} <span class="hidden md:inline">(${maxGoles.v})</span></p></div></div>
                <div class="stat-record bg-gray-500/10 p-3"><div class="text-xl">📊</div><div><p class="text-[10px] text-gray-500 uppercase">Más Partidos</p><p class="text-sm font-bold text-white truncate">${maxPj.n} <span class="hidden md:inline">(${maxPj.v})</span></p></div></div>
                <div class="stat-record bg-teal-500/10 p-3"><div class="text-xl">⭐</div><div><p class="text-[10px] text-gray-500 uppercase">Mejor Promedio</p><p class="text-sm font-bold text-cyan-400 truncate">${maxProm.n} <span class="hidden md:inline">(${maxProm.v})</span></p></div></div>
                <div class="stat-record bg-green-500/10 p-3"><div class="text-xl">🥇</div><div><p class="text-[10px] text-gray-500 uppercase">Más Ganados</p><p class="text-sm font-bold text-blue-400 truncate">${maxPg.n} <span class="hidden md:inline">(${maxPg.v})</span></p></div></div>
                <div class="stat-record bg-red-500/10 p-3"><div class="text-xl">🥉</div><div><p class="text-[10px] text-gray-500 uppercase">Más Perdidos</p><p class="text-sm font-bold text-red-400 truncate">${maxPp.n} <span class="hidden md:inline">(${maxPp.v})</span></p></div></div>
                <div class="stat-record bg-yellow-500/10 p-3 col-span-2 md:col-span-1"><div class="text-xl">🎩</div><div><p class="text-[10px] text-gray-500 uppercase">Máximo MVP</p><p class="text-sm font-bold text-yellow-400 truncate">${maxMvp.n} <span class="hidden md:inline">(${maxMvp.v})</span></p></div></div>
            </div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-blue-800 pl-3">Partidos Jugados</h3>
            <div class="space-y-3 mb-8">${matches.length === 0 ? '<p class="text-gray-500">No hay partidos.</p>' : matches.map(p => `<div onclick="showView('matchDetail', '${p.ID_Partido}')" class="glass p-4 rounded-xl flex justify-between items-center hover:bg-white/5 cursor-pointer border border-white/5"><div><p class="text-xs text-gray-500">${formatDate(p.Fecha)} | ${p.Estadio || 'St. Diego'}</p><p class="text-sm font-bold text-white">Equipo 1 vs Equipo 2</p></div><div class="flex items-center gap-4"><span class="text-2xl font-black text-white">${p.Goles_E1} - ${p.Goles_E2}</span></div></div>`).join('')}</div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-blue-800 pl-3">Estadísticas Individuales</h3>
            <div class="glass rounded-2xl overflow-x-auto border border-white/10">
                <table class="w-full text-sm whitespace-nowrap">
                    <thead class="bg-white/5 text-gray-500 uppercase text-xs">
                        <tr>
                            <th class="p-3 text-left cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('JUGADOR')">Jugador ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('PARTIDOS')">PJ ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('VICTORIAS')">PG ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('EMPATES')">PE ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('DERROTAS')">PP ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('GOLES')">Goles ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('RATIO')">Ratio ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('MVP')">MVP ⇅</th>
                            <th class="p-3 text-center cursor-pointer hover:text-blue-400 select-none" onclick="sortSeasonsTable('PROMEDIO')">Prom ⇅</th>
                        </tr>
                    </thead>
                    <tbody id="seasons-tbody">
                        ${renderSeasonsTableBody(tempData)}
                    </tbody>
                </table>
            </div>
        `;
    }
    else if(view === 'duels') {
        const histData = DB['HISTORICA'] || [];
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-6 text-center">⚔️ Duelos</h1>
            <div class="flex flex-col gap-4 mb-8">
                <select onchange="changeDuelSeason(this.value)" class="glass p-3 rounded-xl bg-gray-900 text-white outline-none w-full">
                    <option value="hist" ${currentDuelSeason == 'hist' ? 'selected' : ''}>Histórica</option>
                    <option value="t1" ${currentDuelSeason == 't1' ? 'selected' : ''}>Temp 1</option>
                    <option value="t2" ${currentDuelSeason == 't2' ? 'selected' : ''}>Temp 2</option>
                </select>
                <div class="grid grid-cols-2 gap-4">
                    <select id="duel-select-1" onchange="updateDuel(1, this.value)" class="glass p-3 rounded-xl bg-gray-900 text-white outline-none text-sm"><option value="">Jugador 1</option>${histData.map(p => `<option value="${p.JUGADOR}" ${duelP1Name === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}</select>
                    <select id="duel-select-2" onchange="updateDuel(2, this.value)" class="glass p-3 rounded-xl bg-gray-900 text-white outline-none text-sm"><option value="">Jugador 2</option>${histData.map(p => `<option value="${p.JUGADOR}" ${duelP2Name === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}</select>
                </div>
            </div>
            <div id="duel-content">${duelP1Name && duelP2Name ? renderDuel() : '<p class="text-center text-gray-600 mt-10">Selecciona ambos jugadores...</p>'}</div>
        `;
    }
    else if(view === 'teamGen') {
        const histData = DB['HISTORICA'] || [];
        app.innerHTML = `
          <h1 class="flex items-center gap-3 text-4xl md:text-5xl font-black text-white uppercase mb-6"><span class="text-3xl md:text-4xl">⚽</span> Generador de Equipos</h1>
            <div class="glass p-6 rounded-2xl border border-white/10 mb-6">
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold">Temporada</label>
                        <select id="gen_season" onchange="updateTeamGenOptions('season', this.value)" class="w-full glass p-2 rounded-lg bg-gray-900 text-white mt-1">
                            <option value="hist" ${teamGenSeason === 'hist' ? 'selected' : ''}>Histórica</option>
                            <option value="t1" ${teamGenSeason === 't1' ? 'selected' : ''}>Temp 1</option>
                            <option value="t2" ${teamGenSeason === 't2' ? 'selected' : ''}>Temp 2</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold">Balancear por</label>
                        <select id="gen_criteria" onchange="updateTeamGenOptions('criteria', this.value)" class="w-full glass p-2 rounded-lg bg-gray-900 text-white mt-1">
                            <option value="OVERALL" ${teamGenCriteria === 'OVERALL' ? 'selected' : ''}>Overall</option>
                            <option value="PROMEDIO" ${teamGenCriteria === 'PROMEDIO' ? 'selected' : ''}>Promedio de Notas</option>
                        </select>
                    </div>
                </div>
                <h3 class="text-lg font-bold mb-4 text-gray-300">Seleccionar Jugadores (${teamGenPlayers.length})</h3>
                <div class="flex gap-2 mb-4">
                    <select id="gen_select" class="glass p-3 rounded-xl bg-gray-900 text-white flex-grow"><option value="">Elegir jugador...</option>${histData.map(p => `<option value="${p.JUGADOR}" ${teamGenPlayers.includes(p.JUGADOR) ? 'disabled' : ''}>${p.JUGADOR}</option>`).join('')}</select>
                    <button onclick="addPlayerToGen()" class="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-xl text-xl">+</button>
                </div>
                <div class="space-y-2 mb-4">${teamGenPlayers.map((p, i) => `<div class="gen-player"><span>${p}</span><button onclick="removePlayerFromGen(${i})" class="text-red-500 font-bold">X</button></div>`).join('')}</div>
                ${teamGenPlayers.length >= 2 && teamGenPlayers.length % 2 === 0 ? `<button onclick="generateTeams()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-lg">GENERAR EQUIPOS</button>` : '<p class="text-gray-500 text-sm text-center">Agregá una cantidad par de jugadores.</p>'}
            </div>
            <div id="gen_result"></div>
        `;
    }
    else if(view === 'cardGen') {
        const histData = DB['HISTORICA'] || [];
        if (cardGenData.name === '' && histData.length > 0) {
            cardGenData.name = histData[0].JUGADOR;
            cardGenData.pos = histData[0].POSICION || 'DC';
            cardGenData.photo = getPhoto(histData[0].JUGADOR);
        }
        app.innerHTML = `
        <h1 class="flex items-center gap-3 text-4xl md:text-5xl font-black text-white uppercase mb-6"><span class="text-3xl md:text-4xl">🃏</span> Generador de Carta</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="glass p-6 rounded-2xl border border-white/10 space-y-4">
                    <h3 class="text-lg font-bold text-gray-300">Diseña tu Carta</h3>
                    <div>
                        <label class="text-sm text-gray-400">Jugador</label>
                        <select onchange="updateCardGen('name', this.value)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white mt-1">
                            ${histData.map(p => `<option value="${p.JUGADOR}" ${cardGenData.name === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-sm text-gray-400">Overall</label><input type="number" min="0" max="99" value="${cardGenData.ovr}" oninput="updateCardGen('ovr', this.value)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white mt-1"></div>
                        <div><label class="text-sm text-gray-400">Posición</label><input type="text" value="${cardGenData.pos}" oninput="updateCardGen('pos', this.value.toUpperCase())" class="w-full glass p-3 rounded-xl bg-gray-900 text-white mt-1"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        ${['rit', 'tir', 'pas', 'reg', 'def', 'fis'].map(s => `<div><label class="text-sm text-gray-400 uppercase">${s}</label><input type="number" min="0" max="99" value="${cardGenData.stats[s]}" oninput="updateCardGen('${s}', this.value)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white mt-1 text-center"></div>`).join('')}
                    </div>
                </div>
                <div id="card_preview" class="flex items-center justify-center"></div>
            </div>
        `;
        updateCardPreview();
    }
    else if(view === 'admin') { renderAdmin(); }
    
    window.scrollTo(0, 0);
    if (!window.isRouting) {
        let url = BASE_URL + view;
        if (param) url += '/' + encodeURIComponent(param);
        window.history.pushState({ view, param: param || null }, '', url);
    }
}

// --- FUNCIONES AUXILIARES GLOBALES (FUERA DE SHOWVIEW) ---

function renderPlayersGrid(query = '', sortBy = 'default') {
    let histData = DB['HISTORICA'] || [];
    let dataToRender = histData.filter(p => String(p.JUGADOR).toLowerCase().includes(query.toLowerCase()));
    if (sortBy === 'name') dataToRender.sort((a,b) => String(a.JUGADOR).localeCompare(String(b.JUGADOR)));
    else if (sortBy === 'ovr') dataToRender.sort((a,b) => n(b.OVERALL) - n(a.OVERALL));
    else if (sortBy === 'pos') dataToRender.sort((a,b) => String(a.POSICION).localeCompare(String(b.POSICION)));
    if (dataToRender.length === 0) return '<p class="text-gray-500 text-center col-span-4 mt-10">No se encontraron jugadores...</p>';
    return dataToRender.map(p => `
        <div onclick="showView('playerProfile', '${p.JUGADOR}')" class="glass p-4 rounded-2xl text-center hover:border-blue-500/50 transition cursor-pointer flex flex-col items-center justify-center">
            <div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 ${n(p.OVERALL)>=94 ? 'border-cyan-400' : n(p.OVERALL)>=75 ? 'border-yellow-400' : n(p.OVERALL)>=68 ? 'border-gray-300' : 'border-orange-700'}">
                <img src="${getPhoto(p.JUGADOR)}" alt="${p.JUGADOR}" class="w-full h-full object-cover">
            </div>
            <h3 class="font-bold text-white text-sm">${p.JUGADOR}</h3>
            <div class="mt-2 flex items-center gap-2">
                <span class="font-black text-xl ${getOvrColor(n(p.OVERALL))}">${n(p.OVERALL)}</span>
                <span class="text-sm font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">${p.POSICION}</span>
            </div>
        </div>
    `).join('');
}

function filterPlayers(query) {
    const sortBy = document.getElementById('sort-players-select').value;
    document.getElementById('players-grid').innerHTML = renderPlayersGrid(query, sortBy);
}

function handlePlayerSortChange() {
    const query = document.getElementById('search-players-input').value;
    const sortBy = document.getElementById('sort-players-select').value;
    document.getElementById('players-grid').innerHTML = renderPlayersGrid(query, sortBy);
}

let seasonsSortKey = null;
let seasonsSortDir = 'desc';

function sortSeasonsTable(key) {
    let excelKey = key;
    if (key === 'MVP') excelKey = "MVP'S";
    if (key === 'RATIO') excelKey = 'RATIO GOLEADOR';
    if (seasonsSortKey === excelKey) {
        seasonsSortDir = seasonsSortDir === 'desc' ? 'asc' : 'desc';
    } else {
        seasonsSortKey = excelKey;
        seasonsSortDir = (key === 'JUGADOR') ? 'asc' : 'desc';
    }
    const tempData = getSeasonData(currentSeason === 'hist' ? 'hist' : currentSeason);
    document.getElementById('seasons-tbody').innerHTML = renderSeasonsTableBody(tempData);
}

function renderSeasonsTableBody(tempData) {
    let data = tempData.filter(p => n(p.PARTIDOS) > 0);
    if (seasonsSortKey) {
        data.sort((a, b) => {
            let valA = a[seasonsSortKey];
            let valB = b[seasonsSortKey];
            if (seasonsSortKey === 'JUGADOR') {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
                return seasonsSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                valA = n(valA);
                valB = n(valB);
                return seasonsSortDir === 'asc' ? valA - valB : valB - valA;
            }
        });
    }
    return data.map(p => `<tr class="border-t border-white/5 hover:bg-white/5 cursor-pointer" onclick="showView('playerProfile', '${p.JUGADOR}')"><td class="p-3 font-semibold text-white">${p.JUGADOR}</td><td class="p-3 text-center text-gray-400">${n(p.PARTIDOS)}</td><td class="p-3 text-center text-blue-400">${n(p.VICTORIAS)}</td><td class="p-3 text-center text-gray-400">${n(p.EMPATES)}</td><td class="p-3 text-center text-red-400">${n(p.DERROTAS)}</td><td class="p-3 text-center font-bold text-blue-400">${n(p.GOLES)}</td><td class="p-3 text-center text-gray-400">${n(p["RATIO GOLEADOR"]).toFixed(2)}</td><td class="p-3 text-center text-yellow-400">${n(p["MVP'S"])}</td><td class="p-3 text-center text-cyan-400">${n(p.PROMEDIO).toFixed(2)}</td></tr>`).join('');
}

function renderAdmin() {
    const app = document.getElementById('app-view');
    let estadios = DB['ESTADIOS'] || [];
    (DB['PARTIDOS'] || []).forEach(m => { if(m.Estadio && !estadios.includes(m.Estadio)) estadios.push(m.Estadio); });
    if(estadios.length === 0) estadios = ['St. Diego'];
    if(adminSection === 'menu') {
        app.innerHTML = `<h1 class="text-4xl font-black text-white mb-2">Panel de <span class="text-blue-400">Administración</span></h1><div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"><div onclick="setAdminSection('loadMatch')" class="admin-card"><h3 class="text-blue-400">⚽ Cargar Partido</h3></div><div onclick="setAdminSection('editMatch')" class="admin-card"><h3 class="text-blue-400">✏️ Editar Partido</h3></div><div onclick="setAdminSection('addPlayer')" class="admin-card"><h3 class="text-blue-400">👤 Añadir Jugador</h3></div><div onclick="setAdminSection('deleteMatch')" class="admin-card"><h3 class="text-red-400">🗑️ Eliminar Partido</h3></div><div onclick="setAdminSection('updatePhoto')" class="admin-card"><h3 class="text-blue-400">📷 Gestionar Fotos</h3></div><div onclick="setAdminSection('manageStadiums')" class="admin-card"><h3 class="text-blue-400">🏟️ Gestionar Estadios</h3></div><div onclick="setAdminSection('editHome')" class="admin-card"><h3 class="text-blue-400">📝 Editor INICIO</h3></div></div>`;
    } 
    else if(adminSection === 'loadMatch' || adminSection === 'editMatch') {
        const isEdit = adminSection === 'editMatch';
        if(isEdit && !adminMatch.ID_Partido) {
            app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">✏️ Editar Partido</h1><div class="admin-card space-y-4"><select onchange="loadMatchIntoAdmin(this.value)" id="edit_match_select" class="w-full glass p-3 rounded-xl bg-gray-900 text-white"><option value="">Elegir partido a editar...</option>${DB['PARTIDOS'].map(p => `<option value="${p.ID_Partido}">${formatDate(p.Fecha)} - ${p.Goles_E1} a ${p.Goles_E2} (${p.MVP})</option>`).join('')}</select></div>`;
            return;
        }
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">${isEdit ? '✏️ Editar' : '⚽ Cargar'} Partido</h1><div class="admin-card mb-6"><div class="grid grid-cols-2 gap-4"><input type="date" id="m_fecha" class="glass p-3 rounded-xl bg-gray-900 text-white" value="${isEdit ? toInputDate(adminMatch.Fecha) : new Date().toISOString().split('T')[0]}"><select id="m_estadio" class="glass p-3 rounded-xl bg-gray-900 text-white">${estadios.map(e => `<option value="${e}" ${isEdit && adminMatch.Estadio === e ? 'selected' : ''}>${e}</option>`).join('')}</select><select id="m_temp" class="glass p-3 rounded-xl bg-gray-900 text-white"><option value="1" ${isEdit && adminMatch.Temporada == '1' ? 'selected' : ''}>Temp 1</option><option value="2" ${isEdit ? (adminMatch.Temporada == '2' ? 'selected' : '') : 'selected'}>Temp 2</option></select><select id="m_mvp" class="glass p-3 rounded-xl bg-gray-900 text-white"><option value="">MVP</option>${DB['HISTORICA'].map(p=>`<option ${isEdit && adminMatch.MVP === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}</select><div class="flex gap-2 items-center"><span class="font-bold">E1:</span><input type="number" id="m_g1" class="glass p-3 rounded-xl bg-gray-900 text-white w-20" value="${isEdit ? adminMatch.Goles_E1 : 0}"></div><div class="flex gap-2 items-center"><span class="font-bold">E2:</span><input type="number" id="m_g2" class="glass p-3 rounded-xl bg-gray-900 text-white w-20" value="${isEdit ? adminMatch.Goles_E2 : 0}"></div></div></div><div class="admin-card mt-4"><div class="grid grid-cols-5 gap-2 mb-4"><select id="p_jugador" class="glass p-2 rounded-lg bg-gray-900 text-white col-span-2"><option value="">Jugador...</option>${DB['HISTORICA'].map(p=>`<option>${p.JUGADOR}</option>`).join('')}</select><select id="p_equipo" class="glass p-2 rounded-lg bg-gray-900 text-white"><option value="Equipo 1">Eq 1</option><option value="Equipo 2">Eq 2</option></select><input type="number" id="p_goles" placeholder="Goles" class="glass p-2 rounded-lg bg-gray-900 text-white"><input type="number" id="p_nota" placeholder="Nota" class="glass p-2 rounded-lg bg-gray-900 text-white"></div><button onclick="addPlayerToMatch()" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl mb-4">+ Agregar</button><div class="space-y-2">${adminMatch.Detalle.map((p, i) => `<div class="gen-player"><span>${p.Jugador} (Eq ${p.Equipo}) - ⚽${p.Goles} ⭐${p.Nota}</span><button onclick="removePlayerFromMatch(${i})" class="text-red-500 font-bold">X</button></div>`).join('')}</div></div><button onclick="${isEdit ? 'saveEditedMatch()' : 'saveMatch()'}" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-lg mt-4">${isEdit ? 'GUARDAR CAMBIOS' : 'GUARDAR PARTIDO'}</button>`;
    }
    else if(adminSection === 'manageStadiums') {
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">🏟️ Gestionar Estadios</h1><div class="admin-card space-y-4"><div class="space-y-2">${estadios.map(e => `<div class="gen-player"><span>${e}</span><div class="flex gap-2"><button onclick="editStadium('${e}')" class="text-blue-400">✏️</button><button onclick="deleteStadium('${e}')" class="text-red-500">❌</button></div></div>`).join('')}</div><input type="text" id="new_stadium_name" placeholder="Nombre del nuevo estadio" class="w-full glass p-3 rounded-xl bg-gray-900 text-white"><button onclick="saveStadium()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl">AÑADIR ESTADIO</button></div>`;
    }
    else if(adminSection === 'editHome') {
        const currentText = DB['CONFIG'] && DB['CONFIG'].home_text ? DB['CONFIG'].home_text : '';
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">📝 Editor INICIO</h1><div class="admin-card space-y-4"><textarea id="home_text_input" rows="5" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">${currentText}</textarea><button onclick="saveHomeText()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl">GUARDAR TEXTO</button></div>`;
    }
    else if(adminSection === 'updatePhoto') {
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">📷 Insertar/Cambiar Foto</h1><div class="admin-card space-y-4"><select id="photo_player_select" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">${DB['HISTORICA'].map(p => `<option value="${p.JUGADOR}">${p.JUGADOR}</option>`).join('')}</select><input type="text" id="photo_id_input" placeholder="ID de Google Drive" class="w-full glass p-3 rounded-xl bg-gray-900 text-white"><button onclick="savePhoto()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl">GUARDAR FOTO (DRIVE)</button></div>`;
    }
    else if(adminSection === 'addPlayer') {
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">👤 Añadir Nuevo Jugador</h1><div class="admin-card space-y-4"><input type="text" id="new_player_name" placeholder="Nombre y Apellido" class="w-full glass p-3 rounded-xl bg-gray-900 text-white"><input type="text" id="new_player_pos" placeholder="Posición (Ej: DC, CM, GK)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white"><button onclick="saveNewPlayer()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl">CREAR JUGADOR</button></div>`;
    }
    else if(adminSection === 'deleteMatch') {
        app.innerHTML = `<button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button><h1 class="text-3xl font-black text-white mb-6">🗑️ Eliminar Partido</h1><div class="admin-card space-y-4"><select id="del_match_select" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">${DB['PARTIDOS'].map(p => `<option value="${p.ID_Partido}">${formatDate(p.Fecha)} - ${p.Goles_E1} a ${p.Goles_E2} (${p.MVP})</option>`).join('')}</select><button onclick="deleteMatch()" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl">ELIMINAR PARTIDO SELECCIONADO</button></div>`;
    }
}

function setAdminSection(section) { adminSection = section; adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] }; renderAdmin(); }

function showAlert(title, message, type = 'success') {
    const icon = type === 'success' ? '✅' : '⚠️';
    const color = type === 'success' ? 'text-green-400' : 'text-red-400';
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal-box text-center">
            <div class="text-4xl mb-4">${icon}</div>
            <h3 class="text-2xl font-display uppercase ${color} mb-2 tracking-wide">${title}</h3>
            <p class="text-gray-300 text-sm mb-6">${message}</p>
            <button onclick="document.getElementById('feedback-modal').remove()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">Aceptar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function loadMatchIntoAdmin(id) {
    const m = DB['PARTIDOS'].find(m => m.ID_Partido == id);
    const dets = DB['DETALLE_PARTIDO'].filter(d => d.ID_Partido == id);
    adminMatch = {
        ID_Partido: m.ID_Partido, Fecha: m.Fecha, Temporada: m.Temporada, Goles_E1: m.Goles_E1, Goles_E2: m.Goles_E2, MVP: m.MVP, Estadio: m.Estadio || 'St. Diego',
        Detalle: dets.map(d => ({ Jugador: d.Jugador, Equipo: d.Equipo, Goles: d.Goles, Nota: d.Nota }))
    };
    renderAdmin();
}

async function saveNewPlayer() { 
    const n = document.getElementById('new_player_name').value, p = document.getElementById('new_player_pos').value; 
    if(!n||!p) return showAlert('Faltan datos', 'Por favor, completá nombre y posición.', 'error'); 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addPlayer', Nombre: n, Posicion: p, FotoId: '', Password: adminPassword }) }); 
        showAlert('Jugador Creado', 'El jugador fue añadido a la base de datos.'); await loadData(); setAdminSection('menu'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function deleteMatch() { 
    const id = document.getElementById('del_match_select').value; 
    if(!confirm("¿Seguro que querés borrar este partido? Esta acción no se puede deshacer.")) return; 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMatch', MatchId: id, Password: adminPassword }) }); 
        showAlert('Partido Eliminado', 'El partido fue borrado correctamente.'); await loadData(); setAdminSection('menu'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function savePhoto() { 
    const n = document.getElementById('photo_player_select').value, id = document.getElementById('photo_id_input').value; 
    if(!id) return showAlert('Faltan datos', 'Tenés que pegar un ID de Drive.', 'error'); 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updatePhoto', Nombre: n, FotoId: id, Password: adminPassword }) }); 
        showAlert('Foto Guardada', 'La imagen se vinculó correctamente.'); await loadData(); setAdminSection('menu'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function saveStadium() { 
    const n = document.getElementById('new_stadium_name').value; 
    if(!n) return showAlert('Faltan datos', 'Escribí el nombre del estadio.', 'error'); 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addStadium', Nombre: n, Password: adminPassword }) }); 
        showAlert('Estadio Añadido', 'La nueva cancha está disponible.'); await loadData(); setAdminSection('manageStadiums'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function deleteStadium(name) { 
    if(!confirm("¿Eliminar "+name+"?")) return; 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteStadium', Nombre: name, Password: adminPassword }) }); 
        showAlert('Estadio Eliminado', 'La cancha fue borrada.'); await loadData(); setAdminSection('manageStadiums'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function editStadium(oldName) { 
    const newName = prompt("Nuevo nombre para:", oldName); 
    if(!newName) return; 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateStadium', OldName: oldName, NewName: newName, Password: adminPassword }) }); 
        showAlert('Estadio Actualizado', 'El nombre fue cambiado.'); await loadData(); setAdminSection('manageStadiums'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
async function saveHomeText() { 
    const t = document.getElementById('home_text_input').value; 
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveHomeText', Text: t, Password: adminPassword }) }); 
        showAlert('Texto Guardado', 'La noticia del inicio fue actualizada.'); await loadData(); setAdminSection('menu'); 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}
function addPlayerToMatch() { 
    const j = document.getElementById('p_jugador').value, e = document.getElementById('p_equipo').value, g = document.getElementById('p_goles').value, nt = document.getElementById('p_nota').value; 
    if(!j) return showAlert('Faltan datos', 'Elegí un jugador.', 'error'); 
    adminMatch.Detalle.push({ Jugador: j, Equipo: e, Goles: g, Nota: nt }); renderAdmin(); 
}
function removePlayerFromMatch(i) { adminMatch.Detalle.splice(i, 1); renderAdmin(); }

async function saveMatch() { 
    adminMatch.Fecha = document.getElementById('m_fecha').value; 
    adminMatch.Estadio = document.getElementById('m_estadio').value; 
    adminMatch.Temporada = document.getElementById('m_temp').value; 
    adminMatch.MVP = document.getElementById('m_mvp').value; 
    adminMatch.Goles_E1 = parseInt(document.getElementById('m_g1').value) || 0; 
    adminMatch.Goles_E2 = parseInt(document.getElementById('m_g2').value) || 0; 
    if(!adminMatch.Detalle.length) return showAlert('Faltan datos', 'Agregá al menos un jugador.', 'error'); 
    adminMatch.Detalle.forEach(d => {
        const teamNum = String(d.Equipo).includes('1') ? 1 : 2;
        d.Equipo = "Equipo " + teamNum; 
        if (adminMatch.Goles_E1 === adminMatch.Goles_E2) d.Resultado = "Empató";
        else if (teamNum === 1) d.Resultado = adminMatch.Goles_E1 > adminMatch.Goles_E2 ? "Ganó" : "Perdió";
        else d.Resultado = adminMatch.Goles_E2 > adminMatch.Goles_E1 ? "Ganó" : "Perdió";
    });
    try { 
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({action: 'saveMatch', ...adminMatch, Password: adminPassword}) }); 
        const data = await res.json(); 
        if(data.status === 'success') { 
            showAlert('Partido Cargado', 'El resultado se guardó en el Excel.'); 
            adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] }; 
            await loadData(); showView('home'); 
        } else { showAlert('Error del servidor', data.message || "Desconocido", 'error'); } 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}

async function saveEditedMatch() {
    if(!adminMatch.ID_Partido) return showAlert('Error', 'No se seleccionó ningún partido para editar.', 'error');
    if(!adminPassword) {
        adminPassword = prompt("Ingresá nuevamente la clave Admin para guardar:");
        if(!adminPassword) return;
    }
    adminMatch.Fecha = document.getElementById('m_fecha').value; 
    adminMatch.Estadio = document.getElementById('m_estadio').value; 
    adminMatch.Temporada = document.getElementById('m_temp').value; 
    adminMatch.MVP = document.getElementById('m_mvp').value; 
    adminMatch.Goles_E1 = parseInt(document.getElementById('m_g1').value) || 0; 
    adminMatch.Goles_E2 = parseInt(document.getElementById('m_g2').value) || 0; 
    if(!adminMatch.Detalle || adminMatch.Detalle.length === 0) return showAlert('Faltan datos', 'El partido debe tener al menos un jugador cargado.', 'error'); 
    adminMatch.Detalle.forEach(d => {
        const teamNum = String(d.Equipo).includes('1') ? 1 : 2;
        d.Equipo = "Equipo " + teamNum; 
        if (adminMatch.Goles_E1 === adminMatch.Goles_E2) d.Resultado = "Empató";
        else if (teamNum === 1) d.Resultado = adminMatch.Goles_E1 > adminMatch.Goles_E2 ? "Ganó" : "Perdió";
        else d.Resultado = adminMatch.Goles_E2 > adminMatch.Goles_E1 ? "Ganó" : "Perdió";
    });
    try { 
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({action: 'editMatch', ...adminMatch, Password: adminPassword}) }); 
        const data = await res.json(); 
        if(data.status === 'success') { 
            showAlert('Partido Actualizado', 'Los cambios se guardaron correctamente.'); 
            adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] }; 
            await loadData(); showView('home'); 
        } else { showAlert('Error del servidor', data.message || "Desconocido", 'error'); } 
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); } 
}

function addPlayerToGen() { const p = document.getElementById('gen_select').value; if(!p) return; if(!teamGenPlayers.includes(p)) teamGenPlayers.push(p); showView('teamGen'); }
function removePlayerFromGen(i) { teamGenPlayers.splice(i, 1); showView('teamGen'); }
function updateTeamGenOptions(type, value) {
    if(type === 'season') teamGenSeason = value;
    if(type === 'criteria') teamGenCriteria = value;
    showView('teamGen');
}
function generateTeams() {
    const tempData = getSeasonData(teamGenSeason);
    const histData = DB['HISTORICA'] || [];
    const playersWithVal = teamGenPlayers.map(name => {
        let pData = tempData.find(p => p.JUGADOR === name);
        if(!pData) pData = histData.find(p => p.JUGADOR === name) || {};
        let val = n(pData[teamGenCriteria]);
        if(val === 0) {
            if(teamGenCriteria === 'PROMEDIO') val = n(pData.OVERALL);
            if(val === 0) val = n(histData.find(p => p.JUGADOR === name)?.OVERALL || 0);
            if(val === 0) val = 75;
        }
        return { name, val: val };
    }).sort((a,b) => b.val - a.val);
    let t1 = [], t2 = [];
    playersWithVal.forEach((p, i) => { if(i % 4 === 0 || i % 4 === 3) t1.push(p); else t2.push(p); });
    const t1Avg = (t1.reduce((s,p) => s+p.val, 0) / t1.length).toFixed(1);
    const t2Avg = (t2.reduce((s,p) => s+p.val, 0) / t2.length).toFixed(1);
    const critLabel = teamGenCriteria === 'PROMEDIO' ? 'Prom' : 'OVR';
    document.getElementById('gen_result').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="glass rounded-2xl p-6 border border-blue-500/30">
                <h3 class="text-2xl font-black text-blue-400 mb-4">EQUIPO 1 (Prom: ${t1Avg})</h3>
                <div class="space-y-2">${t1.map(p => `<div class="gen-player"><span>${p.name}</span><span class="font-black ${getOvrColor(p.val)}">${p.val} ${critLabel}</span></div>`).join('')}</div>
            </div>
            <div class="glass rounded-2xl p-6 border border-red-500/30">
                <h3 class="text-2xl font-black text-red-400 mb-4">EQUIPO 2 (Prom: ${t2Avg})</h3>
                <div class="space-y-2">${t2.map(p => `<div class="gen-player"><span>${p.name}</span><span class="font-black ${getOvrColor(p.val)}">${p.val} ${critLabel}</span></div>`).join('')}</div>
            </div>
        </div>
    `;
}

function updateCardGen(field, value) {
    if(field === 'name') {
        cardGenData.name = value;
        const p = DB['HISTORICA'].find(p => p.JUGADOR === value);
        if(p) { cardGenData.pos = p.POSICION; cardGenData.photo = getPhoto(value); }
    } else if(field === 'ovr') cardGenData.ovr = n(value);
    else if(field === 'pos') cardGenData.pos = value;
    else cardGenData.stats[field] = n(value);
    updateCardPreview();
}
function updateCardPreview() {
    const ovr = n(cardGenData.ovr);
    const cardType = getCardType(ovr);
    const templateNames = { 'bronze': 'BRONCE', 'silver': 'PLATA', 'gold': 'ORO', 'toty': 'TOTY' };
    const templateName = templateNames[cardType];
    const cardBg = photosMap[templateName] || "https://via.placeholder.com/300x420?text=Falta+ID+de+" + templateName;
    const photo = cardGenData.photo || "https://via.placeholder.com/150";
    const txtColor = cardType === 'toty' ? '#ffffff' : '#000000';
    document.getElementById('card_preview').innerHTML = `
        <div style="width: 300px; height: 420px; position: relative; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <img src="${cardBg}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" onerror="this.src='https://via.placeholder.com/300x420?text=Error+al+cargar+ID'">
            <div style="position: absolute; top: 65px; left: 67px; text-align: center; color: ${txtColor};">
                <p style="font-size: 2.5rem; font-weight: 900; line-height: 1; font-family: 'Oswald', sans-serif;">${ovr}</p>
                <p style="font-size: 1.1rem; font-weight: 700; margin-top: 2px;">${cardGenData.pos}</p>
            </div>
            <div style="position: absolute; top: 87px; left: 51%; transform: translateX(-50%); width: 110px; height: 125px;">
                <img src="${photo}" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
            </div>
            <p style="position: absolute; top: 225px; left: 50%; transform: translateX(-50%); font-size: 1.1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: ${txtColor}; white-space: nowrap;">${cardGenData.name}</p>
            <div style="position: absolute; bottom: 71px; width: 100%; display: flex; justify-content: center; gap: 50px; color: ${txtColor}; font-weight: 900; font-size: 1rem; font-family: 'Oswald', sans-serif;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">RIT</span><span>${cardGenData.stats.rit}</span></div>
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">TIR</span><span>${cardGenData.stats.tir}</span></div>
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">PAS</span><span>${cardGenData.stats.pas}</span></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">REG</span><span>${cardGenData.stats.reg}</span></div>
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">DEF</span><span>${cardGenData.stats.def}</span></div>
                    <div style="display: flex; justify-content: space-between; width: 70px;"><span style="opacity: 0.8">FIS</span><span>${cardGenData.stats.fis}</span></div>
                </div>
            </div>
        </div>
    `;
}

function changeProfileSeason(playerName, season) { currentProfileSeason = season; showView('playerProfile', playerName); }
function updateDuel(playerNum, name) { if(playerNum === 1) duelP1Name = name; else duelP2Name = name; showView('duels'); }
function changeSeason(temp) { currentSeason = temp; showView('seasons'); }
function changeDuelSeason(temp) { currentDuelSeason = temp; showView('duels'); }

async function checkAdmin() {
    if (adminPassword) { 
        adminSection = 'menu'; 
        showView('admin'); 
        return; 
    }
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal-box text-center">
            <h3 class="text-2xl font-display uppercase text-blue-400 mb-2 tracking-wide">🔒 Acceso Admin</h3>
            <p class="text-gray-500 text-sm mb-6">Ingresá la clave para gestionar la liga</p>
            <input type="password" id="admin-pass-input" placeholder="Contraseña" class="w-full bg-gray-900 text-white p-3 rounded-xl mb-4 outline-none border border-white/10 text-center text-lg tracking-widest">
            <div class="flex gap-2">
                <button onclick="document.getElementById('admin-modal').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition">Cancelar</button>
                <button onclick="submitAdminPass()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">Ingresar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('admin-pass-input').focus();
    document.getElementById('admin-pass-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') submitAdminPass(); });
}

function updateAuthButtons() {
    const btnPc = document.getElementById('auth-btn-pc');
    const btnMobile = document.getElementById('auth-btn-mobile');
    
    [btnPc, btnMobile].forEach(btn => {
        if(!btn) return;
        if(currentUser) {
            btn.innerText = "Cerrar Sesión";
            btn.setAttribute('onclick', 'openLogoutModal()');
            btn.classList.remove('text-green-400', 'hover:text-green-300');
            btn.classList.add('text-red-400', 'hover:text-red-300');
        } else {
            btn.innerText = "Ingresar";
            btn.setAttribute('onclick', 'openLoginModal()');
            btn.classList.remove('text-red-400', 'hover:text-red-300');
            btn.classList.add('text-green-400', 'hover:text-green-300');
        }
    });
}

function openLoginModal() {
    const users = DB['USUARIOS'] || [];
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal-box text-center">
            <h3 class="text-2xl font-display uppercase text-green-400 mb-2 tracking-wide">Ingresar</h3>
            <p class="text-gray-500 text-sm mb-6">Selecciona tu nombre y poné tu PIN de 4 dígitos</p>
            <select id="login-name" class="w-full bg-gray-900 text-white p-3 rounded-xl mb-4 outline-none border border-white/10">
                ${users.map(u => `<option value="${u}">${u}</option>`).join('')}
            </select>
            <input type="password" id="login-pin" placeholder="PIN" maxlength="4" class="w-full bg-gray-900 text-white p-3 rounded-xl mb-4 outline-none border border-white/10 text-center text-lg tracking-widest">
            <div class="flex gap-2">
                <button onclick="document.getElementById('login-modal').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition">Cancelar</button>
                <button onclick="submitLogin()" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition">Ingresar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitLogin() {
    const name = document.getElementById('login-name').value;
    const pin = document.getElementById('login-pin').value;
    document.getElementById('login-modal').remove();
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', Nombre: name, PIN: pin }) });
        const data = await res.json();
        if(data.status === 'success') {
            currentUser = data.user;
            localStorage.setItem('tecsports_user', currentUser);
            showAlert('¡Bienvenido!', `Sesión iniciada como ${currentUser}.`);
            updateAuthButtons(); // CAMBIA EL BOTÓN A ROJO
            showView('home');
        } else {
            showAlert('Error', 'PIN incorrecto.', 'error');
        }
    } catch(e) { showAlert('Error', 'No se pudo conectar.', 'error'); }
}

function openLogoutModal() {
    const modal = document.createElement('div');
    modal.id = 'logout-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal-box text-center">
            <div class="text-4xl mb-4">👋</div>
            <h3 class="text-2xl font-display uppercase text-red-400 mb-2 tracking-wide">Cerrar Sesión</h3>
            <p class="text-gray-300 text-sm mb-6">Estás por cerrar la sesión de <b>${currentUser}</b>. ¿Querés continuar?</p>
            <div class="flex gap-2">
                <button onclick="document.getElementById('logout-modal').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition">Cancelar</button>
                <button onclick="submitLogout()" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition">Cerrar Sesión</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function submitLogout() {
    document.getElementById('logout-modal').remove();
    localStorage.removeItem('tecsports_user');
    currentUser = null;
    showAlert('Sesión Cerrada', 'Te deslogueaste correctamente.');
    updateAuthButtons(); // VUELVE A DECIR "INGRESAR" EN VERDE
    showView('home');
}


function openVoteModal(matchId) {
    const match = DB['PARTIDOS'].find(m => m.ID_Partido == matchId);
    const details = (DB['DETALLE_PARTIDO'] || []).filter(d => d.ID_Partido == matchId);

    const modal = document.createElement('div');
    modal.id = 'vote-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
        <div class="admin-modal-box text-center" style="max-width: 500px;">
            <h3 class="text-2xl font-display uppercase text-yellow-400 mb-2 tracking-wide">🗳️ Votación Anónima</h3>
            <p class="text-gray-500 text-sm mb-6">Votás como: <b>${currentUser}</b></p>
            
            <div class="mb-4 text-left">
                <label class="text-gray-300 text-sm font-bold block mb-2">MVP del Partido</label>
                <select id="vote-mvp" class="w-full bg-gray-900 text-white p-3 rounded-xl border border-white/10">
                    ${details.map(d => `<option value="${d.Jugador}">${d.Jugador} (Eq ${d.Equipo})</option>`).join('')}
                </select>
            </div>

            <div class="mb-6 max-h-60 overflow-y-auto text-left pr-2">
                <label class="text-gray-300 text-sm font-bold block mb-2">Notas de los Jugadores (1-10)</label>
                ${details.map(d => `
                    <div class="flex items-center justify-between gap-4 mb-3">
                        <span class="text-white text-sm">${d.Jugador} <span class="text-gray-500 text-xs">(Eq ${d.Equipo})</span></span>
                        <input type="number" min="1" max="10" step="0.5" id="vote-note-${d.Jugador.replace(/\s/g, '_')}" placeholder="0" class="w-20 bg-gray-900 text-white p-2 rounded-lg border border-white/10 text-center">
                    </div>
                `).join('')}
            </div>

            <button onclick="submitVote('${matchId}')" class="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl transition">Enviar Voto</button>
            <button onclick="document.getElementById('vote-modal').remove()" class="w-full mt-2 text-gray-500 text-sm hover:text-white transition">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitVote(matchId) {
    const details = (DB['DETALLE_PARTIDO'] || []).filter(d => d.ID_Partido == matchId);
    const mvp = document.getElementById('vote-mvp').value;
    
    let notas = {};
    let valid = true;
    details.forEach(d => {
        const inputVal = document.getElementById(`vote-note-${d.Jugador.replace(/\s/g, '_')}`).value;
        if(!inputVal) valid = false;
        notas[d.Jugador] = parseFloat(inputVal) || 0;
    });

    if(!valid) return alert("Por favor, completá la nota de todos los jugadores.");

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'submitVote', MatchID: matchId, Nombre: currentUser, MVP: mvp, NotasJSON: JSON.stringify(notas) }) 
        });
        const data = await res.json();
        if(data.status === 'success') {
            document.getElementById('vote-modal').remove();
            showAlert('¡Voto Enviado!', 'Tu voto fue registrado correctamente.');
            await loadData();
            showView('home');
        }
    } catch(e) { alert("Error al enviar el voto."); }
}

async function submitAdminPass() {
    const pass = document.getElementById('admin-pass-input').value;
    document.getElementById('admin-modal').remove();
    if(!pass) return;
    try { 
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkAdmin', Password: pass }) }); 
        const data = await res.json(); 
        if(data.status === 'success' && data.isAdmin) { 
            adminPassword = pass; 
            adminSection = 'menu'; 
            showView('admin'); 
        } else { 
            alert("Clave incorrecta."); 
        } 
    } catch(e) { 
        alert("Error de conexión."); 
    } 
}

function renderDuel() {
    const tempData = getSeasonData(currentDuelSeason);
    const defaultStats = { OVERALL: 0, PARTIDOS: 0, GOLES: 0, VICTORIAS: 0, "MVP'S": 0, PROMEDIO: 0 };
    const s1 = tempData.find(p => String(p.JUGADOR).trim() === String(duelP1Name).trim()) || { JUGADOR: duelP1Name, ...defaultStats };
    const s2 = tempData.find(p => String(p.JUGADOR).trim() === String(duelP2Name).trim()) || { JUGADOR: duelP2Name, ...defaultStats };
    const stats = [
        { label: 'Overall', val1: n(s1.OVERALL), val2: n(s2.OVERALL) }, { label: 'Partidos', val1: n(s1.PARTIDOS), val2: n(s2.PARTIDOS) },
        { label: 'Goles', val1: n(s1.GOLES), val2: n(s2.GOLES) }, { label: 'Victorias', val1: n(s1.VICTORIAS), val2: n(s2.VICTORIAS) },
        { label: 'MVPs', val1: n(s1["MVP'S"]), val2: n(s2["MVP'S"]) }, { label: 'Promedio', val1: n(s1.PROMEDIO), val2: n(s2.PROMEDIO) }
    ];
    return `<div class="glass rounded-2xl p-8 border border-white/10"><div class="flex justify-between items-center mb-10"><div class="text-center flex-1"><div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 border-blue-500"><img src="${getPhoto(s1.JUGADOR)}" class="w-full h-full object-cover"></div><h3 class="font-bold text-xl text-white">${s1.JUGADOR}</h3></div><div class="text-4xl font-black bg-gradient-to-r from-blue-400 to-red-500 bg-clip-text text-transparent">VS</div><div class="text-center flex-1"><div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 border-red-500"><img src="${getPhoto(s2.JUGADOR)}" class="w-full h-full object-cover"></div><h3 class="font-bold text-xl text-white">${s2.JUGADOR}</h3></div></div><div class="space-y-6">${stats.map(s => { const total = s.val1 + s.val2; const w1 = total === 0 ? 50 : (s.val1 / total) * 100; const w2 = total === 0 ? 50 : (s.val2 / total) * 100; return `<div><div class="flex justify-between text-2xl mb-2"><span class="font-black ${s.val1 >= s.val2 ? 'text-blue-400' : 'text-gray-600'}">${s.val1}</span><span class="text-gray-500 uppercase text-sm tracking-widest">${s.label}</span><span class="font-black ${s.val2 >= s.val1 ? 'text-red-400' : 'text-gray-600'}">${s.val2}</span></div><div class="flex h-3 rounded-full overflow-hidden bg-gray-800"><div class="bg-blue-500" style="width: ${w1}%"></div><div class="bg-red-500" style="width: ${w2}%"></div></div></div>`; }).join('')}</div></div>`;
}

// --- SISTEMA DE RUTAS (URLs REALES) ---
const validViews = ['home', 'players', 'seasons', 'duels', 'matchDetail', 'playerProfile', 'admin', 'cardGen', 'teamGen'];
let BASE_URL = '';

function getBasePath() {
    let path = window.location.pathname;
    if (path.endsWith('/index.html')) return path.substring(0, path.length - 'index.html'.length);
    let segments = path.split('/').filter(p => p !== '');
    for (let i = 0; i < segments.length; i++) {
        if (validViews.includes(segments[i])) {
            return '/' + segments.slice(0, i).join('/') + '/';
        }
    }
    return path.endsWith('/') ? path : path + '/';
}
document.addEventListener('click', e => {
    if (e.target.closest('a[href="#"]')) e.preventDefault();
});
function getRouteFromUrl() {
    let search = window.location.search;
    if (search.startsWith('?/')) {
        let route = search.substring(2).split('&')[0];
        let parts = route.split('/');
        let view = parts[0] || 'home';
        let param = parts[1] ? decodeURIComponent(parts[1]) : null;
        return { view, param };
    }
    let path = window.location.pathname;
    if (path.endsWith('/index.html')) return { view: 'home', param: null };
    let segments = path.split('/').filter(p => p !== '');
    for (let i = 0; i < segments.length; i++) {
        if (validViews.includes(segments[i])) {
            let view = segments[i];
            let param = (i + 1 < segments.length) ? decodeURIComponent(segments[i + 1]) : null;
            return { view, param };
        }
    }
    return { view: 'home', param: null };
}
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view) {
        showView(e.state.view, e.state.param);
    } else {
        showView('home');
    }
});
async function initApp() {
    await loadData();
    let search = window.location.search;
    if (search.startsWith('?/')) {
        let route = search.substring(2).split('&')[0];
        let parts = route.split('/');
        let view = parts[0] || 'home';
        let param = parts[1] ? decodeURIComponent(parts[1]) : null;
        BASE_URL = getBasePath();
        let cleanUrl = BASE_URL + view + (param ? '/' + encodeURIComponent(param) : '');
        window.history.replaceState({}, '', cleanUrl);
        showView(view, param);
    } else {
        BASE_URL = getBasePath();
        const initialRoute = getRouteFromUrl();
        showView(initialRoute.view, initialRoute.param);
    }
}
initApp();
