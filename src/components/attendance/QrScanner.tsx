import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Volume2, VolumeX, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type ScanPayload = { studentId?: number; token?: string };

interface QrScannerProps {
  onScan: (payload: ScanPayload, status?: string) => void;
  onClose: () => void;
  lastScanned?: { nama: string; status: string } | null;
  pickerMode?: boolean;
}

const PREFIX = "PRESENSI:";

function parseQr(text: string): ScanPayload | null {
  const m = text.match(/\/s\/([a-zA-Z0-9-_]+)/);
  if (m) return { token: m[1] };
  if (text.startsWith(PREFIX)) {
    const id = parseInt(text.slice(PREFIX.length), 10);
    if (!isNaN(id)) return { studentId: id };
  }
  return null;
}

const STATUS_OPTIONS = [
  { code: "H", label: "Hadir", color: "#16a34a", icon: CheckCircle2 },
  { code: "T", label: "Terlambat", color: "#f59e0b", icon: Clock },
  { code: "S", label: "Sakit", color: "#ea580c", icon: AlertTriangle },
  { code: "I", label: "Izin", color: "#2563eb", icon: AlertTriangle },
  { code: "A", label: "Alpha", color: "#dc2626", icon: AlertTriangle },
];

export function QrScanner({ onScan, onClose, lastScanned, pickerMode = false }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [pendingScan, setPendingScan] = useState<ScanPayload | null>(null);
  const cooldownRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  const onScanRef = useRef(onScan);
  const pickerModeRef = useRef(pickerMode);

  soundOnRef.current = soundOn;
  onScanRef.current = onScan;
  pickerModeRef.current = pickerMode;

  const playBeep = useCallback(() => {
    if (!soundOnRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const makeTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };
      makeTone(880, now, 0.08);
      makeTone(1320, now + 0.07, 0.14);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const elementId = "qr-reader";
    let stopped = false;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        const viewport = Math.min(window.innerWidth, window.innerHeight) - 40;
        const boxSize = Math.min(viewport, 400);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: boxSize, height: boxSize } },
          (text) => {
            if (cooldownRef.current) return;
            const parsed = parseQr(text);
            if (!parsed) return;
            cooldownRef.current = true;
            playBeep();
            if (pickerModeRef.current) {
              // Tahan — tunggu guru pilih status
              setPendingScan(parsed);
            } else {
              onScanRef.current(parsed);
              setTimeout(() => { cooldownRef.current = false; }, 1500);
            }
          },
          () => {}
        );
      } catch (err: any) {
        if (stopped) return;
        const msg = err?.toString() || "";
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setError("Izinkan akses kamera untuk scan QR");
        } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
          setError("Kamera tidak ditemukan di perangkat ini");
        } else {
          setError("Gagal membuka kamera. Pastikan tidak ada aplikasi lain yang menggunakan kamera.");
        }
      }
    };

    startScanner();

    return () => {
      stopped = true;
      scannerRef.current?.stop().catch(() => {});
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [playBeep]);

  const pickStatus = (code: string) => {
    if (!pendingScan) return;
    onScanRef.current(pendingScan, code);
    setPendingScan(null);
    setTimeout(() => { cooldownRef.current = false; }, 500);
  };

  const cancelPick = () => {
    setPendingScan(null);
    cooldownRef.current = false;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      <div className="text-white text-[0.85rem] font-bold mb-3 flex items-center gap-2">
        <Camera size={18} /> {pendingScan ? "Pilih status siswa" : "Arahkan ke kartu QR siswa"}
      </div>

      {error ? (
        <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-xl text-[0.8rem] text-center max-w-[320px]">
          {error}
        </div>
      ) : (
        <div id="qr-reader" className={`w-[min(90vw,440px)] h-[min(90vw,440px)] rounded-xl overflow-hidden ${pendingScan ? "opacity-30" : ""}`} />
      )}

      {pendingScan && (
        <div className="absolute inset-x-0 bottom-0 bg-[var(--card-bg)] rounded-t-3xl p-4 pb-6 shadow-2xl animate-slide-up max-w-app mx-auto">
          <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-3" />
          <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-3">
            Pilih status presensi:
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {STATUS_OPTIONS.slice(0, 4).map((opt) => (
              <button
                key={opt.code}
                onClick={() => pickStatus(opt.code)}
                className="flex items-center justify-center gap-2 py-[14px] rounded-xl font-bold text-[0.9rem] cursor-pointer border-[2px] active:scale-95 transition-transform"
                style={{ borderColor: opt.color, color: opt.color, background: "transparent" }}
              >
                <opt.icon size={18} /> {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => pickStatus("A")}
            className="w-full flex items-center justify-center gap-2 py-[12px] rounded-xl font-bold text-[0.85rem] cursor-pointer border-[2px] active:scale-95 transition-transform mb-2"
            style={{ borderColor: "#dc2626", color: "#dc2626", background: "transparent" }}
          >
            <AlertTriangle size={16} /> Alpha
          </button>
          <button
            onClick={cancelPick}
            className="w-full py-[10px] rounded-xl text-[var(--text-light)] text-[0.78rem] cursor-pointer bg-transparent border-none"
          >
            Batal
          </button>
        </div>
      )}

      {!pendingScan && lastScanned && (
        <div className="mt-4 bg-[#0ea5a0] text-white px-5 py-3 rounded-xl text-center animate-fade-in">
          <div className="text-[0.9rem] font-bold">{lastScanned.nama}</div>
          <div className="text-[0.75rem] opacity-90">{lastScanned.status}</div>
        </div>
      )}
    </div>
  );
}
