'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function OrderTracking() {
  const params = useParams();
  const orderId = params?.id;

  // Data State
  const [productPrice, setProductPrice] = useState(0); // 🔥 State harga dinamis dari DB
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data order spesifik milik customer berdasarkan ID di URL beserta harga aslinya
  const fetchOrderTrack = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError('');

      // 1. Ambil detail data pesanan customer
      const { data, error: dbError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (dbError) throw dbError;
      if (!data) {
        setError('Waduh Bro, pesanan dengan ID ini gak ketemu di sistem.');
        return;
      }

      setOrder(data);

      // 2. 🔥 AMBIL HARGA ASLI KUE DARI TABEL PRODUCTS SECARA DINAMIS
      if (data && data.product_variant) {
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('price')
          .eq('name', data.product_variant)
          .single();

        if (!prodError && prodData) {
          setProductPrice(prodData.price);
        } else {
          setProductPrice(50000); // Fallback aman jika nama varian tidak terdaftar di DB
        }
      }

    } catch (err) {
      console.error(err);
      setError('Gagal memuat status pesanan. Coba refresh halaman, Bro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderTrack();
  }, [orderId]);

  // Helper format rupiah
  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // Helper penentu langkah/step status alur baking
  const getStepStatus = (currentStatus) => {
    const steps = [
      { key: 'Pending', label: 'Menunggu Verifikasi DP', desc: 'Bukti bayar anda sedang dicek admin' },
      { key: 'Active', label: 'Sedang Diproses (Baking)', desc: 'Pesanan anda sedang disiapkan, tunggu yah :)' },
      { key: 'Done', label: 'Siap Di-pickup!', desc: 'Pesanan siap diambil!' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStatus);
    const activeIndex = currentIndex !== -1 ? currentIndex : 0; 

    return { steps, activeIndex };
  };

  // ========================================================
  // LOADING STATE (Mencegah aplikasi crash sebelum data ada)
  // ========================================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FEF6E3]/20 font-sans p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#525F41] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-[#525F41] font-mono animate-pulse">Memetakan status adonan Sourflavour...</p>
        </div>
      </div>
    );
  }

  // ========================================================
  // ERROR / DATA KOSONG STATE
  // ========================================================
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF6E3]/20 font-sans p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-xl font-serif font-bold text-gray-800">Pesanan Tidak Ditemukan</h1>
          <p className="text-sm text-gray-400 font-mono">{error || 'ID Pesanan salah atau tidak valid.'}</p>
          <button onClick={fetchOrderTrack} className="w-full bg-[#525F41] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#414c33] transition">
            Coba Cek Ulang Data
          </button>
        </div>
      </div>
    );
  }

  // Ambil kalkulasi status (Hanya dieksekusi jika loading selesai dan order VALID)
  const { steps, activeIndex } = getStepStatus(order.status);

  return (
    <div className="min-h-screen bg-[#FEF6E3]/20 flex flex-col font-sans antialiased text-gray-600">
      
      {/* Mini Customer Navbar */}
      <header className="bg-white border-b border-[#525F41]/10 px-6 py-4 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xl font-serif font-bold text-[#525F41]">Sourflavour</span>
          <span className="text-[10px] bg-[#525F41]/10 text-[#525F41] font-mono px-2 py-0.5 rounded-sm font-bold">Order Tracking</span>
        </div>
        <button onClick={fetchOrderTrack} className="text-xs font-bold text-[#525F41] hover:underline">
          🔄 Refresh Status
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-y-auto">
        
        {/* Card 1: Greeting & Ringkasan Utama */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#525F41]/10 text-center space-y-2">
          <span className="text-3xl">🍞</span>
          <h2 className="text-lg font-serif font-bold text-gray-800">Halo, {order.customer_name || 'Pelanggan Setia'}!</h2>
          <p className="text-xs text-gray-400">Pantau perkembangan pengerjaan roti pesanan anda di bawah ini secara real-time.</p>
          
          <div className="pt-2 flex justify-center gap-2 text-[10px] font-mono">
            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200">
              ID: {order?.id ? String(order.id).substring(0, 8) : 'ORDER-ID'}
            </span>
            <span className="bg-[#525F41]/10 text-[#525F41] px-2.5 py-1 rounded-md border border-[#525F41]/20 font-bold">
              Status: {order.status || 'Pending'}
            </span>
          </div>
        </div>

        {/* Card 2: Real-time Visual Progress Tracker (Timeline Vertical) */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#525F41]/10 space-y-6">
          <h3 className="font-serif font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">Progres Orderan Lo</h3>
          
          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
            {steps.map((step, idx) => {
              const isCompleted = idx < activeIndex;
              const isActive = idx === activeIndex;
              
              return (
                <div key={step.key} className="relative flex flex-col gap-1 text-left">
                  
                  {/* Indicator Dot */}
                  <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    isCompleted ? 'bg-emerald-500 border-emerald-500 ring-4 ring-emerald-100' :
                    isActive ? 'bg-[#525F41] border-[#525F41] ring-4 ring-[#525F41]/20 animate-pulse' :
                    'bg-white border-gray-300'
                  }`} />

                  {/* Step Text Label */}
                  <h4 className={`text-xs font-bold transition-colors ${
                    isActive ? 'text-[#525F41] text-sm' :
                    isCompleted ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {step.label} {isCompleted && '✓'}
                  </h4>
                  
                  {/* Step Description */}
                  <p className={`text-[11px] ${isActive ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Detail Nota Transaksi Ringkas */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-[#525F41]/10 font-mono text-[11px] space-y-4">
          <div className="border-b border-gray-100 pb-2 flex justify-between items-center">
            <span className="font-serif font-bold text-gray-800 text-xs">Detail Rincian Nota</span>
            <span className="text-gray-400 text-[10px]">Pick-up: {order.pickup_date ? order.pickup_date.split('T')[0] : '-'}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Varian Produk:</span>
              <span className="font-bold text-gray-800">{order.product_variant || 'Sourdough Bread'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Jumlah (Quantity):</span>
              <span className="font-bold text-gray-800">x{order.quantity || 1}</span>
            </div>
            {order.custom_notes && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-left text-gray-500 italic mt-1">
                Catatan khusus: "{order.custom_notes}"
              </div>
            )}
          </div>

          {/* 🚀 KALKULASI NOTA BERSIH: Sudah terintegrasi dengan productPrice dinamis */}
          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1 text-right">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Harga:</span>
              <span className="text-gray-700 font-bold">{formatRupiah((order.quantity || 1) * productPrice)}</span>
            </div>
            <div className="flex justify-between text-[#525F41]">
              <span>Uang Muka (DP Paid):</span>
              <span className="font-semibold">-{formatRupiah(50000)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-bold text-gray-800 text-xs">
              <span>Sisa yang Harus Dibayar:</span>
              <span className="text-[#525F41] font-extrabold">{formatRupiah(((order.quantity || 1) * productPrice) - 50000)}</span>
            </div>
          </div>
        </div>

        {/* Footer info penutup */}
        <div className="text-center text-[10px] text-gray-400 font-mono">
          © 2026 Sourflavour Korean Bento Cake. Thank you for baking with us!
        </div>

      </main>
    </div>
  );
}