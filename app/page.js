'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. Form States
  const [customerName, setCustomerName] = useState(searchParams.get('name') || '');
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone') || '');
  const [productVariant, setProductVariant] = useState(searchParams.get('variant') || 'Bento cake 10cm');
  const [quantity, setQuantity] = useState(parseInt(searchParams.get('qty')) || 1);
  const [pickupDate, setPickupDate] = useState(searchParams.get('date') || '');
  const [customNotes, setCustomNotes] = useState(searchParams.get('notes') || '');

  // 2. Resource States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableVariants, setAvailableVariants] = useState(["Bento cake 10cm", "Bento Cake 15cm"]);

  // Ambil varian dari tabel products
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('name')
          .eq('is_available', true);

        if (error) throw error;
        if (data && data.length > 0) {
          const productNames = data.map(p => p.name);
          setAvailableVariants(productNames);
          if (!searchParams.get('variant')) {
            setProductVariant(productNames[0]);
          }
        }
      } catch (err) {
        console.error('⚠️ Gagal ambil data produk:', err.message);
      }
    };
    fetchVariants();
  }, [searchParams]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !phoneNumber || !pickupDate) {
      alert('Harap isi semua kolom wajib ya, Bro!');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            customer_name: customerName,
            phone_number: phoneNumber,
            product_variant: productVariant,
            quantity: parseInt(quantity),
            pickup_date: pickupDate,
            custom_notes: customNotes,
            status: 'Pending'
          }
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        // 🚀 ROUTING KE HALAMAN CHECKOUT SAMBIL BAWA ORDER ID
        router.push(`/checkout?orderId=${data[0].id}`);
      }
    } catch (err) {
      alert(`Gagal memproses pesanan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF6E3]/40 bg-[linear-gradient(135deg,rgba(82,95,65,0.04)_25%,transparent_25%,transparent_50%,rgba(82,95,65,0.04)_50%,rgba(82,95,65,0.04)_75%,transparent_75%,transparent)] [background-size:20px_20px] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(82,95,65,0.15)] border-2 border-[#525F41]/20 p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-serif font-bold text-[#525F41] tracking-wide">Sourflavour</h1>
          <p className="text-xs text-gray-400 font-light">Korean Bento Cake</p>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-xs focus:border-[#525F41]"
              placeholder="Masukkan nama Anda"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <input 
              type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-xs focus:border-[#525F41]"
              placeholder="Contoh: 08123456789"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pilihan Produk / Varian</label>
            <select 
              value={productVariant} onChange={(e) => setProductVariant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg outline-none text-xs focus:border-[#525F41]"
            >
              {availableVariants.map((v, i) => (
                <option key={i} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kuantitas</label>
              <input 
                type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-xs focus:border-[#525F41]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal & Jam Ambil</label>
              <input 
                type="datetime-local" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-xs focus:border-[#525F41]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan Kustom (Desain)</label>
            <textarea 
              rows="3" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-xs focus:border-[#525F41]"
              placeholder="Tulis instruksi kustomisasi kue di sini..."
            />
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full bg-[#525F41] text-white py-2.5 rounded-lg text-xs font-medium hover:bg-[#414c33] transition disabled:opacity-50"
          >
            {isSubmitting ? '⏳ Memproses...' : 'Lanjut ke Pembayaran DP'}
          </button>
        </form>
      </div>
    </div>
  );
}