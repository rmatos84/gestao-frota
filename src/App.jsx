import { useState, useEffect, useMemo, useRef } from "react";

const SUPABASE_URL = "https://vwjetfypctzoimvvdsjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_65zvqkMbn2aW3PN9woXtrA_iuy5Fgv7";

const api = async (path, method = "GET", body = null) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  if (method === "DELETE") return true;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const emptyMotorista = { nome: "", cnh: "", telefone: "" };
const emptyVeiculo = { placa: "", modelo: "", ano: "" };
const emptyAbast = { motorista_id: "", veiculo_id: "", motorista_nome: "", veiculo_descricao: "", data: "", km_inicial: "", km_final: "", combustivel_litros: "", valor_total: "", observacao: "" };

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMotoristaForm, setShowMotoristaForm] = useState(false);
  const [showVeiculoForm, setShowVeiculoForm] = useState(false);
  const [showAbastForm, setShowAbastForm] = useState(false);
  const [formMotorista, setFormMotorista] = useState(emptyMotorista);
  const [formVeiculo, setFormVeiculo] = useState(emptyVeiculo);
  const [formAbast, setFormAbast] = useState(emptyAbast);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const dropdownRef = useRef(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, v, a] = await Promise.all([
        api("motoristas?select=*&order=nome"),
        api("veiculos?select=*&order=modelo"),
        api("abastecimentos?select=*&order=data.desc"),
      ]);
      setMotoristas(m); setVeiculos(v); setAbastecimentos(a);
    } catch (e) { setError("Erro ao carregar dados: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCadastroOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const stats = useMemo(() => {
    const por = {};
    abastecimentos.forEach(r => {
      const nome = r.motorista_nome || r.motorista_id;
      const km = r.km_final - r.km_inicial;
      if (!por[nome]) por[nome] = { km: 0, litros: 0, viagens: 0, gasto: 0 };
      por[nome].km += km;
      por[nome].litros += parseFloat(r.combustivel_litros);
      por[nome].viagens += 1;
      por[nome].gasto += parseFloat(r.valor_total || 0);
    });
    return Object.entries(por).map(([nome, d]) => ({
      nome, kmTotal: d.km, litros: d.litros,
      kml: d.litros > 0 ? (d.km / d.litros).toFixed(2) : "—",
      viagens: d.viagens, gasto: d.gasto,
    })).sort((a, b) => b.kmTotal - a.kmTotal);
  }, [abastecimentos]);

  const totalKm = abastecimentos.reduce((s, r) => s + (r.km_final - r.km_inicial), 0);
  const totalLitros = abastecimentos.reduce((s, r) => s + parseFloat(r.combustivel_litros || 0), 0);
  const totalGasto = abastecimentos.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);
  const mediaKml = totalLitros > 0 ? (totalKm / totalLitros).toFixed(2) : "—";

  const saveMotorista = async () => {
    if (!formMotorista.nome) return;
    setSaving(true);
    try {
      await api("motoristas", "POST", { ...formMotorista, ativo: true });
      setFormMotorista(emptyMotorista); setShowMotoristaForm(false); await loadAll();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const saveVeiculo = async () => {
    if (!formVeiculo.placa || !formVeiculo.modelo) return;
    setSaving(true);
    try {
      await api("veiculos", "POST", { ...formVeiculo, ano: formVeiculo.ano ? parseInt(formVeiculo.ano) : null, ativo: true });
      setFormVeiculo(emptyVeiculo); setShowVeiculoForm(false); await loadAll();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const saveAbast = async () => {
    const { motorista_id, veiculo_id, data, km_inicial, km_final, combustivel_litros } = formAbast;
    if (!motorista_id || !veiculo_id || !data || !km_inicial || !km_final || !combustivel_litros) return;
    setSaving(true);
    try {
      const mot = motoristas.find(m => m.id === motorista_id);
      const vei = veiculos.find(v => v.id === veiculo_id);
      await api("abastecimentos", "POST", {
        ...formAbast,
        motorista_nome: mot?.nome || "",
        veiculo_descricao: `${vei?.modelo || ""} - ${vei?.placa || ""}`,
        km_inicial: parseFloat(km_inicial), km_final: parseFloat(km_final),
        combustivel_litros: parseFloat(combustivel_litros),
        valor_total: formAbast.valor_total ? parseFloat(formAbast.valor_total) : null,
      });
      setFormAbast(emptyAbast); setShowAbastForm(false); await loadAll();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const runAI = async () => {
    setAiLoading(true); setAiAnalysis(""); setTab("ia");
    const resumo = stats.map(s => `${s.nome}: ${s.kmTotal}km, ${s.kml} km/L, ${s.viagens} viagem(ns), ${s.litros.toFixed(0)}L${s.gasto > 0 ? `, R$${s.gasto.toFixed(2)}` : ""}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Você é especialista em gestão de frota. Analise os dados e forneça insights em português:\n\nMotoristas:\n${resumo || "Nenhum registro."}\n\nTotais: ${totalKm}km, ${totalLitros.toFixed(0)}L, média ${mediaKml} km/L${totalGasto > 0 ? `, R$${totalGasto.toFixed(2)}` : ""}.\n\nForneça: 1) Insights de eficiência 2) Alertas 3) Recomendações. Use bullet points.` }]
        })
      });
      const data = await res.json();
      setAiAnalysis(data.content?.[0]?.text || "Sem resposta.");
    } catch { setAiAnalysis("Erro ao conectar com a IA."); }
    setAiLoading(false);
  };

  const inp = (val, onChange, placeholder, type = "text") => (
    <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
  );

  const isCadastro = tab === "motoristas" || tab === "veiculos";

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#0a0f1a", minHeight: "100vh", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚛</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#f1f5f9" }}>Supremo Açaí</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>GESTÃO DE FROTA</div>
          </div>
        </div>
        <button onClick={runAI} style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✨ Analisar com IA</button>
      </div>

      {error && <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "10px 24px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>{error} <span style={{ cursor: "pointer" }} onClick={() => setError("")}>✕</span></div>}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>

        {/* Tabs com submenu */}
        <div style={{ display: "flex", gap: 3, background: "#0f172a", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid #1e293b", alignItems: "center", position: "relative" }}>
          {[["dashboard","📊 Dashboard"],["registros","⛽ Abastecimentos"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: tab === key ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: tab === key ? "#fff" : "#64748b" }}>
              {label}
            </button>
          ))}

          {/* Dropdown Cadastros */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button onClick={() => setCadastroOpen(!cadastroOpen)}
              style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, background: isCadastro ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: isCadastro ? "#fff" : "#64748b" }}>
              📋 Cadastros <span style={{ fontSize: 9, opacity: 0.7 }}>{cadastroOpen ? "▲" : "▼"}</span>
            </button>
            {cadastroOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 4, zIndex: 100, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {[["motoristas","👤 Motoristas"],["veiculos","🚗 Veículos"]].map(([key, label]) => (
                  <button key={key} onClick={() => { setTab(key); setCadastroOpen(false); }}
                    style={{ display: "block", width: "100%", padding: "9px 14px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 500, textAlign: "left", background: tab === key ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: tab === key ? "#fff" : "#94a3b8" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setTab("ia")}
            style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", background: tab === "ia" ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: tab === "ia" ? "#fff" : "#64748b" }}>
            🤖 IA
          </button>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Carregando...</div>}

        {/* DASHBOARD */}
        {!loading && tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
              {[["Total KM", totalKm.toLocaleString()+" km","#06b6d4","rgba(6,182,212,0.15)","rgba(6,182,212,0.25)"],["Combustível",totalLitros.toFixed(0)+" L","#fbbf24","rgba(251,191,36,0.15)","rgba(251,191,36,0.25)"],["Média Frota",mediaKml+" km/L","#10b981","rgba(16,185,129,0.15)","rgba(16,185,129,0.25)"],["Gasto Total",totalGasto>0?"R$ "+totalGasto.toFixed(2):"—","#a78bfa","rgba(167,139,250,0.15)","rgba(167,139,250,0.25)"]].map(([label,val,color,bg,border]) => (
                <div key={label} style={{ background:`linear-gradient(135deg,${bg},transparent)`, border:`1px solid ${border}`, borderRadius:16, padding:"16px 18px" }}>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:22, fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>
            {stats.length === 0
              ? <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:40, textAlign:"center", color:"#475569" }}>Nenhum registro ainda. Cadastre motoristas, veículos e abastecimentos.</div>
              : <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
                  <div style={{ padding:"14px 18px", borderBottom:"1px solid #1e293b", fontWeight:600, fontSize:14, color:"#f1f5f9" }}>🏆 Ranking de Motoristas</div>
                  {stats.map((s,i) => {
                    const kmlN = parseFloat(s.kml);
                    const pct = stats[0].kmTotal > 0 ? (s.kmTotal/stats[0].kmTotal)*100 : 0;
                    return (
                      <div key={s.nome} style={{ padding:"14px 18px", borderTop:i>0?"1px solid #1e293b":"none", display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0, background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#64748b)":"linear-gradient(135deg,#b45309,#92400e)", color:"#fff" }}>{i+1}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9", marginBottom:5 }}>{s.nome}</div>
                          <div style={{ height:4, background:"#1e293b", borderRadius:99 }}><div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#06b6d4,#3b82f6)", borderRadius:99 }} /></div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{s.kmTotal.toLocaleString()} km</div>
                          <div style={{ fontSize:11, fontWeight:600, color:!isNaN(kmlN)?(kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171"):"#64748b" }}>{s.kml} km/L</div>
                        </div>
                        <div style={{ fontSize:11, color:"#475569", flexShrink:0 }}>{s.viagens} viagem{s.viagens>1?"s":""}</div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ABASTECIMENTOS */}
        {!loading && tab === "registros" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={() => setShowAbastForm(!showAbastForm)} style={{ background:showAbastForm?"#1e293b":"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"1px solid #334155", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{showAbastForm?"✕ Cancelar":"+ Novo Abastecimento"}</button>
            </div>
            {showAbastForm && (
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:600, marginBottom:14, color:"#f1f5f9" }}>Novo Registro</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>MOTORISTA</label>
                    <select value={formAbast.motorista_id} onChange={e => setFormAbast(p => ({...p, motorista_id:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
                      <option value="">Selecione...</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>VEÍCULO</label>
                    <select value={formAbast.veiculo_id} onChange={e => setFormAbast(p => ({...p, veiculo_id:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
                      <option value="">Selecione...</option>{veiculos.map(v => <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>)}
                    </select>
                  </div>
                  {[["data","DATA","date"],["km_inicial","KM INICIAL","number"],["km_final","KM FINAL","number"],["combustivel_litros","LITROS","number"],["valor_total","VALOR TOTAL (R$)","number"],["observacao","OBSERVAÇÃO","text"]].map(([f,l,t]) => (
                    <div key={f}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{l}</label>{inp(formAbast[f], v => setFormAbast(p => ({...p,[f]:v})), l, t)}</div>
                  ))}
                </div>
                <button onClick={saveAbast} disabled={saving} style={{ marginTop:14, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Salvando...":"Salvar"}</button>
              </div>
            )}
            {abastecimentos.length === 0
              ? <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:40, textAlign:"center", color:"#475569" }}>Nenhum registro ainda.</div>
              : <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead><tr style={{ background:"#0a0f1a" }}>{["Data","Motorista","Veículo","KM Ini","KM Fim","KM Rod","Litros","km/L","Valor"].map(h => <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
                    <tbody>{abastecimentos.map((r,i) => {
                      const km = r.km_final - r.km_inicial;
                      const kml = (km/r.combustivel_litros).toFixed(2);
                      const kmlN = parseFloat(kml);
                      return <tr key={r.id} style={{ borderTop:"1px solid #1e293b", background:i%2===0?"transparent":"rgba(30,41,59,0.3)" }}>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{r.data}</td>
                        <td style={{ padding:"10px 14px", fontWeight:600, color:"#f1f5f9" }}>{r.motorista_nome}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{r.veiculo_descricao}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{parseFloat(r.km_inicial).toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{parseFloat(r.km_final).toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", fontWeight:600, color:"#06b6d4" }}>{km.toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", color:"#fbbf24" }}>{r.combustivel_litros}L</td>
                        <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, fontWeight:600, background:kmlN>=11?"rgba(16,185,129,0.15)":kmlN>=9?"rgba(251,191,36,0.15)":"rgba(248,113,113,0.15)", color:kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171" }}>{kml}</span></td>
                        <td style={{ padding:"10px 14px", color:"#a78bfa" }}>{r.valor_total?"R$ "+parseFloat(r.valor_total).toFixed(2):"—"}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* MOTORISTAS */}
        {!loading && tab === "motoristas" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={() => setShowMotoristaForm(!showMotoristaForm)} style={{ background:showMotoristaForm?"#1e293b":"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"1px solid #334155", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{showMotoristaForm?"✕ Cancelar":"+ Novo Motorista"}</button>
            </div>
            {showMotoristaForm && (
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20, marginBottom:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  {[["nome","NOME"],["cnh","CNH"],["telefone","TELEFONE"]].map(([f,l]) => <div key={f}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{l}</label>{inp(formMotorista[f], v => setFormMotorista(p => ({...p,[f]:v})), l)}</div>)}
                </div>
                <button onClick={saveMotorista} disabled={saving} style={{ marginTop:14, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{saving?"Salvando...":"Salvar"}</button>
              </div>
            )}
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
              {motoristas.length === 0
                ? <div style={{ padding:40, textAlign:"center", color:"#475569" }}>Nenhum motorista cadastrado.</div>
                : motoristas.map((m,i) => <div key={m.id} style={{ padding:"14px 18px", borderTop:i>0?"1px solid #1e293b":"none", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1e293b,#334155)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
                    <div><div style={{ fontWeight:600, color:"#f1f5f9", fontSize:14 }}>{m.nome}</div><div style={{ fontSize:11, color:"#475569" }}>{m.cnh?`CNH: ${m.cnh}`:""}{m.telefone?` · ${m.telefone}`:""}</div></div>
                  </div>)
              }
            </div>
          </div>
        )}

        {/* VEÍCULOS */}
        {!loading && tab === "veiculos" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={() => setShowVeiculoForm(!showVeiculoForm)} style={{ background:showVeiculoForm?"#1e293b":"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"1px solid #334155", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{showVeiculoForm?"✕ Cancelar":"+ Novo Veículo"}</button>
            </div>
            {showVeiculoForm && (
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20, marginBottom:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  {[["placa","PLACA"],["modelo","MODELO"],["ano","ANO"]].map(([f,l]) => <div key={f}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{l}</label>{inp(formVeiculo[f], v => setFormVeiculo(p => ({...p,[f]:v})), l, f==="ano"?"number":"text")}</div>)}
                </div>
                <button onClick={saveVeiculo} disabled={saving} style={{ marginTop:14, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{saving?"Salvando...":"Salvar"}</button>
              </div>
            )}
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
              {veiculos.length === 0
                ? <div style={{ padding:40, textAlign:"center", color:"#475569" }}>Nenhum veículo cadastrado.</div>
                : veiculos.map((v,i) => <div key={v.id} style={{ padding:"14px 18px", borderTop:i>0?"1px solid #1e293b":"none", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1e293b,#334155)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🚗</div>
                    <div><div style={{ fontWeight:600, color:"#f1f5f9", fontSize:14 }}>{v.modelo}</div><div style={{ fontSize:11, color:"#475569" }}>Placa: {v.placa}{v.ano?` · ${v.ano}`:""}</div></div>
                  </div>)
              }
            </div>
          </div>
        )}

        {/* IA */}
        {tab === "ia" && (
          <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:24 }}>
            {aiLoading && <div style={{ textAlign:"center", padding:40 }}><div style={{ fontSize:32, marginBottom:12 }}>🤖</div><div style={{ color:"#94a3b8" }}>Analisando dados da frota...</div></div>}
            {!aiLoading && !aiAnalysis && <div style={{ textAlign:"center", padding:40 }}><div style={{ fontSize:32, marginBottom:12 }}>✨</div><div style={{ color:"#94a3b8", marginBottom:16 }}>Clique abaixo para analisar sua frota com IA</div><button onClick={runAI} style={{ background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:600, cursor:"pointer" }}>Analisar com IA</button></div>}
            {!aiLoading && aiAnalysis && <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, paddingBottom:14, borderBottom:"1px solid #1e293b" }}>
                <div style={{ width:30, height:30, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>🤖</div>
                <div style={{ fontWeight:600, color:"#f1f5f9" }}>Análise da IA</div>
                <button onClick={runAI} style={{ marginLeft:"auto", background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>↻ Reanalisar</button>
              </div>
              <div style={{ color:"#cbd5e1", lineHeight:1.8, fontSize:14, whiteSpace:"pre-wrap" }}>{aiAnalysis}</div>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
