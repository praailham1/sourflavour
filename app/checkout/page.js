'use client';
import { useState, useEffect, Suspense } from 'react'; // 
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // 1. Data States
  const [orderData, setOrderData] = useState(null);
  const [productPrice, setProductPrice] = useState(0);
  const [qrisUrl, setQrisUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Kebijakan DP Toko Lo
  const DOWN_PAYMENT_AMOUNT = 50000; 

  const formatRupiah = (num) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // Dynamic Base URL untuk Tracking Link
  const trackUrl = typeof window !== 'undefined' && orderId ? `${window.location.origin}/track/${orderId}` : '';

  useEffect(() => {
    if (!orderId) return;

    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        
        // 1. Tarik detail data pesanan customer yang baru dibuat
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderErr) throw orderErr;
        setOrderData(order);

        // 2. Tarik harga asli kue berdasarkan varian yang dipilih dari master data tabel products
        if (order) {
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select('price')
            .eq('name', order.product_variant)
            .single();
          
          if (!prodErr && prod) {
            setProductPrice(prod.price);
          } else {
            setProductPrice(50000); // Fallback base price invoice jika produk tidak ditemukan
          }
        }

        // 3. Tarik gambar barcode QRIS dari tabel settings
        const { data: settings, error: setErr } = await supabase.from('settings').select('*');
        if (!setErr && settings) {
          const qrisRow = settings.find(row => row.key && row.key.toLowerCase().includes('qris'));
          if (qrisRow) setQrisUrl(qrisRow.value);
        }

        // 🚀 DATA BERHASIL DI-LOAD, LANGSUNG BUAT POP-UP MODAL QRIS MUNCUL OTOMATIS
        setShowPaymentModal(true);

      } catch (err) {
        console.error('❌ Gagal memuat data ringkasan checkout:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [orderId]);

  const handleSendToWhatsApp = () => {
    if (!orderData) return;
    const adminWhatsAppNumber = "6281236258321"; // Ganti dengan nomor WA Sourflavour lo

    // Menghasilkan format pesan WhatsApp yang rapi beserta link tracking pesanan
    const message = `Halo Admin Sourflavour! ✨%0A` +
                    `Saya mau konfirmasi pembayaran DP untuk orderan berikut:%0A%0A` +
                    `*Nama:* ${orderData.customer_name}%0A` +
                    `*Pesanan:* ${orderData.product_variant} (${orderData.quantity}x)%0A` +
                    `*Tanggal Ambil:* ${new Date(orderData.pickup_date).toLocaleString('id-ID')}%0A%0A` +
                    `*Lacak Pesanan disini yah:* ${trackUrl}%0A%0A` +
                    `Berikut bukti screenshot transfer DP-nya ya!`;

    window.open(`https://api.whatsapp.com/send?phone=${adminWhatsAppNumber}&text=${message}`, '_blank');
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEF6E3]/20 flex items-center justify-center">
        <p className="text-xs text-gray-500 animate-pulse font-medium">Memuat Ringkasan Invoice Anda, Bro...</p>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-[#FEF6E3]/20 flex items-center justify-center">
        <p className="text-xs text-red-400 font-bold">⚠️ Pesanan tidak ditemukan atau ID salah.</p>
      </div>
    );
  }

  const totalEstimation = orderData.quantity * productPrice;
  const remainingBalance = totalEstimation - DOWN_PAYMENT_AMOUNT;

  return (
    <div className="min-h-screen bg-[#FEF6E3]/40 bg-[linear-gradient(135deg,rgba(82,95,65,0.04)_25%,transparent_25%,transparent_50%,rgba(82,95,65,0.04)_50%,rgba(82,95,65,0.04)_75%,transparent_75%,transparent)] [background-size:20px_20px] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        <div className="text-center space-y-1">
          <div className="inline-block px-2.5 py-1 bg-green-50 text-[#525F41] text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
            Order Form Submitted
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#525F41]">Sourflavour Invoice</h1>
          <p className="text-xs text-gray-400 font-light">Korean Bento Cakes</p>
        </div>

        {/* Rincian Invoice Bersih */}
        <div className="border border-dashed border-gray-200 rounded-xl p-5 bg-stone-50/50 space-y-3 text-xs text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-400">Pelanggan:</span>
            <span className="font-medium text-gray-800">{orderData.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">WhatsApp:</span>
            <span className="font-medium text-gray-800">{orderData.phone_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Jadwal Pick-up:</span>
            <span className="font-medium text-gray-800">
              {new Date(orderData.pickup_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {orderData.custom_notes && (
            <div className="pt-2 border-t border-gray-100">
              <span className="text-gray-400 block mb-1">Catatan Kustom:</span>
              <p className="italic text-gray-700 bg-white p-2 rounded-lg border border-gray-100">{orderData.custom_notes}</p>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between font-medium text-gray-800">
              <span>{orderData.product_variant} (x{orderData.quantity})</span>
              <span>{formatRupiah(totalEstimation)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-800 pt-1">
              <span>Total Estimasi:</span>
              <span>{formatRupiah(totalEstimation)}</span>
            </div>
            <div className="flex justify-between text-teal-700 font-medium">
              <span>Wajib DP Slot (QRIS):</span>
              <span>-{formatRupiah(DOWN_PAYMENT_AMOUNT)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-double border-gray-300 text-sm">
              <span>Sisa Pelunasan:</span>
              <span>{formatRupiah(remainingBalance)}</span>
            </div>
          </div>

          {/* 🚀 BERHASIL DITAMBAHKAN: Tampilan Tautan Live Tracking Orderan Di Lembar Invoice */}
          <div className="pt-3 border-t border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Cek Pesanan Kamu Disini!:</span>
            <a 
              href={trackUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-teal-700 hover:text-teal-900 underline font-mono text-[10px] block break-all"
            >
              {trackUrl}
            </a>
          </div>
        </div>

        <button 
          onClick={() => setShowPaymentModal(true)}
          className="w-full bg-[#525F41] text-white py-2.5 rounded-lg text-xs font-medium hover:bg-[#414c33] transition"
        >
          Lihat Barcode Pembayaran DP
        </button>
      </div>

      {/* ==================== POP-UP MODAL QRIS OTOMATIS ==================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100 space-y-5">
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-800">Pembayaran DP Slot</h3>
              <p className="text-xs text-gray-400 mt-1">Silakan scan QRIS untuk mengunci jadwal produksi:</p>
            </div>

            <div className="flex justify-center">
              {qrisUrl ? (
<div className="flex flex-col items-center justify-center space-y-3">
  {qrisUrl ? (
    <div className="space-y-3 w-full flex flex-col items-center">
      {/* Container Gambar QRIS */}
      <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-inner max-w-[240px]">
        <img src={qrisUrl} alt="QRIS" className="w-full h-auto object-contain" />
      </div>

      {/* 🚀 TOMBOL PREVIEW & DOWNLOAD BARU */}
      <div className="flex gap-2 w-full max-w-[240px]">
        {/* Button Preview (Buka di Tab Baru) */}
        <a 
          href={qrisUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 bg-stone-100 hover:bg-stone-200 text-gray-700 text-[10px] font-bold py-2 rounded-lg transition text-center"
        >
          🔍 Preview
        </a>

        {/* Button Download Langsung */}
        {/* <a 
          href={qrisUrl} 
          download="QRIS-DP-Sourflavour.png"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-[10px] font-bold py-2 rounded-lg transition text-center"
        >
          📥 Download
        </a> */}
      </div>
    </div>
  ) : (
    <div className="w-[240px] h-[240px] bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center animate-pulse text-[11px] text-gray-400">
      Memuat QRIS...
    </div>
  )}
</div>
              ) : (
                <div className="w-[240px] h-[240px] bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center animate-pulse text-[11px] text-gray-400">
                  Memuat QRIS...
                </div>
              )}
            </div>

            <div className="bg-amber-50 rounded-lg p-3 text-left text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">💡 Langkah Konfirmasi:</p>
              <p>1. Transfer nominal DP sebesar <span className="font-bold">{formatRupiah(DOWN_PAYMENT_AMOUNT)}</span>.</p>
              <p>2. Screenshot bukti berhasil, lalu klik tombol di bawah ini untuk mengirim ke WA Admin.</p>
              {/* Info Tambahan di Pop-up */}
              <p className="pt-1 text-[10px] italic text-amber-700">Tautan live tracking pesanan otomatis disematkan dalam isi pesan WhatsApp.</p>
            </div>

            <div className="space-y-2">
              <button 
                onClick={handleSendToWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20ba56] text-white font-bold py-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-2"
              >
                💬 Kirim Bukti ke WhatsApp →
              </button>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600 transition block w-full text-center"
              >
                Tutup Popup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FEF6E3]/20 flex items-center justify-center">
        <p className="text-xs text-gray-400 animate-pulse font-mono">Memuat Invoice...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
