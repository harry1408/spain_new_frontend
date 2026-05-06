import React, { useState, useEffect, useRef, useCallback } from "react";
import { API } from "../App.jsx";
import { T } from "../components/shared.jsx";

const PROVINCES = ["valencia", "alicante", "castellon", "murcia"];

const STEPS = [
  { id: "links",       label: "Municipality Links",   desc: "Fetch municipality listing URLs" },
  { id: "html",        label: "Listing Pages",        desc: "Scrape all listing HTML pages" },
  { id: "listings",    label: "Individual Listings",  desc: "Extract listing details + unit table" },
  { id: "subflats",    label: "Sub-flat Details",     desc: "Scrape each sub-unit's detail page" },
  { id: "combine",     label: "Combine CSVs",         desc: "Merge sub-flat chunk files" },
  { id: "final_sheet", label: "Final Sheet",          desc: "Build final all-units xlsx" },
  { id: "merge",       label: "Merge to Main",        desc: "Append to province data sheet" },
  { id: "expired",     label: "Expired Listings",     desc: "Compute sold-outs + update expired sheet" },
];

function StepDot({ state }) {
  const base = {
    width: 24, height: 24, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0,
    transition: "all 0.3s",
  };
  if (state === "done")    return <div style={{ ...base, background: "#16A34A", color: "#fff" }}>✓</div>;
  if (state === "active")  return <div style={{ ...base, background: "#2563EB", color: "#fff", boxShadow: "0 0 0 4px rgba(37,99,235,0.25)" }}>…</div>;
  if (state === "skipped") return <div style={{ ...base, background: "#E5E7EB", color: "#9CA3AF", border: "1px dashed #D1D5DB" }}>–</div>;
  return <div style={{ ...base, background: T.bgStripe, color: T.textMuted, border: `1px solid ${T.border}` }}>·</div>;
}

export default function ScraperPage() {
  const [datadome, setDatadome]         = useState("");
  const [detecting, setDetecting]       = useState(false);
  const [detectMsg, setDetectMsg]       = useState("");
  const [provinces, setProvinces]       = useState(["valencia"]);
  const [allProvs, setAllProvs]         = useState(false);
  const [fromStep, setFromStep]         = useState("links");
  const [status, setStatus]             = useState(null);
  const [logs, setLogs]                 = useState([]);
  const [running, setRunning]           = useState(false);
  const logRef  = useRef(null);
  const esRef   = useRef(null);

  // auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // poll status while running
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/scraper/status`);
        const d = await r.json();
        setStatus(d);
        if (!d.running) { setRunning(false); }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [running]);

  // cleanup SSE on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  const connectSSE = useCallback(() => {
    esRef.current?.close();
    const es = new EventSource(`${API}/scraper/logs`);
    esRef.current = es;
    es.onmessage = (e) => {
      const msg = e.data;
      if (msg === "__ping__" || msg === "connected") return;
      if (msg === "__DONE__") { setRunning(false); return; }
      setLogs(l => {
        const next = [...l, msg];
        return next.length > 800 ? next.slice(-800) : next;
      });
    };
  }, []);

  const handleStart = async () => {
    const selected = allProvs ? PROVINCES : provinces;
    if (!selected.length) { alert("Select at least one province."); return; }

    // Always extract a fresh datadome cookie before starting
    setDetecting(true);
    setDetectMsg("Extracting DataDome cookie — browser window opening…");
    let dd = "";
    try {
      const r = await fetch(`${API}/scraper/datadome`);
      const d = await r.json();
      if (d.ok) {
        dd = d.datadome;
        setDatadome(dd);
        setDetectMsg("✓ Cookie extracted");
      } else {
        setDetectMsg("✗ " + d.error);
        setDetecting(false);
        return;
      }
    } catch (e) {
      setDetectMsg("✗ " + e.message);
      setDetecting(false);
      return;
    }
    setDetecting(false);

    setLogs([]);
    setStatus(null);
    connectSSE();
    setRunning(true);

    try {
      const r = await fetch(`${API}/scraper/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datadome: dd, provinces: selected, dev_type: "new", from_step: fromStep }),
      });
      const d = await r.json();
      if (!d.ok) {
        setLogs(l => [...l, `[ERROR] ${d.error}`]);
        setRunning(false);
      }
    } catch (e) {
      setLogs(l => [...l, `[ERROR] ${e.message}`]);
      setRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API}/scraper/stop`, { method: "POST" });
      setLogs(l => [...l, "[ABORT] Stop signal sent — waiting for current step to finish…"]);
    } catch (e) {
      setLogs(l => [...l, `[ERROR] ${e.message}`]);
    }
  };


  const toggleProv = (p) =>
    setProvinces(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);

  const fromStepIdx = STEPS.findIndex(s => s.id === fromStep);

  const getStepState = (prov, stepId) => {
    const thisIdx = STEPS.findIndex(s => s.id === stepId);
    if (thisIdx < fromStepIdx && !status?.running) return "skipped";
    if (!status) return "pending";
    if (status.steps_done?.includes(prov)) return thisIdx < fromStepIdx ? "skipped" : "done";
    const cur = status.step || "";
    if (cur === `${prov}:${stepId}`) return "active";
    if (cur.startsWith(`${prov}:`)) {
      const curIdx  = STEPS.findIndex(s => s.id === cur.split(":")[1]);
      if (thisIdx < curIdx) return thisIdx < fromStepIdx ? "skipped" : "done";
    }
    return thisIdx < fromStepIdx ? "skipped" : "pending";
  };

  const selectedProvs = allProvs ? PROVINCES : provinces;

  const logColor = (line) => {
    if (line.includes("ERROR") || line.includes("FAILED")) return "#FCA5A5";
    if (line.includes("COMPLETE") || line.includes("ALL PROVINCES DONE")) return "#34D399";
    if (line.includes(" OK") || line.includes("done") || line.includes("Merge complete")) return "#86EFAC";
    if (line.includes(">>")) return "#93C5FD";
    return "#D1FAE5";
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bgSection, padding: "32px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
            background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6,
            padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#991B1B",
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Admin Only · Hidden Page
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.navy, margin: "0 0 6px" }}>
            Idealista Scraper Pipeline
          </h1>
          <div style={{ fontSize: 12, color: T.textSub }}>
            Access via <code style={{ background: T.navyTint, padding: "1px 5px", borderRadius: 4 }}>#scraper</code> URL hash only.
            Runs 8-step scrape → builds monthly xlsx → merges into main data sheet → updates expired listings.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Left panel ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Start / Abort buttons */}
            {detectMsg && (
              <div style={{ fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 8,
                background: detectMsg.startsWith("✓") ? "#F0FDF4" : detectMsg.startsWith("✗") ? "#FEF2F2" : "#EFF6FF",
                color: detectMsg.startsWith("✓") ? "#16A34A" : detectMsg.startsWith("✗") ? "#DC2626" : "#2563EB",
                border: `1px solid ${detectMsg.startsWith("✓") ? "#BBF7D0" : detectMsg.startsWith("✗") ? "#FCA5A5" : "#BFDBFE"}` }}>
                {detectMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleStart}
                disabled={running || detecting || (!allProvs && !provinces.length)}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
                  background: (running || detecting) ? T.navyLight : T.navy,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: (running || detecting) ? "not-allowed" : "pointer",
                  opacity: (running || detecting) ? 0.65 : 1,
                  boxShadow: (running || detecting) ? "none" : T.shadowMd,
                  transition: "all 0.2s",
                }}>
                {detecting
                  ? "Extracting DataDome…"
                  : running
                    ? "Pipeline Running…"
                    : fromStep === "links"
                      ? "Start Pipeline"
                      : `Start from: ${STEPS.find(s => s.id === fromStep)?.label}`
                }
              </button>
              {running && (
                <button
                  onClick={handleStop}
                  style={{
                    padding: "14px 18px", borderRadius: 10,
                    border: "1px solid #FCA5A5",
                    background: "#FEF2F2", color: "#B91C1C",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s",
                  }}>
                  Abort
                </button>
              )}
            </div>

            {/* Development type */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                Development Type
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "new",  label: "New Builds", enabled: true },
                  { id: "buy",  label: "Buy",         enabled: false },
                  { id: "rent", label: "Rent",        enabled: false },
                ].map(({ id, label, enabled }) => (
                  <button key={id} disabled={!enabled} style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: `1px solid ${enabled ? T.navy : T.border}`,
                    background: enabled ? T.navy : T.bgStripe,
                    color: enabled ? "#fff" : T.textMuted,
                    fontSize: 12, fontWeight: 700,
                    cursor: enabled ? "default" : "not-allowed",
                    opacity: enabled ? 1 : 0.45,
                  }}>
                    {label}
                    {!enabled && <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>soon</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Province selection */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                Province
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                cursor: "pointer", fontSize: 13, fontWeight: 700, color: T.navy }}>
                <input type="checkbox" checked={allProvs}
                  onChange={e => setAllProvs(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: T.navy }} />
                All Provinces
              </label>
              <div style={{ height: 1, background: T.border, marginBottom: 12 }} />
              {PROVINCES.map(p => {
                const checked = allProvs || provinces.includes(p);
                return (
                  <label key={p} style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    cursor: allProvs ? "not-allowed" : "pointer",
                    opacity: allProvs ? 0.5 : 1, fontSize: 13, color: T.text,
                  }}>
                    <input type="checkbox" checked={checked} disabled={allProvs}
                      onChange={() => toggleProv(p)}
                      style={{ width: 15, height: 15, accentColor: T.navy,
                        cursor: allProvs ? "not-allowed" : "pointer" }} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                );
              })}
            </div>

            {/* Start from step */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                Start from Step
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {STEPS.map((s, i) => {
                  const active = fromStep === s.id;
                  return (
                    <button key={s.id} onClick={() => setFromStep(s.id)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 8, border: "none",
                      background: active ? T.navy : T.bgStripe,
                      color: active ? "#fff" : T.text,
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: active ? "rgba(255,255,255,0.2)" : T.navyTint,
                        color: active ? "#fff" : T.navy,
                        fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</span>
                      <span>
                        <span style={{ fontSize: 12, fontWeight: 600, display: "block" }}>{s.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {fromStep !== "links" && (
                <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6,
                  background: "#FEF9C3", border: "1px solid #FDE047",
                  fontSize: 10, color: "#713F12", lineHeight: 1.5 }}>
                  Steps 1–{STEPS.findIndex(s => s.id === fromStep)} will be skipped.
                  Make sure prior outputs already exist.
                </div>
              )}
            </div>


            {/* Status card */}
            {status && (
              <div style={{
                background: status.error ? "#FEF2F2" : status.aborted ? "#FFFBEB" : (status.running ? T.navyTint : "#F0FDF4"),
                border: `1px solid ${status.error ? "#FCA5A5" : status.aborted ? "#FDE047" : (status.running ? T.navyTint2 : "#86EFAC")}`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6,
                  color: status.error ? "#991B1B" : status.aborted ? "#92400E" : (status.running ? T.navy : "#166534") }}>
                  {status.error ? "Error" : status.aborted ? "Aborted" : status.running ? "Running" : "Completed"}
                </div>
                {status.error && (
                  <div style={{ fontSize: 11, color: "#991B1B", fontFamily: "monospace",
                    wordBreak: "break-all" }}>{status.error}</div>
                )}
                {status.step && !status.error && (
                  <div style={{ fontSize: 11, color: T.textSub }}>
                    Current: <strong>{status.step}</strong>
                  </div>
                )}
                {status.steps_done?.length > 0 && (
                  <div style={{ fontSize: 11, color: T.textSub, marginTop: 4 }}>
                    Done: {status.steps_done.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right panel ───────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Pipeline steps grid */}
            {selectedProvs.length > 0 && (
              <div style={{ background: "#fff", border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 20, boxShadow: T.shadow, overflowX: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
                  Pipeline Progress
                </div>

                {/* Step header */}
                <div style={{ display: "grid",
                  gridTemplateColumns: `120px repeat(${STEPS.length}, 1fr)`,
                  gap: 6, marginBottom: 8 }}>
                  <div />
                  {STEPS.map(s => (
                    <div key={s.id} style={{ textAlign: "center", fontSize: 9,
                      color: T.textMuted, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.3 }}>
                      {s.label}
                    </div>
                  ))}
                </div>

                {/* Province rows */}
                {selectedProvs.map(prov => (
                  <div key={prov} style={{ display: "grid",
                    gridTemplateColumns: `120px repeat(${STEPS.length}, 1fr)`,
                    gap: 6, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.navy,
                      textTransform: "capitalize" }}>{prov}</div>
                    {STEPS.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "center" }}>
                        <StepDot state={getStepState(prov, s.id)} />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 12,
                  paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  {[
                    { state: "skipped", label: "Skipped" },
                    { state: "pending", label: "Pending" },
                    { state: "active",  label: "In Progress" },
                    { state: "done",    label: "Done" },
                  ].map(({ state, label }) => (
                    <div key={state} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textSub }}>
                      <StepDot state={state} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step descriptions */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`,
              borderRadius: 12, padding: 20, boxShadow: T.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
                What Each Step Does
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {STEPS.map((s, i) => (
                  <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%",
                      background: T.navyTint, color: T.navy, fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.navy }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Log output */}
            <div style={{ background: "#0F172A", border: "1px solid #1E293B",
              borderRadius: 12, padding: 0, overflow: "hidden", boxShadow: T.shadowMd }}>
              {/* terminal title bar */}
              <div style={{ background: "#1E293B", padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#EF4444","#F59E0B","#10B981"].map(c => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                    ))}
                  </div>
                  <span style={{ color: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}>
                    scraper.log
                  </span>
                  {running && (
                    <span style={{ color: "#34D399", fontSize: 10, fontWeight: 700 }}>● LIVE</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {logs.length > 0 && (
                    <span style={{ color: "#475569", fontSize: 10 }}>{logs.length} lines</span>
                  )}
                  {logs.length > 0 && (
                    <button onClick={() => setLogs([])}
                      style={{ background: "none", border: "1px solid #374151",
                        color: "#94A3B8", fontSize: 10, padding: "2px 8px",
                        borderRadius: 4, cursor: "pointer" }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* log body */}
              <div ref={logRef}
                style={{ height: 420, overflowY: "auto", padding: "14px 16px",
                  fontFamily: "monospace", fontSize: 11, lineHeight: 1.8,
                  background: "#0F172A" }}>
                {logs.length === 0 ? (
                  <div style={{ color: "#334155" }}>
                    Waiting for pipeline to start…<br />
                    <span style={{ color: "#1E3A5F" }}>
                      {"> "}python id_home_scrap.py (managed via API)
                    </span>
                  </div>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} style={{ color: logColor(line), wordBreak: "break-all" }}>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
