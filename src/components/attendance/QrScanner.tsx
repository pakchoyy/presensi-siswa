import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Volume2, VolumeX } from "lucide-react";

interface QrScannerProps {
  onScan: (studentId: number) => void;
  onClose: () => void;
  lastScanned?: { nama: string; status: string } | null;
}

const PREFIX = "PRESENSI:";

export function QrScanner({ onScan, onClose, lastScanned }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const cooldownRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(soundOn);
  const onScanRef = useRef(onScan);

  soundOnRef.current = soundOn;
  onScanRef.current = onScan;

  const playBeep = useCallback(() => {
    if (!soundOnRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
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
            if (!text.startsWith(PREFIX)) return;
            const id = parseInt(text.slice(PREFIX.length), 10);
            if (isNaN(id)) return;
            cooldownRef.current = true;
            playBeep();
            onScanRef.current(id);
            setTimeout(() => { cooldownRef.current = false; }, 1500);
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
        <Camera size={18} /> Arahkan ke kartu QR siswa
      </div>

      {error ? (
        <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-xl text-[0.8rem] text-center max-w-[320px]">
          {error}
        </div>
      ) : (
        <div id="qr-reader" className="w-[min(90vw,440px)] h-[min(90vw,440px)] rounded-xl overflow-hidden" />
      )}

      {lastScanned && (
        <div className="mt-4 bg-[#0ea5a0] text-white px-5 py-3 rounded-xl text-center animate-fade-in">
          <div className="text-[0.9rem] font-bold">{lastScanned.nama}</div>
          <div className="text-[0.75rem] opacity-90">{lastScanned.status}</div>
        </div>
      )}
    </div>
  );
}
