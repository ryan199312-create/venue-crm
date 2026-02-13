import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Star, ChevronDown 
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

// --- CONTENT DICTIONARY ---
const content = {
  en: {
    heroTitle: "A Symphony of Taste",
    heroSub: "In the Heart of Culture",
    heroDesc: "Where culinary heritage meets the majestic Victoria Harbour skyline. Experience the art of Cantonese fine dining at the Hong Kong Palace Museum.",
    inquire: "Book Table",
    scroll: "Scroll to Discover",
    sections: [
      {
        id: "weddings",
        title: "The Perfect Union",
        subtitle: "Weddings & Banquets",
        desc: "Begin your forever against a backdrop of history and horizon. Our pillar-less grand ballroom, adorned with crystal accents and panoramic harbour views, offers a setting as timeless as your love story.",
        img: "https://images.unsplash.com/photo-1519225468359-2996bc017507?q=80&w=2070",
        cta: "View Wedding Packages"
      },
      {
        id: "corporate",
        title: "Meetings of Minds",
        subtitle: "Corporate Events",
        desc: "From board meetings to annual galas, impress your stakeholders with world-class hospitality. Our flexible venues are equipped with state-of-the-art AV technology, ensuring your message is heard with clarity and style.",
        img: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069",
        cta: "Plan an Event"
      },
      {
        id: "dining",
        title: "Culinary Craftsmanship",
        subtitle: "Fine Dining",
        desc: "Savor the authentic flavors of Canton. Our Michelin-experienced culinary team selects only the finest seasonal ingredients to craft dishes that are both visually stunning and deeply satisfying.",
        img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974",
        cta: "Browse Menus"
      }
    ]
  },
  zh: {
    heroTitle: "味覺交響",
    heroSub: "文化與美饌",
    heroDesc: "於香港故宮文化博物館，細味傳統粵菜精髓。在維港璀璨景致下，體驗一場視覺與味覺的非凡饗宴。",
    inquire: "立即訂座",
    scroll: "探索更多",
    sections: [
      {
        id: "weddings",
        title: "締造永恆",
        subtitle: "浪漫婚宴",
        desc: "在歷史與天際線的見證下，許下愛的承諾。我們無柱式宴會大廳，配以水晶吊燈與維港全景，為您的婚禮增添無盡氣派與浪漫。",
        img: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2FlandingPage%2Fcouple1.JPEG?alt=media&token=4c25be90-339e-4bd6-a85d-53f47a7b449f",
        cta: "查看婚宴套餐"
      },
      {
        id: "corporate",
        title: "運籌帷幄",
        subtitle: "企業活動",
        desc: "無論是董事會議還是週年晚宴，我們靈活多變的場地與頂尖視聽設備，助您展現專業形象，讓每一場商務盛事圓滿成功。",
        img: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2FlandingPage%2FDesign%20Trust.jpeg?alt=media&token=5da50a4c-c3ad-43dc-aba9-dd8e563babed",
        cta: "策劃商務活動"
      },
      {
        id: "dining",
        title: "匠心獨運",
        subtitle: "精緻粵菜",
        desc: "嚴選上乘時令食材，由米芝蓮級廚藝團隊精心炮製。每一道菜餚都是對傳統工藝的致敬，為您呈獻最正宗的廣東滋味。",
        img: "https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2FlandingPage%2Froasted%20goose.JPG?alt=media&token=3c1c42c2-9e62-4efc-8887-3311b053ca8f",
        cta: "瀏覽菜單"
      }
    ]
  }
};

// --- CONTENT COMPONENTS ONLY ---

const Hero = ({ onOpenBooking, t }) => (
  <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 z-0">
      <motion.img 
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 15, ease: "easeOut" }}
        src="https://firebasestorage.googleapis.com/v0/b/event-management-system-9f764.firebasestorage.app/o/website-assets%2FlandingPage%2Flobster.jpg?alt=media&token=db4ba26e-03d6-48be-83e1-60343ebc8bf0" 
        className="w-full h-full object-cover"
        alt="Hero"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-black/20" />
    </div>

    <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-12">
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1 }}>
        <p className="text-[#C5A059] text-sm md:text-base font-bold tracking-[0.3em] uppercase mb-6 drop-shadow-md">
          {t.heroSub}
        </p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-8 leading-tight drop-shadow-lg">
          {t.heroTitle}
        </h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto font-light leading-relaxed mb-10 antialiased">
          {t.heroDesc}
        </p>
        
        <div className="flex flex-col items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenBooking}
            className="border border-white/30 bg-white/10 backdrop-blur-sm text-white px-10 py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-white hover:text-[#1a1a1a] transition-all duration-500"
          >
            {t.inquire}
          </motion.button>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/50 flex flex-col items-center gap-2 mt-12 cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest">{t.scroll}</span>
            <ChevronDown size={20} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  </section>
);

const EditorialSection = ({ t }) => {
  return (
    <div className="bg-[#FAF9F6] text-[#1a1a1a]"> 
      {t.sections.map((section, index) => {
        const isEven = index % 2 === 0;
        return (
          <div key={index} className="min-h-screen flex flex-col md:flex-row overflow-hidden">
            <div className={`w-full md:w-1/2 h-[50vh] md:h-auto relative overflow-hidden ${isEven ? 'md:order-1' : 'md:order-2'}`}>
              <motion.div 
                whileInView={{ scale: 1.05 }}
                transition={{ duration: 1.5 }}
                className="w-full h-full"
              >
                <img src={section.img} alt={section.title} className="w-full h-full object-cover" />
              </motion.div>
            </div>

            <div className={`w-full md:w-1/2 flex items-center justify-center p-12 md:p-24 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-md"
              >
                <span className="text-[#C5A059] font-bold text-xs uppercase tracking-[0.2em] mb-4 block">
                  {section.subtitle}
                </span>
                <h2 className="text-4xl md:text-5xl font-serif text-[#1a1a1a] mb-6 leading-tight">
                  {section.title}
                </h2>
                <div className="w-12 h-px bg-[#C5A059] mb-8"></div>
                <p className="text-stone-600 leading-loose font-light mb-8 text-sm md:text-base">
                  {section.desc}
                </p>
                <button className="group flex items-center text-xs font-bold uppercase tracking-widest text-[#1a1a1a] hover:text-[#C5A059] transition-colors">
                  {section.cta} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform"/>
                </button>
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ImmersiveDivider = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <div ref={ref} className="relative h-[60vh] overflow-hidden flex items-center justify-center">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <img 
          src="https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?q=80&w=2070" 
          alt="Atmosphere" 
          className="w-full h-[120%] object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </motion.div>
      <div className="text-center px-4">
        <Star size={24} className="text-[#C5A059] mx-auto mb-6" fill="currentColor" />
        <h3 className="text-3xl md:text-5xl font-serif text-white mb-4 italic">"An unforgettable experience."</h3>
        <p className="text-white/80 text-sm tracking-widest uppercase">Michelin Guide 2025</p>
      </div>
    </div>
  );
};

// --- PAGE COMPONENT ---
export default function Home() {
  // Use Context from WebsiteLayout to get shared functions
  const { openBooking, lang } = useOutletContext(); 

  return (
    <div>
      <Hero onOpenBooking={openBooking} t={content[lang]} />
      <EditorialSection t={content[lang]} />
      <ImmersiveDivider />
    </div>
  );
}