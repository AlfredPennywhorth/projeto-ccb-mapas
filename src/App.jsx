import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DADOS_REAIS } from './casas';

const SEDES_BASE = [
  { id: 'SM', nome: "SÃO MATEUS", lat: -23.6089157, lng: -46.4786242, cor: "#2563eb" },
  { id: 'JR', nome: "JARDIM ROSELI", lat: -23.5957263, lng: -46.4421270, cor: "#dc2626" },
  { id: 'VC', nome: "VILA CARRÃO", lat: -23.5507928, lng: -46.5394055, cor: "#7c3aed" }
];

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

function MapController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50], animate: true });
  }, [bounds, map]);
  return null;
}

export default function App() {
  const [cenario, setCenario] = useState(2);
  const [filtroSede, setFiltroSede] = useState(null);
  const [atribuicoes, setAtribuicoes] = useState({});

  const { metricas, setoresAtivos, mapBounds } = useMemo(() => {
    const sedesAtivas = SEDES_BASE.slice(0, cenario);
    const grupos = {};
    sedesAtivas.forEach(s => { grupos[s.id] = { info: s, casas: [], d: 0, i: 0, maxDist: 0 }; });

    DADOS_REAIS.forEach(casa => {
      let destinoId;
      const manualId = atribuicoes[casa.bairro];

      if (manualId && manualId !== 'auto' && sedesAtivas.find(s => s.id === manualId)) {
        destinoId = manualId;
      } else {
        let menorDist = Infinity;
        destinoId = sedesAtivas[0].id;
        sedesAtivas.forEach(sede => {
          const d = Math.hypot(casa.lat - sede.lat, casa.lng - sede.lng);
          if (d < menorDist) { menorDist = d; destinoId = sede.id; }
        });
      }

      const km = haversine(casa.lat, casa.lng, grupos[destinoId].info.lat, grupos[destinoId].info.lng);
      grupos[destinoId].casas.push({ ...casa, km: km.toFixed(2), cor: grupos[destinoId].info.cor, isManual: manualId && manualId !== 'auto' });
      grupos[destinoId].d += (casa.diaconos || 0);
      grupos[destinoId].i += (casa.irmas || 0);
      if (parseFloat(km) > grupos[destinoId].maxDist) grupos[destinoId].maxDist = parseFloat(km);
    });

    const distC1 = DADOS_REAIS.reduce((acc, c) => acc + Math.min(...SEDES_BASE.slice(0,2).map(s => haversine(c.lat, c.lng, s.lat, s.lng))), 0);
    const distC2 = DADOS_REAIS.reduce((acc, c) => acc + Math.min(...SEDES_BASE.slice(0,3).map(s => haversine(c.lat, c.lng, s.lat, s.lng))), 0);
    const red = ((distC1 - distC2) / distC1 * 100).toFixed(1);

    let bounds = filtroSede && grupos[filtroSede] ? grupos[filtroSede].casas.map(c => [c.lat, c.lng]) : [];
    if (bounds.length > 0) bounds.push([grupos[filtroSede].info.lat, grupos[filtroSede].info.lng]);

    return { metricas: { red }, setoresAtivos: grupos, mapBounds: bounds };
  }, [cenario, filtroSede, atribuicoes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f1f5f9', fontFamily: 'sans-serif' }}>
      
      <header style={{ padding: '12px 24px', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>📊 Simulador Estratégico CCB</h1>
          <button onClick={() => setFiltroSede(null)} style={{ background: '#334155', border: 'none', color: '#fff', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', marginTop: '6px' }}>Ver Mapa Completo</button>
        </div>
        
        <div style={{ display: 'flex', background: '#1e293b', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button onClick={() => {setCenario(2); setFiltroSede(null);}} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: cenario === 2 ? '#3b82f6' : 'transparent', color: 'white', fontWeight: 'bold' }}>2 Polos</button>
          <button onClick={() => {setCenario(3); setFiltroSede(null);}} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: cenario === 3 ? '#7c3aed' : 'transparent', color: 'white', fontWeight: 'bold' }}>3 Polos</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '480px', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Resumo Consolidado</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {Object.values(setoresAtivos).map(s => (
                <div key={s.info.id} style={{ background: '#fff', padding: '10px', borderRadius: '8px', borderTop: `4px solid ${s.info.cor}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: s.info.cor }}>{s.info.nome}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px' }}>{s.casas.length} <small style={{fontWeight:'normal'}}>casas</small></div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b' }}>D: {s.d} | I: {s.i}</div>
                  <div style={{ fontSize: '0.55rem', color: '#ef4444', marginTop: '3px' }}>Raio: {s.maxDist.toFixed(1)}km</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '10px' }}>Listagem (Ordem Alfabética)</h3>
            {Object.entries(setoresAtivos).map(([key, s]) => (
              <div key={key} style={{ marginBottom: '15px', padding: '10px', borderRadius: '10px', background: filtroSede === key ? `${s.info.cor}05` : '#fff', border: `1px solid ${filtroSede === key ? s.info.cor : '#f1f5f9'}` }}>
                <div onClick={() => setFiltroSede(key)} style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', color: s.info.cor, marginBottom: '8px' }}>{s.info.nome}</div>
                <table style={{ width: '100%', fontSize: '0.65rem' }}>
                  <tbody>
                    {s.casas.sort((a, b) => a.bairro.localeCompare(b.bairro)).map(c => (
                      <tr key={c.bairro} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '4px 0', color: '#1e293b' }}>{c.isManual ? '📌 ' : ''}{c.bairro}</td>
                        <td style={{ textAlign: 'right', color: '#64748b', paddingRight: '10px' }}>{c.km}km</td>
                        <td style={{ textAlign: 'right' }}>
                          <select 
                            value={atribuicoes[c.bairro] || 'auto'}
                            onChange={(e) => setAtribuicoes(prev => ({...prev, [c.bairro]: e.target.value}))}
                            style={{ fontSize: '0.6rem', padding: '1px' }}
                          >
                            <option value="auto">Auto</option>
                            <option value="SM">SM</option>
                            <option value="JR">JR</option>
                            {cenario === 3 && <option value="VC">VC</option>}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div style={{ padding: '20px', background: '#0f172a', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: cenario === 3 ? '#a78bfa' : '#60a5fa' }}>-{metricas.red}% Deslocamento</div>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '4px' }}>GANHO LOGÍSTICO MÉDIO</div>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <MapContainer center={[-23.60, -46.48]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController bounds={mapBounds} />
            
            {/* POLOS PRIMEIRO E SEM INTERATIVIDADE (O CLIQUE PASSA POR ELES) */}
            {Object.values(setoresAtivos).filter(s => !filtroSede || s.info.id === filtroSede).map(s => (
              <CircleMarker key={s.info.id} center={[s.info.lat, s.info.lng]} radius={15} pathOptions={{ color: s.info.cor, fillColor: 'white', fillOpacity: 1, weight: 6, interactive: false }} />
            ))}

            {/* CASAS POR CIMA E CLICÁVEIS */}
            {Object.values(setoresAtivos).filter(s => !filtroSede || s.info.id === filtroSede).flatMap(s => s.casas).map((casa, idx) => (
              <CircleMarker key={idx} center={[casa.lat, casa.lng]} radius={7} pathOptions={{ color: casa.isManual ? '#000' : 'white', fillColor: casa.cor, fillOpacity: 0.9, weight: casa.isManual ? 3 : 2, interactive: true }}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <b style={{ color: casa.cor }}>{casa.bairro}</b><br/>
                    Distância: {casa.km}km<br/>
                    D/I: {casa.diaconos}/{casa.irmas}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}
