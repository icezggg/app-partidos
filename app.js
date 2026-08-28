const API_URL = "https://script.google.com/macros/s/AKfycbwG-jkQ120wbMnNokuBCnHrQZtp3BG6sXxwvNyTxPOkvZH0kKdDpiDkKE8UyY5gjrux/exec";
let DB = {}; 
let photosMap = {};
let currentSeason = '2';
let currentProfileSeason = 'hist';
let currentDuelSeason = 'hist';
let duelP1 = null;
let duelP2 = null;
let adminSection = 'menu';
let adminPassword = null;

let adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] };

const n = (val) => !val || isNaN(val) ? 0 : Number(val);
const getPhoto = (name) => photosMap[name] || "https://via.placeholder.com/150";

const formatDate = (dateStr) => {
    if (!dateStr) return 'Fecha N/D';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr; 
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) { return dateStr; }
};

const getPitchX = (posStr, team) => {
    const pos = String(posStr || 'DC').toUpperCase();
    let x = team === 1 ? 15 : 85;
    if(pos.includes('GK')) x = team === 1 ? 5 : 95;
    else if(pos.includes('DF')) x = team === 1 ? 25 : 75;
    else if(pos.includes('CM') || pos.includes('MD') || pos.includes('MCO')) x = team === 1 ? 45 : 55;
    else if(pos.includes('W') || pos.includes('LW') || pos.includes('RW')) x = team === 1 ? 50 : 50;
    else if(pos.includes('DC')) x = team === 1 ? 70 : 30;
    return x;
};

function getCardType(ovr) {
    if(ovr >= 94) return 'toty';
    if(ovr >= 75) return 'gold';
    if(ovr >= 68) return 'silver';
    return 'bronze';
}

function getOvrColor(ovr) {
    if(ovr >= 94) return 'text-cyan-400';
    if(ovr >= 75) return 'text-yellow-400';
    if(ovr >= 68) return 'text-gray-300';
    return 'text-orange-600';
}

async function loadData() {
    try {
        const res = await fetch(API_URL);
        DB = await res.json();
        
        if(DB['FOTOS']) {
            DB['FOTOS'].forEach(row => {
                if(row.JUGADOR && row.FOTO_ID) {
                    photosMap[row.JUGADOR] = `https://drive.google.com/thumbnail?id=${row.FOTO_ID}&sz=w150`;
                }
            });
        }
        
        document.getElementById('loader').style.display = 'none';
        document.getElementById('app-body').style.display = 'flex';
        document.getElementById('mobile-nav').style.display = ''; 
        
        showView('home');
    } catch (e) {
        document.getElementById('loader').innerHTML = '<p class="text-red-500 font-bold p-4 text-center">Error de conexión. Verificá la URL y la versión del Script.</p>';
    }
}

function showView(view, param = null) {
    const app = document.getElementById('app-view');
    if(Object.keys(DB).length === 0) return;
    
    document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
    if(document.querySelector(`a[onclick="showView('${view}')"]`)) document.querySelector(`a[onclick="showView('${view}')"]`).classList.add('active');
    
    if(view === 'home') {
        const inicioData = DB['INICIO'] || [];
        const lastMatch = DB['PARTIDOS'] && DB['PARTIDOS'].length > 0 ? DB['PARTIDOS'][DB['PARTIDOS'].length - 1] : null;
        
        app.innerHTML = `
            <div class="mb-8">
                <h2 class="text-3xl font-display tracking-wide text-gray-500 uppercase">Bienvenido a la</h2>
                <h1 class="text-5xl font-black text-white uppercase">Liga Aura 🔥</h1>
            </div>
            ${lastMatch ? `
            <div onclick="showView('matchDetail', '${lastMatch.ID_Partido}')" class="glass rounded-2xl p-6 mb-8 hover:border-green-500/50 transition cursor-pointer relative overflow-hidden">
                <div class="absolute top-4 left-4 text-xs text-gray-500 font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded">${formatDate(lastMatch.Fecha)}</div>
                <div class="absolute top-0 right-0 bg-green-500/10 px-4 py-1 text-xs font-bold text-green-400 rounded-bl-lg">ESTADIO ${lastMatch.Estadio || 'St. Diego'}</div>
                <div class="flex justify-between items-center mt-6">
                    <div class="text-center flex-1"><p class="text-4xl font-black text-green-400">EQUIPO 1</p></div>
                    <div class="bg-black px-8 py-4 rounded-xl mx-4 neon-glow border border-white/10">
                        <span class="text-6xl font-black text-green-400">${lastMatch.Goles_E1}</span>
                        <span class="text-4xl font-bold text-gray-600 mx-2">-</span>
                        <span class="text-6xl font-black text-white">${lastMatch.Goles_E2}</span>
                    </div>
                    <div class="text-center flex-1"><p class="text-4xl font-black text-blue-400">EQUIPO 2</p></div>
                </div>
                <div class="mt-6 flex items-center justify-center space-x-2 text-yellow-400">
                    <span class="text-xl">🎩</span><p class="font-bold text-lg">MVP: ${lastMatch.MVP}</p>
                </div>
            </div>
            ` : '<p class="text-gray-500 mb-8">No hay partidos cargados aún.</p>'}

            <h2 class="text-3xl font-display uppercase tracking-wide text-gray-300 mb-4 border-l-4 border-green-500 pl-3">Tabla de Posiciones</h2>
            <div class="glass rounded-2xl overflow-hidden border border-white/10">
                <table class="w-full text-sm">
                    <thead class="bg-white/5 text-gray-500 uppercase text-xs border-b border-white/10">
                        <tr><th class="p-3 text-left">Jugador</th><th class="p-3 text-center">PJ</th><th class="p-3 text-center">Goles</th><th class="p-3 text-center text-green-400">PTS</th></tr>
                    </thead>
                    <tbody>
                        ${inicioData.map((j, i) => {
                            const nombre = j.JUGADOR || j['JUGADOR '] || j['JUGADORES'] || Object.values(j)[0];
                            const pj = n(j.PJ || j['PJ '] || j['PARTIDOS']);
                            const goles = n(j.GOLES || j['GOLES '] || j['G']);
                            const pts = n(j.PTS || j['PTS '] || j['PUNTOS']);
                            let rowColor = i === 0 ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : i === 2 ? 'bg-orange-700/10' : '';
                            return `
                                <tr class="border-b border-white/5 ${rowColor} hover:bg-white/5 transition">
                                    <td class="p-3 font-semibold text-white flex items-center gap-2">
                                        <span class="text-gray-600 w-4">${i+1}.</span> ${nombre}
                                    </td>
                                    <td class="p-3 text-center text-gray-400">${pj}</td>
                                    <td class="p-3 text-center text-gray-400">${goles}</td>
                                    <td class="p-3 text-center font-black text-green-400">${pts}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
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
                // Protección: si no encuentra al jugador en HISTORICA, asume DC
                const histPlayer = (DB['HISTORICA'] || []).find(h => String(h.JUGADOR).trim() === String(p.Jugador).trim());
                const pos = String(histPlayer ? histPlayer.POSICION : 'DC').toUpperCase();
                if(!groups[pos]) groups[pos] = [];
                groups[pos].push(p);
            });
            let html = '';
            for(const pos in groups) {
                const x = getPitchX(pos, teamNum);
                const playersInPos = groups[pos];
                playersInPos.forEach((p, idx) => {
                    let y = 50;
                    if(playersInPos.length === 1) {
                        if (pos.includes('L')) y = 75;
                        else if (pos.includes('R')) y = 25;
                        else y = 50;
                    } else {
                        y = 50 + ((idx - (playersInPos.length - 1) / 2) * 25); 
                    }
                    const isMvp = match.MVP === p.Jugador;
                    html += `
                        <div class="player-pin flex flex-col items-center" style="left: ${x}%; top: ${y}%;" onclick="alert('${p.Jugador}\\nGoles: ${p.Goles}\\nNota: ${p.Nota}')">
                            <div class="w-10 h-10 md:w-14 md:h-14 rounded-full ${teamNum === 1 ? 'bg-green-500/20 border-green-400' : 'bg-blue-500/20 border-blue-400'} border-2 flex items-center justify-center text-xs md:text-sm font-black text-white backdrop-blur ${isMvp ? 'ring-4 ring-yellow-400 border-yellow-400' : ''}">${pos}</div>
                            <span class="text-[8px] md:text-xs font-bold mt-1 bg-black/70 px-1 rounded text-white">${p.Jugador}</span>
                        </div>
                    `;
                });
            }
            return html;
        };

        app.innerHTML = `
            <button onclick="showView('home')" class="btn-back"><- Volver</button>
            
            <div class="glass rounded-2xl p-6 mb-8 border border-white/10 text-center relative">
                <div class="absolute top-4 left-4 text-xs text-gray-500 font-bold uppercase bg-black/50 px-2 py-1 rounded">${formatDate(match.Fecha)}</div>
                <div class="flex justify-between items-center mt-4">
                    <div class="text-center flex-1"><p class="text-4xl font-black text-green-400">EQUIPO 1</p></div>
                    <div class="bg-black px-8 py-4 rounded-xl mx-4 neon-glow border border-white/10">
                        <span class="text-6xl font-black text-green-400">${match.Goles_E1}</span>
                        <span class="text-4xl font-bold text-gray-600 mx-2">-</span>
                        <span class="text-6xl font-black text-white">${match.Goles_E2}</span>
                    </div>
                    <div class="text-center flex-1"><p class="text-4xl font-black text-blue-400">EQUIPO 2</p></div>
                </div>
                <div class="mt-4 flex items-center justify-center space-x-2 text-yellow-400">
                    <span class="text-xl">🎩</span><p class="font-bold text-lg">MVP: ${match.MVP}</p>
                </div>
            </div>

            <div class="pitch rounded-3xl p-4 relative w-full aspect-[16/9] mb-8 overflow-hidden">
                <div class="pitch-line-center"></div>
                <div class="pitch-circle-center"></div>
                <div class="pitch-box-left"></div>
                <div class="pitch-box-right"></div>
                <div class="pitch-goal-left"></div>
                <div class="pitch-goal-right"></div>
                ${groupAndMap(e1, 1)}
                ${groupAndMap(e2, 2)}
            </div>
            
            <div class="flex flex-col md:flex-row gap-6">
                <div class="flex-1 w-full md:w-1/2">
                    <h3 class="text-xl font-black mb-3 text-green-400 border-l-4 border-green-500 pl-3">Equipo 1</h3>
                    <div class="space-y-2">
                        ${e1.map(p => `
                            <div class="glass p-3 rounded-xl flex items-center justify-between ${match.MVP === p.Jugador ? 'border border-yellow-400 bg-yellow-500/10' : ''}">
                                <div class="flex items-center gap-3">
                                    <img src="${getPhoto(p.Jugador)}" class="w-8 h-8 rounded-full object-cover">
                                    <span class="font-semibold text-sm ${match.MVP === p.Jugador ? 'text-yellow-400' : 'text-white'}">${p.Jugador} ${match.MVP === p.Jugador ? '🎩' : ''}</span>
                                </div>
                                <div class="flex gap-4 text-sm font-bold">
                                    <span class="text-green-400">⚽ ${n(p.Goles)}</span>
                                    <span class="text-yellow-400">⭐ ${p.Nota}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="flex-1 w-full md:w-1/2">
                    <h3 class="text-xl font-black mb-3 text-blue-400 border-l-4 border-blue-500 pl-3">Equipo 2</h3>
                    <div class="space-y-2">
                        ${e2.map(p => `
                            <div class="glass p-3 rounded-xl flex items-center justify-between ${match.MVP === p.Jugador ? 'border border-yellow-400 bg-yellow-500/10' : ''}">
                                <div class="flex items-center gap-3">
                                    <img src="${getPhoto(p.Jugador)}" class="w-8 h-8 rounded-full object-cover">
                                    <span class="font-semibold text-sm ${match.MVP === p.Jugador ? 'text-yellow-400' : 'text-white'}">${p.Jugador} ${match.MVP === p.Jugador ? '🎩' : ''}</span>
                                </div>
                                <div class="flex gap-4 text-sm font-bold">
                                    <span class="text-green-400">⚽ ${n(p.Goles)}</span>
                                    <span class="text-yellow-400">⭐ ${p.Nota}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    else if(view === 'players') {
        const histData = DB['HISTORICA'] || [];
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-1">Plantel</h1>
            <p class="text-gray-500 mb-6">Toca un jugador para ver su perfil completo</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${histData.map(p => `
                    <div onclick="showView('playerProfile', '${p.JUGADOR}')" class="glass p-4 rounded-2xl text-center hover:border-green-500/50 transition cursor-pointer flex flex-col items-center justify-center">
                        <div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 ${n(p.OVERALL)>=94 ? 'border-cyan-400' : n(p.OVERALL)>=75 ? 'border-yellow-400' : n(p.OVERALL)>=68 ? 'border-gray-300' : 'border-orange-700'}">
                            <img src="${getPhoto(p.JUGADOR)}" alt="${p.JUGADOR}" class="w-full h-full object-cover">
                        </div>
                        <h3 class="font-bold text-white text-sm">${p.JUGADOR}</h3>
                        <div class="mt-2 flex items-center gap-2">
                            <span class="font-black text-xl ${getOvrColor(n(p.OVERALL))}">${n(p.OVERALL)}</span>
                            <span class="text-sm font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">${p.POSICION}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    else if(view === 'playerProfile') {
        const hist = DB['HISTORICA'].find(j => j.JUGADOR === param);
        if(!hist) return showView('players');
        
        const tempData = currentProfileSeason === 't1' ? DB['TEMP 1'] : currentProfileSeason === 't2' ? DB['TEMP 2'] : DB['HISTORICA'];
        const s = tempData.find(j => j.JUGADOR === param) || hist;
        
        const ovr = n(s.OVERALL);
        const cardType = getCardType(ovr);
        const fifaStats = [85, 92, 80, 88, 45, 85]; 
        
        app.innerHTML = `
            <button onclick="showView('players')" class="btn-back"><- Volver</button>
            <div class="flex flex-col md:flex-row gap-6 items-center mb-8">
                <div class="card-${cardType} rounded-2xl p-6 w-56 text-center flex-shrink-0">
                    <div class="flex justify-between items-start">
                        <div class="text-left">
                            <p class="text-5xl font-black text-white">${ovr}</p>
                            <p class="text-lg font-bold ${cardType === 'toty' ? 'text-cyan-400' : 'text-yellow-400'}">${hist.POSICION}</p>
                        </div>
                    </div>
                    <div class="w-28 h-28 bg-gray-800 rounded-full mx-auto my-4 overflow-hidden border-2 border-white/20">
                        <img src="${getPhoto(hist.JUGADOR)}" class="w-full h-full object-cover">
                    </div>
                    <p class="text-xl font-bold uppercase tracking-wider text-white">${hist.JUGADOR.split(' ')[0]}</p>
                    <p class="text-sm text-gray-400 uppercase">${hist.JUGADOR.split(' ')[1] || ''}</p>
                </div>
                <div class="flex-grow w-full">
                    <h2 class="text-4xl font-black text-white mb-4">${hist.JUGADOR}</h2>
                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-green-400">${n(s.GOLES)}</p><p class="text-xs text-gray-500 uppercase">Goles</p></div>
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-white">${n(s.PARTIDOS)}</p><p class="text-xs text-gray-500 uppercase">Partidos</p></div>
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-yellow-400">${n(s["MVP'S"])}</p><p class="text-xs text-gray-500 uppercase">MVPs</p></div>
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-green-400">${n(s.VICTORIAS)}</p><p class="text-xs text-gray-500 uppercase">Victorias</p></div>
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-red-400">${n(s.DERROTAS)}</p><p class="text-xs text-gray-500 uppercase">Derrotas</p></div>
                        <div class="glass p-3 rounded-xl text-center"><p class="text-2xl font-black text-blue-400">${n(s.PROMEDIO)}</p><p class="text-xs text-gray-500 uppercase">Promedio</p></div>
                    </div>
                </div>
            </div>
            <div class="flex gap-2 mb-6">
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 'hist')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 'hist' ? 'bg-green-500 text-black' : 'glass text-gray-400'}">Histórica</button>
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 't1')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 't1' ? 'bg-green-500 text-black' : 'glass text-gray-400'}">Temp 1</button>
                <button onclick="changeProfileSeason('${hist.JUGADOR}', 't2')" class="flex-1 py-3 rounded-xl font-bold ${currentProfileSeason === 't2' ? 'bg-green-500 text-black' : 'glass text-gray-400'}">Temp 2</button>
            </div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-green-500 pl-3">ESTADISTICAS</h3>
            <div class="space-y-4">
                ${[['RITMO', fifaStats[0]], ['TIRO', fifaStats[1]], ['PASE', fifaStats[2]], ['REGATE', fifaStats[3]], ['DEFENSA', fifaStats[4]], ['FISICO', fifaStats[5]]].map(stat => `
                    <div class="flex items-center gap-4">
                        <span class="text-sm font-bold text-gray-400 w-24">${stat[0]}</span>
                        <div class="flex-grow bg-gray-800 rounded-full h-3">
                            <div class="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full" style="width: ${stat[1]}%"></div>
                        </div>
                        <span class="text-lg font-black text-white w-10 text-right">${stat[1]}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    else if(view === 'seasons') {
        const tempData = DB[`TEMP ${currentSeason}`] || (currentSeason === 'hist' ? DB['HISTORICA'] : []);
        const matches = (DB['PARTIDOS'] || []).filter(m => currentSeason === 'hist' ? true : String(m.Temporada) === String(currentSeason));
        
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-6">Temporadas</h1>
            <div class="flex gap-2 mb-8">
                ${['hist', '1', '2'].map(t => `
                    <button onclick="changeSeason('${t}')" class="flex-1 py-3 rounded-xl font-bold transition ${currentSeason == t ? 'bg-green-500 text-black' : 'glass text-gray-400'}">${t === 'hist' ? 'Histórica' : 'Temp ' + t}</button>
                `).join('')}
            </div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-green-500 pl-3">Partidos Jugados</h3>
            <div class="space-y-3 mb-8">
                ${matches.length === 0 ? '<p class="text-gray-500">No hay partidos en esta temporada.</p>' : matches.map(p => `
                    <div onclick="showView('matchDetail', '${p.ID_Partido}')" class="glass p-4 rounded-xl flex justify-between items-center hover:bg-white/5 cursor-pointer transition border border-white/5">
                        <div>
                            <p class="text-xs text-gray-500">${formatDate(p.Fecha)} | ${p.Estadio || 'St. Diego'}</p>
                            <p class="text-sm font-bold text-white">Equipo 1 vs Equipo 2</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-2xl font-black text-white">${p.Goles_E1} - ${p.Goles_E2}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <h3 class="text-2xl font-black mb-4 text-white border-l-4 border-green-500 pl-3">Estadísticas Individuales</h3>
            <div class="glass rounded-2xl overflow-x-auto border border-white/10">
                <table class="w-full text-sm whitespace-nowrap">
                    <thead class="bg-white/5 text-gray-500 uppercase text-xs">
                        <tr>
                            <th class="p-3 text-left">Jugador</th><th class="p-3 text-center">PJ</th><th class="p-3 text-center">PG</th><th class="p-3 text-center">PE</th><th class="p-3 text-center">PP</th><th class="p-3 text-center">Goles</th><th class="p-3 text-center">Ratio</th><th class="p-3 text-center">MVP</th><th class="p-3 text-center">Prom</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tempData.filter(p => n(p.PARTIDOS) > 0).map(p => `
                            <tr class="border-t border-white/5 hover:bg-white/5 cursor-pointer" onclick="showView('playerProfile', '${p.JUGADOR}')">
                                <td class="p-3 font-semibold text-white">${p.JUGADOR}</td>
                                <td class="p-3 text-center text-gray-400">${n(p.PARTIDOS)}</td>
                                <td class="p-3 text-center text-green-400">${n(p.VICTORIAS)}</td>
                                <td class="p-3 text-center text-gray-400">${n(p.EMPATES)}</td>
                                <td class="p-3 text-center text-red-400">${n(p.DERROTAS)}</td>
                                <td class="p-3 text-center font-bold text-green-400">${n(p.GOLES)}</td>
                                <td class="p-3 text-center text-gray-400">${n(p["RATIO GOLEADOR"])}</td>
                                <td class="p-3 text-center text-yellow-400">${n(p["MVP'S"])}</td>
                                <td class="p-3 text-center text-blue-400">${n(p.PROMEDIO)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    else if(view === 'duels') {
        const histData = DB['HISTORICA'] || [];
        app.innerHTML = `
            <h1 class="text-5xl font-black text-white uppercase mb-6">⚔️ Duelos</h1>
            <div class="flex gap-2 mb-8">
                ${['hist', '1', '2'].map(t => `
                    <button onclick="changeDuelSeason('${t}')" class="flex-1 py-3 rounded-xl font-bold transition ${currentDuelSeason == t ? 'bg-green-500 text-black' : 'glass text-gray-400'}">${t === 'hist' ? 'Histórica' : 'Temp ' + t}</button>
                `).join('')}
            </div>
            <div class="grid grid-cols-2 gap-4 mb-8">
                <select id="duel-select-1" onchange="updateDuel(1, this.value)" class="glass p-3 rounded-xl bg-gray-900 text-white outline-none">
                    <option value="">Jugador 1</option>
                    ${histData.map(p => `<option value="${p.JUGADOR}" ${duelP1?.JUGADOR === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}
                </select>
                <select id="duel-select-2" onchange="updateDuel(2, this.value)" class="glass p-3 rounded-xl bg-gray-900 text-white outline-none">
                    <option value="">Jugador 2</option>
                    ${histData.map(p => `<option value="${p.JUGADOR}" ${duelP2?.JUGADOR === p.JUGADOR ? 'selected' : ''}>${p.JUGADOR}</option>`).join('')}
                </select>
            </div>
            <div id="duel-content">
                ${duelP1 && duelP2 ? renderDuel() : '<p class="text-center text-gray-600 mt-10">Selecciona ambos...</p>'}
            </div>
        `;
    }
    else if(view === 'admin') {
        renderAdmin();
    }
    window.scrollTo(0, 0);
}

function renderAdmin() {
    const app = document.getElementById('app-view');
    if(adminSection === 'menu') {
        app.innerHTML = `
            <h1 class="text-4xl font-black text-white mb-2">Panel de <span class="text-green-400">Administración</span></h1>
            <p class="text-gray-500 mb-8">Gestioná la liga, los jugadores y los partidos desde aquí.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div onclick="setAdminSection('loadMatch')" class="admin-card group">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl">⚽</div>
                        <div><h3 class="group-hover:text-green-400 transition">Cargar Partido</h3><p>Registra un nuevo resultado y stats</p></div>
                    </div>
                </div>
                <div onclick="setAdminSection('addPlayer')" class="admin-card group">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl">👤</div>
                        <div><h3 class="group-hover:text-green-400 transition">Añadir Jugador</h3><p>Suma un nuevo integrante a la liga</p></div>
                    </div>
                </div>
                <div onclick="setAdminSection('deleteMatch')" class="admin-card group">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl">🗑️</div>
                        <div><h3 class="group-hover:text-red-400 transition">Eliminar Partido</h3><p>Borrá un partido cargado por error</p></div>
                    </div>
                </div>
                <div onclick="setAdminSection('updatePhoto')" class="admin-card group">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl">📷</div>
                        <div><h3 class="group-hover:text-green-400 transition">Gestionar Fotos</h3><p>Actualiza el avatar de un jugador</p></div>
                    </div>
                </div>
            </div>
        `;
    } 
    else if(adminSection === 'loadMatch') {
        app.innerHTML = `
            <button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button>
            <h1 class="text-3xl font-black text-white mb-6">⚽ Cargar Partido</h1>
            <div class="admin-card mb-6">
                <h3 class="text-lg font-bold mb-4 text-gray-300">Datos del Partido</h3>
                <div class="grid grid-cols-2 gap-4">
                    <input type="date" id="m_fecha" class="glass p-3 rounded-xl bg-gray-900 text-white" value="${new Date().toISOString().split('T')[0]}">
                    <input type="text" id="m_estadio" placeholder="Estadio" class="glass p-3 rounded-xl bg-gray-900 text-white" value="St. Diego">
                    <select id="m_temp" class="glass p-3 rounded-xl bg-gray-900 text-white"><option value="1">Temp 1</option><option value="2" selected>Temp 2</option></select>
                    <select id="m_mvp" class="glass p-3 rounded-xl bg-gray-900 text-white"><option value="">MVP</option>${DB['HISTORICA'].map(p=>`<option>${p.JUGADOR}</option>`).join('')}</select>
                    <div class="flex gap-2 items-center"><span class="font-bold text-white">E1:</span><input type="number" id="m_g1" class="glass p-3 rounded-xl bg-gray-900 text-white w-20" value="0"></div>
                    <div class="flex gap-2 items-center"><span class="font-bold text-white">E2:</span><input type="number" id="m_g2" class="glass p-3 rounded-xl bg-gray-900 text-white w-20" value="0"></div>
                </div>
            </div>
            <div class="admin-card mb-6">
                <h3 class="text-lg font-bold mb-4 text-gray-300">Agregar Jugadores</h3>
                <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                    <select id="p_jugador" class="glass p-2 rounded-lg bg-gray-900 text-white col-span-2"><option value="">Jugador...</option>${DB['HISTORICA'].map(p=>`<option>${p.JUGADOR}</option>`).join('')}</select>
                    <select id="p_equipo" class="glass p-2 rounded-lg bg-gray-900 text-white"><option value="1">Eq 1</option><option value="2">Eq 2</option></select>
                    <input type="number" id="p_goles" placeholder="Goles" class="glass p-2 rounded-lg bg-gray-900 text-white">
                    <input type="number" id="p_nota" placeholder="Nota" class="glass p-2 rounded-lg bg-gray-900 text-white">
                </div>
                <button onclick="addPlayerToMatch()" class="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl mb-4 border border-white/10">+ Agregar</button>
                <div class="space-y-2">
                    ${adminMatch.Detalle.map((p, i) => `<div class="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg"><span>${p.Jugador} (Eq ${p.Equipo}) - ⚽${p.Goles} ⭐${p.Nota}</span><button onclick="removePlayerFromMatch(${i})" class="text-red-500 font-bold">X</button></div>`).join('')}
                </div>
            </div>
            <button onclick="saveMatch()" class="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-lg">GUARDAR PARTIDO</button>
        `;
    }
    else if(adminSection === 'addPlayer') {
        app.innerHTML = `
            <button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button>
            <h1 class="text-3xl font-black text-white mb-6">👤 Añadir Nuevo Jugador</h1>
            <div class="admin-card space-y-4">
                <input type="text" id="new_player_name" placeholder="Nombre y Apellido" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                <input type="text" id="new_player_pos" placeholder="Posición (Ej: DC, CM, GK)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                <input type="text" id="new_player_photo" placeholder="ID de Google Drive (Opcional)" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                <button onclick="saveNewPlayer()" class="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-lg">CREAR JUGADOR</button>
            </div>
        `;
    }
    else if(adminSection === 'deleteMatch') {
        app.innerHTML = `
            <button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button>
            <h1 class="text-3xl font-black text-white mb-6">🗑️ Eliminar Partido</h1>
            <div class="admin-card space-y-4">
                <select id="del_match_select" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                    ${DB['PARTIDOS'].map(p => `<option value="${p.ID_Partido}">${formatDate(p.Fecha)} - ${p.Goles_E1} a ${p.Goles_E2} (${p.MVP})</option>`).join('')}
                </select>
                <button onclick="deleteMatch()" class="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl text-lg">ELIMINAR PARTIDO SELECCIONADO</button>
            </div>
        `;
    }
    else if(adminSection === 'updatePhoto') {
        app.innerHTML = `
            <button onclick="setAdminSection('menu')" class="btn-back"><- Volver</button>
            <h1 class="text-3xl font-black text-white mb-6">📷 Insertar/Cambiar Foto</h1>
            <div class="admin-card space-y-4">
                <select id="photo_player_select" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                    ${DB['HISTORICA'].map(p => `<option value="${p.JUGADOR}">${p.JUGADOR}</option>`).join('')}
                </select>
                <input type="text" id="photo_id_input" placeholder="Nuevo ID de Google Drive" class="w-full glass p-3 rounded-xl bg-gray-900 text-white">
                <button onclick="savePhoto()" class="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-lg">GUARDAR FOTO</button>
            </div>
        `;
    }
}

function setAdminSection(section) { adminSection = section; renderAdmin(); }

async function saveNewPlayer() {
    const nombre = document.getElementById('new_player_name').value;
    const pos = document.getElementById('new_player_pos').value;
    const fotoId = document.getElementById('new_player_photo').value;
    if(!nombre || !pos) return alert("Falta nombre o posición");
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addPlayer', Nombre: nombre, Posicion: pos, FotoId: fotoId, Password: adminPassword }) });
        alert("Jugador añadido!");
        await loadData();
        setAdminSection('menu');
    } catch(e) { alert("Error de red."); }
}

async function deleteMatch() {
    const matchId = document.getElementById('del_match_select').value;
    if(!confirm("Seguro que querés borrar este partido?")) return;
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteMatch', MatchId: matchId, Password: adminPassword }) });
        alert("Partido eliminado!");
        await loadData();
        setAdminSection('menu');
    } catch(e) { alert("Error de red."); }
}

async function savePhoto() {
    const nombre = document.getElementById('photo_player_select').value;
    const fotoId = document.getElementById('photo_id_input').value;
    if(!fotoId) return alert("Pegá el ID de la foto");
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updatePhoto', Nombre: nombre, FotoId: fotoId, Password: adminPassword }) });
        alert("Foto guardada!");
        await loadData();
        setAdminSection('menu');
    } catch(e) { alert("Error de red."); }
}

function addPlayerToMatch() {
    const jug = document.getElementById('p_jugador').value;
    const eq = document.getElementById('p_equipo').value;
    const gol = document.getElementById('p_goles').value;
    const not = document.getElementById('p_nota').value;
    if(!jug) return alert("Elegí un jugador");
    adminMatch.Detalle.push({ Jugador: jug, Equipo: eq, Goles: gol, Nota: not });
    renderAdmin();
}

function removePlayerFromMatch(i) { adminMatch.Detalle.splice(i, 1); renderAdmin(); }

async function saveMatch() {
    adminMatch.Fecha = document.getElementById('m_fecha').value;
    adminMatch.Estadio = document.getElementById('m_estadio').value;
    adminMatch.Temporada = document.getElementById('m_temp').value;
    adminMatch.MVP = document.getElementById('m_mvp').value;
    adminMatch.Goles_E1 = document.getElementById('m_g1').value;
    adminMatch.Goles_E2 = document.getElementById('m_g2').value;
    if(adminMatch.Detalle.length === 0) return alert("Agregá al menos un jugador.");

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({action: 'saveMatch', ...adminMatch, Password: adminPassword}) });
        const data = await res.json();
        if(data.status === 'success') {
            alert("Partido guardado!");
            adminMatch = { Fecha: '', Temporada: '2', Goles_E1: 0, Goles_E2: 0, MVP: '', Estadio: 'St. Diego', Detalle: [] };
            await loadData(); 
            showView('home');
        } else { alert("Error: " + data.message); }
    } catch(e) { alert("Error de red."); }
}

function changeProfileSeason(playerName, season) { currentProfileSeason = season; showView('playerProfile', playerName); }
function updateDuel(playerNum, name) { if(playerNum === 1) duelP1 = DB['HISTORICA'].find(p => p.JUGADOR === name); else duelP2 = DB['HISTORICA'].find(p => p.JUGADOR === name); showView('duels'); }
function changeSeason(temp) { currentSeason = temp; showView('seasons'); }
function changeDuelSeason(temp) { currentDuelSeason = temp; showView('duels'); }
async function checkAdmin() {
    const pass = prompt("Ingrese clave de Administrador:");
    if(!pass) return;
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkAdmin', Password: pass }) });
        const data = await res.json();
        
        if(data.status === 'success' && data.isAdmin === true) {
            adminPassword = pass; // Guardamos la contraseña en memoria
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
    const tempData = currentDuelSeason === 't1' ? DB['TEMP 1'] : currentDuelSeason === 't2' ? DB['TEMP 2'] : DB['HISTORICA'];
    const s1 = tempData.find(p => String(p.JUGADOR).trim() === String(duelP1.JUGADOR).trim()) || { JUGADOR: duelP1.JUGADOR, OVERALL: 0, PARTIDOS: 0, GOLES: 0, VICTORIAS: 0, "MVP'S": 0, PROMEDIO: 0 };
    const s2 = tempData.find(p => String(p.JUGADOR).trim() === String(duelP2.JUGADOR).trim()) || { JUGADOR: duelP2.JUGADOR, OVERALL: 0, PARTIDOS: 0, GOLES: 0, VICTORIAS: 0, "MVP'S": 0, PROMEDIO: 0 };
    
    const stats = [
        { label: 'Overall', val1: n(s1.OVERALL), val2: n(s2.OVERALL) }, { label: 'Partidos', val1: n(s1.PARTIDOS), val2: n(s2.PARTIDOS) },
        { label: 'Goles', val1: n(s1.GOLES), val2: n(s2.GOLES) }, { label: 'Victorias', val1: n(s1.VICTORIAS), val2: n(s2.VICTORIAS) },
        { label: 'MVPs', val1: n(s1["MVP'S"]), val2: n(s2["MVP'S"]) }, { label: 'Promedio', val1: n(s1.PROMEDIO), val2: n(s2.PROMEDIO) }
    ];
    return `
        <div class="glass rounded-2xl p-8 border border-white/10">
            <div class="flex justify-between items-center mb-10">
                <div class="text-center flex-1">
                    <div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 border-green-500"><img src="${getPhoto(s1.JUGADOR)}" class="w-full h-full object-cover"></div>
                    <h3 class="font-bold text-xl text-white">${s1.JUGADOR}</h3>
                </div>
                <div class="text-4xl font-black bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">VS</div>
                <div class="text-center flex-1">
                    <div class="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden border-4 border-blue-500"><img src="${getPhoto(s2.JUGADOR)}" class="w-full h-full object-cover"></div>
                    <h3 class="font-bold text-xl text-white">${s2.JUGADOR}</h3>
                </div>
            </div>
            <div class="space-y-6">
                ${stats.map(s => {
                    const total = s.val1 + s.val2; const w1 = total === 0 ? 50 : (s.val1 / total) * 100; const w2 = total === 0 ? 50 : (s.val2 / total) * 100;
                    return `
                        <div>
                            <div class="flex justify-between text-2xl mb-2">
                                <span class="font-black ${s.val1 >= s.val2 ? 'text-green-400' : 'text-gray-600'}">${s.val1}</span>
                                <span class="text-gray-500 uppercase text-sm tracking-widest">${s.label}</span>
                                <span class="font-black ${s.val2 >= s.val1 ? 'text-blue-400' : 'text-gray-600'}">${s.val2}</span>
                            </div>
                            <div class="flex h-3 rounded-full overflow-hidden bg-gray-800">
                                <div class="bg-green-500" style="width: ${w1}%"></div>
                                <div class="bg-blue-500" style="width: ${w2}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

loadData();