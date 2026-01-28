import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, MapPin, Phone, Mail, Instagram, Facebook, ArrowRight, 
  Star, Users, Calendar, Clock, ChefHat, MessageCircle, ChevronRight 
} from 'lucide-react';

import { db } from './firebase'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- CONTENT DICTIONARY ---
const content = {
  en: {
    nav: ['Weddings', 'Corporate', 'Dining', 'Venue'],
    inquire: "Book Now",
    heroTitle: "Royal Cantonese",
    heroSub: "The Palace Museum Experience",
    heroDesc: "A culinary journey situated in the heart of Hong Kong's cultural district, offering Michelin-standard service with a panoramic harbour view.",
    features: [
      { t: "Weddings", d: "Bespoke bridal experiences.", img: "https://images.unsplash.com/photo-1519225468359-2996bc017507?q=80&w=2070" },
      { t: "Corporate", d: "Impress your stakeholders.", img: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069" },
      { t: "Private Dining", d: "Intimate gatherings.", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974" }
    ],
    rights: "All rights reserved."
  },
  zh: {
    nav: ['婚宴', '企業', '餐飲', '場地'],
    inquire: "立即預約",
    heroTitle: "御膳",
    heroSub: "故宮文化體驗",
    heroDesc: "位於香港故宮文化博物館，坐擁維港絕美景色，呈獻米芝蓮級數的精緻粵菜宴席。",
    features: [
      { t: "浪漫婚宴", d: "度身訂造的夢幻婚禮。", img: "https://images.unsplash.com/photo-1519225468359-2996bc017507?q=80&w=2070" },
      { t: "企業活動", d: "專業會議與週年晚宴。", img: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069" },
      { t: "私人饗宴", d: "極致私隱的用餐體驗。", img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974" }
    ],
    rights: "版權所有"
  }
};

// --- COMPONENTS ---

// --- 1. MORPHING "ISLAND" NAVBAR ---
const FloatingNav = ({ onOpenBooking, lang, setLang }) => {
  // State: Are we scrolled down? Are we hovering/expanding the island?
  const [scrolled, setScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const t = content[lang];

  // Handle Scroll Detection
  useEffect(() => {
    const handleScroll = () => {
      // If we scroll past 100px, shrink to island mode
      const isScrolled = window.scrollY > 100;
      setScrolled(isScrolled);
      // If we scroll back to top, auto-expand again
      if (!isScrolled) setIsExpanded(false); 
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Interaction Handlers
  const handleMouseEnter = () => { if (scrolled) setIsExpanded(true); };
  const handleMouseLeave = () => { if (scrolled) setIsExpanded(false); };
  const toggleMobile = () => setIsExpanded(!isExpanded);

  // Dynamic Styles based on state
  const isCompact = scrolled && !isExpanded;

  return (
    <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.nav
        layout // <--- THE MAGIC PROP: Automatically morphs width/height
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          pointer-events-auto
          relative bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-black/10
          overflow-hidden
          ${isExpanded ? 'rounded-[32px] p-2' : 'rounded-full px-2 py-2'} // Shape change
        `}
        // Dynamic Widths for different states
        style={{ 
          width: isCompact ? 'auto' : '100%', 
          maxWidth: isCompact ? '200px' : '800px' 
        }}
      >
        <div className="flex items-center justify-between h-12 px-2">
          
          {/* LOGO (Always Visible) */}
          <motion.div layout="position" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-[#D4AF37] font-serif font-bold">
              璟
            </div>
            {/* Hide text in compact mode to save space */}
            <AnimatePresence>
              {!isCompact && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-serif font-bold text-stone-800 tracking-wide whitespace-nowrap"
                >
                  璟瓏軒
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* DESKTOP LINKS (Hidden in Compact Mode) */}
          <div className="hidden md:flex items-center">
             <AnimatePresence>
                {!isCompact && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
                  >
                    {t.nav.map((item, i) => (
                      <a 
                        key={i} 
                        href={`#section-${i}`} 
                        className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all"
                      >
                        {item}
                      </a>
                    ))}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          {/* RIGHT ACTIONS (Lang + CTA) */}
          <motion.div layout="position" className="flex items-center gap-2">
            
            {/* In compact mode, show a tiny dot indicator or menu icon */}
            {isCompact ? (
               <div className="text-xs font-medium text-stone-400 flex items-center gap-1 pr-2">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
                 <span>Menu</span>
               </div>
            ) : (
              <>
                <button 
                  onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                  className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition-colors"
                >
                  {lang === 'en' ? '繁' : 'EN'}
                </button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenBooking}
                  className="bg-stone-900 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg"
                >
                  {t.inquire}
                </motion.button>
              </>
            )}

            {/* Mobile Toggle Button */}
            <button onClick={toggleMobile} className="md:hidden w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full ml-1">
               {isExpanded ? <X size={16}/> : <Menu size={16}/>}
            </button>
          </motion.div>
        </div>

        {/* MOBILE MENU CONTENT (Expands downwards inside the island) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pt-4 pb-2 px-2 flex flex-col gap-2">
                 {t.nav.map((item, i) => (
                    <a 
                      key={i} 
                      href={`#section-${i}`} 
                      onClick={() => setIsExpanded(false)}
                      className="block px-4 py-3 text-center text-stone-800 bg-stone-50 rounded-2xl font-medium"
                    >
                      {item}
                    </a>
                 ))}
                 {/* Mobile Lang Switch */}
                 <div className="flex justify-center mt-2 border-t border-stone-100 pt-3">
                   <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      Switch Language: {lang === 'en' ? '繁體' : 'English'}
                   </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.nav>
    </div>
  );
};

// 2. Liquid Hero Section
const Hero = ({ onOpenBooking, t }) => (
  <section className="relative h-[95vh] w-full p-4 flex flex-col justify-end overflow-hidden">
    {/* Background Video/Image Container with Apple-style rounded corners */}
    <div className="absolute inset-4 rounded-[40px] overflow-hidden z-0 shadow-2xl">
      <motion.img 
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: "easeOut" }}
        src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070" 
        className="w-full h-full object-cover"
        alt="Hero"
      />
      {/* Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
    </div>

    {/* Text Content */}
    <div className="relative z-10 p-12 max-w-6xl mx-auto w-full text-white mb-8">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white/20 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white/90">
            Est. 2022
          </div>
          <div className="bg-[#D4AF37]/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-white">
            West Kowloon
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-serif font-medium tracking-tight leading-[0.9] mb-6">
          {t.heroTitle} <span className="text-[#D4AF37] italic font-light">{t.heroSub}</span>
        </h1>
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <p className="text-lg md:text-xl text-white/80 max-w-md font-light leading-relaxed">
            {t.heroDesc}
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenBooking}
            className="group flex items-center justify-between bg-white/90 backdrop-blur-xl text-stone-900 px-2 py-2 pr-6 rounded-full font-bold shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] transition-all"
          >
            <span className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center text-white mr-4 group-hover:rotate-45 transition-transform">
              <ArrowRight size={18} />
            </span>
            {content.en.inquire === t.inquire ? "Plan Your Event" : "策劃您的活動"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  </section>
);

// 3. Bento Grid Features
const BentoGrid = ({ t }) => (
  <section className="py-24 px-4 bg-[#F5F5F7]"> {/* Apple's Light Grey */}
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[600px]">
        
        {/* Large Card (Weddings) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 md:row-span-2 relative group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
        >
          <img src={t.features[0].img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Weddings" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-8 flex flex-col justify-end">
            <h3 className="text-3xl font-bold text-white mb-2">{t.features[0].t}</h3>
            <p className="text-white/80">{t.features[0].d}</p>
          </div>
        </motion.div>

        {/* Small Card 1 (Corporate) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          viewport={{ once: true }}
          className="relative group rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500"
        >
          <img src={t.features[1].img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Corporate" />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors p-6 flex flex-col justify-end">
            <h3 className="text-xl font-bold text-white">{t.features[1].t}</h3>
          </div>
        </motion.div>

        {/* Small Card 2 (Dining) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
          className="relative group rounded-3xl overflow-hidden bg-stone-900 shadow-sm hover:shadow-xl transition-all duration-500 flex items-center justify-center"
        >
          <div className="absolute inset-0 opacity-40">
             <img src={t.features[2].img} className="w-full h-full object-cover" alt="Dining" />
          </div>
          <div className="relative z-10 text-center p-6">
            <ChefHat size={40} className="text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">{t.features[2].t}</h3>
            <button className="mt-4 text-xs font-bold text-white border border-white/30 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors">
              Explore Menu
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  </section>
);

// 4. Glass Booking Modal
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
      {/* Background Blur Overlay */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-md"
      />
      
      {/* Modal Content */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-serif font-bold text-stone-900">Reserve Your Date</h3>
              <p className="text-sm text-stone-500">We'll check availability instantly.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
              <X size={20} className="text-stone-600"/>
            </button>
          </div>

          {success ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full flex items-center justify-center mb-4 mx-auto">
                <Star size={32} fill="currentColor" />
              </div>
              <h4 className="text-xl font-bold text-stone-800 mb-2">Request Received</h4>
              <p className="text-stone-500 text-sm">We'll be in touch within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Name</label>
                  <input required type="text" className="w-full bg-white/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Phone</label>
                  <input required type="tel" className="w-full bg-white/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Date</label>
                  <input required type="date" className="w-full bg-white/50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Guests</label>
                  <input required type="number" placeholder="e.g. 100" className="w-full bg-white/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Type</label>
                <select className="w-full bg-white/50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option>婚宴 (Wedding)</option>
                  <option>公司活動 (Corporate)</option>
                  <option>生日派對 (Birthday)</option>
                  <option>其他 (Other)</option>
                </select>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit" 
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-stone-800 transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Processing...' : 'Submit Request'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// 5. Minimal Footer
const Footer = ({ t }) => (
  <footer className="bg-white py-12 border-t border-stone-100">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="text-center md:text-left">
        <h5 className="font-serif font-bold text-xl text-stone-900">璟瓏軒</h5>
        <p className="text-stone-400 text-xs mt-1">Hong Kong Palace Museum</p>
      </div>
      <div className="flex gap-6">
        <MapPin size={20} className="text-stone-400 hover:text-[#D4AF37] transition-colors cursor-pointer" />
        <Instagram size={20} className="text-stone-400 hover:text-[#D4AF37] transition-colors cursor-pointer" />
        <Mail size={20} className="text-stone-400 hover:text-[#D4AF37] transition-colors cursor-pointer" />
      </div>
      <div className="text-xs text-stone-400 font-medium">
        <a href="/admin" className="hover:text-stone-900 transition-colors">Staff Login</a>
        <span className="mx-2">|</span>
        &copy; {new Date().getFullYear()} {t.rights}
      </div>
    </div>
  </footer>
);

const WhatsAppFloat = () => (
  <motion.a 
    href="https://wa.me/85252226066" 
    target="_blank" 
    rel="noreferrer"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center"
  >
    <MessageCircle size={24} fill="white" />
  </motion.a>
);

// --- MAIN LAYOUT ---
export default function Website() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [lang, setLang] = useState('zh');

  return (
    <div className="font-sans bg-[#F5F5F7] text-stone-900 selection:bg-[#D4AF37] selection:text-white">
      <FloatingNav onOpenBooking={() => setIsBookingOpen(true)} lang={lang} setLang={setLang} />
      <Hero onOpenBooking={() => setIsBookingOpen(true)} t={content[lang]} />
      <BentoGrid t={content[lang]} />
      <Footer t={content[lang]} />
      <WhatsAppFloat />
      <GlassModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
}