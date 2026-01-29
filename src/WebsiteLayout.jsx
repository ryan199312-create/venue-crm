import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageCircle, ChevronDown, Star } from 'lucide-react';
import { db } from './firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- 1. NAVIGATION COMPONENT (Updated with Logo) ---
const FloatingNav = ({ onOpenBooking, lang, setLang }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
      if (!isScrolled) setIsExpanded(false); 
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isCompact = scrolled && !isExpanded;

  const navItems = [
    { label: lang === 'en' ? 'Home' : '主頁', path: '/' },
    { label: lang === 'en' ? 'Weddings' : '婚宴', path: '/weddings' },
    { label: lang === 'en' ? 'Corporate' : '企業', path: '/' }, 
    { label: lang === 'en' ? 'Dining' : '餐飲', path: '/' },       
  ];

  return (
    <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.nav
        layout
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        onMouseEnter={() => scrolled && setIsExpanded(true)}
        onMouseLeave={() => scrolled && setIsExpanded(false)}
        onClick={() => scrolled && setIsExpanded(true)}
        className={`
          pointer-events-auto relative bg-white/90 backdrop-blur-md border border-white/50 shadow-xl shadow-stone-900/5 overflow-hidden
          ${isExpanded ? 'rounded-[32px] px-2' : 'rounded-full'} 
          flex items-center
        `}
        style={{ 
          // Circle Logic: Force 50px width when compact
          width: isCompact ? '50px' : '100%', 
          height: isCompact ? '50px' : 'auto',
          maxWidth: isCompact ? '50px' : '800px',
          justifyContent: isCompact ? 'center' : 'space-between',
          padding: isCompact ? '0' : '0.5rem 0.5rem'
        }}
      >
        {/* LOGO SECTION */}
        <Link to="/" className="flex items-center gap-3 cursor-pointer group shrink-0">
          {/* UPDATED LOGO IMAGE */}
          <motion.img 
            layout="position" 
            src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Flogo%2FScreenshot%202026-01-29%20at%206.09.03%20PM.png?alt=media&token=3133c9f6-5756-4e60-98d6-2a2ecc96bc5b"
            className="w-10 h-10 rounded-full object-cover border border-stone-100"
            alt="King Lung Heen Logo"
          />
          
          <AnimatePresence>
            {!isCompact && (
              <motion.span 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: 'auto' }} 
                exit={{ opacity: 0, width: 0 }} 
                className="font-serif font-bold text-[#1a1a1a] tracking-wide whitespace-nowrap overflow-hidden"
              >
                璟瓏軒
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* LINKS SECTION */}
        {!isCompact && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2"
          >
            {navItems.map((item) => (
              <Link 
                key={item.label} 
                to={item.path} 
                className={`px-4 py-2 text-sm font-medium transition-colors ${location.pathname === item.path && item.path !== '/' ? 'text-[#C5A059]' : 'text-stone-500 hover:text-[#C5A059]'}`}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}

        {/* RIGHT ACTIONS */}
        <AnimatePresence>
          {!isCompact && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex items-center gap-2"
            >
              <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-xs font-bold hover:bg-[#C5A059] hover:text-white transition-colors">
                {lang === 'en' ? '繁' : 'EN'}
              </button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenBooking} className="bg-[#1a1a1a] text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-[#C5A059] transition-colors whitespace-nowrap">
                {lang === 'en' ? 'Book' : '預約'}
              </motion.button>
              
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="md:hidden w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full ml-1">
                {isExpanded ? <X size={16}/> : <Menu size={16}/>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isExpanded && !isCompact && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              className="md:hidden w-full overflow-hidden absolute top-14 left-0 bg-white/95 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-2xl"
            >
              <div className="pt-2 pb-4 px-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link 
                    key={item.label} 
                    to={item.path} 
                    onClick={() => setIsExpanded(false)} 
                    className={`block px-4 py-3 text-center rounded-2xl font-medium ${location.pathname === item.path ? 'bg-[#C5A059] text-white' : 'text-stone-800 bg-stone-50'}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
};

// --- 2. FOOTER ---
const Footer = () => (
  <footer className="bg-[#1a1a1a] text-stone-400 py-20 px-6 mt-auto">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
      <div className="space-y-6 max-w-sm">
        <h5 className="font-serif font-bold text-3xl text-white">璟瓏軒</h5>
        <p className="text-sm leading-relaxed text-stone-500">Located at the Hong Kong Palace Museum.</p>
      </div>
      <div className="grid grid-cols-2 gap-12 text-sm">
        <div>
          <h6 className="text-white font-bold uppercase tracking-widest mb-4 text-xs">Contact</h6>
          <ul className="space-y-3">
            <li>+852 2788 3939</li>
            <li>banquet@kinglungheen.com</li>
          </ul>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-stone-800 flex justify-between text-xs text-stone-600">
      <p>&copy; 2026 King Lung Heen.</p>
      <a href="/admin" className="hover:text-stone-400">STAFF LOGIN</a>
    </div>
  </footer>
);

// --- 3. GLASS MODAL ---
const GlassModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', date: '', type: '婚宴 (Wedding)', guests: '', message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', 'my-venue-crm', 'public', 'data', 'events'), {
        eventName: `${formData.type} - ${formData.name}`,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        date: formData.date,
        eventType: formData.type,
        guestCount: formData.guests,
        otherNotes: `Web Inquiry: ${formData.message}`,
        status: 'tentative', 
        orderId: `WEB-${Date.now().toString().slice(-6)}`,
        createdAt: serverTimestamp(),
        source: 'website_inquiry'
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({ name: '', phone: '', email: '', date: '', type: '婚宴 (Wedding)', guests: '', message: '' });
        onClose();
      }, 3000);
    } catch (error) {
      alert("System busy. Please try WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
      
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[40px] shadow-2xl overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-3xl font-serif font-bold text-[#1a1a1a]">Reserve</h3>
              <p className="text-sm text-stone-500 mt-1">Begin your journey with us.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
              <X size={20} className="text-stone-600"/>
            </button>
          </div>

          {success ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-[#C5A059]/10 text-[#C5A059] rounded-full flex items-center justify-center mb-4 mx-auto">
                <Star size={32} fill="currentColor" />
              </div>
              <h4 className="text-xl font-bold text-[#1a1a1a] mb-2">Request Received</h4>
              <p className="text-stone-500 text-sm">We will contact you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Name</label>
                  <input required type="text" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Phone</label>
                  <input required type="tel" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Date</label>
                  <input required type="date" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Guests</label>
                  <input required type="number" placeholder="Approx. count" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all" value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Event Type</label>
                <div className="relative">
                  <select className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 appearance-none transition-all" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>婚宴 (Wedding)</option>
                    <option>公司活動 (Corporate)</option>
                    <option>生日派對 (Birthday)</option>
                    <option>其他 (Other)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit" 
                className="w-full bg-[#1a1a1a] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#C5A059] transition-colors disabled:opacity-50 mt-4 tracking-widest text-xs uppercase"
              >
                {loading ? 'Processing...' : 'Request Availability'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const WhatsAppFloat = () => (
  <motion.a href="https://wa.me/85252226066" target="_blank" rel="noreferrer" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="fixed bottom-8 right-8 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-[#128C7E] transition-colors"><MessageCircle size={28} fill="white" /></motion.a>
);

// --- MAIN LAYOUT EXPORT ---
export default function WebsiteLayout() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [lang, setLang] = useState('zh');

  return (
    <div className="font-sans bg-[#FAF9F6] text-[#1a1a1a] selection:bg-[#C5A059] selection:text-white flex flex-col min-h-screen">
      <FloatingNav onOpenBooking={() => setIsBookingOpen(true)} lang={lang} setLang={setLang} />
      
      {/* Pass lang and setLang down via Outlet Context */}
      <div className="flex-grow">
        <Outlet context={{ openBooking: () => setIsBookingOpen(true), lang, setLang }} />
      </div>

      <Footer />
      <WhatsAppFloat />
      <GlassModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
}