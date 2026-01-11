import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Video, 
  PlusCircle, 
  Send, 
  Loader2, 
  BookOpen, 
  Layout, 
  CheckCircle,
  FileDown,
  User,
  School,
  Clock,
  Book,
  Bookmark
} from 'lucide-react';

const apiKey = ""; // API Key otomatis

const App = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [videoLinks, setVideoLinks] = useState([]);
  const [error, setError] = useState(null);

  // State untuk Identitas Pembelajaran
  const [identitas, setIdentitas] = useState({
    namaGuru: "Abu Rizal Bakri, S.Kom",
    asalSekolah: "SMAIT Cordova",
    mataPelajaran: "Informatika",
    kelasFase: "XI / F",
    materiPokok: "",
    alokasiWaktu: "2 JP (2 x 45 Menit)",
    tahunPelajaran: "2025/2026"
  });

  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js";
    script2.async = true;
    document.body.appendChild(script2);
  }, []);

  const handleIdentitasChange = (e) => {
    const { name, value } = e.target;
    setIdentitas(prev => ({ ...prev, [name]: value }));
  };

  const generateContent = async () => {
    if (!prompt && !identitas.materiPokok) return;
    setLoading(true);
    setError(null);
    setGeneratedContent(null);
    setVideoLinks([]);

    const combinedPrompt = `Mata Pelajaran: ${identitas.mataPelajaran}. Materi Pokok: ${identitas.materiPokok}. Instruksi Tambahan: ${prompt}`;

    const systemPrompt = `
      Anda adalah pakar kurikulum merdeka Indonesia. Buat RPP & Modul Ajar SMAIT Cordova.
      Gunakan data identitas berikut, namun jangan tulis ulang bagian Identitas di jawaban Anda karena sistem sudah memilikinya.
      Mata Pelajaran: ${identitas.mataPelajaran}
      Materi Pokok: ${identitas.materiPokok}

      Gunakan format sangat rapi:
      # RENCANA PELAKSANAAN PEMBELAJARAN (RPP)
      B. Capaian Pembelajaran
      C. Tujuan Pembelajaran
      D. Profil Pelajar Pancasila
      E. Media & Sarana
      F. Langkah Pembelajaran (Discovery Learning: Stimulasi, Identifikasi, Pengumpulan Data, Pengolahan, Verifikasi, Generalisasi)
      G. Penilaian
      H. LKPD Terdiferensiasi
      
      Bahasa: Indonesia Formal.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combinedPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ "google_search": {} }]
        })
      });

      if (!response.ok) throw new Error('Gagal menghubungi AI.');
      
      const resultData = await response.json();
      const text = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
      const groundings = resultData.candidates?.[0]?.groundingMetadata?.groundingAttributions?.map(a => ({
        uri: a.web?.uri,
        title: a.web?.title
      })) || [];

      setGeneratedContent(text);
      setVideoLinks(groundings.filter(l => l.uri.includes('youtube') || l.uri.includes('video')));
      setActiveTab('output');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!window.jspdf) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = 20;

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RENCANA PELAKSANAAN PEMBELAJARAN (RPP)", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 6;
    doc.setFontSize(11);
    doc.text(`${identitas.asalSekolah.toUpperCase()} - TAHUN PELAJARAN ${identitas.tahunPelajaran}`, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 4;
    doc.setLineWidth(0.5);
    doc.line(20, cursorY, pageWidth - 20, cursorY);
    cursorY += 10;

    // Section A: Identitas Table (PDF)
    doc.setFontSize(10);
    doc.text("A. Identitas Pembelajaran", 20, cursorY);
    cursorY += 2;
    
    const identitasData = [
      ["Nama Penyusun", `: ${identitas.namaGuru}`],
      ["Satuan Pendidikan", `: ${identitas.asalSekolah}`],
      ["Mata Pelajaran", `: ${identitas.mataPelajaran}`],
      ["Kelas / Fase", `: ${identitas.kelasFase}`],
      ["Materi Pokok", `: ${identitas.materiPokok}`],
      ["Alokasi Waktu", `: ${identitas.alokasiWaktu}`],
      ["Tahun Pelajaran", `: ${identitas.tahunPelajaran}`]
    ];

    doc.autoTable({
      startY: cursorY + 2,
      body: identitasData,
      theme: 'plain',
      styles: { cellPadding: 1, fontSize: 10, font: "helvetica" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 120 } },
      margin: { left: 25 }
    });

    cursorY = doc.lastAutoTable.finalY + 10;

    // Content Sections
    if (generatedContent) {
      const lines = generatedContent.split('\n');
      lines.forEach(line => {
        const clean = line.replace(/[#*]/g, '').trim();
        if (!clean || clean.toLowerCase().includes("rincian pelaksanaan") || clean.includes("Identitas")) return;

        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }

        if (/^[B-Z]\./.test(clean)) {
          doc.setFont("helvetica", "bold");
          doc.text(clean, 20, cursorY);
          cursorY += 7;
        } else {
          doc.setFont("helvetica", "normal");
          const splitText = doc.splitTextToSize(clean, pageWidth - 45);
          doc.text(splitText, 25, cursorY);
          cursorY += (splitText.length * 5) + 2;
        }
      });
    }

    // Tanda Tangan
    if (cursorY > 240) doc.addPage(); cursorY = doc.internal.pageSize.getHeight() - 50;
    doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", 25, cursorY);
    doc.text("Tangerang, " + new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}), pageWidth - 85, cursorY);
    cursorY += 6;
    doc.text("Kepala SMAIT CORDOVA", 25, cursorY);
    doc.text("Guru Mata Pelajaran", pageWidth - 85, cursorY);
    cursorY += 25;
    doc.setFont("helvetica", "bold");
    doc.text("Nahroji, S.Pd.i", 25, cursorY);
    doc.text(identitas.namaGuru, pageWidth - 85, cursorY);

    doc.save(`RPP_${identitas.materiPokok.replace(/\s/g, '_') || 'Tanpa_Judul'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-indigo-800 text-white px-8 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Section with SVG for Guaranteed Visibility */}
            <div className="bg-white p-1 rounded-lg shadow-inner flex items-center justify-center w-14 h-14 overflow-hidden">
               <svg viewBox="0 0 100 100" className="w-10 h-10 text-indigo-800">
                  <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="4" />
                  <text x="50" y="55" fontSize="12" fontWeight="bold" textAnchor="middle" fill="currentColor">CORDOVA</text>
                  <circle cx="50" cy="35" r="5" fill="currentColor" />
               </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-tight">RPP Assistant <span className="text-indigo-300">Plus</span></h1>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">SMAIT Cordova Digital System</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-indigo-900/40 px-4 py-2 rounded-2xl border border-indigo-700">
             <div className="text-right">
                <p className="text-xs font-bold text-white leading-none">{identitas.namaGuru}</p>
                <p className="text-[10px] text-indigo-300 mt-1 uppercase font-medium">{identitas.asalSekolah}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white border-2 border-indigo-400">AR</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-12 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <PlusCircle size={18} className="text-indigo-600" />
              Identitas Pembelajaran
            </h2>
            
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" name="namaGuru" value={identitas.namaGuru} onChange={handleIdentitasChange}
                  placeholder="Nama Guru"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="relative group">
                <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" name="asalSekolah" value={identitas.asalSekolah} onChange={handleIdentitasChange}
                  placeholder="Asal Sekolah"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="relative group">
                <Bookmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" name="mataPelajaran" value={identitas.mataPelajaran} onChange={handleIdentitasChange}
                  placeholder="Mata Pelajaran"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" name="kelasFase" value={identitas.kelasFase} onChange={handleIdentitasChange}
                    placeholder="Kelas / Fase"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input 
                    type="text" name="alokasiWaktu" value={identitas.alokasiWaktu} onChange={handleIdentitasChange}
                    placeholder="Alokasi Waktu"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="relative group">
                <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" name="materiPokok" value={identitas.materiPokok} onChange={handleIdentitasChange}
                  placeholder="Materi Pokok (Wajib Isi)"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-indigo-50/50 border border-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-bold text-indigo-900"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Instruksi Khusus AI (Opsional)</label>
              <textarea 
                className="w-full h-24 p-4 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-500 outline-none transition-all resize-none text-xs leading-relaxed"
                placeholder="Misal: Fokuskan pada diskusi kelompok..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button 
              onClick={generateContent}
              disabled={loading || !identitas.materiPokok}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? "AI sedang menyusun..." : "Hasilkan RPP Sekarang"}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-7">
          {!generatedContent && !loading ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <FileText size={48} className="opacity-20" />
              </div>
              <h3 className="text-slate-600 font-bold mb-1">Preview Belum Siap</h3>
              <p className="text-xs max-w-[250px] leading-relaxed">Silakan isi Materi Pokok terlebih dahulu untuk menjana RPP dalam tabel identitas yang rapi.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="px-8 py-4 bg-slate-900 flex justify-between items-center">
                  <span className="text-white text-xs font-black uppercase tracking-widest">Preview Dokumen</span>
                  <button 
                    onClick={exportPDF}
                    className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                  >
                    <FileDown size={16} /> Unduh PDF
                  </button>
                </div>

                <div className="p-10 overflow-y-auto max-h-[650px] bg-white">
                  {loading ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-8 bg-slate-100 rounded w-3/4 mx-auto mb-12"></div>
                      <div className="h-4 bg-slate-100 rounded w-1/4 mb-4"></div>
                      <div className="h-40 bg-slate-100 rounded w-full"></div>
                    </div>
                  ) : (
                    <div className="font-serif prose prose-slate max-w-none">
                      <h1 className="text-center text-xl font-black text-slate-900 uppercase mb-1">RENCANA PELAKSANAAN PEMBELAJARAN (RPP)</h1>
                      <p className="text-center text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider">{identitas.asalSekolah} - TAHUN PELAJARAN {identitas.tahunPelajaran}</p>
                      
                      {/* Tabel Identitas di Pratinjau */}
                      <div className="mb-8">
                        <h2 className="text-md font-bold text-slate-800 mb-3 underline">A. Identitas Pembelajaran</h2>
                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-200">
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold w-1/3">Nama Penyusun</td>
                                <td className="px-4 py-2 font-medium">{identitas.namaGuru}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold">Satuan Pendidikan</td>
                                <td className="px-4 py-2 font-medium">{identitas.asalSekolah}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold">Mata Pelajaran</td>
                                <td className="px-4 py-2 font-medium">{identitas.mataPelajaran}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold">Kelas / Fase</td>
                                <td className="px-4 py-2 font-medium">{identitas.kelasFase}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold">Materi Pokok</td>
                                <td className="px-4 py-2 font-bold text-indigo-700">{identitas.materiPokok}</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 bg-slate-50 font-bold">Alokasi Waktu</td>
                                <td className="px-4 py-2 font-medium">{identitas.alokasiWaktu}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Konten RPP */}
                      {generatedContent && generatedContent.split('\n').map((line, i) => {
                        const clean = line.replace(/[#*]/g, '');
                        if (!clean.trim()) return <br key={i} />;
                        if (/^[B-Z]\./.test(clean)) return <h2 key={i} className="text-lg font-bold text-indigo-800 mt-8 mb-4 border-l-4 border-indigo-600 pl-4">{clean}</h2>;
                        return <p key={i} className="text-sm text-slate-700 mb-2 leading-relaxed">{clean}</p>;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {videoLinks.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Video size={16} className="text-red-500" /> Referensi Video
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videoLinks.map((v, i) => (
                      <a key={i} href={v.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-300 transition-all group">
                         <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
                            <Send size={12} />
                         </div>
                         <p className="text-[10px] font-bold text-slate-700 truncate">{v.title}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Cordova Smart Educator • v2.2</p>
      </footer>
    </div>
  );
};

export default App;