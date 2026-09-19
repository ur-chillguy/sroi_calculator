import React, { useState, useMemo, useEffect, useCallback } from "react";

// ---- Design tokens ----
const T = {
  bg: "#12151A", panel: "#1B2028", panelAlt: "#171B22",
  border: "#2B3240", borderSoft: "#232936",
  text: "#EDEAE2", textMuted: "#8B93A1", textFaint: "#5B6472",
  gold: "#C7A248", sage: "#7FA98C", rust: "#B5563B", slate: "#5F84A6",
  serif: "'Source Serif 4', Georgia, serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  sans: "'Inter', system-ui, sans-serif",
};
const CHART_PALETTE = [T.gold, T.sage, T.slate, T.rust, "#9A7FB5", "#5FA6A0"];

const fmtRp = (n) => (isFinite(n) ? "Rp " + Math.round(n).toLocaleString("id-ID") : "—");
const fmtRpShort = (n) => {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + " M";
  if (abs >= 1e6) return (n / 1e6).toFixed(0) + " jt";
  return Math.round(n).toLocaleString("id-ID");
};
const fmtNum1 = (n) => (isFinite(n) ? Number(n).toFixed(1) : "0.0");
const uid = () => Math.random().toString(36).slice(2, 10);
const thisYear = new Date().getFullYear();

// storage = window.storage (Claude artifact persistent storage API)
const storage = window.storage;

// ---- Minimal inline icons ----
const Icon = ({ children, size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconTrash = (p) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></Icon>;
const IconSave = (p) => <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></Icon>;
const IconFolder = (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></Icon>;
const IconInfo = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></Icon>;
const IconX = (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>;
const IconSparkles = (p) => <Icon {...p}><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/></Icon>;
const IconChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
const IconChevronUp = (p) => <Icon {...p}><path d="m18 15-6-6-6 6"/></Icon>;
const IconCopy = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>;
const IconFileText = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></Icon>;

function MiniBarChart({ data, height = 200 }) {
  const max = Math.max(1, ...data.map((d) => d.pv));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.pv / max) * (height - 56));
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ fontSize: 9, fontFamily: T.mono, color: T.textFaint, marginBottom: 3, whiteSpace: "nowrap" }}>{fmtRpShort(d.pv)}</div>
            <div title={d.name + ": " + fmtRp(d.pv)} style={{ width: "60%", height: h, background: CHART_PALETTE[i % CHART_PALETTE.length], borderRadius: "3px 3px 0 0" }} />
            <div style={{ fontSize: 8.5, color: T.textFaint, marginTop: 5, textAlign: "center", lineHeight: 1.25, maxWidth: 64 }}>{d.name}</div>
          </div>
        );
      })}
    </div>
  );
}

// 8 bidang sesuai Lampiran Kepmen ESDM No. 1824 K/30/MEM/2018 — dikonfirmasi juga muncul di laporan SROI riil
const BIDANG_OPTIONS = [
  "Pendidikan",
  "Kesehatan",
  "Tingkat Pendapatan Riil / Penciptaan Kesempatan Kerja",
  "Kemandirian Ekonomi",
  "Sosial dan Budaya",
  "Lingkungan (Partisipasi Pengelolaan Lingkungan Berkelanjutan)",
  "Kelembagaan Komunitas Masyarakat",
  "Infrastruktur Penunjang PPM",
];

const blankInvestmentItem = (tahun) => ({ id: uid(), tahun: tahun || thisYear, nama: "", biaya: 0 });

const blankRow = () => ({
  id: uid(), bidang: BIDANG_OPTIONS[3], stakeholder: "", outcome: "",
  tahun: thisYear, durasi: 1,
  quantity: 0, proxy: 0, deadweight: 0, attribution: 0, displacement: 0, dropoff: 0,
  evidence: "",
  deadweightHelperOn: false, deadweightPeserta: 0, deadweightPembanding: 0,
  attributionHelperOn: false, attributionTotal: 0, attributionMurni: 0,
  displacementHelperOn: false, displacementTotal: 0, displacementGeser: 0,
  dropoffHelperOn: false, dropoffY1: 0, dropoffY2: 0,
});

const ASSUMPTION_META = {
  deadweight: { label: "Deadweight %", fieldA: "deadweightPeserta", labelA: "Rata-rata capaian kelompok peserta", fieldB: "deadweightPembanding", labelB: "Rata-rata capaian kelompok pembanding (tanpa program)", compute: (a, b) => (a > 0 ? Math.min(100, (b / a) * 100) : 0), formula: "Pembanding ÷ Peserta × 100%" },
  attribution: { label: "Atribusi %", fieldA: "attributionTotal", labelA: "Total penerima manfaat program", fieldB: "attributionMurni", labelB: "Jumlah yang murni dapat manfaat dari program ini", compute: (a, b) => (a > 0 ? Math.min(100, ((a - b) / a) * 100) : 0), formula: "(Total − Murni) ÷ Total × 100%" },
  displacement: { label: "Displacement %", fieldA: "displacementTotal", labelA: "Total nilai tambahan hasil program (Rp)", fieldB: "displacementGeser", labelB: "Perkiraan nilai yang tergeser dari pihak lain (Rp)", compute: (a, b) => (a > 0 ? Math.min(100, (b / a) * 100) : 0), formula: "Geser ÷ Total × 100%" },
  dropoff: { label: "Drop-off %", fieldA: "dropoffY1", labelA: "Capaian outcome periode/kondisi acuan", fieldB: "dropoffY2", labelB: "Capaian setelah efek waktu/keberlanjutan berkurang", compute: (a, b) => (a > 0 ? Math.min(100, Math.max(0, (1 - b / a) * 100)) : 0), formula: "(1 − Setelah ÷ Acuan) × 100%" },
};

const FIELD_HELP = {
  deadweight: "% perubahan yang tetap akan terjadi walau tanpa program ini (baseline/tren alami).",
  attribution: "% dari perubahan yang disebabkan pihak lain (mitra, pemda, program lain), bukan program ini.",
  displacement: "% dampak positif yang menggeser/menggantikan dampak positif di tempat/kelompok lain.",
  dropoff: "Penyesuaian nilai karena unsur waktu/keberlanjutan — bisa berarti penurunan efektivitas, bisa juga depresiasi aset. Diterapkan sebagai satu potongan flat, sesuai justifikasinya masing-masing.",
  discount: "Suku bunga/discount rate untuk meng-compound (Evaluation) atau mendiskon (Forecast) nilai ke tahun acuan.",
  sensitivity: "Menghitung rentang rasio (konservatif–optimis) dengan menggeser proxy, deadweight/atribusi/displacement, dan drop-off sebesar % ini ke dua arah.",
  tahun: "Tahun kalender saat dampak ini benar-benar terjadi (Evaluation) atau tahun mulai proyeksi (Forecast).",
  durasi: "1 = data aktual satu tahun — tambah baris baru untuk tahun berikutnya (gaya laporan SROI Evaluation Arutmin). Lebih dari 1 = proyeksi ke depan dari tahun ini, dengan drop-off diterapkan berulang tiap tahun proyeksi (gaya SROI Forecast).",
  mode: "Evaluation: menilai program yang sudah berjalan — nilai tahun lampau di-compound maju ke tahun terbaru sebagai acuan (\"nilai saat ini\"). Forecast: memproyeksikan program ke depan — nilai tahun mendatang didiskon mundur ke tahun awal sebagai acuan.",
};

const CONTOH_KASUS = {
  programName: "Pelatihan Kewirausahaan & Modal Usaha UMKM Ring-1",
  site: "Kintap", discountRate: 5, sensitivitySpread: 15, analysisMode: "evaluation",
  investmentItems: [
    { id: uid(), tahun: 2024, nama: "Pelatihan Kewirausahaan & Pendampingan UMKM", biaya: 80000000 },
    { id: uid(), tahun: 2024, nama: "Bantuan Modal Usaha Tahap 1", biaya: 70000000 },
    { id: uid(), tahun: 2025, nama: "Pendampingan Lanjutan & Modal Usaha Tahap 2", biaya: 100000000 },
  ],
  rows: [
    {
      id: uid(), bidang: "Kemandirian Ekonomi", stakeholder: "50 pelaku UMKM Ring-1",
      outcome: "Peningkatan pendapatan bersih usaha (tahun 2024)", tahun: 2024, durasi: 1,
      quantity: 50, proxy: 6000000, deadweight: 20, attribution: 16, displacement: 10, dropoff: 0,
      evidence: "Survei pendapatan before-after peserta tahun 2024 + rekap penjualan UMKM binaan",
      deadweightHelperOn: true, deadweightPeserta: 500000, deadweightPembanding: 100000,
      attributionHelperOn: true, attributionTotal: 50, attributionMurni: 42,
      displacementHelperOn: true, displacementTotal: 300000000, displacementGeser: 30000000,
      dropoffHelperOn: false, dropoffY1: 0, dropoffY2: 0,
    },
    {
      id: uid(), bidang: "Kemandirian Ekonomi", stakeholder: "50 pelaku UMKM Ring-1 (tahun ke-2)",
      outcome: "Peningkatan pendapatan bersih usaha (tahun 2025, pendampingan berkurang)", tahun: 2025, durasi: 1,
      quantity: 50, proxy: 4800000, deadweight: 25, attribution: 10, displacement: 10, dropoff: 0,
      evidence: "Survei pendapatan tahun 2025 — atribusi turun karena UMKM makin mandiri",
      deadweightHelperOn: false, deadweightPeserta: 0, deadweightPembanding: 0,
      attributionHelperOn: false, attributionTotal: 0, attributionMurni: 0,
      displacementHelperOn: false, displacementTotal: 0, displacementGeser: 0,
      dropoffHelperOn: false, dropoffY1: 0, dropoffY2: 0,
    },
    {
      id: uid(), bidang: "Tingkat Pendapatan Riil / Penciptaan Kesempatan Kerja", stakeholder: "15 tenaga kerja baru",
      outcome: "Penyerapan tenaga kerja dari UMKM yang berkembang", tahun: 2024, durasi: 1,
      quantity: 15, proxy: 39600000, deadweight: 25, attribution: 10, displacement: 5, dropoff: 0,
      evidence: "Data karyawan baru dari laporan rutin UMKM binaan",
      deadweightHelperOn: false, deadweightPeserta: 0, deadweightPembanding: 0,
      attributionHelperOn: false, attributionTotal: 0, attributionMurni: 0,
      displacementHelperOn: false, displacementTotal: 0, displacementGeser: 0,
      dropoffHelperOn: false, dropoffY1: 0, dropoffY2: 0,
    },
    {
      id: uid(), bidang: "Kelembagaan Komunitas Masyarakat", stakeholder: "1 koperasi mitra",
      outcome: "Penguatan kapasitas kelembagaan koperasi", tahun: 2024, durasi: 1,
      quantity: 1, proxy: 25000000, deadweight: 30, attribution: 20, displacement: 0, dropoff: 15,
      evidence: "Proxy = estimasi biaya jasa konsultan kelembagaan setara di pasar; drop-off 15% karena kelembagaan belum sepenuhnya stabil",
      deadweightHelperOn: false, deadweightPeserta: 0, deadweightPembanding: 0,
      attributionHelperOn: false, attributionTotal: 0, attributionMurni: 0,
      displacementHelperOn: false, displacementTotal: 0, displacementGeser: 0,
      dropoffHelperOn: false, dropoffY1: 0, dropoffY2: 0,
    },
  ],
};

// Unified compounding: PV = nominal × (1+r)^(referenceYear - itemYear).
// itemYear < referenceYear → compounds UP (Evaluation: past values brought forward to "now").
// itemYear > referenceYear → discounts DOWN (Forecast: future values brought back to "now").
function calcOutcomeRow(row, discountRate, referenceYear, mult = { proxy: 1, reduction: 1, dropoff: 1 }) {
  const q = Number(row.quantity) || 0;
  const proxy = (Number(row.proxy) || 0) * mult.proxy;
  const clamp = (v) => Math.min(Math.max(v, 0), 100);
  const dw = clamp((Number(row.deadweight) || 0) * mult.reduction) / 100;
  const attr = clamp((Number(row.attribution) || 0) * mult.reduction) / 100;
  const disp = clamp((Number(row.displacement) || 0) * mult.reduction) / 100;
  const drop = clamp((Number(row.dropoff) || 0) * mult.dropoff) / 100;
  const durasi = Math.max(1, Math.round(Number(row.durasi) || 1));
  const tahunMulai = Math.round(Number(row.tahun) || referenceYear);
  const dr = (Number(discountRate) || 0) / 100;

  const grossY1 = q * proxy;
  // All four fixation factors apply flat, once, to the baseline year — matching the real
  // report's Gross × (1-DW)(1-Attr)(1-Disp)(1-Drop) formula, so a single-year (durasi=1)
  // entry still gets its drop-off applied. For durasi > 1 (Forecast projections), the SAME
  // drop-off rate then compounds further for each additional projected year.
  const netY1 = grossY1 * (1 - dw) * (1 - attr) * (1 - disp) * (1 - drop);

  let totalNominal = 0, totalPV = 0;
  const perYear = [];
  for (let i = 0; i < durasi; i++) {
    const tahun = tahunMulai + i;
    const nilaiBersih = netY1 * Math.pow(1 - drop, i);
    const pv = nilaiBersih * Math.pow(1 + dr, referenceYear - tahun);
    totalNominal += nilaiBersih;
    totalPV += pv;
    perYear.push({ tahun, nilaiBersih, pv });
  }
  return { grossY1, netY1, totalNominal, totalPV, perYear };
}

function calcInvestmentItem(item, discountRate, referenceYear) {
  const nominal = Number(item.biaya) || 0;
  const tahun = Math.round(Number(item.tahun) || referenceYear);
  const dr = (Number(discountRate) || 0) / 100;
  const pv = nominal * Math.pow(1 + dr, referenceYear - tahun);
  return { tahun, nominal, pv };
}

function SROICalculator() {
  const [programName, setProgramName] = useState("");
  const [site, setSite] = useState("");
  const [discountRate, setDiscountRate] = useState(0);
  const [analysisMode, setAnalysisMode] = useState("evaluation");
  const [investmentItems, setInvestmentItems] = useState([blankInvestmentItem(thisYear)]);
  const [rows, setRows] = useState([blankRow()]);
  const [sensitivityOn, setSensitivityOn] = useState(false);
  const [sensitivitySpread, setSensitivitySpread] = useState(15);
  const [helpKey, setHelpKey] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [savedList, setSavedList] = useState([]);
  const [toast, setToast] = useState("");
  const [chartsOpen, setChartsOpen] = useState(true);

  const referenceYear = useMemo(() => {
    const invYears = investmentItems.map((i) => Number(i.tahun)).filter((y) => y > 0);
    const outcomeYears = rows.flatMap((r) => {
      const t = Number(r.tahun) || 0;
      const d = Math.max(1, Number(r.durasi) || 1);
      return t > 0 ? Array.from({ length: d }, (_, i) => t + i) : [];
    });
    const allYears = [...invYears, ...outcomeYears];
    if (!allYears.length) return thisYear;
    return analysisMode === "evaluation" ? Math.max(...allYears) : Math.min(...allYears);
  }, [investmentItems, rows, analysisMode]);

  const results = useMemo(() => {
    const perRow = rows.map((r) => ({ id: r.id, ...calcOutcomeRow(r, discountRate, referenceYear) }));
    const invItemsCalc = investmentItems.map((item) => calcInvestmentItem(item, discountRate, referenceYear));

    const invByYear = {}, manfaatByYear = {};
    invItemsCalc.forEach((c) => {
      if (!invByYear[c.tahun]) invByYear[c.tahun] = { nominal: 0, pv: 0 };
      invByYear[c.tahun].nominal += c.nominal; invByYear[c.tahun].pv += c.pv;
    });
    perRow.forEach((r) => r.perYear.forEach((y) => {
      if (!manfaatByYear[y.tahun]) manfaatByYear[y.tahun] = { nominal: 0, pv: 0 };
      manfaatByYear[y.tahun].nominal += y.nilaiBersih; manfaatByYear[y.tahun].pv += y.pv;
    }));
    const years = [...new Set([...Object.keys(invByYear).map(Number), ...Object.keys(manfaatByYear).map(Number)])].sort((a, b) => a - b);

    const totalInvNominal = invItemsCalc.reduce((s, c) => s + c.nominal, 0);
    const totalInvPV = invItemsCalc.reduce((s, c) => s + c.pv, 0);
    const totalManfaatNominal = perRow.reduce((s, r) => s + r.totalNominal, 0);
    const totalManfaatPV = perRow.reduce((s, r) => s + r.totalPV, 0);
    const ratio = totalInvPV > 0 ? totalManfaatPV / totalInvPV : NaN;
    const net = totalManfaatPV - totalInvPV;

    let range = null;
    if (sensitivityOn) {
      const s = Number(sensitivitySpread) || 0;
      const optMult = { proxy: 1 + s / 100, reduction: 1 - s / 100, dropoff: 1 - s / 100 };
      const consMult = { proxy: 1 - s / 100, reduction: 1 + s / 100, dropoff: 1 + s / 100 };
      const pvOpt = rows.reduce((sum, r) => sum + calcOutcomeRow(r, discountRate, referenceYear, optMult).totalPV, 0);
      const pvCons = rows.reduce((sum, r) => sum + calcOutcomeRow(r, discountRate, referenceYear, consMult).totalPV, 0);
      range = { low: totalInvPV > 0 ? pvCons / totalInvPV : NaN, high: totalInvPV > 0 ? pvOpt / totalInvPV : NaN };
    }

    const byBidang = {};
    perRow.forEach((r, i) => { const b = rows[i].bidang || "Lainnya"; byBidang[b] = (byBidang[b] || 0) + r.totalPV; });

    return { perRow, invItemsCalc, invByYear, manfaatByYear, years, totalInvNominal, totalInvPV, totalManfaatNominal, totalManfaatPV, ratio, net, range, byBidang };
  }, [rows, investmentItems, discountRate, referenceYear, sensitivityOn, sensitivitySpread]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };
  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (id) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const updateRow = (id, field, value) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const updateAssumption = (id, metaKey, subField, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [subField]: value };
      const meta = ASSUMPTION_META[metaKey];
      const a = Number(updated[meta.fieldA]) || 0;
      const b = Number(updated[meta.fieldB]) || 0;
      updated[metaKey] = Number(meta.compute(a, b).toFixed(1));
      return updated;
    }));
  };

  const addInvItem = () => setInvestmentItems((s) => [...s, blankInvestmentItem(referenceYear)]);
  const removeInvItem = (id) => setInvestmentItems((s) => (s.length > 1 ? s.filter((x) => x.id !== id) : s));
  const updateInvItem = (id, field, value) => setInvestmentItems((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const loadExample = () => {
    setProgramName(CONTOH_KASUS.programName);
    setSite(CONTOH_KASUS.site);
    setDiscountRate(CONTOH_KASUS.discountRate);
    setAnalysisMode(CONTOH_KASUS.analysisMode);
    setInvestmentItems(CONTOH_KASUS.investmentItems.map((t) => ({ ...t, id: uid() })));
    setRows(CONTOH_KASUS.rows.map((r) => ({ ...r, id: uid() })));
    setSensitivityOn(true);
    setSensitivitySpread(CONTOH_KASUS.sensitivitySpread);
    showToast("Contoh kasus dimuat.");
  };

  const refreshSavedList = useCallback(async () => {
    try { const res = await storage.list("sroi-scenario:"); setSavedList((res?.keys || []).map((k) => k.replace("sroi-scenario:", ""))); }
    catch (e) { setSavedList([]); }
  }, []);
  useEffect(() => { refreshSavedList(); }, [refreshSavedList]);

  const saveScenario = async () => {
    const name = scenarioName.trim();
    if (!name) return;
    try {
      await storage.set("sroi-scenario:" + name, JSON.stringify({ programName, site, discountRate, analysisMode, investmentItems, rows, sensitivityOn, sensitivitySpread }));
      showToast(`Skenario "${name}" tersimpan.`);
      setSaveOpen(false); setScenarioName(""); refreshSavedList();
    } catch (e) { showToast("Gagal menyimpan."); }
  };

  const loadScenario = async (name) => {
    try {
      const res = await storage.get("sroi-scenario:" + name);
      if (res?.value) {
        const d = JSON.parse(res.value);
        setProgramName(d.programName || ""); setSite(d.site || ""); setDiscountRate(d.discountRate || 0);
        setAnalysisMode(d.analysisMode || "evaluation");
        setInvestmentItems(d.investmentItems?.length ? d.investmentItems : [blankInvestmentItem(thisYear)]);
        setRows(d.rows?.length ? d.rows : [blankRow()]);
        setSensitivityOn(!!d.sensitivityOn); setSensitivitySpread(d.sensitivitySpread || 15);
        showToast(`Skenario "${name}" dimuat.`);
      }
    } catch (e) { showToast("Gagal memuat."); }
    setLoadOpen(false);
  };

  const deleteScenario = async (name, ev) => {
    ev.stopPropagation();
    try { await storage.delete("sroi-scenario:" + name); refreshSavedList(); } catch (e) {}
  };

  const generateLaporanText = () => {
    const modeLabel = analysisMode === "evaluation" ? "Evaluation" : "Forecast";
    const years = results.years.length ? results.years : [thisYear];
    const minY = Math.min(...years), maxY = Math.max(...years);
    const ratioStr = isFinite(results.ratio) ? results.ratio.toFixed(2) : "-";
    const namaProgram = programName || "[Nama Program]";
    const namaSite = site ? ` PT Arutmin Indonesia Tambang ${site}` : " perusahaan";

    let t = "";
    t += `KAJIAN SOCIAL RETURN ON INVESTMENT (SROI)\n${namaProgram}${site ? " — " + site : ""}\n\n`;

    t += `RINGKASAN RASIO SROI\n`;
    t += `Kajian Social Return on Investment (SROI) terhadap ${namaProgram} yang dilaksanakan oleh${namaSite} dianalisis melalui pendekatan SROI ${modeLabel} untuk periode ${minY}-${maxY}. `;
    t += `Total nilai investasi program mencapai ${fmtRp(results.totalInvNominal)} (nilai nominal) atau setara ${fmtRp(results.totalInvPV)} setelah dikonversi ke nilai saat ini (present value tahun ${referenceYear}). `;
    t += `Dari sisi manfaat, program ini menghasilkan nilai dampak sosial-ekonomi sebesar ${fmtRp(results.totalManfaatNominal)} (nilai nominal) atau setara ${fmtRp(results.totalManfaatPV)} pada nilai saat ini. `;
    t += `Dari hasil tersebut, diperoleh rasio SROI ${modeLabel} sebesar 1 : ${ratioStr}, yang menunjukkan bahwa setiap satu rupiah investasi menghasilkan manfaat sebesar Rp${ratioStr} bagi masyarakat dan lingkungan sekitar wilayah program.\n\n`;

    t += `TABEL PERHITUNGAN NILAI RASIO SROI ${modeLabel.toUpperCase()} (${minY}-${maxY})\n`;
    t += `Komponen\t${years.join("\t")}\tTotal\n`;
    t += `Nilai Investasi\t${years.map((y) => fmtRp(results.invByYear[y]?.nominal || 0)).join("\t")}\t${fmtRp(results.totalInvNominal)}\n`;
    t += `Nilai Investasi Saat Ini\t${years.map((y) => fmtRp(results.invByYear[y]?.pv || 0)).join("\t")}\t${fmtRp(results.totalInvPV)}\n`;
    t += `Nilai Manfaat\t${years.map((y) => fmtRp(results.manfaatByYear[y]?.nominal || 0)).join("\t")}\t${fmtRp(results.totalManfaatNominal)}\n`;
    t += `Nilai Manfaat Saat Ini\t${years.map((y) => fmtRp(results.manfaatByYear[y]?.pv || 0)).join("\t")}\t${fmtRp(results.totalManfaatPV)}\n`;
    t += `Rasio SROI\t${years.map(() => "").join("\t")}\t1 : ${ratioStr}\n\n`;

    t += `KERANGKA SIMPULAN PER BIDANG PPM\n`;
    BIDANG_OPTIONS.forEach((b) => {
      const rowsInBidang = rows.filter((r) => r.bidang === b);
      if (!rowsInBidang.length) return;
      const bidangPV = rowsInBidang.reduce((s, r) => {
        const rr = results.perRow.find((p) => p.id === r.id);
        return s + (rr ? rr.totalPV : 0);
      }, 0);
      t += `\n${b}\n`;
      t += `Pada bidang ${b}, program menghasilkan dampak melalui: ${rowsInBidang.map((r) => `${r.outcome || "[deskripsi outcome]"} bagi ${r.stakeholder || "[stakeholder]"}`).join("; ")}. `;
      t += `Total nilai manfaat (present value) pada bidang ini tercatat sebesar ${fmtRp(bidangPV)}. `;
      t += `[Lengkapi dengan narasi kualitatif: capaian spesifik, perubahan kondisi sebelum-sesudah, cerita keberhasilan/tantangan di lapangan.]\n`;
    });

    t += `\nKERANGKA REKOMENDASI PER BIDANG PPM\n`;
    BIDANG_OPTIONS.forEach((b) => {
      const rowsInBidang = rows.filter((r) => r.bidang === b);
      if (!rowsInBidang.length) return;
      t += `\n${b}\n`;
      t += `[Rekomendasi lanjutan untuk bidang ${b} berdasarkan capaian di atas — misalnya perluasan cakupan, replikasi ke lokasi/kelompok lain, penguatan kelembagaan, atau evaluasi pendekatan bila capaian belum optimal.]\n`;
    });

    t += `\n---\nDraft ini dihasilkan otomatis dari Instrumen SROI berdasarkan data yang diisi. Bagian kerangka (simpulan & rekomendasi) masih perlu dilengkapi narasi kualitatif oleh tim penyusun sebelum menjadi laporan final.\n`;
    return t;
  };

  const [reportText, setReportText] = useState("");
  const openReport = () => { setReportText(generateLaporanText()); setReportOpen(true); };
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(reportText); showToast("Draft laporan disalin ke clipboard."); }
    catch (e) { showToast("Gagal menyalin — silakan select-all manual."); }
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const summary = [
      ["Program", programName || "-"], ["Lokasi/Site", site || "-"],
      ["Mode Analisis", analysisMode === "evaluation" ? "Evaluation" : "Forecast"], ["Tahun Acuan", referenceYear],
      ["Total Investasi (Nominal, Rp)", results.totalInvNominal], ["Total Investasi (Present Value, Rp)", Math.round(results.totalInvPV)],
      ["Discount Rate (%)", discountRate], ["Total Manfaat (Nominal, Rp)", Math.round(results.totalManfaatNominal)],
      ["Total Manfaat (Present Value, Rp)", Math.round(results.totalManfaatPV)],
      ["Net Social Value (Rp)", Math.round(results.net)], ["SROI Ratio (1 : x)", isFinite(results.ratio) ? Number(results.ratio.toFixed(2)) : "-"],
    ];
    if (results.range) {
      summary.push(["Rentang Sensitivitas — Konservatif (1 : x)", Number(results.range.low.toFixed(2))]);
      summary.push(["Rentang Sensitivitas — Optimis (1 : x)", Number(results.range.high.toFixed(2))]);
      summary.push(["Spread Sensitivitas (%)", sensitivitySpread]);
    }
    const invSheet = investmentItems.map((t) => ({ Tahun: t.tahun, "Nama Kegiatan": t.nama, "Biaya (Rp)": Number(t.biaya) || 0 }));
    const ratioSheet = [
      ["Komponen", ...results.years, "Total"],
      ["Nilai Investasi", ...results.years.map((y) => results.invByYear[y]?.nominal || 0), results.totalInvNominal],
      ["Nilai Investasi Saat Ini", ...results.years.map((y) => Math.round(results.invByYear[y]?.pv || 0)), Math.round(results.totalInvPV)],
      ["Nilai Manfaat", ...results.years.map((y) => Math.round(results.manfaatByYear[y]?.nominal || 0)), Math.round(results.totalManfaatNominal)],
      ["Nilai Manfaat Saat Ini", ...results.years.map((y) => Math.round(results.manfaatByYear[y]?.pv || 0)), Math.round(results.totalManfaatPV)],
      ["Rasio SROI", ...results.years.map(() => ""), isFinite(results.ratio) ? Number(results.ratio.toFixed(2)) : "-"],
    ];
    const basisText = (r, k) => {
      const m = ASSUMPTION_META[k];
      if (!r[k + "HelperOn"]) return "Input manual";
      return `${m.labelA}=${r[m.fieldA]}; ${m.labelB}=${r[m.fieldB]} → ${m.formula}`;
    };
    const detail = rows.map((r, i) => {
      const c = results.perRow[i];
      return {
        Bidang: r.bidang, "Pemangku Kepentingan": r.stakeholder, Outcome: r.outcome,
        Tahun: r.tahun, "Durasi (thn)": r.durasi,
        Kuantitas: r.quantity, "Proxy Nilai (Rp/unit)": r.proxy,
        "Deadweight (%)": r.deadweight, "Basis Deadweight": basisText(r, "deadweight"),
        "Atribusi (%)": r.attribution, "Basis Atribusi": basisText(r, "attribution"),
        "Displacement (%)": r.displacement, "Basis Displacement": basisText(r, "displacement"),
        "Drop-off (%)": r.dropoff, "Basis Drop-off": basisText(r, "dropoff"),
        "Nilai Bersih (Rp)": Math.round(c.netY1), "Total PV (Rp)": Math.round(c.totalPV),
        "Sumber/Verifikasi": r.evidence,
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invSheet), "Rincian Investasi");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ratioSheet), "Tabel Rasio SROI");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Detail Outcome");
    const draftSheet = generateLaporanText().split("\n").map((line) => [line]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(draftSheet), "Draft Laporan");
    XLSX.writeFile(wb, "SROI_" + (programName || "program").replace(/\s+/g, "_") + ".xlsx");
  };

  const ratioColor = !isFinite(results.ratio) ? T.textFaint : results.ratio >= 1 ? T.sage : T.rust;
  const outcomeChartData = rows.map((r, i) => ({ name: (r.outcome || ("Outcome " + (i + 1))).slice(0, 16), pv: Math.round(results.perRow[i]?.totalPV || 0) }));
  const bidangChartData = Object.entries(results.byBidang).map(([k, v]) => ({ name: k.length > 14 ? k.slice(0, 14) + "…" : k, pv: Math.round(v) }));

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: T.sans, minHeight: "100vh" }} className="w-full">
      <style>{`
        .sroi-input { background: ${T.panelAlt}; border: 1px solid ${T.border}; color: ${T.text}; font-family: ${T.mono}; border-radius: 4px; padding: 6px 8px; font-size: 13px; width: 100%; outline: none; }
        .sroi-input:focus { border-color: ${T.gold}; }
        .sroi-input::placeholder { color: ${T.textFaint}; font-family: ${T.sans}; }
        .sroi-select { background: ${T.panelAlt}; border: 1px solid ${T.border}; color: ${T.text}; font-family: ${T.sans}; border-radius: 4px; padding: 6px 8px; font-size: 12.5px; width: 100%; outline: none; }
        .sroi-select:focus { border-color: ${T.gold}; }
        .sroi-label { font-family: ${T.sans}; font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; color: ${T.textMuted}; }
        .sroi-btn { background: transparent; border: 1px solid ${T.border}; color: ${T.text}; font-family: ${T.sans}; font-size: 12.5px; padding: 7px 12px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: border-color 0.15s; white-space: nowrap; }
        .sroi-btn:hover { border-color: ${T.gold}; }
        .sroi-btn-gold { background: ${T.gold}; color: #14171C; border: 1px solid ${T.gold}; font-weight: 600; }
        .sroi-btn-gold:hover { background: #d4b458; }
        .sroi-toggle { width: 34px; height: 19px; border-radius: 10px; position: relative; cursor: pointer; transition: background 0.15s; }
        .sroi-table { width: 100%; border-collapse: collapse; font-family: ${T.mono}; font-size: 11.5px; }
        .sroi-table th, .sroi-table td { border: 1px solid ${T.borderSoft}; padding: 6px 8px; text-align: right; white-space: nowrap; }
        .sroi-table th:first-child, .sroi-table td:first-child { text-align: left; font-family: ${T.sans}; color: ${T.textMuted}; white-space: normal; }
        .sroi-table thead th { color: ${T.gold}; font-family: ${T.sans}; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; }
        .sroi-table tfoot td { font-weight: 600; }

        * { box-sizing: border-box; }
        .flex { display: flex; } .flex-col { flex-direction: column; } .flex-wrap { flex-wrap: wrap; }
        .items-baseline { align-items: baseline; } .items-center { align-items: center; }
        .justify-between { justify-content: space-between; } .justify-center { justify-content: center; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .grid-cols-\\[70px_1fr_28px\\] { grid-template-columns: 70px 1fr 28px; }
        .grid-cols-\\[90px_1fr_120px_28px\\] { grid-template-columns: 90px 1fr 120px 28px; }
        .h-fit { height: fit-content; } .w-full { width: 100%; }
        .self-start { align-self: flex-start; } .cursor-pointer { cursor: pointer; }
        .overflow-x-auto { overflow-x: auto; }
        .gap-1 { gap: 4px; } .gap-1\\.5 { gap: 6px; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; } .gap-5 { gap: 20px; } .gap-6 { gap: 24px; }
        .gap-x-6 { column-gap: 24px; } .gap-y-1 { row-gap: 4px; }
        .mt-1 { margin-top: 4px; } .mt-3 { margin-top: 12px; } .mt-4 { margin-top: 16px; }
        .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
        .my-3 { margin-top: 12px; margin-bottom: 12px; }
        .px-5 { padding-left: 20px; padding-right: 20px; } .py-6 { padding-top: 24px; padding-bottom: 24px; }
        @media (min-width: 640px) {
          .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (min-width: 768px) { .md\\:px-10 { padding-left: 40px; padding-right: 40px; } }
        @media (min-width: 1024px) {
          .lg\\:grid-cols-\\[1fr_320px\\] { grid-template-columns: 1fr 320px; }
          .lg\\:sticky { position: sticky; } .lg\\:top-6 { top: 24px; }
        }
      `}</style>

      <div style={{ borderBottom: `1px solid ${T.border}` }} className="px-5 md:px-10 py-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 24, letterSpacing: "-0.01em" }}>Instrumen SROI</div>
            <div className="sroi-label mt-1">Social Return on Investment · Kalkulator Universal Program PPM</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="sroi-btn" onClick={loadExample}><IconSparkles size={13} /> Contoh Kasus</button>
            <button className="sroi-btn" onClick={() => setLoadOpen(true)}><IconFolder size={13} /> Muat</button>
            <button className="sroi-btn" onClick={() => setSaveOpen(true)}><IconSave size={13} /> Simpan</button>
            <button className="sroi-btn" onClick={openReport}><IconFileText size={13} /> Generate Laporan</button>
            <button className="sroi-btn sroi-btn-gold" onClick={exportExcel}><IconDownload size={13} /> Excel</button>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-10 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nama Program">
                <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. BUMDesa Berkah Mulia" value={programName} onChange={(e) => setProgramName(e.target.value)} />
              </Field>
              <Field label="Site / Lokasi">
                <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. Kintap" value={site} onChange={(e) => setSite(e.target.value)} />
              </Field>
              <Field label="Mode Analisis" help="mode" helpKey={helpKey} setHelpKey={setHelpKey}>
                <select className="sroi-select" value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)}>
                  <option value="evaluation">Evaluation (retrospektif)</option>
                  <option value="forecast">Forecast (proyeksi)</option>
                </select>
              </Field>
              <Field label="Discount Rate (%/thn)" help="discount" helpKey={helpKey} setHelpKey={setHelpKey}>
                <input type="number" className="sroi-input" placeholder="0" value={discountRate || ""} onChange={(e) => setDiscountRate(e.target.value)} />
              </Field>
            </div>
            <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 11.5, color: T.textFaint }}>
              Tahun acuan (nilai saat ini): <span style={{ color: T.gold }}>{referenceYear}</span> — otomatis dari mode {analysisMode === "evaluation" ? "Evaluation (tahun terbaru)" : "Forecast (tahun awal)"}
            </div>
            <div className="mt-3">
              <Field label="Analisis Sensitivitas" help="sensitivity" helpKey={helpKey} setHelpKey={setHelpKey}>
                <div className="flex items-center gap-2">
                  <div className="sroi-toggle" style={{ background: sensitivityOn ? T.gold : T.border }} onClick={() => setSensitivityOn((v) => !v)}>
                    <div style={{ position: "absolute", top: 2, left: sensitivityOn ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: T.bg, transition: "left 0.15s" }} />
                  </div>
                  <input type="number" disabled={!sensitivityOn} className="sroi-input" style={{ opacity: sensitivityOn ? 1 : 0.4, maxWidth: 100 }} value={sensitivitySpread} onChange={(e) => setSensitivitySpread(e.target.value)} placeholder="± %" />
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.gold }}>RINCIAN INVESTASI / KEGIATAN</div>
              <span style={{ fontSize: 11, color: T.textFaint }}>Boleh banyak item per tahun</span>
            </div>
            <div className="flex flex-col gap-2">
              {investmentItems.map((t) => (
                <div key={t.id} className="grid grid-cols-[90px_1fr_120px_28px] gap-2 items-center">
                  <input type="number" min="1" className="sroi-input" placeholder="Thn" value={t.tahun || ""} onChange={(e) => updateInvItem(t.id, "tahun", e.target.value)} />
                  <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="Nama kegiatan" value={t.nama} onChange={(e) => updateInvItem(t.id, "nama", e.target.value)} />
                  <input type="number" className="sroi-input" placeholder="Biaya (Rp)" value={t.biaya || ""} onChange={(e) => updateInvItem(t.id, "biaya", e.target.value)} />
                  <button onClick={() => removeInvItem(t.id)} style={{ color: T.textFaint }}><IconTrash size={13} /></button>
                </div>
              ))}
            </div>
            <button className="sroi-btn mt-3" onClick={addInvItem}><IconPlus size={12} /> Tambah Item</button>
            <div style={{ borderTop: `1px solid ${T.borderSoft}`, marginTop: 12, paddingTop: 10 }} className="flex flex-wrap gap-x-6 gap-y-1">
              <div style={{ fontFamily: T.mono, fontSize: 12 }}><span style={{ color: T.textFaint }}>Nominal: </span>{fmtRp(results.totalInvNominal)}</div>
              <div style={{ fontFamily: T.mono, fontSize: 12 }}><span style={{ color: T.textFaint }}>Present Value ({referenceYear}): </span><span style={{ color: T.gold }}>{fmtRp(results.totalInvPV)}</span></div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {rows.map((row, idx) => {
              const calc = results.perRow[idx];
              return (
                <Card key={row.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.gold }}>OUTCOME {String(idx + 1).padStart(2, "0")}</div>
                    <button onClick={() => removeRow(row.id)} style={{ color: T.textFaint }}><IconTrash size={14} /></button>
                  </div>

                  <Field label="Bidang PPM">
                    <select className="sroi-select" value={row.bidang} onChange={(e) => updateRow(row.id, "bidang", e.target.value)}>
                      {BIDANG_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                    <Field label="Pemangku Kepentingan">
                      <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. Warga Ring-1" value={row.stakeholder} onChange={(e) => updateRow(row.id, "stakeholder", e.target.value)} />
                    </Field>
                    <Field label="Deskripsi Outcome">
                      <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. Peningkatan pendapatan UMKM tahun 2024" value={row.outcome} onChange={(e) => updateRow(row.id, "outcome", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <Field label="Tahun" help="tahun" helpKey={helpKey} setHelpKey={setHelpKey}>
                      <input type="number" className="sroi-input" placeholder={String(thisYear)} value={row.tahun || ""} onChange={(e) => updateRow(row.id, "tahun", e.target.value)} />
                    </Field>
                    <Field label="Kuantitas"><input type="number" className="sroi-input" placeholder="0" value={row.quantity || ""} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} /></Field>
                    <Field label="Proxy Nilai (Rp/unit)"><input type="number" className="sroi-input" placeholder="0" value={row.proxy || ""} onChange={(e) => updateRow(row.id, "proxy", e.target.value)} /></Field>
                    <Field label="Durasi (thn)" help="durasi" helpKey={helpKey} setHelpKey={setHelpKey}>
                      <input type="number" min="1" className="sroi-input" placeholder="1" value={row.durasi || ""} onChange={(e) => updateRow(row.id, "durasi", e.target.value)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {["deadweight", "attribution", "displacement", "dropoff"].map((k) => (
                      <AssumptionField key={k} metaKey={k} row={row} updateRow={updateRow} updateAssumption={updateAssumption} helpKey={helpKey} setHelpKey={setHelpKey} />
                    ))}
                  </div>

                  <Field label="Sumber / Verifikasi Data">
                    <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. survei before-after, laporan mitra, data BPS" value={row.evidence} onChange={(e) => updateRow(row.id, "evidence", e.target.value)} />
                  </Field>

                  <div style={{ borderTop: `1px solid ${T.borderSoft}`, marginTop: 12, paddingTop: 10 }} className="flex flex-wrap gap-x-6 gap-y-1">
                    <div style={{ fontFamily: T.mono, fontSize: 12 }}><span style={{ color: T.textFaint }}>Nilai Bersih: </span>{fmtRp(calc.netY1)}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 12 }}><span style={{ color: T.textFaint }}>PV Total: </span><span style={{ color: T.sage }}>{fmtRp(calc.totalPV)}</span></div>
                  </div>
                </Card>
              );
            })}
            <button className="sroi-btn self-start" onClick={addRow}><IconPlus size={13} /> Tambah Outcome</button>
          </div>

          <Card>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.gold, marginBottom: 10 }}>TABEL RASIO SROI {analysisMode === "evaluation" ? "EVALUATION" : "FORECAST"}</div>
            <div className="overflow-x-auto">
              <table className="sroi-table">
                <thead>
                  <tr><th>Komponen</th>{results.years.map((y) => <th key={y}>{y}</th>)}<th>Total</th></tr>
                </thead>
                <tbody>
                  <tr><td>Nilai Investasi</td>{results.years.map((y) => <td key={y}>{fmtRp(results.invByYear[y]?.nominal || 0)}</td>)}<td>{fmtRp(results.totalInvNominal)}</td></tr>
                  <tr><td>Nilai Investasi Saat Ini</td>{results.years.map((y) => <td key={y}>{fmtRp(results.invByYear[y]?.pv || 0)}</td>)}<td>{fmtRp(results.totalInvPV)}</td></tr>
                  <tr><td>Nilai Manfaat</td>{results.years.map((y) => <td key={y}>{fmtRp(results.manfaatByYear[y]?.nominal || 0)}</td>)}<td>{fmtRp(results.totalManfaatNominal)}</td></tr>
                  <tr><td>Nilai Manfaat Saat Ini</td>{results.years.map((y) => <td key={y}>{fmtRp(results.manfaatByYear[y]?.pv || 0)}</td>)}<td>{fmtRp(results.totalManfaatPV)}</td></tr>
                </tbody>
                <tfoot>
                  <tr><td>Rasio SROI</td>{results.years.map((y) => <td key={y}></td>)}<td style={{ color: ratioColor }}>1 : {isFinite(results.ratio) ? results.ratio.toFixed(2) : "-"}</td></tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setChartsOpen((v) => !v)}>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.gold }}>ANALISIS VISUAL</div>
              {chartsOpen ? <IconChevronUp size={14} color={T.textFaint} /> : <IconChevronDown size={14} color={T.textFaint} />}
            </div>
            {chartsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div><div className="sroi-label mb-2">PV per Outcome</div><MiniBarChart data={outcomeChartData} /></div>
                <div><div className="sroi-label mb-2">PV per Bidang PPM</div><MiniBarChart data={bidangChartData} /></div>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 h-fit flex flex-col gap-4">
          <Card center>
            <div className="sroi-label mb-4">Rasio SROI {analysisMode === "evaluation" ? "Evaluation" : "Forecast"}</div>
            <div style={{ width: 148, height: 148, borderRadius: "50%", border: `2.5px solid ${ratioColor}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: `1px solid ${T.borderSoft}` }} />
              <div style={{ fontFamily: T.serif, fontSize: 12, color: T.textMuted }}>1 :</div>
              <div style={{ fontFamily: T.mono, fontSize: 34, fontWeight: 600, color: ratioColor, lineHeight: 1.1 }}>{isFinite(results.ratio) ? results.ratio.toFixed(2) : "—"}</div>
            </div>
            {results.range && (
              <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, marginTop: 12 }}>
                Rentang: {isFinite(results.range.low) ? results.range.low.toFixed(2) : "—"} – {isFinite(results.range.high) ? results.range.high.toFixed(2) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: T.textMuted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              {isFinite(results.ratio) ? `Setiap Rp1 investasi (PV ${referenceYear}) menghasilkan Rp${results.ratio.toFixed(2)} nilai sosial.` : "Isi investasi & outcome untuk menghitung rasio."}
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3">
              <Row label="Investasi (Nominal)" value={fmtRp(results.totalInvNominal)} />
              <Row label={`Investasi (PV ${referenceYear})`} value={fmtRp(results.totalInvPV)} />
              <Row label="Total Manfaat (Nominal)" value={fmtRp(results.totalManfaatNominal)} />
              <Row label={`Total Manfaat (PV ${referenceYear})`} value={fmtRp(results.totalManfaatPV)} color={T.sage} />
              <div style={{ borderTop: `1px solid ${T.borderSoft}`, paddingTop: 10 }}>
                <Row label="Net Social Value" value={fmtRp(results.net)} color={results.net >= 0 ? T.sage : T.rust} />
              </div>
            </div>
          </Card>

          {programName && <div style={{ fontSize: 11, color: T.textFaint, fontFamily: T.mono, textAlign: "center" }}>{programName}{site ? ` — ${site}` : ""}</div>}
        </div>
      </div>

      {saveOpen && (
        <Modal onClose={() => setSaveOpen(false)}>
          <div className="sroi-label mb-2">Simpan Skenario</div>
          <input className="sroi-input" style={{ fontFamily: T.sans }} placeholder="mis. Kintap-UMKM-2026" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} autoFocus />
          <button className="sroi-btn sroi-btn-gold mt-3 w-full justify-center" onClick={saveScenario}>Simpan</button>
        </Modal>
      )}

      {loadOpen && (
        <Modal onClose={() => setLoadOpen(false)}>
          <div className="sroi-label mb-2">Muat Skenario</div>
          {savedList.length === 0 && <div style={{ fontSize: 12.5, color: T.textMuted }}>Belum ada skenario tersimpan.</div>}
          <div className="flex flex-col gap-2 mt-1">
            {savedList.map((name) => (
              <div key={name} onClick={() => loadScenario(name)} style={{ background: T.panelAlt, border: `1px solid ${T.borderSoft}`, borderRadius: 5, padding: "8px 10px", cursor: "pointer" }} className="flex items-center justify-between">
                <span style={{ fontFamily: T.mono, fontSize: 12.5 }}>{name}</span>
                <button onClick={(e) => deleteScenario(name, e)} style={{ color: T.textFaint }}><IconTrash size={12} /></button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {reportOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={() => setReportOpen(false)}>
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, width: 720, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily: T.serif, fontSize: 16 }}>Draft Laporan</div>
              <button onClick={() => setReportOpen(false)} style={{ color: T.textFaint }}><IconX size={16} /></button>
            </div>
            <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 8 }}>Bagian kuantitatif siap tempel; bagian kerangka simpulan/rekomendasi masih perlu narasi kualitatif dari lu.</div>
            <textarea readOnly value={reportText} style={{ flex: 1, minHeight: 320, background: T.panelAlt, border: `1px solid ${T.border}`, color: T.text, fontFamily: T.mono, fontSize: 11.5, padding: 12, borderRadius: 5, resize: "none", whiteSpace: "pre-wrap" }} />
            <button className="sroi-btn sroi-btn-gold mt-3 justify-center" onClick={copyReport}><IconCopy size={13} /> Salin ke Clipboard</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: T.panel, border: `1px solid ${T.gold}`, color: T.text, padding: "8px 16px", borderRadius: 6, fontSize: 12.5, fontFamily: T.sans, zIndex: 50, maxWidth: "90vw", textAlign: "center" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({ children, center }) {
  return <div style={{ background: T.panel, border: `1px solid ${T.borderSoft}`, borderRadius: 8 }} className={"p-4" + (center ? " flex flex-col items-center" : "")}>{children}</div>;
}
function Field({ label, children, help, helpKey, setHelpKey }) {
  return (
    <div>
      <div className="sroi-label mb-1 flex items-center gap-1">
        {label}
        {help && <button onClick={() => setHelpKey(helpKey === help ? null : help)} type="button"><IconInfo size={11} color={T.textFaint} /></button>}
      </div>
      {children}
      {help && helpKey === help && <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4, lineHeight: 1.4 }}>{FIELD_HELP[help]}</div>}
    </div>
  );
}
function AssumptionField({ metaKey, row, updateRow, updateAssumption, helpKey, setHelpKey }) {
  const meta = ASSUMPTION_META[metaKey];
  const helperOn = row[metaKey + "HelperOn"];
  return (
    <div style={{ background: T.panelAlt, border: `1px solid ${T.borderSoft}`, borderRadius: 5, padding: 8 }}>
      <div className="sroi-label mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1">{meta.label}
          <button type="button" onClick={() => setHelpKey(helpKey === metaKey ? null : metaKey)}><IconInfo size={11} color={T.textFaint} /></button>
        </span>
        <button type="button" onClick={() => updateRow(row.id, metaKey + "HelperOn", !helperOn)} style={{ fontSize: 9.5, color: helperOn ? T.gold : T.textFaint, textTransform: "none", letterSpacing: 0 }}>
          {helperOn ? "✓ dari data" : "hitung dari data"}
        </button>
      </div>
      {!helperOn ? (
        <input type="number" min="0" max="100" className="sroi-input" placeholder="0" value={row[metaKey] || ""} onChange={(e) => updateRow(row.id, metaKey, e.target.value)} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div><div style={{ fontSize: 9.5, color: T.textFaint, marginBottom: 2 }}>{meta.labelA}</div><input type="number" className="sroi-input" placeholder="0" value={row[meta.fieldA] || ""} onChange={(e) => updateAssumption(row.id, metaKey, meta.fieldA, e.target.value)} /></div>
          <div><div style={{ fontSize: 9.5, color: T.textFaint, marginBottom: 2 }}>{meta.labelB}</div><input type="number" className="sroi-input" placeholder="0" value={row[meta.fieldB] || ""} onChange={(e) => updateAssumption(row.id, metaKey, meta.fieldB, e.target.value)} /></div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.gold, marginTop: 2 }}>= {fmtNum1(row[metaKey])}%<span style={{ fontFamily: T.sans, color: T.textFaint, fontSize: 10, marginLeft: 6 }}>({meta.formula})</span></div>
        </div>
      )}
      {helpKey === metaKey && <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 5, lineHeight: 1.4 }}>{FIELD_HELP[metaKey]}</div>}
    </div>
  );
}
function Row({ label, value, color }) {
  return <div className="flex items-center justify-between"><span style={{ fontSize: 12, color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>{label}</span><span style={{ fontFamily: T.mono, fontSize: 13, color: color || T.text }}>{value}</span></div>;
}
function Modal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }} onClick={onClose}>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, width: 320, maxWidth: "90vw", position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, color: T.textFaint }}><IconX size={14} /></button>
        {children}
      </div>
    </div>
  );
}

export default SROICalculator;
