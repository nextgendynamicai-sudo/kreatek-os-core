import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  Camera, Upload, ShoppingCart, TrendingUp, Users, DollarSign, 
  LogOut, Shield, Package, Activity, Search, QrCode, Lock, 
  ChevronRight, CheckCircle, CreditCard, Bell
} from 'lucide-react';

const KREATEK_COLORS = {
  navy: '#0A1128',
  bronze: '#C5A184',
  white: '#F8F9FA'
};

const MOCK_BCV_RATES = {
  USD: 36.45,
  EUR: 39.20
};

const initialDB = {
  promotoras: [
    { id: 'p1', name: 'Promotora Alpha', setups: 0, earningsEUR: 0 }
  ],
  clients: [
    { id: 'c0', promotoraId: 'p1', name: 'Kreatek Demo', company: 'Comercio Alpha', avgBilling: 500, phone: '000', idCard: 'V-0000', salesUSD: 150 }
  ],
  vendedores: [
    { id: 'v1', clientId: 'c0', company: 'Comercio Alpha', name: 'Vendedor Demo', email: 'vendedor@demo.com', password: '123' }
  ],
  products: [
    { id: 'prod1', clientId: 'c0', clientName: 'Comercio Alpha', name: 'Terminal KFS', priceUSD: 150, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=300&q=80' }
  ],
  transactions: [],
  kreatekCore: {
    totalTransactions: 0,
    earningsEUR: 0
  }
};

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [view, setView] = useState('login'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [rates, setRates] = useState(MOCK_BCV_RATES);

  // Persistencia de datos híbrida (Supabase / LocalStorage)
  const [db, setDb] = useState(() => {
    try {
      const saved = localStorage.getItem('kreatek_os_db');
      return saved ? JSON.parse(saved) : initialDB;
    } catch (error) {
      return initialDB;
    }
  });

  const ghostTrapActive = useRef(true);

  // Cargar de Supabase al inicio
  useEffect(() => {
    const loadData = async () => {
      if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) return;
      try {
        const [proms, cli, vend, prod, tx, core] = await Promise.all([
            supabase.from('promotoras').select('*'),
            supabase.from('clients').select('*'),
            supabase.from('vendedores').select('*'),
            supabase.from('products').select('*'),
            supabase.from('transactions').select('*'),
            supabase.from('kreatekCore').select('*').single()
        ]);
        if (core.data) {
            setDb({
               promotoras: proms.data.length ? proms.data : initialDB.promotoras,
               clients: cli.data.length ? cli.data : initialDB.clients,
               vendedores: vend.data.length ? vend.data : initialDB.vendedores,
               products: prod.data.length ? prod.data : initialDB.products,
               transactions: tx.data || [],
               kreatekCore: core.data || initialDB.kreatekCore
            });
        }
      } catch (err) {
        console.error("Error cargando de Supabase, usando LocalStorage:", err);
      }
    };
    loadData();
  }, []);

  // Sincronizar cambios hacia Supabase y LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('kreatek_os_db', JSON.stringify(db));
    } catch (error) {}

    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) return;

    const syncData = async () => {
      try {
        if(db.promotoras.length) await supabase.from('promotoras').upsert(db.promotoras);
        if(db.clients.length) await supabase.from('clients').upsert(db.clients);
        if(db.vendedores.length) await supabase.from('vendedores').upsert(db.vendedores);
        if(db.products.length) await supabase.from('products').upsert(db.products);
        if(db.transactions.length) await supabase.from('transactions').upsert(db.transactions);
        await supabase.from('kreatekCore').upsert({ id: 1, ...db.kreatekCore });
      } catch(err) {
        console.error("Error sincronizando a Supabase:", err);
      }
    };

    const timeout = setTimeout(syncData, 1500);
    return () => clearTimeout(timeout);
  }, [db]);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatEUR = (val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

  const handleLogin = (role, password, email = null) => {
    const isProvisional = password === '123123';

    if (role === 'core' && (password === '199521' || isProvisional)) {
      setCurrentUser({ role: 'core', name: 'El Arquitecto' });
      setView('core');
      showToast('KFS OS Accesado. Bienvenido, Arquitecto.');
    } else if (role === 'promotora' && (password === '1995' || isProvisional)) {
      setCurrentUser({ role: 'promotora', name: 'Promotora Alpha', id: 'p1' });
      setView('promotora');
      showToast('Sesión de Promotora Iniciada.');
    } else if (role === 'dueño') {
      if (password === '1234' || isProvisional) {
        const client = db.clients.find(c => c.email === email) || db.clients[0];
        if (client) {
          setCurrentUser({ ...client, role: 'dueño' });
          setView('client');
          showToast(`Bienvenido al comercio: ${client.company}`);
        } else {
          showToast('Dueño no encontrado. Regístrese.', 'error');
        }
      } else {
        showToast('Clave de dueño incorrecta.', 'error');
      }
    } else if (role === 'vendedor') {
      if (isProvisional) {
        const vendedorDemo = db.vendedores[0];
        setCurrentUser({ ...vendedorDemo, role: 'vendedor' });
        setView('vendedor');
        showToast(`Terminal de Vendedor activado: ${vendedorDemo.name}`);
      } else {
        const vendedor = db.vendedores.find(v => v.email === email && v.password === password);
        if (vendedor) {
           setCurrentUser({ ...vendedor, role: 'vendedor' });
           setView('vendedor');
           showToast(`Terminal de Vendedor activado: ${vendedor.name}`);
        } else {
           showToast('Credenciales de vendedor inválidas.', 'error');
        }
      }
    } else if (role === 'marketplace') {
      setView('marketplace');
    } else {
      showToast('Credenciales inválidas.', 'error');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setView('login');
  };

  const registerClient = (clientData, promotoraId = 'p1') => {
    const newClient = { ...clientData, id: `c${Date.now()}`, salesUSD: 0, promotoraId };
    const setupFeeUSD = 32.5;
    const setupFeeEUR = (setupFeeUSD * rates.USD) / rates.EUR;

    setDb(prev => {
      const updatedPromotoras = prev.promotoras.map(p => {
        if (p.id === promotoraId) {
          return { ...p, setups: p.setups + 1, earningsEUR: p.earningsEUR + setupFeeEUR };
        }
        return p;
      });
      return { ...prev, clients: [...prev.clients, newClient], promotoras: updatedPromotoras };
    });

    showToast('Setup de Cliente completado con éxito.');
    if(view !== 'promotora') setView('login');
  };

  const addProduct = (productData) => {
    setDb(prev => ({ ...prev, products: [...prev.products, { ...productData, id: `prod${Date.now()}` }] }));
    showToast('Producto sincronizado con el Marketplace.');
  };

  const processPurchase = (product) => {
    const kreatekFeeUSD = 0.04;
    const kreatekFeeEUR = (kreatekFeeUSD * rates.USD) / rates.EUR;

    setDb(prev => {
      const updatedClients = prev.clients.map(c => 
        c.id === product.clientId ? { ...c, salesUSD: c.salesUSD + product.priceUSD } : c
      );

      if (ghostTrapActive.current) {
        console.log(`[Ghost Protocol] Detonando captura de datos para tx_id: ${Date.now()}`);
      }

      return {
        ...prev,
        clients: updatedClients,
        transactions: [...prev.transactions, {
          id: `tx${Date.now()}`, productId: product.id, amountUSD: product.priceUSD, kreatekFeeEUR: kreatekFeeEUR
        }],
        kreatekCore: {
          totalTransactions: prev.kreatekCore.totalTransactions + 1,
          earningsEUR: prev.kreatekCore.earningsEUR + kreatekFeeEUR
        }
      };
    });
    showToast(`Compra de ${product.name} procesada.`);
  };

  const Toast = () => {
    if (!toast.show) return null;
    return (
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md font-bold text-sm transition-all duration-300 animate-fade-in-up flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500/90 text-white border border-red-400' : 'bg-[#C5A184]/90 text-[#0A1128] border border-white/20'}`}>
        {toast.type === 'success' ? <CheckCircle size={18} /> : <Activity size={18} />}
        {toast.message}
      </div>
    );
  };

  const Navbar = ({ title }) => (
    <nav className="flex justify-between items-center p-4 border-b border-white/5 bg-[#0A1128] sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Shield size={24} style={{ color: KREATEK_COLORS.bronze }} />
        <span className="font-bold text-lg tracking-widest uppercase text-[#C5A184]">
          Kreatek <span className="font-light text-white hidden sm:inline-block">Flow Systems OS</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        {title && <span className="text-white/80 text-xs sm:text-sm uppercase tracking-wider font-mono bg-white/5 px-3 py-1 rounded-full">{title}</span>}
        {currentUser && (
          <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <LogOut size={20} />
          </button>
        )}
      </div>
    </nav>
  );

  const RegisterClientForm = ({ onRegister, onCancel, standalone = true }) => {
    const [formData, setFormData] = useState({ name: '', idCard: '', company: '', avgBilling: '', phone: '', email: '', password: '', address: '' });
    
    return (
      <form onSubmit={(e) => { e.preventDefault(); onRegister(formData); }} className={`space-y-3 animate-fade-in-up ${standalone ? 'text-white' : 'text-gray-800'}`}>
        <h3 className={`text-lg font-black mb-4 border-b pb-2 ${standalone ? 'text-[#C5A184] border-[#C5A184]/30' : 'text-[#0A1128] border-gray-200'}`}>Setup de Nuevo Comercio</h3>
        <input required placeholder="Nombre Completo" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input required placeholder="Cédula / RIF" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, idCard: e.target.value})} />
        <input required placeholder="Nombre de la Empresa" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, company: e.target.value})} />
        <textarea required placeholder="Dirección Comercial" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, address: e.target.value})} />
        <input required type="number" placeholder="Facturación Promedio Diaria ($)" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, avgBilling: e.target.value})} />
        <input required placeholder="Teléfono Personal" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, phone: e.target.value})} />
        <input required type="email" placeholder="Correo Electrónico" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, email: e.target.value})} />
        <input required type="password" placeholder="Crear Clave de Acceso" className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A184] transition-all ${standalone ? 'bg-[#0A1128]/80 border-[#C5A184]/50' : 'bg-gray-50 border-gray-200'}`} onChange={e => setFormData({...formData, password: e.target.value})} />
        
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="w-1/3 py-3 rounded-xl bg-gray-200/20 hover:bg-gray-200/30 font-bold transition-all text-sm">Cancelar</button>
          <button type="submit" className="w-2/3 py-3 rounded-xl font-black text-[#0A1128] text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg" style={{ backgroundColor: KREATEK_COLORS.bronze }}>Aprobar Setup</button>
        </div>
      </form>
    );
  };

  const LoginView = () => {
    const [activeTab, setActiveTab] = useState('marketplace'); 
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');

    return (
      <div className="min-h-screen flex flex-col bg-[#0A1128] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141E3A] to-[#0A1128]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#C5A184]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#C5A184]/30">
                <Shield className="text-[#C5A184]" size={32} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">KFS Core <span className="text-[#C5A184]">Access</span></h1>
              <p className="text-sm text-gray-400 mt-2 font-mono">Seleccione su vector de entrada</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-8">
              <button onClick={() => setActiveTab('marketplace')} className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'marketplace' ? 'bg-[#C5A184] text-[#0A1128] shadow-[0_0_15px_rgba(197,161,132,0.4)]' : 'bg-white/5 text-[#C5A184] hover:bg-white/10'}`}>Market</button>
              <button onClick={() => setActiveTab('dueño')} className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'dueño' ? 'bg-[#C5A184] text-[#0A1128] shadow-[0_0_15px_rgba(197,161,132,0.4)]' : 'bg-white/5 text-[#C5A184] hover:bg-white/10'}`}>Dueño</button>
              <button onClick={() => setActiveTab('vendedor')} className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'vendedor' ? 'bg-[#C5A184] text-[#0A1128] shadow-[0_0_15px_rgba(197,161,132,0.4)]' : 'bg-white/5 text-[#C5A184] hover:bg-white/10'}`}>Vendedor</button>
              <button onClick={() => setActiveTab('promotora')} className={`py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${activeTab === 'promotora' ? 'bg-[#C5A184] text-[#0A1128] shadow-[0_0_15px_rgba(197,161,132,0.4)]' : 'bg-white/5 text-[#C5A184] hover:bg-white/10'}`}>Promotora</button>
              <button onClick={() => setActiveTab('core')} className={`col-span-2 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-[#C5A184]/30 ${activeTab === 'core' ? 'bg-[#C5A184] text-[#0A1128] shadow-[0_0_20px_rgba(197,161,132,0.5)]' : 'bg-transparent text-[#C5A184] hover:bg-white/5'}`}>KFS OS (Arquitecto)</button>
            </div>

            {activeTab === 'marketplace' && (
              <button onClick={() => handleLogin('marketplace', '')} className="w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg text-[#0A1128] bg-[#C5A184]">
                <ShoppingCart size={20} /> Entrar al Marketplace Público
              </button>
            )}

            {(activeTab === 'core' || activeTab === 'promotora' || activeTab === 'dueño' || activeTab === 'vendedor') && (
              <div className="space-y-4">
                {(activeTab === 'dueño' || activeTab === 'vendedor') && (
                  <input type="email" placeholder="Correo Electrónico de Usuario" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0A1128]/80 border border-[#C5A184]/30 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#C5A184] focus:ring-1 focus:ring-[#C5A184] transition-all" />
                )}
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-[#C5A184]/50" size={20} />
                  <input type="password" placeholder="Clave de Seguridad" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0A1128]/80 border border-[#C5A184]/30 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-[#C5A184] focus:ring-1 focus:ring-[#C5A184] transition-all" />
                </div>
                <button onClick={() => handleLogin(activeTab, password, email)} className="w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg text-[#0A1128] bg-[#C5A184]">
                  Desbloquear Terminal <ChevronRight size={20} />
                </button>
                {activeTab === 'dueño' && (
                  <button onClick={() => setActiveTab('register')} className="w-full text-center text-sm font-bold text-[#C5A184] hover:text-white transition-colors mt-4">
                    ¿Comercio nuevo? Iniciar Setup
                  </button>
                )}
              </div>
            )}

            {activeTab === 'register' && (
              <RegisterClientForm onRegister={registerClient} onCancel={() => setActiveTab('dueño')} />
            )}
          </div>
        </div>
      </div>
    );
  };

  const CoreDashboard = () => {
    const [newPromoName, setNewPromoName] = useState('');
    
    const handleAddPromotora = (e) => {
      e.preventDefault();
      if(!newPromoName) return;
      const newPromo = { id: `p${Date.now()}`, name: newPromoName, setups: 0, earningsEUR: 0 };
      setDb(prev => ({ ...prev, promotoras: [...prev.promotoras, newPromo] }));
      setNewPromoName('');
      showToast('Nueva Promotora habilitada.');
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Navbar title="KFS OS (Arquitecto)" />
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#0A1128] to-[#141E3A] text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[#C5A184] text-xs font-black uppercase tracking-widest mb-2">Flujo de Caja Kreatek</p>
                <h2 className="text-5xl font-black mb-2">{formatEUR(db.kreatekCore.earningsEUR)}</h2>
                <p className="text-xs text-gray-400">Recaudación silenciosa: $0.04 USD por TX</p>
              </div>
              <Activity size={100} className="absolute -right-10 -bottom-10 text-white/5" />
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Nodos Activos</p>
                <h2 className="text-5xl font-black text-[#0A1128]">{db.clients.length}</h2>
              </div>
              <div className="w-16 h-16 bg-[#C5A184]/10 rounded-2xl flex items-center justify-center">
                <Users size={32} className="text-[#C5A184]" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Transacciones</p>
                <h2 className="text-5xl font-black text-[#0A1128]">{db.kreatekCore.totalTransactions}</h2>
              </div>
              <div className="w-16 h-16 bg-[#0A1128]/5 rounded-2xl flex items-center justify-center">
                <TrendingUp size={32} className="text-[#0A1128]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-black mb-6 text-[#0A1128] flex items-center gap-2"><Shield className="text-[#C5A184]"/> Control de Promotoras</h3>
            <form onSubmit={handleAddPromotora} className="flex gap-4 mb-8">
              <input required type="text" placeholder="Nombre completo de la Promotora" value={newPromoName} onChange={e => setNewPromoName(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184]" />
              <button type="submit" className="px-8 py-3 rounded-xl font-black text-white bg-[#0A1128] hover:bg-gray-800 transition-colors">Habilitar</button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-black">
                  <tr>
                    <th className="py-4 px-4 rounded-tl-xl">ID Promotora</th>
                    <th className="py-4 px-4 text-center">Setups Exitosos</th>
                    <th className="py-4 px-4 text-right rounded-tr-xl">Comisiones (EUR)</th>
                  </tr>
                </thead>
                <tbody>
                  {db.promotoras.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-[#0A1128]">{p.name}</td>
                      <td className="py-4 px-4 text-center font-mono">{p.setups}</td>
                      <td className="py-4 px-4 text-right font-black text-green-600">{formatEUR(p.earningsEUR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-black mb-6 text-[#0A1128] flex items-center gap-2"><Search className="text-[#C5A184]"/> Trazabilidad de Comercios</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-black">
                  <tr>
                    <th className="py-4 px-4 rounded-tl-xl">Comercio</th>
                    <th className="py-4 px-4">Dueño / RIF</th>
                    <th className="py-4 px-4">Facturación Estimada</th>
                    <th className="py-4 px-4 text-right rounded-tr-xl">Ventas Reales (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {db.clients.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-[#0A1128]">{c.company}</td>
                      <td className="py-4 px-4 text-gray-500">{c.name}<br/><span className="text-xs font-mono">{c.idCard}</span></td>
                      <td className="py-4 px-4 font-mono">${c.avgBilling}/día</td>
                      <td className="py-4 px-4 text-right font-black text-[#0A1128]">{formatUSD(c.salesUSD)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PromotoraDashboard = () => {
    const [showRegister, setShowRegister] = useState(false);
    const myClients = db.clients.filter(c => c.promotoraId === currentUser.id);
    const myPromotoraData = db.promotoras.find(p => p.id === currentUser?.id) || db.promotoras[0];

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Navbar title={`Hub: ${currentUser.name}`} />
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#0A1128] to-[#141E3A] text-white p-8 md:p-10 rounded-[2rem] shadow-2xl relative">
              <p className="text-[#C5A184] text-xs font-black uppercase tracking-widest mb-4">Comisiones Liquidadas</p>
              <h2 className="text-6xl font-black mb-6">{formatEUR(myPromotoraData?.earningsEUR || 0)}</h2>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-2"><CreditCard size={16} className="text-[#C5A184]"/> Tarifa Setup: $32.5 USD</span>
              </div>
            </div>
            
            <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
               <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle size={40} className="text-green-500" />
               </div>
               <h3 className="text-6xl font-black text-[#0A1128] mb-3">{myPromotoraData?.setups || 0}</h3>
               <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Nodos Captados</p>
            </div>
          </div>

          {!showRegister ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 relative overflow-hidden">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-black text-[#0A1128]">Mis Comercios Activados</h3>
                <button onClick={() => setShowRegister(true)} className="bg-[#0A1128] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">+ Nuevo Setup</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-black">
                    <tr>
                      <th className="py-4 px-4">Comercio</th>
                      <th className="py-4 px-4">Contacto</th>
                      <th className="py-4 px-4">Rendimiento USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myClients.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-4 px-4 font-bold text-[#0A1128]">{c.company}</td>
                        <td className="py-4 px-4 text-gray-500">{c.name}<br/><span className="text-xs font-mono">{c.phone}</span></td>
                        <td className="py-4 px-4 font-black text-green-600">{formatUSD(c.salesUSD)}</td>
                      </tr>
                    ))}
                    {myClients.length === 0 && <tr><td colSpan="3" className="text-center py-10 text-gray-400 font-bold">Sin comercios en cartera.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
              <RegisterClientForm onRegister={(data) => { registerClient(data, currentUser.id); setShowRegister(false); }} onCancel={() => setShowRegister(false)} standalone={false} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const ClientDashboard = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddVendedor, setShowAddVendedor] = useState(false);
    const [newVendedor, setNewVendedor] = useState({ name: '', email: '', password: '' });
    const [newProd, setNewProd] = useState({ name: '', price: '', imgUrl: '' });
    const myProducts = db.products.filter(p => p.clientId === currentUser.id);
    const myVendedores = db.vendedores.filter(v => v.clientId === currentUser.id);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setNewProd({ ...newProd, imgUrl: url });
      }
    };

    const submitProduct = (e) => {
      e.preventDefault();
      addProduct({ name: newProd.name, priceUSD: parseFloat(newProd.price), image: newProd.imgUrl || 'https://via.placeholder.com/150', clientId: currentUser.id, clientName: currentUser.company });
      setShowAddModal(false);
      setNewProd({ name: '', price: '', imgUrl: '' });
    };

    const handleAddVendedor = (e) => {
       e.preventDefault();
       const added = { ...newVendedor, id: `v${Date.now()}`, clientId: currentUser.id, company: currentUser.company };
       setDb(prev => ({ ...prev, vendedores: [...prev.vendedores, added] }));
       setNewVendedor({ name: '', email: '', password: '' });
       setShowAddVendedor(false);
       showToast('Vendedor autorizado y registrado.');
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Navbar title={currentUser.company} />
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          
          <div className="bg-gradient-to-br from-[#0A1128] to-[#141E3A] text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="relative z-10 w-full">
              <p className="text-[#C5A184] text-xs font-black uppercase tracking-widest mb-4">Balance de Ventas (USD)</p>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">{formatUSD(currentUser.salesUSD)}</h2>
              <p className="text-sm text-gray-400 max-w-sm">Los fondos se actualizan en tiempo real mediante ventas en el Marketplace y Terminales de Vendedores.</p>
            </div>
            <DollarSign size={200} className="absolute -right-10 -bottom-20 text-white/5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <button onClick={() => setShowAddModal(true)} className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-5 hover:border-[#C5A184]/50 transition-all">
              <div className="w-16 h-16 bg-[#0A1128]/5 rounded-full flex items-center justify-center">
                <Upload size={32} className="text-[#0A1128]" />
              </div>
              <span className="font-black text-lg text-[#0A1128]">Subir Producto</span>
            </button>
            <button onClick={() => window.open('https://wa.me/584125455777?text=Solicito%20asistencia%20KFS', '_blank')} className="bg-[#0A1128] text-white p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-5 hover:bg-gray-900 transition-all relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/20 animate-pulse group-hover:bg-red-500/40 transition-colors"></div>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center relative z-10">
                <Bell size={32} className="text-red-400" />
              </div>
              <span className="font-black text-lg text-white relative z-10">Alerta KFS (Soporte)</span>
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="font-black text-xl text-[#0A1128] flex items-center gap-2"><Users className="text-[#C5A184]"/> Control de Empleados</h3>
              <button onClick={() => setShowAddVendedor(true)} className="text-sm font-bold text-white bg-[#0A1128] px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">+ Añadir Vendedor</button>
            </div>
            <div className="space-y-3">
              {myVendedores.map(v => (
                <div key={v.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0A1128]">{v.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{v.email}</span>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Activo</span>
                </div>
              ))}
              {myVendedores.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin empleados. Añada vendedores para usar los terminales móviles.</p>}
            </div>
          </div>

          <div>
            <h3 className="font-black text-xl text-[#0A1128] mb-6 pl-2">Inventario en Marketplace</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {myProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="h-40 bg-gray-100 w-full overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-sm truncate text-[#0A1128] mb-1">{p.name}</h4>
                    <p className="text-[#C5A184] font-black">{formatUSD(p.priceUSD)}</p>
                  </div>
                </div>
              ))}
              {myProducts.length === 0 && <div className="col-span-2 md:col-span-4 text-center py-10 bg-white rounded-2xl text-gray-400 font-bold">Catálogo vacío.</div>}
            </div>
          </div>
        </div>

        {/* Modal Agregar Producto */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-[#0A1128]">Nuevo Producto</h3>
              <form onSubmit={submitProduct} className="space-y-4">
                <input required type="text" placeholder="Nombre del Artículo" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184] font-bold" />
                <input required type="number" step="0.01" placeholder="Precio Final (USD)" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184] font-black text-lg" />
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {newProd.imgUrl ? (
                     <img src={newProd.imgUrl} className="mx-auto h-32 object-cover rounded-lg shadow-md" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera size={40} className="mb-3" />
                      <span className="text-sm font-bold">Tocar para seleccionar de Galería</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="w-1/3 py-3 rounded-xl bg-gray-100 font-bold text-gray-600">Cancelar</button>
                  <button type="submit" className="w-2/3 py-3 rounded-xl font-black text-[#0A1128] bg-[#C5A184] shadow-lg">Publicar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Agregar Vendedor */}
        {showAddVendedor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-[#0A1128]">Nuevo Empleado</h3>
              <form onSubmit={handleAddVendedor} className="space-y-4">
                <input required type="text" placeholder="Nombre del Vendedor" value={newVendedor.name} onChange={e => setNewVendedor({...newVendedor, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184]" />
                <input required type="email" placeholder="Correo (Usuario de Acceso)" value={newVendedor.email} onChange={e => setNewVendedor({...newVendedor, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184]" />
                <input required type="password" placeholder="Clave de Acceso" value={newVendedor.password} onChange={e => setNewVendedor({...newVendedor, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184]" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddVendedor(false)} className="w-1/3 py-3 rounded-xl bg-gray-100 font-bold text-gray-600">Cancelar</button>
                  <button type="submit" className="w-2/3 py-3 rounded-xl font-black text-white bg-[#0A1128] shadow-lg">Crear Acceso</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const VendedorDashboard = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [newProd, setNewProd] = useState({ name: '', price: '', imgUrl: '' });

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setNewProd({ ...newProd, imgUrl: url });
      }
    };

    const submitProduct = (e) => {
      e.preventDefault();
      addProduct({ name: newProd.name, priceUSD: parseFloat(newProd.price), image: newProd.imgUrl || 'https://via.placeholder.com/150', clientId: currentUser.clientId, clientName: currentUser.company });
      setShowAddModal(false);
      setNewProd({ name: '', price: '', imgUrl: '' });
    };

    const startScanner = async () => {
      setShowScanner(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamRef.current = stream;
      } catch (err) {
        showToast("Cámara no disponible.", "error");
        setShowScanner(false);
      }
    };

    const stopScanner = () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      setShowScanner(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Navbar title={`Terminal: ${currentUser.company}`} />
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
          
          <div className="bg-[#0A1128] text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[#C5A184] text-xs font-black uppercase tracking-widest mb-1">Sesión Operativa</p>
              <h2 className="text-3xl font-black">{currentUser.name}</h2>
              <p className="text-sm text-gray-400 mt-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Terminal en línea y asegurado.</p>
            </div>
            <Activity size={150} className="absolute -right-10 -bottom-10 text-white/5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => setShowAddModal(true)} className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4 hover:border-[#C5A184]/50 transition-all">
              <Upload size={32} className="text-[#0A1128]" />
              <span className="font-black text-[#0A1128]">Subir Producto</span>
            </button>
            <button onClick={startScanner} className="bg-[#C5A184] text-[#0A1128] p-8 rounded-[2rem] shadow-lg flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-all">
              <QrCode size={32} />
              <span className="font-black text-lg">Escanear Venta</span>
            </button>
            <button onClick={() => window.open('https://wa.me/584125455777?text=Solicito%20asistencia%20KFS', '_blank')} className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/10 animate-pulse group-hover:bg-red-500/20 transition-colors"></div>
              <Bell size={32} className="text-red-500 relative z-10" />
              <span className="font-black text-[#0A1128] relative z-10">Soporte KFS</span>
            </button>
          </div>
        </div>

        {/* Reutilización del Modal de Agregar Producto para el Vendedor */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-[#0A1128]">Nuevo Producto</h3>
              <form onSubmit={submitProduct} className="space-y-4">
                <input required type="text" placeholder="Nombre del Artículo" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184] font-bold" />
                <input required type="number" step="0.01" placeholder="Precio Final (USD)" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A184] font-black text-lg" />
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {newProd.imgUrl ? (
                     <img src={newProd.imgUrl} className="mx-auto h-32 object-cover rounded-lg shadow-md" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera size={40} className="mb-3" />
                      <span className="text-sm font-bold">Seleccionar de Galería</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="w-1/3 py-3 rounded-xl bg-gray-100 font-bold text-gray-600">Cancelar</button>
                  <button type="submit" className="w-2/3 py-3 rounded-xl font-black text-[#0A1128] bg-[#C5A184] shadow-lg">Publicar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Scanner */}
        {showScanner && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
              <span className="font-black tracking-widest uppercase">POS Terminal</span>
              <button onClick={stopScanner} className="bg-red-500/80 px-4 py-2 rounded-lg font-bold text-sm backdrop-blur">Cerrar</button>
            </div>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"></video>
              <div className="relative z-10 w-64 h-64 border-4 border-[#C5A184] rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] flex items-center justify-center">
                <div className="w-[90%] h-0.5 bg-[#C5A184] absolute shadow-[0_0_20px_#C5A184] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
            <div className="p-8 bg-[#0A1128] text-center pb-12">
              <p className="text-white text-sm font-bold mb-6">Alinee el Código de Barras en el recuadro</p>
              <button onClick={() => { showToast('Lectura simulada. Terminal listo.'); stopScanner(); }} className="w-full py-4 rounded-xl font-black text-[#0A1128] flex justify-center items-center gap-2 bg-[#C5A184] shadow-lg hover:scale-[1.02] transition-all">
                 Procesar Escaneo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const Marketplace = () => {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-[#0A1128] text-white p-4 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-[#0A1128]/95">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C5A184]/10 rounded-xl flex items-center justify-center">
                 <Package size={20} className="text-[#C5A184]" />
              </div>
              <span className="font-black uppercase tracking-widest text-sm md:text-base hidden sm:block">Kreatek <span className="text-[#C5A184]">Market</span></span>
            </div>
            <div className="flex gap-4">
              <div className="relative hidden md:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar productos..." className="bg-white/10 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#C5A184] w-64 transition-all" />
              </div>
              <button onClick={() => setView('login')} className="text-xs bg-[#C5A184] text-[#0A1128] px-4 py-2 rounded-xl font-black hover:scale-105 transition-all shadow-[0_0_15px_rgba(197,161,132,0.3)]">Portal Interno</button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in-up">
          <div className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-[#0A1128] mb-4 tracking-tight">Ecosistema Comercial Global</h1>
            <p className="text-gray-500 font-bold max-w-2xl mx-auto">Productos directos de comercios verificados y respaldados por la tecnología Kreatek Flow Systems.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {db.products.map(p => (
              <div key={p.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col group hover:-translate-y-1">
                <div className="h-48 md:h-64 bg-gray-100 relative overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                    {p.clientName}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1 bg-white">
                  <h3 className="font-bold text-[#0A1128] mb-2 line-clamp-2 text-lg leading-tight">{p.name}</h3>
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <span className="font-black text-xl text-[#0A1128]">{formatUSD(p.priceUSD)}</span>
                    <button onClick={() => processPurchase(p)} className="bg-[#0A1128] text-white p-3 rounded-xl hover:bg-[#C5A184] hover:text-[#0A1128] transition-colors shadow-md">
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {db.products.length === 0 && (
            <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-100">
              <Package size={80} className="mx-auto text-gray-200 mb-6" />
              <h2 className="text-3xl font-black text-[#0A1128] mb-2">Marketplace en espera</h2>
              <p className="text-gray-400 font-bold">Los comercios de la red aún no han sincronizado su inventario.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isBooting) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex flex-col items-center justify-center">
        <Shield size={64} className="text-[#C5A184] animate-pulse mb-6" />
        <h1 className="text-2xl font-black text-white tracking-widest uppercase">Kreatek <span className="text-[#C5A184]">OS</span></h1>
        <p className="text-[#C5A184]/50 font-mono text-xs mt-4">Iniciando módulos financieros...</p>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-gray-900 selection:bg-[#C5A184] selection:text-[#0A1128]">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}} />
      <Toast />
      {view === 'login' && <LoginView />}
      {view === 'core' && <CoreDashboard />}
      {view === 'promotora' && <PromotoraDashboard />}
      {view === 'client' && <ClientDashboard />}
      {view === 'vendedor' && <VendedorDashboard />}
      {view === 'marketplace' && <Marketplace />}
    </div>
  );
}