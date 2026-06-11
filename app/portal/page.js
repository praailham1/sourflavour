'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // QRIS State
  const [qrisUrl, setQrisUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const savedAuth = localStorage.getItem('sourflavour_admin_logged_in');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'sourflavour2026') {
      setIsAuthenticated(true);
      setAuthError('');
      localStorage.setItem('sourflavour_admin_logged_in', 'true');
    } else {
      setAuthError('Kredensial salah, Bro! Coba cek kembali.');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'qris_url')
        .single();
      
      if (!settingsError && settingsData) {
        setQrisUrl(settingsData.value);
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const updateStatus = async (orderItem, newStatus) => {
    try {
      const matchQuery = orderItem.id 
        ? { id: orderItem.id } 
        : { customer_name: orderItem.customer_name, phone_number: orderItem.phone_number };

      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .match(matchQuery)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        alert(`⚠️ Waduh Bro! Query jalan, tapi 0 row yang ter-update.`);
        return;
      }
      
      setOrders(prevOrders => 
        prevOrders.map(item => {
          const isMatch = item.id === orderItem.id || (item.customer_name === orderItem.customer_name && item.phone_number === orderItem.phone_number);
          return isMatch ? { ...item, status: newStatus } : item;
        })
      );

      if (selectedOrder) {
        const isSelectedMatch = selectedOrder.id === orderItem.id || (selectedOrder.customer_name === orderItem.customer_name && selectedOrder.phone_number === orderItem.phone_number);
        if (isSelectedMatch) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      alert(`Gagal menyimpan status ke database: ${err.message}`);
    }
  };

  const handleQrisUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `qris_current.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('qris-bucket')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('qris-bucket')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('settings')
        .update({ value: publicUrl })
        .eq('key', 'qris_url');

      if (dbError) throw dbError;

      setQrisUrl(publicUrl);
      alert('🔥 Mantap Bro! QRIS baru berhasil di-upload ke CDN Storage & tersimpan permanen.');
    } catch (err) {
      alert(`Gagal upload QRIS: ${err.message}`);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const totalOrders = orders.length;
  const pendingRevenue = orders
    .filter(o => o.status === 'Pending' || o.status === 'Active')
    .reduce((sum, o) => sum + ((o.quantity || 1) * 50000), 0);
  const successRate = totalOrders > 0 
    ? Math.round((orders.filter(o => o.status === 'Done').length / totalOrders) * 100) 
    : 0;

  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const getComplexity = (notes) => {
    if (!notes) return { label: 'Easy', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' };
    if (notes.length > 30) return { label: 'Hard', color: 'bg-red-50 text-red-700 border border-red-200/50' };
    return { label: 'Medium', color: 'bg-amber-50 text-amber-700 border border-amber-200/50' };
  };

  const totalPages = Math.ceil(orders.length / itemsPerPage) || 1;
  const displayedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [orders, totalPages, currentPage]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF6E3]/20 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-[#525F41]/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-serif font-bold text-[#525F41]">Sourflavour Admin</h1>
            <p className="text-xs text-gray-400 mt-1">Silakan login untuk mengelola pesanan artisanal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Username</label>
              <input 
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#525F41] outline-none text-sm"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Password</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#525F41] outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
            {authError && <p className="text-xs text-red-600 font-medium text-center">{authError}</p>}
            <button type="submit" className="w-full bg-[#525F41] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-[#414c33] transition">
              Masuk ke Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF6E3]/20 flex flex-col font-sans">
      <style>{`
        @media print {
          body, html, main, __next { background: white !important; background-color: white !important; }
          header, .xl\\:col-span-2, button, select, .text-gray-400, .sticky > div:first-child, .qris-manager-card { display: none !important; }
          .xl\\:col-span-1 { width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
          .print-area { border: none !important; box-shadow: none !important; background: white !important; padding: 0 !important; margin: 0 auto !important; width: 100% !important; max-width: 600px !important; }
        }
      `}</style>

      <header className="bg-white border-b border-[#525F41]/10 px-8 py-4 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-serif font-bold text-[#525F41]">Sourflavour</span>
          <span className="text-xs bg-[#525F41]/10 text-[#525F41] font-mono px-2 py-0.5 rounded-sm font-bold">HQ Portal</span>
        </div>
        <button 
          onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('sourflavour_admin_logged_in');
          }} 
          className="text-xs font-medium text-gray-400 hover:text-[#525F41] transition"
        >
          Log Out →
        </button>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 xl:grid-cols-3 gap-8 overflow-y-auto">
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-xs border border-[#525F41]/10">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pesanan</p>
              <p className="text-2xl font-mono font-bold text-gray-800 mt-1">{totalOrders} Orders</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-xs border border-[#525F41]/10">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendapatan Tertunda (DP)</p>
              <p className="text-2xl font-mono font-bold text-[#525F41] mt-1">{formatRupiah(pendingRevenue)}</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-xs border border-[#525F41]/10">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Keberhasilan Mingguan</p>
              <p className="text-2xl font-mono font-bold text-[#525F41] mt-1">{successRate}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-[#525F41]/10 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-serif font-bold text-lg text-gray-800">Daftar Masuk Order Masakan</h2>
              <button onClick={fetchData} className="text-xs font-semibold text-[#525F41] hover:underline">🔄 Refresh Data</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] font-semibold border-b border-gray-100">
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Produk / Varian</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4">Kompleksitas</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                  {loading ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-400 animate-pulse">Sedang memetakan data...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Belum ada pesanan masuk di database.</td></tr>
                  ) : (
                    displayedOrders.map((order, index) => {
                      const complexity = getComplexity(order.custom_notes);
                      return (
                        <tr key={order.id || index} className="hover:bg-[#FEF6E3]/10 transition cursor-pointer" onClick={() => setSelectedOrder(order)}>
                          <td className="p-4 font-bold text-gray-800">{order.customer_name || 'Tanpa Nama'}</td>
                          <td className="p-4 text-xs font-medium text-gray-600">{order.product_variant || 'Sourdough Bread'}</td>
                          <td className="p-4 text-center font-mono font-semibold">{order.quantity || 1}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${complexity.color}`}>{complexity.label}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                              order.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              order.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>{order.status || 'Pending'}</span>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={order.status || 'Pending'} 
                              onChange={(e) => updateStatus(order, e.target.value)}
                              className="text-xs bg-white border border-gray-300 rounded-md px-2 py-1 outline-none font-bold focus:border-[#525F41] cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Active">Active</option>
                              <option value="Done">Done</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && orders.length > 0 && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500 font-medium">
                  Menampilkan <span className="text-[#525F41] font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> sampai{' '}
                  <span className="text-[#525F41] font-bold">{Math.min(currentPage * itemsPerPage, orders.length)}</span> dari{' '}
                  <span className="text-gray-800 font-bold">{orders.length}</span> orderan
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-[#FEF6E3]/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs font-mono font-bold text-gray-500 px-1">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-[#FEF6E3]/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="qris-manager-card bg-white rounded-xl shadow-xs border border-[#525F41]/10 p-6">
            <div className="border-b border-gray-100 pb-3 mb-4">
              <h2 className="font-serif font-bold text-lg text-gray-800">Pengaturan QRIS Form Submission</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ganti barcode QRIS pembayaran DP secara real-time</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-32 h-32 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {qrisUrl ? (
                  <img src={qrisUrl} alt="Current QRIS" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400 p-2 text-center">Belum ada QRIS aktif</span>
                )}
              </div>
              <div className="space-y-3 flex-1 w-full">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Upload QRIS Baru (PNG/JPG)</label>
                  <input 
                    type="file" accept="image/*" disabled={uploading} onChange={handleQrisUpload}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#525F41]/10 file:text-[#525F41] hover:file:bg-[#525F41]/20 cursor-pointer disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-gray-400 font-mono break-all">
                  {uploading ? '⏳ Sedang memproses file...' : `🔗 CDN Link: ${qrisUrl || 'Kosong'}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          {selectedOrder ? (
            <div className="bg-white rounded-xl shadow-xs border border-[#525F41]/10 p-6 sticky top-8 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-serif font-bold text-gray-800">Detail & Invoice Preview</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-xs text-gray-400 hover:text-gray-600">Tutup ✕</button>
              </div>
              <div className="space-y-2 text-xs">
                <p><span className="text-gray-400 font-medium">WhatsApp:</span> <span className="font-mono text-gray-700">{selectedOrder.phone_number || '-'}</span></p>
                <p><span className="text-gray-400 font-medium">Jadwal Pick-up:</span> <span className="font-semibold text-[#525F41]">{selectedOrder.pickup_date ? selectedOrder.pickup_date.split('T')[0] : '-'}</span></p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                  <p className="text-gray-400 font-medium mb-1">Catatan Kustom:</p>
                  <p className="text-gray-700 italic">"{selectedOrder.custom_notes || 'Tidak ada catatan khusus.'}"</p>
                </div>
              </div>

              <div className="print-area border border-dashed border-[#525F41]/20 rounded-xl p-5 bg-[#FEF6E3]/30 font-mono text-[11px] text-gray-600 space-y-4 shadow-xs">
                <div className="text-center border-b border-gray-200 pb-3">
                  <p className="font-serif font-bold text-sm text-[#525F41]">SOURFLAVOUR INVOICE</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Artisanal Bakery & Cakes</p>
                </div>
                <div className="space-y-1">
                  <p>Pelanggan : {selectedOrder.customer_name || 'Pelanggan'}</p>
                  <p>Tanggal    : {selectedOrder.pickup_date ? selectedOrder.pickup_date.split('T')[0] : '-'}</p>
                  <p>Status     : {selectedOrder.status || 'Pending'}</p>
                </div>
                <div className="border-t border-b border-gray-200 py-2 my-2 space-y-1">
                  <div className="flex justify-between">
                    <span>{selectedOrder.product_variant || 'Sourdough Bread'} (x{selectedOrder.quantity || 1})</span>
                    <span>{formatRupiah((selectedOrder.quantity || 1) * 120000)}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="flex justify-between font-bold">
                    <span>Total Estimasi:</span>
                    <span>{formatRupiah((selectedOrder.quantity || 1) * 120000)}</span>
                  </div>
                  <div className="flex justify-between text-[#525F41] font-semibold">
                    <span>DP Paid (QRIS):</span>
                    <span>-{formatRupiah(50000)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-gray-800">
                    <span>Sisa Tagihan :</span>
                    <span>{formatRupiah(((selectedOrder.quantity || 1) * 120000) - 50000)}</span>
                  </div>
                </div>
                <div className="text-center text-[9px] text-gray-400 pt-2 border-t border-gray-100">
                  * Bawa lembar invoice digital ini saat pengambilan produk.
                </div>
              </div>

              <button onClick={() => window.print()} className="w-full bg-[#525F41] text-white font-medium py-2 rounded-lg text-xs hover:bg-[#414c33] transition shadow-xs">
                🖨️ Cetak PDF Invoice
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-[#525F41]/20 p-8 text-center text-gray-400 text-xs h-64 flex items-center justify-center sticky top-8 font-mono">
              Pilih salah satu baris pesanan untuk melihat Pratinjau Invoice Real-time, Bro!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}