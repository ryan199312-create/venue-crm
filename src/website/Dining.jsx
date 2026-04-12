import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Coffee, Wine, Star, Download, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase'; 
import { doc, onSnapshot } from "firebase/firestore";

// --- STATIC CONTENT ---
const content = {
  en: {
    heroTitle: "A Taste of Heritage",
    heroSub: "Fine Cantonese Dining at Palace Museum",
    intro: "Experience the zenith of Cantonese culinary art. From delicate handcrafted dim sum to time-honored roasted meats, every dish is a tribute to tradition.",
    stats: {
      cuisine: { title: "Cuisine", t1: "Fine Cantonese", t2: "Dim Sum Classics" },
      rooms: { title: "Private Dining", t1: "5 VIP Rooms", t2: "Harbour Views" },
      hours: { title: "Hours", t1: "11:00 - 15:30 (Lunch)", t2: "18:00 - 22:30 (Dinner)" }
    },
    // CHEF'S SIGNATURES (Masonry/Grid)
    signatures: {
      title: "Chef's Signatures",
      dishes: [
        { name: "Signature Roasted Goose", desc: "Crispy skin with tender, juicy meat roasted to perfection.", img: "https://images.unsplash.com/photo-1599321955726-e04842d6f2e1?q=80&w=2070" },
        { name: "Goldfish Dumplings", desc: "Hand-shaped shrimp dumplings delicately crafted to resemble swimming goldfish.", img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=2070" },
        { name: "Braised Abalone", desc: "Slow-cooked in supreme oyster sauce, a symbol of prosperity.", img: "https://images.unsplash.com/photo-1626804475297-411d8c67c5df?q=80&w=2070" }
      ]
    },
    // PRIVATE DINING
    vip: {
      title: "Private Dining",
      desc: "Host your intimate gatherings in one of our 5 exclusive VIP rooms. Each room offers privacy, dedicated service, and breathtaking views of the Victoria Harbour.",
      features: ["Panoramic Harbour View", "Private Washroom", "Customizable Menus", "Sound System"],
      img: "https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?q=80&w=2070"
    },
    menus: {
      title: "Seasonal Menus",
      desc: "Explore our a la carte and tasting set options.", 
      cta: "Download Full Menu",
      loading: "Loading menus..."
    },
    reservation: {
      title: "Reserve Your Table",
      desc: "Lunch: 11:00 - 15:30 | Dinner: 18:00 - 22:30",
      cta: "Book Now"
    }
  },
  zh: {
    heroTitle: "宮廷饗宴",
    heroSub: "香港故宮文化博物館．精緻粵菜",
    intro: "品嚐粵菜巔峰之作。從精緻的手工點心到傳統燒味，每一道菜都是對傳統烹飪藝術的致敬。",
    stats: {
      cuisine: { title: "菜系", t1: "精緻粵菜", t2: "手工點心" },
      rooms: { title: "貴賓廂房", t1: "5間獨立包廂", t2: "飽覽維港景致" },
      hours: { title: "營業時間", t1: "11:00 - 15:30 (午市)", t2: "18:00 - 22:30 (晚市)" }
    },
    signatures: {
      title: "主廚推介",
      dishes: [
        { name: "皇牌燒鵝", desc: "皮脆肉嫩，肉汁豐盈，以傳統秘方烤製。", img: "https://images.unsplash.com/photo-1599321955726-e04842d6f2e1?q=80&w=2070" },
        { name: "金魚餃", desc: "栩栩如生的手工蝦餃，造型精緻，色香味俱全。", img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=2070" },
        { name: "蠔皇原隻鮑魚", desc: "以上等蠔油慢火炆煮，入口軟腍入味。", img: "https://images.unsplash.com/photo-1626804475297-411d8c67c5df?q=80&w=2070" }
      ]
    },
    vip: {
      title: "貴賓廂房",
      desc: "我們的5間獨立貴賓房為您的私人聚會提供極致的私隱度。每間房間均配備專屬服務員及維港醉人景色。",
      features: ["270度維港全景", "獨立洗手間", "定制菜單", "視聽設備"],
      img: "https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?q=80&w=2070"
    },
    menus: {
      title: "時令菜單",
      desc: "探索我們的單點菜式及廚師發辦套餐。", 
      cta: "下載完整菜單",
      loading: "正在載入菜單..."
    },
    reservation: {
      title: "立即訂座",
      desc: "午市: 11:00 - 15:30 | 晚市: 18:00 - 22:30",
      cta: "網上預約"
    }
  }
};

const formatMoney = (val) => {
  if (!val) return '0';
  return Math.round(parseFloat(val)).toLocaleString('en-US');
};

const Dining = () => {
  const { openBooking, lang } = useOutletContext();
  const t = content[lang];
  const [presetMenus, setPresetMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "artifacts", "my-venue-crm", "public", "data", "settings", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const allMenus = data.defaultMenus || [];
        // Filter for 'dining' type menus (assuming you will add this type in admin)
        // Fallback: show all if no specific 'dining' tag, or filter generic 'food'
        const diningMenus = allMenus.filter(m => m.type === 'dining' || m.type === 'food');
        setPresetMenus(diningMenus);
      }
      setLoadingMenus(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      setLoadingMenus(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="bg-[#FFFFFF] text-[#2C2C2C]"> 
      
      {/* 1. HERO SECTION (Warm/Gold Tones) */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <motion.img 
          initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2 }}>
            <p className="text-[#C5A059] text-sm font-bold tracking-[0.3em] uppercase mb-4 drop-shadow-sm">{t.heroSub}</p>
            <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-tight drop-shadow-lg">{t.heroTitle}</h1>
            <p className="text-lg text-stone-200 font-light leading-relaxed mb-8">{t.intro}</p>
            <button onClick={openBooking} className="border border-white/40 bg-white/10 backdrop-blur-sm text-white px-10 py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-[#1a1a1a] transition-all duration-500">
              {t.reservation.cta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. INFO BAR */}
      <section className="py-16 px-6 border-b border-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-center divide-y md:divide-y-0 md:divide-x divide-[#C5A059]/30">
          <div className="px-12 py-6 text-center w-full">
            <Utensils className="mx-auto text-[#C5A059] mb-3" size={24} />
            <h3 className="font-bold text-[#1a1a1a] uppercase tracking-widest text-xs mb-1">{t.stats.cuisine.title}</h3>
            <p className="text-stone-500 font-serif italic">{t.stats.cuisine.t1}</p>
          </div>
          <div className="px-12 py-6 text-center w-full">
            <Users className="mx-auto text-[#C5A059] mb-3" size={24} />
            <h3 className="font-bold text-[#1a1a1a] uppercase tracking-widest text-xs mb-1">{t.stats.rooms.title}</h3>
            <p className="text-stone-500 font-serif italic">{t.stats.rooms.t1}</p>
          </div>
          <div className="px-12 py-6 text-center w-full">
            <Clock className="mx-auto text-[#C5A059] mb-3" size={24} />
            <h3 className="font-bold text-[#1a1a1a] uppercase tracking-widest text-xs mb-1">{t.stats.hours.title}</h3>
            <p className="text-stone-500 font-serif italic">{t.stats.hours.t1}</p>
          </div>
        </div>
      </section>

      {/* 3. CHEF'S SIGNATURES (3-Column) */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">Culinary Highlights</span>
            <h2 className="text-4xl font-serif text-[#1a1a1a] italic">{t.signatures.title}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {t.signatures.dishes.map((dish, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="group"
              >
                <div className="overflow-hidden rounded-2xl mb-6 shadow-lg">
                  <img src={dish.img} className="w-full h-80 object-cover transform group-hover:scale-110 transition-transform duration-700" alt={dish.name} />
                </div>
                <h3 className="text-2xl font-serif text-[#1a1a1a] mb-2 group-hover:text-[#C5A059] transition-colors">{dish.name}</h3>
                <p className="text-stone-500 leading-relaxed text-sm font-light">{dish.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PRIVATE DINING (Split Layout) */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2 relative">
            <div className="absolute -top-4 -left-4 w-full h-full border border-[#C5A059]/30 rounded-3xl translate-x-4 translate-y-4"></div>
            <img src={t.vip.img} className="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover" alt="Private Room" />
          </div>
          <div className="md:w-1/2">
            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">Exclusive Experience</span>
            <h2 className="text-4xl font-serif text-[#1a1a1a] mb-6 italic">{t.vip.title}</h2>
            <p className="text-stone-600 leading-loose font-light mb-8">{t.vip.desc}</p>
            <ul className="grid grid-cols-2 gap-4 mb-10">
              {t.vip.features.map((f, i) => (
                <li key={i} className="flex items-center text-sm text-[#1a1a1a] font-medium">
                  <Star size={14} className="text-[#C5A059] mr-2" fill="currentColor" /> {f}
                </li>
              ))}
            </ul>
            <button onClick={openBooking} className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold hover:bg-[#C5A059] transition-colors text-sm uppercase tracking-widest">
              {t.reservation.cta}
            </button>
          </div>
        </div>
      </section>

      {/* 5. MENUS (Horizontal Scroll) */}
      <section className="py-24 bg-[#1a1a1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`}}></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
            <div className="max-w-xl">
              <h2 className="text-4xl font-serif mb-4 text-[#FDFBF7]">{t.menus.title}</h2>
              <p className="text-stone-400 font-light">{t.menus.desc}</p>
            </div>
            <button className="mt-6 md:mt-0 flex items-center gap-2 text-[#C5A059] hover:text-white transition-colors text-sm uppercase tracking-widest font-bold">
              <Download size={16}/> {t.menus.cta}
            </button>
          </div>

          <div className="flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory no-scrollbar">
            {presetMenus.map((pkg) => {
              const highlights = pkg.content ? pkg.content.split('\n').filter(line => line.trim().length > 0).slice(0, 4) : [];
              const displayPrice = pkg.price || "Seasonal";
              return (
                <motion.div 
                  key={pkg.id}
                  whileHover={{ y: -5 }}
                  className="flex-shrink-0 w-80 md:w-96 bg-[#252525] border border-white/5 p-10 snap-center flex flex-col shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#C5A059] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  <h3 className="text-2xl font-serif text-[#FDFBF7] mb-2">{pkg.title}</h3>
                  <div className="text-[#C5A059] font-mono text-xl mb-8">
                    {isNaN(displayPrice) ? displayPrice : `$${formatMoney(displayPrice)}`}
                  </div>
                  <div className="space-y-4 mb-10 flex-1">
                    {highlights.map((item, idx) => (
                      <div key={idx} className="flex text-sm text-stone-300 font-light leading-relaxed">
                        <span className="text-[#C5A059] mr-3">•</span> {item}
                      </div>
                    ))}
                  </div>
                  <button onClick={openBooking} className="w-full border border-white/20 text-white py-3 uppercase tracking-[0.2em] text-xs hover:bg-[#C5A059] hover:border-[#C5A059] hover:text-[#1a1a1a] transition-all duration-300">
                    {lang === 'en' ? 'Book Table' : '訂座'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. LOCATION / FOOTER CTA */}
      <section className="py-24 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <MapPin size={32} className="text-[#C5A059] mx-auto mb-6" />
          <h2 className="text-4xl font-serif text-[#1a1a1a] mb-8 italic">{t.reservation.title}</h2>
          <p className="text-stone-500 mb-10">{t.reservation.desc}</p>
          <button onClick={openBooking} className="bg-[#1a1a1a] text-white px-12 py-4 rounded-full font-bold hover:bg-[#C5A059] transition-colors shadow-xl">
            {t.reservation.cta}
          </button>
        </div>
      </section>

    </div>
  );
};

export default Dining;