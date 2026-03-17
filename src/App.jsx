import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DADOS_REAIS } from './casas';

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
  const [setorAtivo, setSetorAtivo] = useState("Carrão");
  const [filtroPolo, setFiltroPolo] = useState(null);
  const [atribuicoes, setAtribuicoes] = useState({});

  const listaSetores = useMemo(() => {
    return [...new Set(DADOS_REAIS.map(d => d.setor))];
  }, []);

  const { metricas, polosAtivos, mapBounds, casasFiltradas } = useMemo(() => {
    const dadosSetor = DADOS_REAIS.filter(d => d.setor === setorAtivo);
    const polos = dadosSetor.filter(d => d.isPolo);
    
    const grupos = {};
    polos.forEach(p => { 
      grupos[p.bairro] = { info: { id: p.bairro, nome: p.bairro, lat: p.lat, lng: p.lng, cor: p.cor || "#3b82f6" }, casas: [], d: 0, i: 0, maxDist: 0 }; 
    });

    dadosSetor.forEach(casa => {
      let destinoId;
      const manualId = atribuicoes[casa.bairro];

      if (casa.isPolo) {
        destinoId = casa.bairro;
      } else if (manualId && manualId !== 'auto' && grupos[manualId]) {
        destinoId = manualId;
      } else {
        let menorDist = Infinity;
        destinoId = polos[0]?.bairro;
        polos.forEach(polo => {
          const d = Math.hypot(casa.lat - polo.lat, casa.lng - polo.lng);
          if (d < menorDist) { menorDist = d; destinoId = polo.bairro; }
        });
      }

      if (destinoId && grupos[destinoId]) {
        const km = haversine(casa.lat, casa.lng, grupos[destinoId].info.lat, grupos[destinoId].info.lng);
        grupos[destinoId].casas.push({ ...casa, km: km.toFixed(2), cor: grupos[destinoId].info.cor, isManual: manualId && manualId !== 'auto' });
        grupos[destinoId].d += (casa.diaconos || 0);
        grupos[destinoId].i += (casa.irmas || 0);
        if (parseFloat(km) > grupos[destinoId].maxDist) grupos[destinoId].maxDist = parseFloat(km);
      }
    });

    let bounds = filtroPolo && grupos[filtroPolo] ? grupos[filtroPolo].casas.map(c => [c.lat, c.lng]) : dadosSetor.map(c => [c.lat, c.lng]);
    if (filtroPolo && grupos[filtroPolo]) bounds.push([grupos[filtroPolo].info.lat, grupos[filtroPolo].info.lng]);

    return { 
      polosAtivos: grupos, 
      mapBounds: bounds,
      casasFiltradas: dadosSetor
    };
  }, [setorAtivo, filtroPolo, atribuicoes]);

  const centroMapa = useMemo(() => {
      if (casasFiltradas.length === 0) return [-23.55, -46.63];
      const lat = casasFiltradas.reduce((acc, c) => acc + c.lat, 0) / casasFiltradas.length;
      const lng = casasFiltradas.reduce((acc, c) => acc + c.lng, 0) / casasFiltradas.length;
      return [lat, lng];
  }, [casasFiltradas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f1f5f9', fontFamily: 'sans-serif' }}>
      
      <header style={{ padding: '12px 24px', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>📊 Simulador Estratégico CCB</h1>
          <button onClick={() => setFiltroPolo(null)} style={{ background: '#334155', border: 'none', color: '#fff', fontSize: '0.65rem', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', marginTop: '6px' }}>Ver Mapa do Setor</button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Setor:</span>
          <select 
            value={setorAtivo} 
            onChange={(e) => { setSetorAtivo(e.target.value); setFiltroPolo(null); }}
            style={{ padding: '8px 12px', borderRadius: '6px', background: '#1e293b', color: 'white', border: '1px solid #334155', fontWeight: 'bold' }}
          >
            {listaSetores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '450px', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Resumo Polos de Reunião</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.values(polosAtivos).map(s => (
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
            <h3 style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '10px' }}>Localidades Associadas</h3>
            {Object.entries(polosAtivos).map(([key, s]) => (
              <div key={key} style={{ marginBottom: '15px', padding: '10px', borderRadius: '10px', background: filtroPolo === key ? `${s.info.cor}05` : '#fff', border: `1px solid ${filtroPolo === key ? s.info.cor : '#f1f5f9'}` }}>
                <div onClick={() => setFiltroPolo(key)} style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', color: s.info.cor, marginBottom: '8px' }}>{s.info.nome}</div>
                <table style={{ width: '100%', fontSize: '0.65rem' }}>
                  <tbody>
                    {s.casas.sort((a, b) => a.bairro.localeCompare(b.bairro)).map(c => (
                      <tr key={c.bairro} style={{ borderBottom: '1px solid #f8fafc', background: c.isPolo ? `${s.info.cor}10` : 'transparent' }}>
                        <td style={{ padding: '4px 0', color: '#1e293b', fontWeight: c.isPolo ? 'bold' : 'normal' }}>
                          {c.isPolo ? '⭐ ' : (c.isManual ? '📌 ' : '')}{c.bairro}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b', paddingRight: '10px' }}>{c.km}km</td>
                        <td style={{ textAlign: 'right' }}>
                          <select 
                            value={atribuicoes[c.bairro] || 'auto'}
                            onChange={(e) => setAtribuicoes(prev => ({...prev, [c.bairro]: e.target.value}))}
                            style={{ fontSize: '0.6rem', padding: '1px' }}
                            disabled={c.isPolo}
                          >
                            <option value="auto">Auto</option>
                            {Object.keys(polosAtivos).map(pName => (
                                <option key={pName} value={pName}>{pName}</option>
                            ))}
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
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SETOR ATIVO: <b style={{color: 'white'}}>{setorAtivo}</b></div>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <MapContainer center={centroMapa} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController bounds={mapBounds} />
            
            {/* POLOS DINÂMICOS */}
            {Object.values(polosAtivos).filter(s => !filtroPolo || s.info.id === filtroPolo).map(s => (
              <CircleMarker key={s.info.id} center={[s.info.lat, s.info.lng]} radius={15} pathOptions={{ color: s.info.cor, fillColor: 'white', fillOpacity: 1, weight: 6, interactive: false }} />
            ))}

            {/* CASAS FILTRADAS POR SETOR E POLO */}
            {Object.values(polosAtivos).filter(s => !filtroPolo || s.info.id === filtroPolo).flatMap(s => s.casas).map((casa, idx) => (
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
