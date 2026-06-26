"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface MapMember {
  id: string;
  name: string;
  organization: string;
  address?: { cep?: string; street?: string; neighborhood?: string; city?: string } | null;
}

interface GeoPoint {
  cep: string;
  lat: number;
  lng: number;
  members: MapMember[];
}

async function geocodeCep(cep: string): Promise<{ lat: number; lng: number } | null> {
  const clean = cep.replace(/\D/g, "");
  try {
    // 1) Tenta direto pelo CEP no Nominatim
    const r1 = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${clean}&country=BR&format=json&limit=1`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const d1 = await r1.json();
    if (d1?.[0]) return { lat: parseFloat(d1[0].lat), lng: parseFloat(d1[0].lon) };

    // 2) Fallback: busca endereço no ViaCEP e geocodifica pelo bairro+cidade
    await new Promise((r) => setTimeout(r, 200));
    const r2 = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const addr = await r2.json();
    if (addr?.erro) return null;
    const query = [addr.logradouro, addr.bairro, addr.localidade, addr.uf, "Brasil"]
      .filter(Boolean).join(", ");
    await new Promise((r) => setTimeout(r, 300));
    const r3 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const d3 = await r3.json();
    if (d3?.[0]) return { lat: parseFloat(d3[0].lat), lng: parseFloat(d3[0].lon) };
  } catch { /* ignore */ }
  return null;
}

export default function MapReport({ members }: { members: MapMember[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Carregando mapa...");
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([-25.535, -49.208], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Agrupa por CEP; membros sem CEP ficam em grupo "cidade"
      const cepMap = new Map<string, MapMember[]>();
      const semCepMap = new Map<string, MapMember[]>(); // chave = cidade
      for (const m of members) {
        const cep = m.address?.cep?.replace(/\D/g, "");
        if (cep) {
          if (!cepMap.has(cep)) cepMap.set(cep, []);
          cepMap.get(cep)!.push(m);
        } else {
          const cidade = m.address?.city ?? "Desconhecida";
          if (!semCepMap.has(cidade)) semCepMap.set(cidade, []);
          semCepMap.get(cidade)!.push(m);
        }
      }

      const points: GeoPoint[] = [];
      const ceps = [...cepMap.keys()];
      const totalGeo = ceps.length + semCepMap.size;
      setStatus(`Geocodificando ${totalGeo} localização(ões)...`);

      for (const cep of ceps) {
        const geo = await geocodeCep(cep);
        if (geo) points.push({ cep, ...geo, members: cepMap.get(cep)! });
        await new Promise((r) => setTimeout(r, 300));
      }

      // Fallback: geocodifica por cidade para quem não tem CEP
      for (const [cidade, mbs] of semCepMap.entries()) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cidade)}&country=BR&format=json&limit=1`,
            { headers: { "Accept-Language": "pt-BR" } }
          );
          const data = await res.json();
          if (data?.[0]) {
            // Espalha ligeiramente para não sobrepor marcadores exatos da cidade
            const lat = parseFloat(data[0].lat) + (Math.random() - 0.5) * 0.003;
            const lng = parseFloat(data[0].lon) + (Math.random() - 0.5) * 0.003;
            points.push({ cep: `cidade:${cidade}`, lat, lng, members: mbs });
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 300));
      }

      for (const pt of points) {
        const count = pt.members.length;
        const isCidade = pt.cep.startsWith("cidade:");
        const bg = isCidade ? "#6366f1" : "#E8503A"; // roxo para fallback cidade
        const size = count > 1 ? 32 : 24;
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${bg};color:#fff;font-weight:900;font-size:13px;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #111;box-shadow:0 2px 6px rgba(0,0,0,.4)">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const label = isCidade
          ? `Cidade: ${pt.cep.replace("cidade:", "")} (sem CEP)`
          : `CEP ${pt.cep}`;
        const popup = pt.members
          .map((m) => `<div style="font-size:12px;margin-bottom:4px"><b>${m.name}</b><br/>${m.organization}</div>`)
          .join("");

        L.marker([pt.lat, pt.lng], { icon })
          .addTo(map)
          .bindPopup(`<div style="min-width:160px"><b>${label}</b><br/>${popup}</div>`);
      }

      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      const sem = members.filter((m) => !m.address?.cep && !m.address?.city).length;
      setStatus(sem > 0 ? `${sem} membro(s) sem CEP cadastrado não aparecem no mapa.` : "");
    })();
  }, [members]);

  return (
    <div>
      <div ref={mapRef} style={{ height: 480, width: "100%", borderRadius: 8, border: "1px solid #e0e0e0" }} />
      {status && <p className="text-xs text-gray-400 mt-2">{status}</p>}
    </div>
  );
}
