import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Added 'Star' to the import list below
import { Users, Maximize, Mic, Wifi, Monitor, Download, ChevronLeft, ChevronRight, LayoutTemplate, Coffee, Star } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

// --- FIREBASE IMPORTS ---
import { db } from '../core/firebase'; 
import { doc, onSnapshot } from "firebase/firestore";
import { APP_ID } from "../core/env";

// ... keep the rest of the file exactly as it was ...
// --- STATIC CONTENT ---
const content = {
  en: {
    heroTitle: "Elevate Your Event",
    heroSub: "Corporate Events at The Palace Museum",
    stats: {
      capacity: { title: "Capacity", t1: "240 Pax (Banquet)", t2: "300 Pax (Theater)" },
      tech: { title: "Technology", t1: "4K LED Wall", t2: "Pro Audio System" },
      location: { title: "Location", t1: "Palace Museum", t2: "West Kowloon" }
    },
    venueShowcase: {
      title: "The Grand Hall",
      subtitle: "Where Business Meets Culture",
      desc: "Impress your stakeholders in a venue that commands respect. Our pillar-less design and floor-to-ceiling harbor views provide a prestigious backdrop for annual dinners, product launches, and seminars.",
      images: [
        { url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069", label: "Gala Dinner Setup" },
        { url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012", label: "Conference Theater" },
        { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070", label: "Executive Boardroom" },
        { url: "https://images.unsplash.com/photo-1561489413-985b06da5bee?q=80&w=2070", label: "Cocktail Reception" }
      ]
    },
    floorPlan: {
      title: "Layout & Configurations",
      desc: "Versatility is key. Our hall transforms seamlessly from a theater-style seminar venue by day to an elegant banquet hall by night.",
      highlights: ["Pillar-less Visibility", "Stage & LED Wall Ready", "Flexible Partitioning"],
      cta: "Download Floor Plan",
      img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932" 
    },
    eventTypes: {
      title: "Event Possibilities",
      types: [
        { title: "Annual Dinners", img: "https://images.unsplash.com/photo-1519671482538-518b5c2c681c?q=80&w=2068" },
        { title: "Seminars", img: "https://images.unsplash.com/photo-1544531696-dd1486aee99b?q=80&w=2070" },
        { title: "Product Launches", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012" },
        { title: "VIP Receptions", img: "https://images.unsplash.com/photo-1561489413-985b06da5bee?q=80&w=2070" }
      ]
    },
    techSpecs: {
      tag: "Capabilities",
      title: "Built for Business",
      desc: "We understand that corporate events require flawless execution. Our venue is equipped with enterprise-grade audiovisual technology to ensure your message is heard and seen clearly.",
      features: [
        { icon: <Monitor />, text: "P2.5 LED Video Wall (8m x 3m)" },
        { icon: <Mic />, text: "Sennheiser Wireless Microphones" },
        { icon: <Wifi />, text: "Dedicated High-Speed Wi-Fi" },
        { icon: <Coffee />, text: "All-Day Coffee & Tea Service" }
      ]
    },
    menus: {
      title: "Corporate Collections",
      desc: "From executive lunches to lavish spring dinners.", 
      cta: "Download Menu PDF",
      loading: "Loading menus..."
    },
    clients: {
      title: "Trusted By",
      list: ["Global Banks", "Tech Giants", "Luxury Retailers", "Government Bodies"] // Placeholders
    },
    facilities: {
      title: "Guest Logistics",
      parkingTitle: "Parking",
      parkingDesc: "Ample parking at West Kowloon Cultural District Art Park Car Park (Zone F). VIP drop-off available at museum entrance.",
      museumTitle: "Museum Access",
      museumDesc: "Offer your delegates a cultural experience with private guided tours of the Palace Museum (subject to arrangement).",
      cta: "Inquire for Rates"
    }
  },
  zh: {
    heroTitle: "成就非凡盛事",
    heroSub: "香港故宮文化博物館．企業宴會",
    stats: {
      capacity: { title: "宴會容量", t1: "240人 (晚宴)", t2: "300人 (劇院式)" },
      tech: { title: "會議科技", t1: "4K LED 屏幕", t2: "專業音響系統" },
      location: { title: "地理位置", t1: "香港故宮文化博物館", t2: "西九文化區" }
    },
    venueShowcase: {
      title: "多功能宴會大廳",
      subtitle: "商業與文化的交匯",
      desc: "在充滿文化氣息的場地舉辦您的年度盛事。無柱式設計配合維港全景，為您的週年晚宴、發布會或研討會提供最體面的舞台。",
      images: [
        { url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069", label: "週年晚宴" },
        { url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012", label: "商務研討會" },
        { url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070", label: "董事會議" },
        { url: "https://images.unsplash.com/photo-1561489413-985b06da5bee?q=80&w=2070", label: "雞尾酒會" }
      ]
    },
    floorPlan: {
      title: "平面圖及佈局",
      desc: "空間靈活多變，可按活動性質調整。從白天的劇院式會議到晚上的圓桌盛宴，我們的團隊都能為您妥善安排。",
      highlights: ["全場無柱設計", "配備舞台及LED牆", "靈活間隔"],
      cta: "下載平面圖",
      img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932"
    },
    eventTypes: {
      title: "多元化活動場地",
      types: [
        { title: "週年晚宴 / 春茗", img: "https://images.unsplash.com/photo-1519671482538-518b5c2c681c?q=80&w=2068" },
        { title: "商務研討會", img: "https://images.unsplash.com/photo-1544531696-dd1486aee99b?q=80&w=2070" },
        { title: "產品發布會", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012" },
        { title: "VIP 接待酒會", img: "https://images.unsplash.com/photo-1561489413-985b06da5bee?q=80&w=2070" }
      ]
    },

    Cases: {
      title: "成功案例",
      types: [
        { title: "香港賽馬會", img: "https://images.unsplash.com/photo-1519671482538-518b5c2c681c?q=80&w=2068" },
        { title: "A機構", img: "https://images.unsplash.com/photo-1544531696-dd1486aee99b?q=80&w=2070" },
        { title: "B機構", img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012" },
        { title: "C機構", img: "https://images.unsplash.com/photo-1561489413-985b06da5bee?q=80&w=2070" }
      ]
    },  
    techSpecs: {
      tag: "專業設備",
      title: "為商務而設",
      desc: "我們深知企業活動對細節的嚴格要求。場地配備企業級視聽科技，確保您的演講與展示清晰傳達。",
      features: [
        { icon: <Monitor />, text: "P2.5 高清 LED 電視牆 (8米 x 3米)" },
        { icon: <Mic />, text: "Sennheiser 無線咪高峰系統" },
        { icon: <Wifi />, text: "專用高速 Wi-Fi 網絡" },
        { icon: <Coffee />, text: "全日咖啡及茶水服務" }
      ]
    },
    menus: {
      title: "精選商務套餐",
      desc: "由行政午餐到豪華春茗晚宴，應有盡有。", 
      cta: "下載菜單 (PDF)",
      loading: "正在載入菜單..."
    },
    clients: {
      title: "合作品牌",
      list: ["投資銀行", "科技巨頭", "高端零售", "政府機構"] 
    },
    facilities: {
      title: "賓客安排",
      parkingTitle: "泊車",
      parkingDesc: "賓客可使用西九文化區藝術公園停車場 (F區)。博物館入口設有 VIP 落客區。",
      museumTitle: "博物館參觀",
      museumDesc: "為您的嘉賓安排專屬導賞團，參觀香港故宮文化博物館的珍貴展品 (需預約)。",
      cta: "查詢企業報價"
    }
  }
};

const formatMoney = (val) => {
  if (!val) return '0';
  return Math.round(parseFloat(val)).toLocaleString('en-US');
};

const Corporate = () => {
  const { openBooking, lang } = useOutletContext();
  const t = content[lang];
  const [presetMenus, setPresetMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  
  // Carousel State
  const [venueIndex, setVenueIndex] = useState(0);
  const nextVenue = () => setVenueIndex((prev) => (prev + 1) % t.venueShowcase.images.length);
  const prevVenue = () => setVenueIndex((prev) => (prev - 1 + t.venueShowcase.images.length) % t.venueShowcase.images.length);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "artifacts", APP_ID, "public", "data", "settings", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const allMenus = data.defaultMenus || [];
        // Ideally filter for 'corporate', but for now using 'food' or all
        const corpMenus = allMenus.filter(m => m?.type === 'food'); 
        setPresetMenus(corpMenus);
      }
      setLoadingMenus(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      setLoadingMenus(false);
    });
    return () => unsub();
  }, [t.venueShowcase.images.length]);

  return (
    <div className="bg-[#FFFFFF] text-[#2C2C2C]"> 
      
      {/* 1. HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.img 
          initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/20 to-slate-900/80" />
        <div className="relative z-10 text-center text-white px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2 }}>
            <p className="text-[#C5A059] text-sm font-bold tracking-[0.3em] uppercase mb-4 drop-shadow-sm">{t.heroSub}</p>
            <h1 className="text-5xl md:text-8xl font-serif mb-8 leading-tight drop-shadow-lg font-medium">{t.heroTitle}</h1>
            <button onClick={openBooking} className="border border-white/40 bg-white/10 backdrop-blur-sm text-white px-10 py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-[#1a1a1a] transition-all duration-500">
              {t.facilities.cta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-center items-center divide-y md:divide-y-0 md:divide-x divide-[#C5A059]/30">
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.capacity.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.capacity.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.capacity.t2}</p></div>
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.tech.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.tech.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.tech.t2}</p></div>
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.location.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.location.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.location.t2}</p></div>
        </div>
      </section>

      {/* 3. VENUE SHOWCASE (Editorial Style) */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-6 mb-16 flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-2 block">{t.venueShowcase.title}</span>
            <h2 className="text-4xl md:text-5xl font-serif text-[#1a1a1a] italic">{t.venueShowcase.subtitle}</h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
          <div className="relative h-[60vh] md:h-auto overflow-hidden">
            <AnimatePresence mode='wait'>
              <motion.img 
                key={venueIndex} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.8 }} 
                src={t.venueShowcase.images[venueIndex].url} 
                className="absolute inset-0 w-full h-full object-cover" 
              />
            </AnimatePresence>
            <div className="absolute inset-0 flex items-center justify-between px-6">
              <button onClick={prevVenue} className="p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all backdrop-blur-sm"><ChevronLeft size={24} /></button>
              <button onClick={nextVenue} className="p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all backdrop-blur-sm"><ChevronRight size={24} /></button>
            </div>
          </div>
          
          <div className="bg-white flex items-center justify-center p-12 md:p-24">
            <motion.div 
              key={venueIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-md"
            >
              <h3 className="text-3xl font-serif mb-6 italic text-[#1a1a1a]">{t.venueShowcase.images[venueIndex].label}</h3>
              <p className="text-stone-600 leading-loose font-light mb-8">{t.venueShowcase.desc}</p>
              <div className="flex gap-2">
                {t.venueShowcase.images.map((_, i) => (
                  <button key={i} onClick={() => setVenueIndex(i)} className={`h-1 transition-all duration-300 ${i === venueIndex ? 'bg-[#C5A059] w-8' : 'bg-stone-200 w-4'}`} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. TECH SPECS (Modern Grid) */}
      <section className="py-32 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div>
            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-6 block">{t.techSpecs.tag}</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-8">{t.techSpecs.title}</h2>
            <p className="text-stone-400 leading-loose font-light mb-12 text-lg">{t.techSpecs.desc}</p>
            <div className="grid grid-cols-1 gap-6">
              {t.techSpecs.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-white transition-all">
                    {React.cloneElement(feat.icon, { size: 20 })}
                  </div>
                  <span className="text-sm font-medium tracking-wide uppercase">{feat.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 border border-[#C5A059]/20 rounded-3xl translate-x-8 translate-y-8 -z-10"></div>
            <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=2012" className="rounded-3xl shadow-2xl" alt="Tech" />
          </div>
        </div>
      </section>

      {/* 5. EVENT TYPES (Editorial Grid) */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-serif italic text-[#1a1a1a] mb-6">{t.eventTypes.title}</h2>
            <div className="w-24 h-px bg-[#C5A059] mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {t.eventTypes.types.map((type, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -12 }} 
                className="group relative h-[500px] rounded-[40px] overflow-hidden cursor-pointer"
              >
                <img src={type.img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={type.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-10">
                  <h3 className="text-white font-serif text-2xl mb-2">{type.title}</h3>
                  <div className="w-0 group-hover:w-12 h-px bg-[#C5A059] transition-all duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TRUSTED BY SECTION */}
      <section className="py-24 bg-stone-50 border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-stone-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-12 block">{t.clients.title}</span>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale transition-all">
            {t.clients.list.map((client, i) => (
              <span key={i} className="text-2xl md:text-3xl font-serif text-stone-800 italic">{client}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 8. MENU PACKAGES */}
      <section className="py-24 bg-[#FDFBF7] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-[#C5A059]/20 pb-8">
            <div className="max-w-xl"><h2 className="text-4xl font-serif mb-4 text-[#1a1a1a]">{t.menus.title}</h2><p className="text-stone-500 font-light">{t.menus.desc}</p></div>
            <button className="mt-6 md:mt-0 flex items-center gap-2 text-[#1a1a1a] border border-[#1a1a1a] px-6 py-3 rounded-full hover:bg-[#1a1a1a] hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"><Download size={16}/> {t.menus.cta}</button>
          </div>
          <div className="flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory no-scrollbar">
            {presetMenus.map((pkg) => {
              const highlights = pkg.content ? pkg.content.split('\n').filter(line => line.trim().length > 0).slice(0, 4) : [];
              const displayPrice = pkg.priceWeekend || pkg.priceWeekday || pkg.price || "Contact Us";
              return (
                <motion.div key={pkg.id} whileHover={{ y: -5 }} className="flex-shrink-0 w-80 md:w-96 bg-white border border-stone-100 p-10 snap-center flex flex-col shadow-xl relative overflow-hidden group rounded-3xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#C5A059] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  <h3 className="text-2xl font-serif text-[#1a1a1a] mb-2">{pkg.title}</h3>
                  <div className="text-[#C5A059] font-mono text-2xl mb-8">{isNaN(displayPrice) ? displayPrice : `$${formatMoney(displayPrice)}`} <span className="text-sm text-stone-400">/ {lang === 'en' ? 'table' : '席'}</span></div>
                  <div className="space-y-4 mb-10 flex-1">{highlights.map((item, idx) => (<div key={idx} className="flex text-sm text-stone-500 font-light leading-relaxed"><span className="text-[#C5A059] mr-3">•</span> {item}</div>))}</div>
                  <button onClick={openBooking} className="w-full bg-[#1a1a1a] text-white py-3 uppercase tracking-[0.2em] text-xs hover:bg-[#C5A059] transition-all duration-300 rounded-lg">{lang === 'en' ? 'Inquire' : '查詢'}</button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FACILITIES / FOOTER CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <Star size={24} className="text-[#C5A059] mx-auto mb-6" fill="currentColor" />
          <h2 className="text-4xl font-serif text-[#1a1a1a] mb-8 italic">{t.facilities.title}</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left mb-12">
            <div><h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-2 text-xs">{t.facilities.parkingTitle}</h4><p className="text-stone-500 font-light text-sm leading-relaxed">{t.facilities.parkingDesc}</p></div>
            <div><h4 className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-2 text-xs">{t.facilities.museumTitle}</h4><p className="text-stone-500 font-light text-sm leading-relaxed">{t.facilities.museumDesc}</p></div>
          </div>
          <button onClick={openBooking} className="bg-[#1a1a1a] text-white px-10 py-4 rounded-full font-bold hover:bg-[#C5A059] transition-colors shadow-xl">{t.facilities.cta}</button>
        </div>
      </section>

    </div>
  );
};

export default Corporate;