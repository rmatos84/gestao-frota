import { useState, useEffect, useMemo, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://vwjetfypctzoimvvdsjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_65zvqkMbn2aW3PN9woXtrA_iuy5Fgv7";

const api = async (path, method = "GET", body = null) => {
  const token = localStorage.getItem("frota_token") || SUPABASE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
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
const TIPO_COLOR = { "Moto": "#06b6d4", "Carro": "#3b82f6", "Van": "#8b5cf6", "Caminhão": "#f59e0b" };

const ITENS_CARRO = [
  { id: "parabrisa", label: "Para-brisa sem avaria" },
  { id: "limpadores", label: "Limpadores para-brisa" },
  { id: "agua_parabrisa", label: "Água do reservatório do para-brisa" },
  { id: "agua_radiador", label: "Nível de água radiador" },
  { id: "oleo_motor", label: "Nível do óleo do motor" },
  { id: "oleo_dias", label: "Óleo do motor em dias" },
  { id: "farol", label: "Farol e sinalizadores de direção" },
  { id: "antena", label: "Antena" },
  { id: "documento", label: "Documento atualizado" },
  { id: "luzes_painel", label: "Luzes do painel apagadas" },
  { id: "buzina", label: "Buzina" },
  { id: "tapetes", label: "Tapetes" },
  { id: "chave_roda", label: "Chave de Roda" },
  { id: "macaco", label: "Macaco" },
  { id: "triangulo", label: "Triângulo" },
  { id: "maquineta", label: "Maquineta com Carregador" },
  { id: "pneu_diant_esq", label: "Pneu Dianteiro Esquerdo" },
  { id: "pneu_diant_dir", label: "Pneu Dianteiro Direito" },
  { id: "pneu_tras_esq", label: "Pneu Traseiro Esquerdo" },
  { id: "pneu_tras_dir", label: "Pneu Traseiro Direito" },
  { id: "pneu_estepe", label: "Pneu Estepe" },
];

const ITENS_MOTO = [
  { id: "farol", label: "Farol e lanterna funcionando" },
  { id: "setas", label: "Setas/piscas funcionando" },
  { id: "freio_diant", label: "Freio dianteiro em ordem" },
  { id: "freio_tras", label: "Freio traseiro em ordem" },
  { id: "oleo_motor", label: "Nível do óleo do motor" },
  { id: "corrente", label: "Corrente lubrificada/ajustada" },
  { id: "pneu_diant", label: "Pneu dianteiro em boas condições" },
  { id: "pneu_tras", label: "Pneu traseiro em boas condições" },
  { id: "documento", label: "Documento atualizado" },
  { id: "buzina", label: "Buzina funcionando" },
  { id: "retrovisor", label: "Retrovisor(es) em ordem" },
  { id: "capacete", label: "Capacete disponível" },
  { id: "maquineta", label: "Maquineta com Carregador" },
  { id: "epi", label: "🦺 EPI Completo (Luva, joelheira, colete refletivo, calçado fechado)" },
];

const emptyMotorista = { nome: "", cnh: "", telefone: "" };
const emptyVeiculo = { placa: "", modelo: "", ano: "", tipo: "" };
const emptyAbast = { motorista_id: "", veiculo_id: "", motorista_nome: "", veiculo_descricao: "", data: "", km_inicial: "", km_final: "", combustivel_litros: "", valor_total: "", observacao: "" };

// ─── Login Screen ───────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) { setErro("Preencha e-mail e senha."); return; }
    setLoading(true); setErro("");
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha })
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("frota_token", data.access_token);
        localStorage.setItem("frota_user", JSON.stringify({ email, nome: data.user?.user_metadata?.nome || email.split("@")[0] }));
        onLogin({ email, nome: data.user?.user_metadata?.nome || email.split("@")[0], token: data.access_token });
      } else {
        setErro("E-mail ou senha incorretos.");
      }
    } catch { setErro("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#0a0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 14px" }}>🚛</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#f1f5f9" }}>Supremo Açaí</div>
          <div style={{ fontSize: 12, color: "#475569", letterSpacing: "0.08em", marginTop: 2 }}>GESTÃO DE FROTA</div>
        </div>

        {/* Card de login */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: 28 }}>
          <div style={{ fontWeight: 600, fontSize: 18, color: "#f1f5f9", marginBottom: 6 }}>Entrar</div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 24 }}>Acesse sua conta para continuar</div>

          {erro && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
              ⚠️ {erro}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email"
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "11px 14px", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Senha</label>
              <div style={{ position: "relative" }}>
                <input type={showSenha ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "11px 44px 11px 14px", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: 0 }}>
                  {showSenha ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ marginTop: 8, padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", color: "#fff", opacity: loading ? 0.7 : 1, transition: "opacity 0.2s" }}>
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#334155" }}>
          Problemas de acesso? Fale com o administrador.
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("frota_user");
      const t = localStorage.getItem("frota_token");
      return u && t ? JSON.parse(u) : null;
    } catch { return null; }
  });

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => {
    localStorage.removeItem("frota_token");
    localStorage.removeItem("frota_user");
    setUser(null);
  };

  const [tab, setTab] = useState("dashboard");
  const [logisticaOpen, setLogisticaOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [checklists, setChecklists] = useState([]);
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

  // Checklist state
  const [ckTipo, setCkTipo] = useState("");
  const [ckVeiculoId, setCkVeiculoId] = useState("");
  const [ckMotoristaId, setCkMotoristaId] = useState("");
  const [ckData, setCkData] = useState(new Date().toISOString().split("T")[0]);
  const [ckKm, setCkKm] = useState("");
  const [ckItens, setCkItens] = useState({});
  const [ckObs, setCkObs] = useState("");
  const [ckSaving, setCkSaving] = useState(false);
  const [ckSuccess, setCkSuccess] = useState(false);
  const [ckView, setCkView] = useState("form"); // "form" | "history"
  // Audio - Web Speech API
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [filtroMotorista, setFiltroMotorista] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  // Abastecimentos - filtros, ordenação e paginação
  const [abastFiltroMotorista, setAbastFiltroMotorista] = useState("");
  const [abastFiltroVeiculo, setAbastFiltroVeiculo] = useState("");
  const [abastFiltroDataIni, setAbastFiltroDataIni] = useState("");
  const [abastFiltroDataFim, setAbastFiltroDataFim] = useState("");
  const [abastFiltroTipo, setAbastFiltroTipo] = useState("");
  const [abastSort, setAbastSort] = useState({ col: "data", dir: "desc" });
  const [abastPage, setAbastPage] = useState(0);
  const ABAST_PER_PAGE = 50;

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, v, a, c] = await Promise.all([
        api("motoristas?select=*&order=nome"),
        api("veiculos?select=*&order=modelo"),
        api("abastecimentos?select=*&order=data.desc"),
        api("checklists?select=*&order=created_at.desc"),
      ]);
      setMotoristas(Array.isArray(m) ? m : []); 
      setVeiculos(Array.isArray(v) ? v : []); 
      setAbastecimentos(Array.isArray(a) ? a : []); 
      setChecklists(Array.isArray(c) ? c : []);
    } catch (e) { setError("Erro ao carregar dados: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { if (user) loadAll(); }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (logisticaRef.current && !logisticaRef.current.contains(e.target)) {
        setLogisticaOpen(false); setCadastroOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Preencher KM do último abastecimento ao selecionar veículo
  useEffect(() => {
    if (!ckVeiculoId) { setCkKm(""); return; }
    const ultAbast = abastecimentos.find(a => a.veiculo_id === ckVeiculoId);
    if (ultAbast) setCkKm(ultAbast.km_final);
    else setCkKm("");
  }, [ckVeiculoId, abastecimentos]);

  // Resetar itens ao mudar tipo
  useEffect(() => { setCkItens({}); }, [ckTipo]);

  const veiculosFiltradosTipo = veiculos.filter(v => !ckTipo || v.tipo === ckTipo);
  const itensChecklist = ckTipo === "Moto" ? ITENS_MOTO : ITENS_CARRO;

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
      por[nome].km += km; por[nome].litros += parseFloat(r.combustivel_litros);
      por[nome].viagens += 1; por[nome].gasto += parseFloat(r.valor_total || 0);
    });
    return Object.entries(por).map(([nome, d]) => ({
      nome, kmTotal: d.km, litros: d.litros,
      kml: d.litros > 0 ? (d.km / d.litros).toFixed(2) : "—",
      viagens: d.viagens, gasto: d.gasto,
    })).sort((a, b) => b.kmTotal - a.kmTotal);
  }, [abastFiltrados]);

  const rankingPorTipo = useMemo(() => {
    const tiposMap = {};
    abastFiltrados.forEach(r => {
      const vei = veiculos.find(v => v.id === r.veiculo_id);
      const tipo = vei?.tipo || "Sem tipo";
      const nome = r.motorista_nome || r.motorista_id;
      const km = r.km_final - r.km_inicial;
      if (!tiposMap[tipo]) tiposMap[tipo] = {};
      if (!tiposMap[tipo][nome]) tiposMap[tipo][nome] = { km: 0, litros: 0, viagens: 0, gasto: 0 };
      tiposMap[tipo][nome].km += km; tiposMap[tipo][nome].litros += parseFloat(r.combustivel_litros);
      tiposMap[tipo][nome].viagens += 1; tiposMap[tipo][nome].gasto += parseFloat(r.valor_total || 0);
    });
    return Object.entries(tiposMap).map(([tipo, motoristasMap]) => {
      const lista = Object.entries(motoristasMap).map(([nome, d]) => ({
        nome, kmTotal: d.km, litros: d.litros,
        kml: d.litros > 0 ? (d.km / d.litros).toFixed(2) : "—",
        viagens: d.viagens, gasto: d.gasto,
      })).sort((a, b) => b.kmTotal - a.kmTotal);
      return { tipo, motoristas: lista, totalKm: lista.reduce((s, m) => s + m.kmTotal, 0) };
    }).sort((a, b) => ["Moto","Carro","Van","Caminhão"].indexOf(a.tipo) - ["Moto","Carro","Van","Caminhão"].indexOf(b.tipo));
  }, [abastFiltrados, veiculos]);

  const totalKm = abastFiltrados.reduce((s, r) => s + (r.km_final - r.km_inicial), 0);
  const totalLitros = abastFiltrados.reduce((s, r) => s + parseFloat(r.combustivel_litros || 0), 0);
  const totalGasto = abastFiltrados.reduce((s, r) => s + parseFloat(r.valor_total || 0), 0);
  const mediaKml = totalLitros > 0 ? (totalKm / totalLitros).toFixed(2) : "—";
  const pieData = (stats || []).map(s => ({ name: (s.nome||"").split(" ")[0], value: s.kmTotal, fullName: s.nome }));

  const saveMotorista = async () => {
    if (!formMotorista.nome) return; setSaving(true);
    try { await api("motoristas", "POST", { ...formMotorista, ativo: true }); setFormMotorista(emptyMotorista); setShowMotoristaForm(false); await loadAll(); }
    catch (e) { setError(e.message); } setSaving(false);
  };

  const saveVeiculo = async () => {
    if (!formVeiculo.placa || !formVeiculo.modelo) return; setSaving(true);
    try { await api("veiculos", "POST", { ...formVeiculo, ano: formVeiculo.ano ? parseInt(formVeiculo.ano) : null, ativo: true }); setFormVeiculo(emptyVeiculo); setShowVeiculoForm(false); await loadAll(); }
    catch (e) { setError(e.message); } setSaving(false);
  };

  const updateVeiculo = async () => {
    if (!editingVeiculo) return; setSaving(true);
    try { await api(`veiculos?id=eq.${editingVeiculo.id}`, "PATCH", { placa: editingVeiculo.placa, modelo: editingVeiculo.modelo, ano: editingVeiculo.ano ? parseInt(editingVeiculo.ano) : null, tipo: editingVeiculo.tipo }); setEditingVeiculo(null); await loadAll(); }
    catch (e) { setError(e.message); } setSaving(false);
  };

  const deleteVeiculo = async (id) => {
    if (!window.confirm("Deseja realmente excluir este veículo?")) return;
    try { await api(`veiculos?id=eq.${id}`, "DELETE"); await loadAll(); }
    catch (e) { setError("Não foi possível excluir. Verifique vínculos."); }
  };

  const saveAbast = async () => {
    const { motorista_id, veiculo_id, data, km_inicial, km_final, combustivel_litros } = formAbast;
    if (!motorista_id || !veiculo_id || !data || !km_inicial || !km_final || !combustivel_litros) return;
    setSaving(true);
    try {
      const mot = motoristas.find(m => m.id === motorista_id);
      const vei = veiculos.find(v => v.id === veiculo_id);
      await api("abastecimentos", "POST", { ...formAbast, motorista_nome: mot?.nome || "", veiculo_descricao: `${vei?.modelo || ""} - ${vei?.placa || ""}`, km_inicial: parseFloat(km_inicial), km_final: parseFloat(km_final), combustivel_litros: parseFloat(combustivel_litros), valor_total: formAbast.valor_total ? parseFloat(formAbast.valor_total) : null });
      setFormAbast(emptyAbast); setShowAbastForm(false); await loadAll();
    } catch (e) { setError(e.message); } setSaving(false);
  };

  const saveChecklist = async () => {
    if (!ckVeiculoId || !ckMotoristaId) { setError("Selecione veículo e motorista."); return; }
    setCkSaving(true);
    try {
      const mot = motoristas.find(m => m.id === ckMotoristaId);
      const vei = veiculos.find(v => v.id === ckVeiculoId);
      await api("checklists", "POST", {
        veiculo_id: ckVeiculoId, motorista_id: ckMotoristaId,
        veiculo_descricao: `${vei?.modelo || ""} - ${vei?.placa || ""}`,
        motorista_nome: mot?.nome || "", tipo_veiculo: ckTipo,
        data: ckData, km: ckKm ? parseFloat(ckKm) : null,
        itens: ckItens, observacao: ckObs,
      });
      setCkSuccess(true);
      setTimeout(() => {
        setCkSuccess(false); setCkTipo(""); setCkVeiculoId(""); setCkMotoristaId("");
        setCkData(new Date().toISOString().split("T")[0]); setCkKm(""); setCkItens({}); setCkObs("");
        loadAll();
      }, 2000);
    } catch (e) { setError(e.message); }
    setCkSaving(false);
  };

  // Gravação de áudio
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta gravação de voz. Use o Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const texto = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setCkObs(prev => prev ? prev + " " + texto : texto);
    };
    recognition.onerror = () => setError("Erro ao gravar áudio. Verifique o microfone.");
    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); setRecording(false); }
  };

  const runAI = async () => {
    setAiLoading(true); setAiAnalysis(""); setTab("ia");
    const resumo = stats.map(s => `${s.nome}: ${s.kmTotal}km, ${s.kml} km/L, ${s.viagens} viagem(ns)`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: `Você é especialista em gestão de frota. Analise e forneça insights:\n\n${resumo}\n\nTotais: ${totalKm}km, ${totalLitros.toFixed(0)}L, média ${mediaKml} km/L.\n\nForneça: 1) Insights 2) Alertas 3) Recomendações. Use bullet points.` }] })
      });
      const data = await res.json();
      setAiAnalysis(data.content?.[0]?.text || "Sem resposta.");
    } catch { setAiAnalysis("Erro ao conectar com a IA."); }
    setAiLoading(false);
  };

  const inp = (val, onChange, placeholder, type = "text", intOnly = false) => (
    <input
      type={type}
      value={val}
      onChange={e => {
        let v = e.target.value;
        if (intOnly) v = v.replace(/[^0-9]/g, "");
        onChange(v);
      }}
      onKeyDown={intOnly ? (e => { if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }) : undefined}
      placeholder={placeholder}
      style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
  );

  const sel = (val, onChange, children) => (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: val ? "#f1f5f9" : "#64748b", fontSize: 13, outline: "none" }}>
      {children}
    </select>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0];
      const pct = totalKm > 0 ? ((d.value / totalKm) * 100).toFixed(1) : 0;
      return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
        <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{d.payload.fullName || d.payload.name}</div>
        <div style={{ color: "#94a3b8" }}>{d.value.toLocaleString()} km</div>
        <div style={{ color: d.fill, fontWeight: 600 }}>{pct}% do total</div>
      </div>;
    }
    return null;
  };

  const navBtn = (label, active, onClick) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left", background: active ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: active ? "#fff" : "#94a3b8" }}>
      {label}
    </button>
  );

  const itensMarcados = Object.values(ckItens).filter(Boolean).length;
  const totalItens = itensChecklist.length;

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#0a0f1a", minHeight: "100vh", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header compacto - só logo + menu */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🚛</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9", lineHeight: 1.2 }}>Supremo Açaí</div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.06em" }}>GESTÃO DE FROTA</div>
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: "#1e293b", flexShrink: 0 }} />
        <div ref={logisticaRef} style={{ position: "relative" }}>
          <button onClick={() => { setLogisticaOpen(!logisticaOpen); setCadastroOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: logisticaOpen ? "rgba(6,182,212,0.15)" : "transparent", color: logisticaOpen ? "#06b6d4" : "#94a3b8", whiteSpace: "nowrap" }}>
            🚚 Logística <span style={{ fontSize: 9, opacity: 0.6 }}>{logisticaOpen ? "▲" : "▼"}</span>
          </button>
          {logisticaOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 6, zIndex: 200, minWidth: 200, boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
              {navBtn("📊 Dashboard", tab === "dashboard", () => { setTab("dashboard"); setLogisticaOpen(false); })}
              {navBtn("⛽ Abastecimentos", tab === "registros", () => { setTab("registros"); setLogisticaOpen(false); })}
              {navBtn("✅ Checklist", tab === "checklist", () => { setTab("checklist"); setLogisticaOpen(false); })}
              <div>
                <button onClick={() => setCadastroOpen(!cadastroOpen)}
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

        {/* User info + logout */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 26, height: 26, background: "linear-gradient(135deg,#1e293b,#334155)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
            <span style={{ color: "#94a3b8", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nome}</span>
          </div>
          <button onClick={handleLogout}
            style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
            Sair
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "10px 24px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>{error} <span style={{ cursor: "pointer" }} onClick={() => setError("")}>✕</span></div>}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {loading && <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Carregando...</div>}

        {/* ===== CHECKLIST ===== */}
        {!loading && tab === "checklist" && (
          <div>
            {/* Tabs form/histórico */}
            <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid #1e293b", width: "fit-content" }}>
              {[["form","✅ Novo Checklist"],["history","📋 Histórico"]].map(([k,l]) => (
                <button key={k} onClick={() => setCkView(k)} style={{ padding: "7px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: ckView === k ? "linear-gradient(135deg,#06b6d4,#3b82f6)" : "transparent", color: ckView === k ? "#fff" : "#64748b" }}>{l}</button>
              ))}
            </div>

            {ckView === "form" && (
              <div>
                {ckSuccess && (
                  <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "center", color: "#10b981", fontWeight: 600, fontSize: 15 }}>
                    ✅ Checklist salvo com sucesso!
                  </div>
                )}

                {/* Step 1: Seleção */}
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 24, height: 24, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>1</span>
                    Informações do Veículo
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo de Veículo</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {TIPOS.map(t => (
                          <button key={t} onClick={() => { setCkTipo(t); setCkVeiculoId(""); }}
                            style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${ckTipo === t ? TIPO_COLOR[t] : "#334155"}`, cursor: "pointer", fontSize: 11, fontWeight: 600, background: ckTipo === t ? `${TIPO_COLOR[t]}20` : "#1e293b", color: ckTipo === t ? TIPO_COLOR[t] : "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 16 }}>{TIPO_ICON[t]}</span>
                            <span>{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Placa / Veículo</label>
                      {sel(ckVeiculoId, setCkVeiculoId, <><option value="">Selecione...</option>{veiculosFiltradosTipo.map(v => <option key={v.id} value={v.id}>{TIPO_ICON[v.tipo]||""} {v.modelo} - {v.placa}</option>)}</>)}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Motorista</label>
                      {sel(ckMotoristaId, setCkMotoristaId, <><option value="">Selecione...</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</>)}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data</label>
                      {inp(ckData, setCkData, "", "date")}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>KM do Veículo {ckKm && <span style={{ color: "#475569", fontWeight: 400 }}>(pré-setado)</span>}</label>
                      {inp(ckKm, setCkKm, "Ex: 42500", "number", true)}
                    </div>
                  </div>
                </div>

                {/* Step 2: Itens */}
                {ckTipo && (
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 24, height: 24, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>2</span>
                        Itens de Verificação {TIPO_ICON[ckTipo]}
                      </div>
                      <div style={{ fontSize: 12, color: itensMarcados === totalItens ? "#10b981" : "#64748b", fontWeight: 600 }}>
                        {itensMarcados}/{totalItens} verificados
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ height: 6, background: "#1e293b", borderRadius: 99, marginBottom: 20, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(itensMarcados/totalItens)*100}%`, background: itensMarcados === totalItens ? "#10b981" : "linear-gradient(90deg,#06b6d4,#3b82f6)", borderRadius: 99, transition: "width 0.3s ease" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                      {itensChecklist.map(item => {
                        const checked = ckItens[item.id] === true;
                        const nok = ckItens[item.id] === false;
                        return (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${checked ? "rgba(16,185,129,0.3)" : nok ? "rgba(248,113,113,0.3)" : "#334155"}`, background: checked ? "rgba(16,185,129,0.05)" : nok ? "rgba(248,113,113,0.05)" : "#1e293b" }}>
                            <span style={{ fontSize: 13, color: "#cbd5e1", flex: 1 }}>{item.label}</span>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => setCkItens(p => ({ ...p, [item.id]: p[item.id] === true ? undefined : true }))}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, background: checked ? "#10b981" : "#334155", color: "#fff", fontWeight: 700, transition: "all 0.15s" }}
                                title="OK (clique novamente para desmarcar">✓</button>
                              <button
                                onClick={() => setCkItens(p => ({ ...p, [item.id]: p[item.id] === false ? undefined : false }))}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, background: nok ? "#ef4444" : "#334155", color: "#fff", fontWeight: 700, transition: "all 0.15s" }}
                                title="Com problema (clique novamente para desmarcar)">✗</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Marcar todos */}
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button onClick={() => { const all = {}; itensChecklist.forEach(i => all[i.id] = true); setCkItens(all); }}
                        style={{ fontSize: 12, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                        ✓ Marcar todos como OK
                      </button>
                      <button onClick={() => setCkItens({})}
                        style={{ fontSize: 12, color: "#64748b", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                        Limpar
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Observação com áudio */}
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 24, height: 24, background: "linear-gradient(135deg,#06b6d4,#3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>3</span>
                    Observações
                  </div>

                  <textarea value={ckObs} onChange={e => setCkObs(e.target.value)} placeholder="Digite ou grave uma observação..."
                    style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 14px", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }} />

                  {/* Botão de áudio */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                    {!recording ? (
                      <button onClick={startRecording}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff" }}>
                        🎙️ Gravar Áudio
                      </button>
                    ) : (
                      <button onClick={stopRecording}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "1px solid #ef4444", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "#1e293b", color: "#ef4444" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                        Gravando... (clique para parar)
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>💡 Fale em português — o texto aparece automaticamente no campo acima</p>
                </div>

                {/* Botão salvar */}
                <button onClick={saveChecklist} disabled={ckSaving || !ckVeiculoId || !ckMotoristaId}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: !ckVeiculoId || !ckMotoristaId ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, background: !ckVeiculoId || !ckMotoristaId ? "#1e293b" : "linear-gradient(135deg,#06b6d4,#3b82f6)", color: !ckVeiculoId || !ckMotoristaId ? "#475569" : "#fff", opacity: ckSaving ? 0.7 : 1, transition: "all 0.2s" }}>
                  {ckSaving ? "Salvando..." : "✅ Salvar Checklist"}
                </button>
              </div>
            )}

            {/* Histórico */}
            {ckView === "history" && (
              <div>
                {checklists.length === 0
                  ? <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 40, textAlign: "center", color: "#475569" }}>Nenhum checklist registrado ainda.</div>
                  : checklists.map((c, i) => {
                    const itens = c.itens || {};
                    const total = Object.keys(itens).length;
                    const ok = Object.values(itens).filter(v => v === true).length;
                    const nok = Object.values(itens).filter(v => v === false).length;
                    return (
                      <div key={c.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => {
                          const el = document.getElementById("ck-detail-" + c.id);
                          if (el) el.style.display = el.style.display === "none" ? "block" : "none";
                        }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${TIPO_COLOR[c.tipo_veiculo] || "#334155"}20`, border: `1px solid ${TIPO_COLOR[c.tipo_veiculo] || "#334155"}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{TIPO_ICON[c.tipo_veiculo] || "🚘"}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{c.veiculo_descricao}</div>
                            <div style={{ fontSize: 11, color: "#475569" }}>{c.motorista_nome} · {c.data}{c.km ? ` · ${parseFloat(c.km).toLocaleString()} km` : ""}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {nok > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(248,113,113,0.15)", color: "#f87171", fontWeight: 600 }}>{nok} ✗</span>}
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 600 }}>{ok} ✓</span>
                            <span style={{ color: "#475569", fontSize: 12 }}>▼</span>
                          </div>
                        </div>
                        <div id={"ck-detail-" + c.id} style={{ display: "none", padding: "0 18px 16px", borderTop: "1px solid #1e293b" }}>
                          {total > 0 && (
                            <div style={{ paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6, marginBottom: 12 }}>
                              {Object.entries(itens).map(([id, val]) => {
                                const item = [...ITENS_CARRO, ...ITENS_MOTO].find(x => x.id === id);
                                return (
                                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: val ? "#94a3b8" : "#f87171" }}>
                                    <span>{val ? "✅" : "❌"}</span>
                                    <span>{item?.label || id}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {c.observacao && (
                            <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#cbd5e1" }}>
                              <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Obs: </span>{c.observacao}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD */}
        {!loading && tab === "dashboard" && (
          <div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                  🔍 Filtros {temFiltro && <span style={{ fontSize: 10, background: "rgba(6,182,212,0.2)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 99, padding: "2px 8px" }}>ativos</span>}
                </div>
                {temFiltro && <button onClick={() => { setFiltroDataInicio(""); setFiltroDataFim(""); setFiltroVeiculo(""); setFiltroMotorista(""); setFiltroTipo(""); }} style={{ fontSize: 11, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>✕ Limpar</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Data Início</label>{inp(filtroDataInicio, setFiltroDataInicio, "", "date")}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Data Fim</label>{inp(filtroDataFim, setFiltroDataFim, "", "date")}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Tipo</label>{sel(filtroTipo, setFiltroTipo, <><option value="">Todos</option>{TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}</>)}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Veículo</label>{sel(filtroVeiculo, setFiltroVeiculo, <><option value="">Todos</option>{veiculos.filter(v => !filtroTipo || v.tipo === filtroTipo).map(v => <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>)}</>)}</div>
                <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase" }}>Motorista</label>{sel(filtroMotorista, setFiltroMotorista, <><option value="">Todos</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</>)}</div>
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
              ? <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:40, textAlign:"center", color:"#475569" }}>Nenhum registro encontrado.</div>
              : <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                  <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:20 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:"#f1f5f9", marginBottom:16 }}>🥧 KM por Motorista</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:8 }}>
                      {pieData.map((d,i) => <div key={d.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}><div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[i%COLORS.length] }} /><span style={{ color:"#94a3b8" }}>{d.fullName}</span></div>)}
                    </div>
                  </div>
                  <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflow:"hidden" }}>
                    <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e293b", fontWeight:600, fontSize:14, color:"#f1f5f9" }}>🏆 Ranking Geral</div>
                    <div style={{ overflowY:"auto", maxHeight:320 }}>
                      {stats.map((s,i) => {
                        const kmlN = parseFloat(s.kml);
                        const pct = stats[0].kmTotal > 0 ? (s.kmTotal/stats[0].kmTotal)*100 : 0;
                        return <div key={s.nome} style={{ padding:"12px 20px", borderTop:i>0?"1px solid #1e293b":"none" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
                            <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#64748b)":i===2?"linear-gradient(135deg,#b45309,#92400e)":"#1e293b", color:"#fff" }}>{i+1}</div>
                            <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9" }}>{s.nome}</div><div style={{ fontSize:10, color:"#475569" }}>{s.viagens} viagem{s.viagens>1?"s":""} · {s.litros.toFixed(0)}L</div></div>
                            <div style={{ textAlign:"right" }}><div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{s.kmTotal.toLocaleString()} km</div><div style={{ fontSize:11, fontWeight:600, color:!isNaN(kmlN)?(kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171"):"#64748b" }}>{s.kml} km/L</div></div>
                          </div>
                          <div style={{ height:4, background:"#1e293b", borderRadius:99 }}><div style={{ height:"100%", width:`${pct}%`, background:COLORS[i%COLORS.length], borderRadius:99 }} /></div>
                        </div>;
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight:600, fontSize:15, color:"#f1f5f9", marginBottom:14 }}>📊 Ranking por Tipo de Veículo</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:16 }}>
                    {rankingPorTipo.map(({ tipo, motoristas: lista, totalKm: totalKmTipo }) => {
                      const cor = TIPO_COLOR[tipo] || "#64748b";
                      return <div key={tipo} style={{ background:"#0f172a", border:`1px solid ${cor}30`, borderRadius:16, overflow:"hidden" }}>
                        <div style={{ padding:"14px 20px", borderBottom:"1px solid #1e293b", display:"flex", alignItems:"center", justifyContent:"space-between", background:`${cor}10` }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:10, background:`${cor}20`, border:`1px solid ${cor}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{TIPO_ICON[tipo]||"🚘"}</div>
                            <div><div style={{ fontWeight:700, fontSize:14, color:"#f1f5f9" }}>{tipo}</div><div style={{ fontSize:11, color:"#64748b" }}>{lista.length} motorista{lista.length>1?"s":""}</div></div>
                          </div>
                          <div style={{ textAlign:"right" }}><div style={{ fontSize:13, fontWeight:700, color:cor }}>{totalKmTipo.toLocaleString()} km</div><div style={{ fontSize:10, color:"#64748b" }}>total rodado</div></div>
                        </div>
                        {lista.map((m,i) => {
                          const kmlN = parseFloat(m.kml);
                          const pct = lista[0].kmTotal > 0 ? (m.kmTotal/lista[0].kmTotal)*100 : 0;
                          return <div key={m.nome} style={{ padding:"12px 20px", borderTop:i>0?"1px solid #1e293b":"none" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                              <div style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0, background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#94a3b8,#64748b)":i===2?"linear-gradient(135deg,#b45309,#92400e)":"#1e293b", color:"#fff" }}>{i+1}</div>
                              <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:600, fontSize:13, color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.nome}</div><div style={{ fontSize:10, color:"#475569" }}>{m.viagens} viagem{m.viagens>1?"s":""} · {m.litros.toFixed(0)}L</div></div>
                              <div style={{ textAlign:"right", flexShrink:0 }}><div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{m.kmTotal.toLocaleString()} km</div><div style={{ fontSize:11, fontWeight:600, color:!isNaN(kmlN)?(kmlN>=11?"#10b981":kmlN>=9?"#fbbf24":"#f87171"):"#64748b" }}>{m.kml} km/L</div></div>
                            </div>
                            <div style={{ height:3, background:"#1e293b", borderRadius:99 }}><div style={{ height:"100%", width:`${pct}%`, background:cor, borderRadius:99, opacity:0.8 }} /></div>
                          </div>;
                        })}
                      </div>;
                    })}
                  </div>
                </div>
              </>
            }
          </div>
        )}

        {/* ABASTECIMENTOS */}
        {!loading && tab === "registros" && (() => {
          // Filtrar
          const abastVisiveis = abastecimentos.filter(r => {
            if (abastFiltroMotorista && r.motorista_id !== abastFiltroMotorista) return false;
            if (abastFiltroVeiculo && r.veiculo_id !== abastFiltroVeiculo) return false;
            if (abastFiltroDataIni && r.data < abastFiltroDataIni) return false;
            if (abastFiltroDataFim && r.data > abastFiltroDataFim) return false;
            if (abastFiltroTipo) {
              const vei = veiculos.find(v => v.id === r.veiculo_id);
              if (!vei || vei.tipo !== abastFiltroTipo) return false;
            }
            return true;
          });
          // Ordenar
          const sorted = [...abastVisiveis].sort((a, b) => {
            let va, vb;
            if (abastSort.col === "data") { va = a.data; vb = b.data; }
            else if (abastSort.col === "motorista") { va = a.motorista_nome||""; vb = b.motorista_nome||""; }
            else if (abastSort.col === "veiculo") { va = a.veiculo_descricao||""; vb = b.veiculo_descricao||""; }
            else if (abastSort.col === "km_rod") { va = a.km_final-a.km_inicial; vb = b.km_final-b.km_inicial; }
            else if (abastSort.col === "kml") { va = (a.km_final-a.km_inicial)/parseFloat(a.combustivel_litros); vb = (b.km_final-b.km_inicial)/parseFloat(b.combustivel_litros); }
            else if (abastSort.col === "valor") { va = parseFloat(a.valor_total||0); vb = parseFloat(b.valor_total||0); }
            else if (abastSort.col === "litros") { va = parseFloat(a.combustivel_litros||0); vb = parseFloat(b.combustivel_litros||0); }
            else { va = a[abastSort.col]||0; vb = b[abastSort.col]||0; }
            if (va < vb) return abastSort.dir === "asc" ? -1 : 1;
            if (va > vb) return abastSort.dir === "asc" ? 1 : -1;
            return 0;
          });
          const totalPages = Math.ceil(sorted.length / ABAST_PER_PAGE);
          const paginated = sorted.slice(abastPage * ABAST_PER_PAGE, (abastPage + 1) * ABAST_PER_PAGE);
          const temFiltroAbast = abastFiltroMotorista || abastFiltroVeiculo || abastFiltroDataIni || abastFiltroDataFim || abastFiltroTipo;

          const SortTh = ({ col, label }) => {
            const active = abastSort.col === col;
            return (
              <th onClick={() => { setAbastSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" })); setAbastPage(0); }}
                style={{ padding:"10px 14px", textAlign:"left", color: active ? "#06b6d4" : "#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none" }}>
                {label} {active ? (abastSort.dir === "asc" ? "▲" : "▼") : "⇅"}
              </th>
            );
          };

          return (
            <div>
              {/* Botão novo + filtros */}
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
                    {[["data","DATA","date",false],["km_inicial","KM INICIAL","number",true],["km_final","KM FINAL","number",true],["combustivel_litros","LITROS","number",false],["valor_total","VALOR TOTAL (R$)","number",false],["observacao","OBSERVAÇÃO","text",false]].map(([f,l,t,intOnly]) => (
                      <div key={f}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>{l}</label>{inp(formAbast[f], v => setFormAbast(p => ({...p,[f]:v})), l, t, intOnly)}</div>
                    ))}
                  </div>
                  <button onClick={saveAbast} disabled={saving} style={{ marginTop:14, background:"linear-gradient(135deg,#06b6d4,#3b82f6)", border:"none", color:"#fff", borderRadius:10, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Salvando...":"Salvar"}</button>
                </div>
              )}

              {/* Filtros da tabela */}
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", display:"flex", alignItems:"center", gap:6 }}>
                    🔍 Filtros
                    {temFiltroAbast && <span style={{ fontSize:10, background:"rgba(6,182,212,0.2)", color:"#06b6d4", border:"1px solid rgba(6,182,212,0.3)", borderRadius:99, padding:"2px 8px" }}>ativos</span>}
                  </div>
                  {temFiltroAbast && <button onClick={() => { setAbastFiltroMotorista(""); setAbastFiltroVeiculo(""); setAbastFiltroDataIni(""); setAbastFiltroDataFim(""); setAbastFiltroTipo(""); setAbastPage(0); }} style={{ fontSize:11, color:"#f87171", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>✕ Limpar</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
                  <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Data Início</label>{inp(abastFiltroDataIni, v => { setAbastFiltroDataIni(v); setAbastPage(0); }, "", "date")}</div>
                  <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Data Fim</label>{inp(abastFiltroDataFim, v => { setAbastFiltroDataFim(v); setAbastPage(0); }, "", "date")}</div>
                  <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Tipo Veículo</label>
                    <select value={abastFiltroTipo} onChange={e => { setAbastFiltroTipo(e.target.value); setAbastFiltroVeiculo(""); setAbastPage(0); }} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:abastFiltroTipo?"#f1f5f9":"#64748b", fontSize:13, outline:"none" }}>
                      <option value="">Todos os tipos</option>{TIPOS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Veículo</label>
                    <select value={abastFiltroVeiculo} onChange={e => { setAbastFiltroVeiculo(e.target.value); setAbastPage(0); }} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:abastFiltroVeiculo?"#f1f5f9":"#64748b", fontSize:13, outline:"none" }}>
                      <option value="">Todos</option>{veiculos.filter(v => !abastFiltroTipo || v.tipo === abastFiltroTipo).map(v => <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Motorista</label>
                    <select value={abastFiltroMotorista} onChange={e => { setAbastFiltroMotorista(e.target.value); setAbastPage(0); }} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:abastFiltroMotorista?"#f1f5f9":"#64748b", fontSize:13, outline:"none" }}>
                      <option value="">Todos</option>{motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, fontSize:12, color:"#64748b" }}>
                <span>{sorted.length} registro{sorted.length !== 1 ? "s" : ""} {temFiltroAbast ? "filtrados" : "no total"}</span>
                {totalPages > 1 && <span>Página {abastPage+1} de {totalPages}</span>}
              </div>

              {sorted.length === 0
                ? <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:40, textAlign:"center", color:"#475569" }}>Nenhum registro encontrado.</div>
                : <>
                  <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:"#0a0f1a" }}>
                          <SortTh col="data" label="Data" />
                          <SortTh col="motorista" label="Motorista" />
                          <SortTh col="veiculo" label="Veículo" />
                          <th style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>KM Ini</th>
                          <th style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>KM Fim</th>
                          <SortTh col="km_rod" label="KM Rod" />
                          <SortTh col="litros" label="Litros" />
                          <SortTh col="kml" label="km/L" />
                          <th style={{ padding:"10px 14px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>Preço/L</th>
                          <SortTh col="valor" label="Valor Total" />
                        </tr>
                      </thead>
                      <tbody>{paginated.map((r,i) => {
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

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:14 }}>
                      <button onClick={() => setAbastPage(0)} disabled={abastPage===0} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #334155", background:"#1e293b", color:abastPage===0?"#334155":"#94a3b8", cursor:abastPage===0?"not-allowed":"pointer", fontSize:13 }}>«</button>
                      <button onClick={() => setAbastPage(p => Math.max(0,p-1))} disabled={abastPage===0} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #334155", background:"#1e293b", color:abastPage===0?"#334155":"#94a3b8", cursor:abastPage===0?"not-allowed":"pointer", fontSize:13 }}>‹</button>
                      {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                        const page = Math.min(Math.max(abastPage - 2 + i, 0), totalPages - 1);
                        return <button key={page} onClick={() => setAbastPage(page)}
                          style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #334155", background:page===abastPage?"linear-gradient(135deg,#06b6d4,#3b82f6)":"#1e293b", color:page===abastPage?"#fff":"#94a3b8", cursor:"pointer", fontSize:13, fontWeight:page===abastPage?700:400 }}>{page+1}</button>;
                      })}
                      <button onClick={() => setAbastPage(p => Math.min(totalPages-1,p+1))} disabled={abastPage===totalPages-1} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #334155", background:"#1e293b", color:abastPage===totalPages-1?"#334155":"#94a3b8", cursor:abastPage===totalPages-1?"not-allowed":"pointer", fontSize:13 }}>›</button>
                      <button onClick={() => setAbastPage(totalPages-1)} disabled={abastPage===totalPages-1} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #334155", background:"#1e293b", color:abastPage===totalPages-1?"#334155":"#94a3b8", cursor:abastPage===totalPages-1?"not-allowed":"pointer", fontSize:13 }}>»</button>
                    </div>
                  )}
                </>
              }
            </div>
          );
        })()}

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
                      <button onClick={() => { setEditingVeiculo(editingVeiculo?.id === v.id ? null : {...v}); setShowVeiculoForm(false); }} style={{ background:editingVeiculo?.id===v.id?"#334155":"#1e293b", border:"1px solid #334155", color:"#94a3b8", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>{editingVeiculo?.id===v.id?"✕ Fechar":"✏️ Editar"}</button>
                      <button onClick={() => deleteVeiculo(v.id)} style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)", color:"#f87171", borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer" }}>🗑️</button>
                    </div>
                    {editingVeiculo?.id === v.id && (
                      <div style={{ padding:"16px 18px", background:"#0a0f1a", borderTop:"1px solid #1e293b" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:12 }}>
                          <div><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Tipo</label>
                            <select value={editingVeiculo.tipo||""} onChange={e => setEditingVeiculo(p => ({...p,tipo:e.target.value}))} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }}>
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

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
