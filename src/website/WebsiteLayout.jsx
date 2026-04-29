import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageCircle, ChevronDown, Star } from 'lucide-react';
import { db } from '../core/firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { APP_ID } from '../core/env';

// --- 1. SEPARATED NAVBAR & DROPDOWN ---
const FloatingNav = ({ onOpenBooking, lang, setLang }) => {
  const [scrollCompact, setScrollCompact] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Logic: Compact ONLY if scrolled down AND not hovered AND menu closed
  const isCompact = scrollCompact && !isHovered && !isMobileMenuOpen;

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setScrollCompact(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: lang === 'en' ? 'Home' : '主頁', path: '/' },
    { label: lang === 'en' ? 'Weddings' : '婚宴', path: '/weddings' },
    { label: lang === 'en' ? 'Corporate' : '企業', path: '/corporate' }, 
    { label: lang === 'en' ? 'Dining' : '餐飲', path: '/dining' },       
  ];

  // Stable Configuration
  const transition = { duration: 0.4, ease: [0.25, 1, 0.5, 1] };

  return (
    <div className="fixed top-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none">
      
      {/* --- PART A: THE NAVBAR (Always stays a pill) --- */}
      <motion.nav
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setScrollCompact(false)}
        
        initial={false}
        animate={{
          // WIDTH: If compact=50, If MobileOpen=340 (to match dropdown width), else Auto
          width: isCompact ? 50 : (isMobileMenuOpen ? 340 : 'auto'),
          height: isCompact ? 50 : 60, // Fixed height! Does not grow for menu.
          borderRadius: isCompact ? 25 : 32,
        }}
        transition={transition}
        
        className={`
          pointer-events-auto relative bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl shadow-stone-900/10 
          overflow-hidden flex flex-col justify-center items-center z-50
          ${isCompact ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <div 
          className={`
            flex items-center w-full h-full transition-all duration-300
            ${isCompact ? 'px-1 justify-center' : 'px-1.5 justify-between'} 
          `}
        >
          
          {/* LEFT: LOGO */}
          <motion.div layout="position" className="shrink-0 z-20">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Flogo%2FScreenshot%202026-01-29%20at%206.09.03%20PM.png?alt=media&token=3133c9f6-5756-4e60-98d6-2a2ecc96bc5b"
                className="w-10 h-10 rounded-full object-cover border border-stone-100"
                alt="Logo"
              />
            </Link>
          </motion.div>

          {/* CONTENT WRAPPER */}
          <motion.div
            initial={false}
            animate={{
              width: isCompact ? 0 : "auto",
              opacity: isCompact ? 0 : 1,
            }}
            transition={transition}
            className="flex items-center overflow-hidden whitespace-nowrap h-full flex-1"
          >
            {/* BRAND NAME */}
            <div className="pl-3 font-serif font-bold text-[#1a1a1a] tracking-wide text-lg whitespace-nowrap mr-auto">
              璟瓏軒
            </div>

            {/* DESKTOP LINKS (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-1 mr-4">
              {navItems.map((item) => (
                <Link 
                  key={item.label} 
                  to={item.path} 
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${location.pathname === item.path && item.path !== '/' ? 'bg-stone-100 text-[#C5A059]' : 'text-stone-500 hover:text-[#1a1a1a] hover:bg-stone-50'}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-2 pr-1">
              {/* Desktop Buttons (Hidden Mobile) */}
              <Link to="/portal" className="hidden md:flex text-xs font-bold text-stone-500 hover:text-[#C5A059] transition-colors px-2">
                {lang === 'en' ? 'Portal' : '客戶登入'}
              </Link>
              <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 text-xs font-bold hover:bg-[#C5A059] hover:text-white transition-colors">
                {lang === 'en' ? '繁' : 'EN'}
              </button>
              <button onClick={onOpenBooking} className="hidden md:block bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg hover:bg-[#C5A059] transition-colors whitespace-nowrap">
                {lang === 'en' ? 'Book' : '預約'}
              </button>
              
              {/* Mobile Toggle (Visible Mobile) */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }} 
                className="md:hidden w-9 h-9 flex items-center justify-center bg-stone-100 rounded-full text-stone-600 transition-colors hover:bg-stone-200"
              >
                {isMobileMenuOpen ? <X size={18}/> : <Menu size={18}/>}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.nav>

      {/* --- PART B: THE DROPDOWN (Detached & Floating Below) --- */}
      <AnimatePresence>
        {isMobileMenuOpen && !isCompact && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 8, scale: 1 }} // Adds gap of 8px below nav
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto w-[340px] bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden z-40 p-2"
          >
            <div className="flex flex-col gap-1">
              {/* 1. NAV PAGES */}
              {navItems.map((item) => (
                <Link 
                  key={item.label} 
                  to={item.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    block px-4 py-3 text-center rounded-xl font-medium text-sm transition-all
                    ${location.pathname === item.path 
                      ? 'bg-[#1a1a1a] text-white shadow-md' 
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}
                  `}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* 2. MOBILE ACTIONS (Language & Book) */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-100/50">
                <Link 
                  to="/portal"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="col-span-2 px-4 py-3 rounded-xl bg-stone-100 text-stone-600 text-center text-xs font-bold shadow-sm hover:bg-stone-200 transition-colors uppercase tracking-wider"
                >
                  {lang === 'en' ? 'Client Portal' : '客戶登入'}
                </Link>
                <button 
                  onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} 
                  className="px-4 py-3 rounded-xl bg-stone-50 text-stone-600 text-xs font-bold hover:bg-stone-100 transition-colors uppercase tracking-wider"
                >
                  {lang === 'en' ? '繁 / EN' : 'EN / 繁'}
                </button>
                <button 
                  onClick={() => { onOpenBooking(); setIsMobileMenuOpen(false); }}
                  className="px-4 py-3 rounded-xl bg-[#C5A059] text-white text-xs font-bold shadow-md hover:bg-[#b08d4d] transition-colors uppercase tracking-wider"
                >
                  {lang === 'en' ? 'Book' : '預約'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// --- 2. FOOTER ---
const Footer = () => (
  <footer className="bg-[#1a1a1a] text-stone-400 py-24 px-6 mt-auto border-t border-white/5">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-24 items-start">
      <div className="md:col-span-1 space-y-6">
        <h5 className="font-serif font-bold text-3xl text-white tracking-wide">璟瓏軒</h5>
        <p className="text-sm leading-relaxed text-stone-500 font-light">
          Where culinary heritage meets the Victoria Harbour skyline. Experience the art of Cantonese fine dining at the heart of culture.
        </p>
      </div>
      
      <div className="md:col-span-1">
        <h6 className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-[10px]">Location</h6>
        <p className="text-sm leading-relaxed font-light text-stone-400">
          4/F,<br />
          Hong Kong Palace Museum,<br />
          8 Museum Drive, West Kowloon
        </p>
      </div>

      <div className="md:col-span-1">
        <h6 className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-[10px]">Reservations</h6>
        <ul className="space-y-4 text-sm font-light">
          <li className="flex flex-col">
            <span className="text-stone-600 text-[10px] uppercase mb-1">Phone</span>
            <a href="tel:+85227883939" className="hover:text-[#C5A059] transition-colors">+852 2788 3939</a>
          </li>
          <li className="flex flex-col">
            <span className="text-stone-600 text-[10px] uppercase mb-1">Email</span>
            <a href="mailto:banquet@kinglungheen.com" className="hover:text-[#C5A059] transition-colors">banquet@kinglungheen.com</a>
          </li>
        </ul>
      </div>

      <div className="md:col-span-1">
        <h6 className="text-white font-bold uppercase tracking-[0.2em] mb-6 text-[10px]">Hours</h6>
        <div className="space-y-2 text-sm font-light">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span>Daily</span>
            <span className="text-white">11:00 — 23:00</span>
          </div>
          <p className="text-[10px] text-stone-600 mt-4 leading-relaxed">
            *Hours may vary during special events and public holidays.
          </p>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-stone-800 flex justify-between text-xs text-stone-600">
      <p>&copy; 2026 King Lung Heen.</p>
      <div className="flex gap-4">
        <Link to="/portal" className="hover:text-stone-400">CLIENT LOGIN</Link>
        <Link to="/admin" className="hover:text-stone-400">STAFF LOGIN</Link>
      </div>
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
      await addDoc(collection(db, 'artifacts', APP_ID, 'private', 'data', 'events'), {
        eventName: `${formData.type} - ${formData.name}`,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientPhoneClean: String(formData.phone).replace(/[^0-9]/g, '').slice(-8),
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
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Email</label>
                <input type="email" placeholder="Email address" className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Message</label>
                <textarea rows={3} placeholder="Any special requests or details..." className="w-full bg-stone-50/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all appearance-none resize-none" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
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