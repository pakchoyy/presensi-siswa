import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatTanggalPanjang } from "@/lib/utils";

type Info = {
  student: { id: number; nama: string; nisn?: string };
  kelas: { id: number; nama: string };
  tanggal: string;
  existingStatus: string | null;
};

const LABEL: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", T: "Terlambat" };

export function AbsenSiswaPage({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setErr("Link tidak valid"); setLoading(false); return; }
    fetch(`/api/absen?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Gagal");
        setInfo(j);
        if (j.existingStatus) setDone(j.existingStatus);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (status: string) => {
    setSubmitting(status);
    try {
      const r = await fetch("/api/absen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal");
      setDone(status);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal";
      setErr(msg);
      setTimeout(() => setErr(""), 3000);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
        <div className="text-white font-bold">Memuat...</div>
      </div>
    );
  }

  if (err && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
          <AlertTriangle className="mx-auto text-[#dc2626] mb-2" size={32} />
          <div className="font-bold text-[#1e293b]">{err}</div>
          <div className="text-sm text-[#64748b] mt-1">Hubungi wali kelas untuk link baru</div>
        </div>
      </div>
    );
  }

  const isDone = !!done;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}>
            <CheckCircle2 size={28} />
          </div>
          <div className="font-extrabold text-[#1e293b] text-[1.05rem]">{info?.student.nama}</div>
          <div className="text-sm text-[#64748b]">{info?.kelas.nama} • {info ? formatTanggalPanjang(info.tanggal) : ""}</div>
        </div>

        {err && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700 text-center mb-3">{err}</div>}

        {isDone ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="font-bold text-[#16a34a]">Absen tercatat — {LABEL[done!] || done}</div>
            <div className="text-xs text-[#64748b] mt-1">Sudah absen hari ini. Bisa ubah di bawah jika salah.</div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            { k: "H", label: "Hadir", color: "#16a34a" },
            { k: "T", label: "Terlambat", color: "#f59e0b" },
            { k: "S", label: "Sakit", color: "#b45309" },
            { k: "I", label: "Izin", color: "#1d4ed8" },
          ].map((b) => (
            <button
              key={b.k}
              disabled={!!submitting}
              onClick={() => submit(b.k)}
              className="py-4 rounded-xl border-[1.5px] font-bold text-sm flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
              style={{ borderColor: b.color, color: b.color, background: done === b.k ? `${b.color}15` : "#f8fafc" }}
            >
              {b.k === "T" ? <Clock size={20} /> : <CheckCircle2 size={20} />}
              {submitting === b.k ? "Menyimpan..." : b.label}
            </button>
          ))}
        </div>
        <div className="text-center text-xs text-[#94a3b8] mt-4">Link ini pribadi, jangan dishare ke teman</div>
      </div>
    </div>
  );
}
