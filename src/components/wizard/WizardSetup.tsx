import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { setupService, type SetupData } from "@/services/setup.service";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { Jenjang, Semester, HariAktif } from "@/types/enums";
import { APP_BRAND } from "@/lib/constants";
import { inisial, generateId } from "@/lib/utils";
import { School, User, Calendar, Users, Upload, Plus, Check, Clock } from "lucide-react";
import { ImportExcel } from "@/components/import/ImportExcel";

const WIZARD_TOTAL = 6;

export function WizardSetup() {
  const { refreshClassrooms } = useApp();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(20);

  const [sekolah, setSekolah] = useState("");
  const [jenjang, setJenjang] = useState<Jenjang>(Jenjang.SD);
  const [namaGuru, setNamaGuru] = useState("");
  const [email, setEmail] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [semester, setSemester] = useState<Semester>(Semester.GANJIL);
  const [namaKelas, setNamaKelas] = useState("");
  const [siswaList, setSiswaList] = useState<{ id: number; nama: string }[]>([]);
  const [siswaInput, setSiswaInput] = useState("");
  const [hariAktif, setHariAktif] = useState<HariAktif>(HariAktif.SENIN_SABTU);

  useEffect(() => {
    setProgress((step / WIZARD_TOTAL) * 100);
  }, [step]);

  const next = () => {
    if (step < WIZARD_TOTAL) {
      setStep((s) => s + 1);
    } else {
      selesaikan();
    }
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const skip = () => {
    if (step < WIZARD_TOTAL) {
      setStep((s) => s + 1);
    } else {
      selesaikan();
    }
  };

  const tambahSiswa = () => {
    const nama = siswaInput.trim();
    if (!nama) {
      toast("Isi nama siswa dulu ya");
      return;
    }
    setSiswaList((prev) => [...prev, { id: generateId(), nama }]);
    setSiswaInput("");
  };

  const selesaikan = async () => {
    localStorage.setItem("bgy_hari_aktif", hariAktif);

    const data: SetupData = {
      sekolah: sekolah || "Sekolahku",
      jenjang,
      namaGuru: namaGuru || "Guru",
      email: email || "guru@email.com",
      tahunAjaran: tahunAjaran || "2026/2027",
      semester,
      namaKelas: namaKelas || "Kelas 1A",
      siswa: siswaList.length > 0 ? siswaList.map((s) => ({ nama: s.nama })) : [{ nama: "Siswa Baru" }],
    };

    await setupService.executeSetup(data);
    await refreshClassrooms();
    toast("Setup selesai! Selamat mengajar");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-[10px] pb-0">
        <div className="h-[6px] bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)",
            }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-light)] mt-[6px] font-semibold text-center">
          Langkah {step} dari {WIZARD_TOTAL}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-5 px-4">
        {/* Step 1: Sekolah */}
        {step === 1 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <School size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Nama & Jenjang Sekolah</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Yuk kenalan dulu sama sekolahmu</div>
            <div className="mb-3">
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Nama Sekolah</label>
              <input
                type="text"
                value={sekolah}
                onChange={(e) => setSekolah(e.target.value)}
                placeholder="Contoh: SDN Sukamaju 01"
                className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Jenjang</label>
              <div className="grid grid-cols-3 gap-2 mb-[14px]">
                {[Jenjang.SD, Jenjang.SMP, Jenjang.SMA].map((j) => (
                  <button
                    key={j}
                    onClick={() => setJenjang(j)}
                    className={`py-[14px] px-[6px] rounded-[10px] border-[1.5px] font-bold text-[0.85rem] cursor-pointer ${
                      jenjang === j
                        ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                        : "border-[var(--border)] bg-[var(--input-bg)]"
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Guru */}
        {step === 2 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <User size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Data Guru</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Email dipakai untuk aktivasi PRO nanti</div>
            <div className="mb-3">
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Nama Guru</label>
              <input
                type="text"
                value={namaGuru}
                onChange={(e) => setNamaGuru(e.target.value)}
                placeholder="Contoh: Sari Wulandari, S.Pd"
                className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
              />
            </div>
          </div>
        )}

        {/* Step 3: Tahun Ajaran */}
        {step === 3 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <Calendar size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Tahun Ajaran</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Sudah kami deteksi otomatis, bisa diubah</div>
            <div className="mb-3">
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Tahun Ajaran</label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
              />
            </div>
            <div>
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Semester Aktif</label>
              <div className="grid grid-cols-2 gap-2">
                {[Semester.GANJIL, Semester.GENAP].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSemester(sem)}
                    className={`py-[14px] px-[6px] rounded-[10px] border-[1.5px] font-bold text-[0.85rem] cursor-pointer ${
                      semester === sem
                        ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                        : "border-[var(--border)] bg-[var(--input-bg)]"
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Kelas */}
        {step === 4 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <Users size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Kelas Pertama</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Kamu bisa tambah kelas lain nanti (PRO)</div>
            <div>
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Nama Kelas</label>
              <input
                type="text"
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
                placeholder="Contoh: Kelas 4B"
                className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
              />
            </div>
          </div>
        )}

        {/* Step 5: Siswa */}
        {step === 5 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <Upload size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Daftar Siswa</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Import Excel atau isi manual</div>

            <ImportExcel
              kelasId={0}
              existingCount={siswaList.length}
              onImport={async (result) => {
                const newSiswa = result.students.map((s, i) => ({
                  id: generateId() + i,
                  nama: s.nama,
                }));
                setSiswaList((prev) => [...prev, ...newSiswa]);
              }}
            />

            <div className="mt-4 mb-3">
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Atau tambah manual</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={siswaInput}
                  onChange={(e) => setSiswaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tambahSiswa()}
                  placeholder="Nama siswa"
                  className="flex-1 px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
                />
                <button
                  onClick={tambahSiswa}
                  className="w-auto flex-none px-[14px] py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer flex items-center justify-center gap-[6px]"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            <div>
              {siswaList.length === 0 ? (
                <div className="text-center py-[30px] px-[10px] text-[var(--text-light)] text-[0.8rem]">
                  Belum ada siswa ditambahkan
                </div>
              ) : (
                siswaList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-[10px] px-3 py-[11px] rounded-[10px] bg-[var(--input-bg)] mb-2 border-l-4"
                    style={{ borderLeftColor: "#16a34a" }}
                  >
                    <div
                      className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-[0.78rem] flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                    >
                      {inisial(s.nama)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.86rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis">{s.nama}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 6: Hari Aktif */}
        {step === 6 && (
          <div>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
              <Clock size={26} />
            </div>
            <div className="text-[1.05rem] font-extrabold text-center mb-1">Hari Aktif Sekolah</div>
            <div className="text-[0.78rem] text-[var(--text-light)] text-center mb-5">Pilih hari masuk sekolahmu</div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setHariAktif(HariAktif.SENIN_JUMAT)}
                className={`p-4 rounded-[12px] border-[1.5px] text-center cursor-pointer ${
                  hariAktif === HariAktif.SENIN_JUMAT
                    ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.08)]"
                    : "border-[var(--border)] bg-[var(--input-bg)]"
                }`}
              >
                <div className={`text-[1.2rem] font-extrabold mb-1 ${hariAktif === HariAktif.SENIN_JUMAT ? "text-[#0ea5a0]" : "text-[var(--text)]"}`}>
                  Senin - Jumat
                </div>
                <div className="text-[0.7rem] text-[var(--text-light)]">
                  5 hari sekolah<br />Sabtu & Minggu libur
                </div>
              </button>
              <button
                onClick={() => setHariAktif(HariAktif.SENIN_SABTU)}
                className={`p-4 rounded-[12px] border-[1.5px] text-center cursor-pointer ${
                  hariAktif === HariAktif.SENIN_SABTU
                    ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.08)]"
                    : "border-[var(--border)] bg-[var(--input-bg)]"
                }`}
              >
                <div className={`text-[1.2rem] font-extrabold mb-1 ${hariAktif === HariAktif.SENIN_SABTU ? "text-[#0ea5a0]" : "text-[var(--text)]"}`}>
                  Senin - Sabtu
                </div>
                <div className="text-[0.7rem] text-[var(--text-light)]">
                  6 hari sekolah<br />Minggu libur
                </div>
              </button>
            </div>

            <div className="bg-[var(--input-bg)] rounded-lg p-3 text-[0.72rem] text-[var(--text-light)]">
              Bisa diubah kapan saja di menu <b>Pengaturan</b>. Hari non-aktif tidak akan masuk presensi.
            </div>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-app lg:relative lg:left-auto lg:bottom-auto lg:translate-x-0 lg:max-w-full lg:mt-auto bg-[var(--card-bg)] border-t border-[var(--border)] px-4 py-3 z-[290]">
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={back}
              className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
            >
              Kembali
            </button>
          )}
          <button
            onClick={skip}
            className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
          >
            Lewati
          </button>
          <button
            onClick={next}
            className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            {step === WIZARD_TOTAL ? (
              <>
                <Check size={16} /> Selesai
              </>
            ) : (
              "Lanjut"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
