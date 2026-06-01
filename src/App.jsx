import { useState, useEffect, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://vwjetfypctzoimvvdsjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_65zvqkMbn2aW3PN9woXtrA_iuy5Fgv7";

const api = async (path, method = "GET", body = null) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": (method === "POST" || method === "PATCH") ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  if (method === "DELETE") return true;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const COLORS = ["#06b6d4","#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#6366f1"];
const TIPOS = ["Moto","Carro","Van","Caminhão"];
const TIPO_ICON = { "Moto": "🏍️", "Carro": "🚗", "Van": "🚐", "Caminhão": "🚛" };

const emptyMotorista = { nome: "", cnh: "", telefone: "" };
const emptyVeiculo = { placa: "", modelo: "", ano: "", tipo: "" };
const emptyAbast = { motorista_id: "", veiculo_id: "", motorista_nome: "", veiculo_descricao: "", data: "", km_inicial: "", km_final: "", combustivel_litros: "", valor_total: "", observacao: "" };

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [logisticaOpen, setLogisticaOpen] = useState(false);
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
  const [editingVeiculo, setEditingVeiculo] = useState(null);
  const [formAbast, setFormAbast] = useState(emptyAbast);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const logisticaRef = useRef(null);

  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

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
    const handler = (e) => {
      if (logisticaRef.current && !logisticaRef.current.contains(e.target)) {
        setLogisticaOpen(false);
        setCadastroOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const abastFiltrados = useMemo(() => {
    return abastecimentos.filter(r => {
      if (filtroDataInicio && r.data < filtroDataInicio) return false;
      if (filtroDataFim && r.data > filtroDataFim) return false;
      if (filtroVeiculo && r.veiculo_id !== filtroVeiculo) return false;
      if (filtroMotorista && r.motorista_id !== filtroMotorista) return false;
      if (filtroTipo) {
        const vei = veiculos.find(v => v.id === r.veiculo_id);
        if (!vei || vei.tipo !== filtroTipo) return false;
      }
      return true;
    });
  }, [abastecimentos, filtroDataInicio, filtroDataFim, filtroVeiculo, filtroMotorista, filtroTipo, veiculos]);

  const temFiltro = filtroDataInicio || filtroDataFim || filtroVeiculo || filtroMotorista || filtroTipo;

  const stats = useMemo(() => {
    const por = {};
    abastFiltrados.forEach(r => {
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
  }, [abastFiltrados]);

  const statsPorTipo = useMemo(() => {
    const por = {};
    abastFiltrados.forEach(r => {
      const vei = veiculos.find(v => v.id === r.veiculo_id);
      const tipo = vei?.tipo || "Sem tipo";
      const km = r.km_final - r.km_inicial;
      if (!por[tipo]) por[tipo] = { km: 0, litros: 0, viagens: 0, gasto: 0 };
      por[tipo].km += km;
      por[tipo].litros += parseFloat(r.combustivel_litros);
      por[tipo].viagens += 1;
      por[tipo].gasto += parseFloat(r.valor_total || 0);
    });
    return Object.entries(por).map(([tipo, d]) => ({
      tipo, kmTotal: d.km, litros: d.litros,
      kml: d.litros > 0 ? (d.km / d.litros).toFixed(2) : "—",
      viagens: d.viagens, gasto: d.gasto,
    })).sort((a, b) => b.kmTotal - a.kmTotal);
  }, [abastFiltrados, veiculos]);

  const totalKm = abastFiltrados.reduce((s, r) => s + (r.km_final - r.km_inicial), 0);
  const totalLitros = abastFiltrados.reduce((s, r) => s + parseFloat(r.combustivel_litros || 0), 0);
  const totalGasto = abastFiltrados.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);
  const mediaKml = totalLitros > 0 ? (totalKm / totalLitros).toFixed(2) : "—";
  const pieData = stats.map(s => ({ name: s.nome.split(" ")[0], value: s.kmTotal, fullName: s.nome }));
  const pieTipoData = statsPorTipo.map(s => ({ name: s.tipo, value: s.kmTotal }));

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

  const updateVeiculo = async () => {
    if (!editingVeiculo) return;
    setSaving(true);
    try {
      await api(`veiculos?id=eq.${editingVeiculo.id}`, "PATCH", {
        placa: editingVeiculo.placa,
        modelo: editingVeiculo.modelo,
        ano: editingVeiculo.ano ? parseInt(editingVeiculo.ano) : null,
        tipo: editingVeiculo.tipo
      });
      setEditingVeiculo(null); await loadAll();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteVeiculo = async (id) => {
    if (!window.confirm("Deseja realmente excluir este veículo?")) return;
    try {
      await api(`veiculos?id=eq.${id}`, "DELETE");
      await loadAll();
    } catch (e) { setError("Não foi possível excluir. Verifique vínculos."); }
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
    const resumoTipo = statsPorTipo.map(s => `${s.tipo}: ${s.kmTotal}km, ${s.kml} km/L, ${s.viagens} viagem(ns)`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: `Você é especialista em gestão de frota. Analise os dados e forneça insights em português:\n\nPor motorista:\n${resumo || "Nenhum registro."}\n\nPor tipo de veículo:\n${resumoTipo || "Nenhum registro."}\n\nTotais: ${totalKm}km, ${totalLitros.toFixed(0)}L, média ${mediaKml} km/L${totalGasto > 0 ? `, R$${totalGasto.toFixed(2)}` : ""}.\n\nForneça: 1) Insights de eficiência 2) Alertas 3) Recomendações. Use bullet points.` }]
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

  const sel = (val, onChange, children) => (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: val ? "#f1f5f9" : "#64748b", fontSize: 13, outline: "none" }}>
      {children}
    </select>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = totalKm > 0 ? ((d.value / totalKm) * 100).toFixed(1) : 0;
      return (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{d.payload.fullName || d.payload.name}</div>
          <div style={{ color: "#94a3b8" }}>{d.value.toLocaleString()} km</div>
          <div style={{ color: d.fill, fontWeight: 600 }}>{pct}% do total</div>
        </div>
      );
    }
    return null;
  };

  const navBtn = (label, active, onClick) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left", background: active ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: active ? "#fff" : "#94a3b8", transition: "all 0.15s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#0a0f1a", minHeight: "100vh", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚛</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#f1f5f9" }}>Supremo Açaí</div>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em" }}>SISTEMA DE GESTÃO 360</div>
            </div>
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 32, background: "#1e293b", margin: "0 4px" }} />

          {/* Nav: Logística dropdown */}
          <div ref={logisticaRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setLogisticaOpen(!logisticaOpen); setCadastroOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: logisticaOpen ? "rgba(6,182,212,0.15)" : "transparent", color: logisticaOpen ? "#06b6d4" : "#94a3b8", transition: "all 0.15s" }}>
              🚚 Logística <span style={{ fontSize: 9, opacity: 0.6 }}>{logisticaOpen ? "▲" : "▼"}</span>
            </button>

            {logisticaOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 6, zIndex: 200, minWidth: 200, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>

                {/* Dashboard */}
                {navBtn("📊 Dashboard", tab === "dashboard", () => { setTab("dashboard"); setLogisticaOpen(false); })}

                {/* Abastecimentos */}
                {navBtn("⛽ Abastecimentos", tab === "registros", () => { setTab("registros"); setLogisticaOpen(false); })}

                {/* Cadastros com sub */}
                <div>
                  <button
                    onClick={() => setCadastroOpen(!cadastroOpen)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, background: (tab === "motoristas" || tab === "veiculos") ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : cadastroOpen ? "rgba(6,182,212,0.1)" : "transparent", color: (tab === "motoristas" || tab === "veiculos") ? "#fff" : "#94a3b8" }}>
                    <span>📋 Cadastros</span>
                    <span style={{ fontSize: 9, opacity: 0.6 }}>{cadastroOpen ? "▲" : "▼"}</span>
                  </button>

                  {cadastroOpen && (
                    <div style={{ paddingLeft: 12, marginTop: 2 }}>
                      {navBtn("👤 Motoristas", tab === "motoristas", () => { setTab("motoristas"); setLogisticaOpen(false); setCadastroOpen(false); })}
                      {navBtn("🚗 Veículos", tab === "veiculos", () => { setTab("veiculos"); setLogisticaOpen(false); setCadastroOpen(false); })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* IA direto no header 
          <button onClick={() => setTab("ia")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === "ia" ? "rgba(6,182,212,0.15)" : "transparent", color: tab === "ia" ? "#06b6d4" : "#94a3b8" }}>
            🤖 IA
          </button>  */}
        </div>

        {/* <button onClick={runAI} style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✨ Analisar com IA</button>*/}
      </div>

      {error && <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "10px 24px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>{error} <span style={{ cursor: "pointer" }} onClick={() => setError("")}>✕</span></div>}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>

        {loading && <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Carregando...</div>}

        {/* DASHBOARD */}
        {!loading && tab === "dashboard" && (
          <div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                  🔍 Filtros
                  {temFiltro && <span style={{ fontSize: 10, background: "rgba(6,182,212,0.2)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 99, padding: "2px 8px" }}>ativos</span>}
                </div>
                {temFiltro && <button onClick={() => { setFiltroDataInicio(""); setFiltroDataFim(""); setFiltroVeiculo(""); setFiltroMotorista(""); setFiltroTipo(""); }} style={{ fontSize: 11, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>✕ Limpar filtros</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Início</label>{inp(filtroDataInicio, setFiltroDataInicio, "", "date")}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Fim</label>{inp(filtroDataFim, setFiltroDataFim, "", "date")}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo de Veículo</label>
                  {sel(filtroTipo, setFiltroTipo, <><option value="">Todos os tipos</option>{TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}</>)}
                </div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Veículo</label>
                  {sel(filtroVeiculo, setFiltroVeiculo, <><option value="">Todos os veículos</option>{veiculos.filter(v => !filtroTipo || v.tipo === filtroTipo).map(v => <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>)}</>)}
                </div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Motorista</label>
                  {sel(filtroMotorista, setFiltroMotorista, <><option value="">Todos os motoristas</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</>)}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
              {[["Total KM",totalKm.toLocaleString()+" km","#06b6d4","rgba(6,182,212,0.15)","rgba(6,182,212,0.25)"],["Combustível",totalLitros.toFixed(0)+" L","#fbbf24","rgba(251,191,36,0.15)","rgba(251,191,36,0.25)"],["Média Frota",mediaKml+" km/L","#10b981","rgba(16,185,129,0.15)","rgba(16,185,129,0.25)"],["Gasto Total",totalGasto>0?"R$ "+totalGasto.toFixed(2):"—","#a78bfa","rgba(167,139,250,0.15)","rgba(167,139,250,0.25)"]].map(([label,val,color,bg,border]) => (
                <div key={label} style={{ background:`linear-gradient(135deg,${bg},transparent)`, border:`1px solid ${border}`, borderRadius:16, padding:"16px 18px" }}>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:22, fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {stats.length === 0
              ? <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:40, textAlign:"center", color:"#475569" }}>Nenhum registro encontrado{temFiltro?" para os filtros selecionados":""}.</div>
              : <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"#f1f5f9", marginBottom:16 }}>🥧 KM por Motorista</div>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
                        {pieData.map((d,i) => (
                          <div key={d.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[i%COLORS.length], flexShrink:0 }} />
                            <span style={{ color:"#94a3b8" }}>{d.fullName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
                      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e293b", fontWeight:600, fontSize:14, color:"#f1f5f9" }}>🏆 Ranking de Motoristas</div>
                      <div style={{ overflowY:"auto", maxHeight:320 }}>
                        {stats.map((s,i) => {
                          const kmlN = parseFloat(s.kml);
                          const pct = stats[0].kmTotal > 0 ? (s.kmTotal/stats[0].kmTotal)*100 : 0;
                          return (
                            <div key={s.nome} style={{ padding:"12px 20px", borderTop:i>0?"1px solid #1e293b":"none" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
                                <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#64748b)":i===2?"linear-gradient(135deg,#b45309,#92400e)":"#1e293b", color:"#fff" }}>{i+1}</div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9" }}>{s.nome}</div>
                                  <div style={{ fontSize:10, color:"#475569" }}>{s.viagens} viagem{s.viagens>1?"s":""} · {s.litros.toFixed(0)}L{s.gasto>0?" · R$"+s.gasto.toFixed(2):""}</div>
                                </div>
                                <div style={{ textAlign:"right" }}>
                                  <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{s.kmTotal.toLocaleString()} km</div>
                                  <div style={{ fontSize:11, fontWeight:600, color:!isNaN(kmlN)?(kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171"):"#64748b" }}>{s.kml} km/L</div>
                                </div>
                              </div>
                              <div style={{ height:4, background:"#1e293b", borderRadius:99 }}>
                                <div style={{ height:"100%", width:`${pct}%`, background:COLORS[i%COLORS.length], borderRadius:99, transition:"width 0.6s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"#f1f5f9", marginBottom:16 }}>🥧 KM por Tipo de Veículo</div>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={pieTipoData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {pieTipoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
                        {pieTipoData.map((d,i) => (
                          <div key={d.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[i%COLORS.length], flexShrink:0 }} />
                            <span style={{ color:"#94a3b8" }}>{TIPO_ICON[d.name]||""} {d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
                      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e293b", fontWeight:600, fontSize:14, color:"#f1f5f9" }}>📊 Ranking por Tipo de Veículo</div>
                      <div style={{ overflowY:"auto", maxHeight:320 }}>
                        {statsPorTipo.map((s,i) => {
                          const kmlN = parseFloat(s.kml);
                          const pct = statsPorTipo[0].kmTotal > 0 ? (s.kmTotal/statsPorTipo[0].kmTotal)*100 : 0;
                          return (
                            <div key={s.tipo} style={{ padding:"12px 20px", borderTop:i>0?"1px solid #1e293b":"none" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
                                <div style={{ width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:"#1e293b", flexShrink:0 }}>{TIPO_ICON[s.tipo]||"🚘"}</div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9" }}>{s.tipo}</div>
                                  <div style={{ fontSize:10, color:"#475569" }}>{s.viagens} viagem{s.viagens>1?"s":""} · {s.litros.toFixed(0)}L{s.gasto>0?" · R$"+s.gasto.toFixed(2):""}</div>
                                </div>
                                <div style={{ textAlign:"right" }}>
                                  <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{s.kmTotal.toLocaleString()} km</div>
                                  <div style={{ fontSize:11, fontWeight:600, color:!isNaN(kmlN)?(kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171"):"#64748b" }}>{s.kml} km/L</div>
                                </div>
                              </div>
                              <div style={{ height:4, background:"#1e293b", borderRadius:99 }}>
                                <div style={{ height:"100%", width:`${pct}%`, background:COLORS[i%COLORS.length], borderRadius:99, transition:"width 0.6s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
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
                    <select value={formAbast.motorista_id} onChange={e => setFormAbast(p => ({...p,motorista_id:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
                      <option value="">Selecione...</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>VEÍCULO</label>
                    <select value={formAbast.veiculo_id} onChange={e => setFormAbast(p => ({...p,veiculo_id:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
                      <option value="">Selecione...</option>{veiculos.map(v => <option key={v.id} value={v.id}>{TIPO_ICON[v.tipo]||""} {v.modelo} - {v.placa}</option>)}
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
                    <thead><tr style={{ background:"#0a0f1a" }}>{["Data","Motorista","Veículo","KM Ini","KM Fim","KM Rod","Litros","km/L","Preço/L","Valor Total"].map(h => <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
                    <tbody>{abastecimentos.map((r,i) => {
                      const km = r.km_final - r.km_inicial;
                      const litros = parseFloat(r.combustivel_litros);
                      const kml = (km/litros).toFixed(2);
                      const kmlN = parseFloat(kml);
                      const precoLitro = r.valor_total ? (parseFloat(r.valor_total)/litros).toFixed(2) : null;
                      return <tr key={r.id} style={{ borderTop:"1px solid #1e293b", background:i%2===0?"transparent":"rgba(30,41,59,0.3)" }}>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{r.data}</td>
                        <td style={{ padding:"10px 14px", fontWeight:600, color:"#f1f5f9" }}>{r.motorista_nome}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{r.veiculo_descricao}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{parseFloat(r.km_inicial).toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{parseFloat(r.km_final).toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", fontWeight:600, color:"#06b6d4" }}>{km.toLocaleString()}</td>
                        <td style={{ padding:"10px 14px", color:"#fbbf24" }}>{litros}L</td>
                        <td style={{ padding:"10px 14px" }}><span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, fontWeight:600, background:kmlN>=11?"rgba(16,185,129,0.15)":kmlN>=9?"rgba(251,191,36,0.15)":"rgba(248,113,113,0.15)", color:kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171" }}>{kml}</span></td>
                        <td style={{ padding:"10px 14px", color:"#e2e8f0" }}>{precoLitro?"R$ "+precoLitro:"—"}</td>
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
              {motoristas.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"#475569" }}>Nenhum motorista cadastrado.</div>
                : motoristas.map((m,i) => <div key={m.id} style={{ padding:"14px 18px", borderTop:i>0?"1px solid #1e293b":"none", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1e293b,#334155)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👤</div>
                    <div><div style={{ fontWeight:600, color:"#f1f5f9", fontSize:14 }}>{m.nome}</div><div style={{ fontSize:11, color:"#475569" }}>{m.cnh?`CNH: ${m.cnh}`:""}{m.telefone?` · ${m.telefone}`:""}</div></div>
                  </div>)}
            </div>
          </div>
        )}

        {/* VEÍCULOS */}
        {!loading && tab === "veiculos" && (
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={() => { setShowVeiculoForm(!showVeiculoForm); setEditingVeiculo(null); }} style={{ background:showVeiculoForm?"#1e293b":"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"1px solid #334155", color:"#fff", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{showVeiculoForm?"✕ Cancelar":"+ Novo Veículo"}</button>
            </div>
            {showVeiculoForm && (
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20, marginBottom:16 }}>
                <div style={{ fontWeight:600, marginBottom:14, color:"#f1f5f9" }}>Novo Veículo</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>TIPO</label>
                    <select value={formVeiculo.tipo} onChange={e => setFormVeiculo(p => ({...p,tipo:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:formVeiculo.tipo?"#f1f5f9":"#64748b", fontSize:13, outline:"none" }}>
                      <option value="">Selecione...</option>{TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                    </select>
                  </div>
                  {[["placa","PLACA"],["modelo","MODELO"],["ano","ANO"]].map(([f,l]) => <div key={f}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{l}</label>{inp(formVeiculo[f], v => setFormVeiculo(p => ({...p,[f]:v})), l, f==="ano"?"number":"text")}</div>)}
                </div>
                <button onClick={saveVeiculo} disabled={saving} style={{ marginTop:14, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer" }}>{saving?"Salvando...":"Salvar"}</button>
              </div>
            )}

            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
              {veiculos.length === 0 ? <div style={{ padding:40, textAlign:"center", color:"#475569" }}>Nenhum veículo cadastrado.</div>
                : veiculos.map((v,i) => (
                  <div key={v.id}>
                    <div style={{ padding:"14px 18px", borderTop:i>0?"1px solid #1e293b":"none", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1e293b,#334155)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{TIPO_ICON[v.tipo]||"🚘"}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color:"#f1f5f9", fontSize:14 }}>{v.modelo}</div>
                        <div style={{ fontSize:11, color:"#475569" }}>
                          {v.tipo && <span style={{ background:"rgba(6,182,212,0.15)", color:"#06b6d4", border:"1px solid rgba(6,182,212,0.25)", borderRadius:99, padding:"1px 7px", marginRight:6 }}>{v.tipo}</span>}
                          Placa: {v.placa}{v.ano?` · ${v.ano}`:""}
                        </div>
                      </div>
                      <button onClick={() => { setEditingVeiculo(editingVeiculo?.id === v.id ? null : {...v}); setShowVeiculoForm(false); }}
                        style={{ background: editingVeiculo?.id === v.id ? "#334155" : "#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>
                        {editingVeiculo?.id === v.id ? "✕ Fechar" : "✏️ Editar"}
                      </button>
                      <button onClick={() => deleteVeiculo(v.id)} style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)", color:"#f87171", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>🗑️</button>
                    </div>

                    {/* Form de edição inline */}
                    {editingVeiculo?.id === v.id && (
                      <div style={{ padding:"16px 18px", background:"#0a0f1a", borderTop:"1px solid #1e293b" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:12 }}>
                          <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Tipo</label>
                            <select value={editingVeiculo.tipo || ""} onChange={e => setEditingVeiculo(p => ({...p,tipo:e.target.value}))}
                              style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
                              <option value="">Selecione...</option>{TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                            </select>
                          </div>
                          <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Placa</label>{inp(editingVeiculo.placa, val => setEditingVeiculo(p => ({...p,placa:val})), "Placa")}</div>
                          <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Modelo</label>{inp(editingVeiculo.modelo, val => setEditingVeiculo(p => ({...p,modelo:val})), "Modelo")}</div>
                          <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Ano</label>{inp(editingVeiculo.ano||"", val => setEditingVeiculo(p => ({...p,ano:val})), "Ano", "number")}</div>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button onClick={updateVeiculo} disabled={saving} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", color:"#fff", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Salvando...":"✓ Salvar"}</button>
                          <button onClick={() => setEditingVeiculo(null)} style={{ background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"8px 18px", fontSize:13, cursor:"pointer" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
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
