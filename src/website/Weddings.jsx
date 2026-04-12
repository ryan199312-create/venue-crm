import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Maximize, Star, Download, ChefHat, Heart, ChevronLeft, ChevronRight, Quote, Plus, Minus, LayoutTemplate } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase'; 
import { doc, onSnapshot } from "firebase/firestore";

// --- STATIC CONTENT ---
const content = {
  en: {
    heroTitle: "Your Timeless Union",
    heroSub: "Weddings at The Palace Museum",
    stats: {
      capacity: { title: "Capacity", t1: "Up to 20 Tables", t2: "240 Guests" },
      space: { title: "The Space", t1: "Pillar-less Ballroom", t2: "Harbour View" },
      location: { title: "Location", t1: "Palace Museum", t2: "West Kowloon" }
    },
    venueShowcase: {
      title: "The Grand Ballroom",
      subtitle: "Where Dreams Unfold",
      desc: "Experience the pillar-less magnificence of our main hall, featuring 7-meter high ceilings and floor-to-ceiling windows overlooking Victoria Harbour.",
      images: [
        { url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2098", label: "Pillar-less Hall" },
        { url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070", label: "Grand Foyer" },
        { url: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070", label: "Harbour View" },
        { url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=2073", label: "Table Setting" }
      ]
    },
    floorPlan: {
      title: "Layout & Floor Plan",
      desc: "Our flexible pillar-less design allows for versatile configurations. Whether you prefer a long table setting or traditional round banquet tables, the space adapts to your vision.",
      highlights: ["6,000 sq. ft. Total Area", "Flexible Partitioning", "Private Bridal Suite Access"],
      cta: "Download Floor Plan PDF",
      img: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2Ffloorplan.JPEG?alt=media&token=cf3627e9-c85a-4dc8-a2e9-bd517a8e1ebc" 
    },
    food: {
      tag: "Culinary Artistry",
      title: "A Feast to Remember",
      desc: "Our Michelin-grade culinary team crafts banquet menus that honor tradition while delighting the modern palate.",
      images: [
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0021.jpg?alt=media&token=9c9b1918-821d-406e-84e4-cb66569f6855", label: "Signature Roast" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0022.jpg?alt=media&token=773b36ba-c0b3-4474-8198-788cdd127791", label: "Handcrafted Dim Sum" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0028.jpg?alt=media&token=9e3a0c22-4f95-4a6a-82af-c874786ea046", label: "Premium Seafood" }
      ]
    },
    team: {
      title: "The Artisans",
      subtitle: "Dedicated to Perfection",
      members: [
        { name: "Chef Lam", role: "Executive Chef", desc: "With over 30 years of experience in Michelin-starred establishments.", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=1968" },
        { name: "Sarah Wong", role: "Banquet Director", desc: "Ensuring every detail of your timeline is executed flawlessly.", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976" },
        { name: "Chef Chen", role: "Dim Sum Head Chef", desc: "A master of delicate craftsmanship.", img: "https://images.unsplash.com/photo-1607631568010-96bbb7386f93?q=80&w=1964" },
        { name: "Jason Lee", role: "Service Director", desc: "Leading our front-of-house team with grace.", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974" }
      ]
    },
    // UPDATED TESTIMONIALS WITH IMAGES
    testimonials: {
      title: "Love Notes",
      items: [
        { 
          text: "The view of the harbor at sunset was magical. The service was impeccable, and the food was the highlight of the night.", 
          author: "Emily & James", 
          date: "December 2025",
          img: "https://images.unsplash.com/photo-1623696129871-3323053bb101?q=80&w=1974" 
        },
        { 
          text: "From the first tasting to the final toast, the team at King Lung Heen made us feel like royalty.", 
          author: "Michael & Sarah", 
          date: "January 2026",
          img: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070" 
        },
        { 
          text: "Our guests are still talking about the suckling pig! Truly a Michelin-level experience.", 
          author: "David & Jessica", 
          date: "November 2025",
          img: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?q=80&w=1974" 
        }
      ]
    },
    bridal: {
      tag: "Private Sanctuary",
      title: "The Bridal Suite",
      desc: "Prepare for your special moment in absolute comfort. Our exclusive bridal suite features a private washroom, full-length mirrors, and professional lighting.",
      features: ["Private en-suite washroom", "Spacious makeup area", "Refreshments served directly"]
    },
    galleryTitle: "Venue & Decor Details",
    menus: {
      title: "Wedding Collections",
      desc: "Curated menus for your special day.", 
      cta: "Download PDF",
      loading: "Loading latest menus..."
    },
    facilities: {
      title: "Guest Convenience",
      parkingTitle: "Parking",
      parkingDesc: "Ample parking is available at the West Kowloon Cultural District Art Park Car Park (Zone F).",
      museumTitle: "Museum Access",
      museumDesc: "Guests can enjoy early access to the Hong Kong Palace Museum exhibitions before the banquet.",
      cta: "Check Availability"
    },
    faq: {
      title: "Common Questions",
      items: [
        { q: "What is the minimum charge?", a: "Minimum charge varies by season and day of the week. Please contact us for the latest rates." },
        { q: "Is AV equipment included?", a: "Yes, our packages include state-of-the-art projection systems and microphones." },
        { q: "Can we bring our own wine?", a: "Corkage fees apply. However, some packages include a waiver for a set number of bottles." }
      ]
    }
  },
  zh: {
    heroTitle: "締造永恆良緣",
    heroSub: "香港故宮文化博物館．婚宴",
    stats: {
      capacity: { title: "宴會容量", t1: "最多 20 席", t2: "240 人" },
      space: { title: "場地特色", t1: "無柱式宴會大廳", t2: "270度維港全景" },
      location: { title: "地理位置", t1: "香港故宮文化博物館", t2: "西九文化區" }
    },
    venueShowcase: {
      title: "宏偉宴會大廳",
      subtitle: "夢想啟航之地",
      desc: "體驗我們無柱式宴會大廳的氣派，擁有7米特高樓底及落地玻璃，維多利亞港的璀璨夜景盡收眼底。",
      images: [
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F0009.JPEG?alt=media&token=92d5cec8-f0b9-4f64-bdd1-9d8c19b3be57", label: "華麗場地" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F0013.JPEG?alt=media&token=da045f82-a110-4d76-adcd-1dac242f93e7", label: "無柱大廳" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F0083.jpg?alt=media&token=581c1621-3b7b-4529-bf59-f3c3e125ed1d", label: "維港景色" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F0084.jpg?alt=media&token=3d86c280-cdeb-4d06-92cc-d5b85a9c6eaa", label: "貼心服務" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F00015.JPEG?alt=media&token=748857b8-f2e5-4db1-b622-73c5bf12e552", label: "精緻佈置" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F0001.JPEG?alt=media&token=70e5e825-b22a-4619-8485-b3a8e6f1ddb8", label: "開闊前廳" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F00022.JPEG?alt=media&token=389d045b-7a11-4338-841a-eec6a8d99e45", label: "特色擺設" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F00020.JPEG?alt=media&token=74980716-2784-4554-ade4-c331ce8425ca", label: "浪漫氛圍" }
      ]
    },
    floorPlan: {
      title: "平面圖及佈局",
      desc: "我們靈活無柱的空間設計，可按您的需求調整佈局。無論是氣派長桌還是傳統圓桌宴會，都能靈活配合。",
      highlights: ["10,000 呎實用面積", "靈活間隔設計"],
      cta: "下載平面圖 (PDF)",
      img: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2Ffloorplan.JPEG?alt=media&token=cf3627e9-c85a-4dc8-a2e9-bd517a8e1ebc"
    },
    food: {
      tag: "極致饗宴",
      title: "米芝蓮級婚宴佳餚",
      desc: "由資深名廚主理，嚴選上乘食材，為您呈獻最正宗的廣東滋味。",
      images: [
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0021.jpg?alt=media&token=9c9b1918-821d-406e-84e4-cb66569f6855", label: "鴻運金豬" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0022.jpg?alt=media&token=773b36ba-c0b3-4474-8198-788cdd127791", label: "精緻點心" },
        { url: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2F0028.jpg?alt=media&token=9e3a0c22-4f95-4a6a-82af-c874786ea046", label: "生猛海鮮" }
      ]
    },
    team: {
      title: "專業團隊",
      subtitle: "匠心服務",
      members: [
        { name: "林師傅", role: "行政總廚", desc: "擁有超過30年掌廚經驗，曾任職多間米芝蓮星級食府。林師傅對食材選用與烹調火候有著極致的執著。", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=1968" },
        { name: "Sarah Wong", role: "宴會總監", desc: "致力為每一對新人打造完美婚禮。從流程策劃到現場統籌，Sarah 的團隊是您最可靠的夥伴。", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976" },
        { name: "陳師傅", role: "點心主廚", desc: "專注鑽研點心工藝三十載。他手製的每一件點心，不僅是味覺的享受，更是視覺的藝術。", img: "https://images.unsplash.com/photo-1607631568010-96bbb7386f93?q=80&w=1964" },
        { name: "Jason Lee", role: "服務總監", desc: "帶領前線團隊，以專業與熱誠款待每一位賓客，確保宴會服務流暢完美。", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974" }
      ]
    },
    // UPDATED TESTIMONIALS (ZH)
    testimonials: {
      title: "新人感言",
      items: [
        { 
          text: "維港日落景色令人陶醉，服務無微不至，食物更是整晚的亮點。", 
          author: "Emily & James", 
          date: "2025年12月",
          img: "https://images.unsplash.com/photo-1623696129871-3323053bb101?q=80&w=1974"
        },
        { 
          text: "從試菜到敬酒，璟瓏軒的團隊讓我們感覺像皇室成員般尊貴。", 
          author: "Michael & Sarah", 
          date: "2026年1月",
          img: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070"
        },
        { 
          text: "賓客們對乳豬讚不絕口！絕對是米芝蓮級的享受。", 
          author: "David & Jessica", 
          date: "2025年11月",
          img: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?q=80&w=1974"
        }
      ]
    },
    bridal: {
      tag: "專屬空間",
      title: "奢華新娘套房",
      desc: "在極致舒適的環境中，為人生重要時刻作好準備。我們設有獨立新娘房，配備私人洗手間及專業化妝照明。",
      features: ["獨立私人洗手間", "寬敞化妝及更衣區", "專屬餐飲送遞服務"]
    },
    galleryTitle: "場地與佈置圖集",
    menus: {
      title: "精選婚宴套餐",
      desc: "實時更新：以下為我們最新的精選宴會菜單。", 
      cta: "下載菜單 (PDF)",
      loading: "正在載入最新菜單..."
    },
    faq: {
      title: "常見問題",
      items: [
        { q: "最低消費是多少？", a: "最低消費視乎季節及日子而定，請聯絡我們獲取最新報價。" },
        { q: "是否包含視聽設備？", a: "是的，我們的套餐已包含專業投影系統及無線咪。" },
        { q: "可以自攜酒水嗎？", a: "自攜酒水需收取開瓶費。部分套餐可獲豁免指定數量。" }
      ]
    },
    facilities: {
      title: "賓客禮遇",
      parkingTitle: "泊車安排",
      parkingDesc: "賓客可使用西九文化區藝術公園停車場 (F區)。凡惠顧婚宴套餐，我們將根據消費金額提供免費泊車優惠。",
      museumTitle: "博物館參觀",
      museumDesc: "賓客可於晚宴前提早到訪，參觀香港故宮文化博物館的珍貴展覽（需另購票）。",
      cta: "查詢婚宴檔期"
    }
  }
};

const formatMoney = (val) => {
  if (!val) return '0';
  return Math.round(parseFloat(val)).toLocaleString('en-US');
};

const Weddings = () => {
  const { openBooking, lang } = useOutletContext();
  const t = content[lang];
  const [presetMenus, setPresetMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  
  // Carousel State
  const [venueIndex, setVenueIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState(null);

  const nextVenue = () => setVenueIndex((prev) => (prev + 1) % t.venueShowcase.images.length);
  const prevVenue = () => setVenueIndex((prev) => (prev - 1 + t.venueShowcase.images.length) % t.venueShowcase.images.length);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "artifacts", "my-venue-crm", "public", "data", "settings", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const allMenus = data.defaultMenus || [];
        const foodMenus = allMenus.filter(m => m.type === 'food');
        setPresetMenus(foodMenus);
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
      
      {/* 1. HERO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 20, ease: "easeOut" }} src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F00052.JPEG?alt=media&token=645124df-17ce-475e-9a81-3ae2f7d1886d" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        <div className="relative z-10 text-center text-white px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2 }}>
            <p className="text-[#C5A059] text-sm font-bold tracking-[0.3em] uppercase mb-4 drop-shadow-sm">{t.heroSub}</p>
            <h1 className="text-5xl md:text-8xl font-serif mb-8 leading-tight drop-shadow-lg font-medium">{t.heroTitle}</h1>
            <button onClick={openBooking} className="border border-white/40 bg-white/10 backdrop-blur-sm text-white px-10 py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-[#1a1a1a] transition-all duration-500">{t.facilities.cta}</button>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-center items-center divide-y md:divide-y-0 md:divide-x divide-[#C5A059]/30">
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.capacity.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.capacity.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.capacity.t2}</p></div>
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.space.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.space.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.space.t2}</p></div>
          <div className="px-12 py-8 text-center w-full"><h3 className="text-[#C5A059] font-serif text-2xl italic mb-2">{t.stats.location.title}</h3><p className="text-stone-600 font-light tracking-wide">{t.stats.location.t1}</p><p className="text-stone-800 font-medium mt-1">{t.stats.location.t2}</p></div>
        </div>
      </section>

      {/* 3. VENUE SHOWCASE */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="max-w-2xl"><span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-2 block">{t.venueShowcase.title}</span><h2 className="text-4xl md:text-5xl font-serif text-[#1a1a1a] mb-6 italic">{t.venueShowcase.subtitle}</h2><p className="text-stone-600 leading-relaxed font-light">{t.venueShowcase.desc}</p></div>
          <div className="hidden md:block h-px w-32 bg-[#C5A059]/50 mb-4"></div>
        </div>
        <div className="relative w-full h-[60vh] md:h-[700px] overflow-hidden bg-stone-200">
          <AnimatePresence mode='wait'>
            <motion.img key={venueIndex} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }} src={t.venueShowcase.images[venueIndex].url} alt={t.venueShowcase.images[venueIndex].label} className="absolute inset-0 w-full h-full object-cover" />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-between px-4 md:px-12 pointer-events-none">
            <button onClick={prevVenue} className="pointer-events-auto p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all backdrop-blur-sm"><ChevronLeft size={24} /></button>
            <button onClick={nextVenue} className="pointer-events-auto p-3 rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all backdrop-blur-sm"><ChevronRight size={24} /></button>
          </div>
          <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 text-white pointer-events-none z-10">
            <motion.div key={venueIndex} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}><h3 className="text-3xl md:text-5xl font-serif italic">{t.venueShowcase.images[venueIndex].label}</h3></motion.div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto z-10">
            {t.venueShowcase.images.map((_, i) => (<button key={i} onClick={() => setVenueIndex(i)} className={`h-2 rounded-full transition-all duration-300 ${i === venueIndex ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white'}`} aria-label={`Go to slide ${i + 1}`} />))}
          </div>
        </div>
      </section>

      {/* 4. FLOOR PLAN */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-4 block"><LayoutTemplate size={16} className="inline mr-2"/> {t.floorPlan.title}</span>
            <h2 className="text-4xl font-serif text-[#1a1a1a] mb-6 italic">{t.floorPlan.title}</h2>
            <p className="text-stone-600 leading-relaxed font-light mb-8">{t.floorPlan.desc}</p>
            <ul className="space-y-4 mb-10">{t.floorPlan.highlights.map((h, i) => (<li key={i} className="flex items-center text-sm font-medium text-[#1a1a1a]"><div className="w-1.5 h-1.5 bg-[#C5A059] rounded-full mr-3"/>{h}</li>))}</ul>
            <button className="flex items-center gap-2 bg-[#1a1a1a] text-white px-8 py-4 rounded-full font-bold hover:bg-[#C5A059] transition-colors shadow-lg text-sm"><Download size={16}/> {t.floorPlan.cta}</button>
          </div>
          <div className="md:w-1/2 relative p-8 bg-stone-50 rounded-3xl border border-stone-100">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Maximize size={64} className="text-[#C5A059]" /></div>
            <img src={t.floorPlan.img} alt="Floor Plan" className="w-full h-auto rounded-xl shadow-sm mix-blend-multiply opacity-80" />
          </div>
        </div>
      </section>

      {/* 5. FOOD GALLERY */}
      <section className="py-24 px-6 max-w-7xl mx-auto bg-[#FDFBF7]">
        <div className="text-center mb-16">
          <span className="text-[#C5A059] text-2xl mb-2 block"><Heart size={24} className="mx-auto" fill="#C5A059" stroke="none" /></span>
          <h2 className="text-4xl font-serif text-[#1a1a1a] mb-4">{t.food.title}</h2>
          <div className="w-px h-12 bg-[#C5A059]/30 mx-auto my-6"></div>
          <p className="text-stone-600 max-w-xl mx-auto leading-loose font-light">{t.food.desc}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {t.food.images.map((img, i) => (
            <div key={i} className="group text-center">
              <div className="overflow-hidden rounded-t-full rounded-b-[200px] h-[400px] mb-6 relative shadow-lg">
                <img src={img.url} alt={img.label} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" />
              </div>
              <h4 className="text-xl font-serif text-[#1a1a1a] italic group-hover:text-[#C5A059] transition-colors">{img.label}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* 6. TEAM */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16"><span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">{t.team.title}</span><h2 className="text-4xl font-serif text-[#1a1a1a] italic">{t.team.subtitle}</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {t.team.members.map((member, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="w-48 h-48 md:w-56 md:h-56 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl relative"><div className="absolute inset-0 bg-[#C5A059]/10 group-hover:bg-transparent transition-colors z-10" /><img src={member.img} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" /></div>
                <div className="text-center md:text-left"><h3 className="text-2xl font-serif text-[#1a1a1a] mb-1">{member.name}</h3><p className="text-[#C5A059] text-xs font-bold uppercase tracking-widest mb-4">{member.role}</p><div className="flex gap-2 justify-center md:justify-start"><Quote size={16} className="text-[#C5A059]/40 shrink-0" /><p className="text-stone-600 text-sm leading-relaxed font-light italic">{member.desc}</p></div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS (Updated with Circular Images) */}
      <section className="py-24 bg-[#FDFBF7]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-8 block">{t.testimonials.title}</span>
          
          <div className="relative min-h-[400px] flex items-center justify-center">
            <AnimatePresence mode='wait'>
              <motion.div 
                key={testimonialIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl flex flex-col items-center"
              >
                {/* COUPLE PHOTO */}
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#C5A059] p-1 mb-8 shadow-lg bg-white">
                  <img src={t.testimonials.items[testimonialIndex].img} alt="Couple" className="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all duration-500" />
                </div>

                <h3 className="text-xl md:text-2xl font-serif text-[#1a1a1a] leading-loose italic mb-6">
                  "{t.testimonials.items[testimonialIndex].text}"
                </h3>
                
                <div className="flex flex-col items-center">
                  <span className="font-bold text-[#C5A059] text-sm uppercase tracking-widest">{t.testimonials.items[testimonialIndex].author}</span>
                  <span className="text-stone-400 text-xs mt-1">{t.testimonials.items[testimonialIndex].date}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-4 mt-8">
            {t.testimonials.items.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setTestimonialIndex(i)} 
                className={`w-3 h-3 rounded-full border border-[#C5A059] transition-all ${i === testimonialIndex ? 'bg-[#C5A059]' : 'bg-transparent'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. DECOR GALLERY */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-serif text-center mb-12 italic text-[#1a1a1a]">{t.galleryTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[600px]">
            <div className="col-span-2 row-span-2 overflow-hidden relative group"><img src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2Fbrides%20room.JPEG?alt=media&token=5ce56b07-4082-48c5-b0bc-f67e68a6dc3a" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="Decor" /></div>
            <div className="col-span-1 row-span-1 overflow-hidden relative group"><img src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2Fweddings%2F00017.JPEG?alt=media&token=5a6d64db-1d4c-4e87-a89b-b8b2f0156d0b" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="Decor" /></div>
            <div className="col-span-1 row-span-2 overflow-hidden relative group"><img src="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="Decor" /></div>
            <div className="col-span-1 row-span-1 overflow-hidden relative group"><img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=2070" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="Decor" /></div>
          </div>
        </div>
      </section>

      {/* 9. MENU PACKAGES */}
      <section className="py-24 bg-[#1a1a1a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`}}></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
            <div className="max-w-xl"><h2 className="text-4xl font-serif mb-4 text-[#FDFBF7]">{t.menus.title}</h2><p className="text-stone-400 font-light">{t.menus.desc}</p></div>
            <button className="mt-6 md:mt-0 flex items-center gap-2 text-[#C5A059] hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"><Download size={16}/> {t.menus.cta}</button>
          </div>
          <div className="flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory no-scrollbar">
            {presetMenus.map((pkg) => {
              const highlights = pkg.content ? pkg.content.split('\n').filter(line => line.trim().length > 0).slice(0, 4) : [];
              const displayPrice = pkg.priceWeekend || pkg.priceWeekday || pkg.price || "Contact Us";
              return (
                <motion.div key={pkg.id} whileHover={{ y: -5 }} className="flex-shrink-0 w-80 md:w-96 bg-[#252525] border border-white/5 p-10 snap-center flex flex-col shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#C5A059] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  <h3 className="text-2xl font-serif text-[#FDFBF7] mb-2">{pkg.title}</h3>
                  <div className="text-[#C5A059] font-mono text-2xl mb-8">{isNaN(displayPrice) ? displayPrice : `$${formatMoney(displayPrice)}`} <span className="text-sm text-stone-500">/ {lang === 'en' ? 'table' : '席'}</span></div>
                  <div className="space-y-4 mb-10 flex-1">{highlights.map((item, idx) => (<div key={idx} className="flex text-sm text-stone-300 font-light leading-relaxed"><span className="text-[#C5A059] mr-3">•</span> {item}</div>))}</div>
                  <button onClick={openBooking} className="w-full border border-white/20 text-white py-3 uppercase tracking-[0.2em] text-xs hover:bg-[#C5A059] hover:border-[#C5A059] hover:text-[#1a1a1a] transition-all duration-300">{lang === 'en' ? 'Inquire' : '查詢'}</button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12"><h2 className="text-3xl font-serif text-[#1a1a1a] mb-2">{t.faq.title}</h2><div className="w-12 h-px bg-[#C5A059] mx-auto"></div></div>
          <div className="space-y-4">
            {t.faq.items.map((item, i) => (
              <div key={i} className="border-b border-stone-200 pb-4">
                <button onClick={() => setActiveAccordion(activeAccordion === i ? null : i)} className="w-full flex justify-between items-center text-left py-2 hover:text-[#C5A059] transition-colors"><span className="font-serif text-lg text-[#1a1a1a]">{item.q}</span>{activeAccordion === i ? <Minus size={16} className="text-[#C5A059]" /> : <Plus size={16} className="text-stone-400" />}</button>
                <AnimatePresence>{activeAccordion === i && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="text-stone-500 font-light text-sm leading-relaxed pt-2 pb-4">{item.a}</p></motion.div>)}</AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FACILITIES / FOOTER CTA */}
      <section className="py-24 bg-[#FDFBF7] text-center">
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

export default Weddings;