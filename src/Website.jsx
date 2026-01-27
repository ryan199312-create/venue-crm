import { db } from './firebase';
import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Instagram, 
  Facebook, 
  ArrowRight,
  Star,
  Users,
  Calendar,
  Clock,
  ChefHat
} from 'lucide-react';

// --- FIREBASE IMPORT (Use the same config as your VMS) ---

import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// REPLACE WITH YOUR EXISTING CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCNJ-TZcqTres8fXcZr3rLaH5x2xLsk3Os",
    authDomain: "event-management-system-9f764.firebaseapp.com",
    projectId: "event-management-system-9f764",
    storageBucket: "event-management-system-9f764.firebasestorage.app",
    messagingSenderId: "281238143424",
    appId: "1:281238143424:web:b463511f0b3c4d68f84825",
};

// Initialize only if not already initialized
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const Navbar = ({ onOpenBooking }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#A57C00] rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
              璟
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold text-stone-900 tracking-wide">璟瓏軒</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#A57C00] font-medium">King Lung Heen</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center">
            {['Home', 'Weddings', 'Corporate', 'Dining', 'Location'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-stone-600 hover:text-[#A57C00] transition-colors uppercase tracking-widest">
                {item}
              </a>
            ))}
            <button 
              onClick={onOpenBooking}
              className="bg-[#A57C00] text-white px-6 py-2.5 rounded-none hover:bg-[#8a6800] transition-all duration-300 text-sm font-medium tracking-wide"
            >
              INQUIRE NOW
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-stone-800">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 animate-in slide-in-from-top-5">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {['Home', 'Weddings', 'Corporate', 'Dining', 'Location'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block px-3 py-3 text-base font-medium text-stone-800 hover:bg-stone-50 rounded-md">
                {item}
              </a>
            ))}
            <button 
              onClick={() => { onOpenBooking(); setIsMobileMenuOpen(false); }}
              className="w-full mt-4 bg-[#A57C00] text-white px-6 py-3 text-center font-medium"
            >
              BOOK AN EVENT
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero = ({ onOpenBooking }) => (
  <div id="home" className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
    {/* Background Image with Overlay */}
    <div className="absolute inset-0 z-0">
      <img 
        src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop" 
        alt="Victoria Harbour View" 
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-stone-900/40 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent" />
    </div>

    {/* Content */}
    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16 animate-in fade-in zoom-in duration-1000">
      <div className="inline-block border border-white/30 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6">
        <span className="text-white text-xs font-bold tracking-[0.2em] uppercase">Located at Hong Kong Palace Museum</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 leading-tight">
        Culinary Artistry <br/> 
        <span className="italic text-[#E5C568]">With a Royal View</span>
      </h1>
      <p className="text-lg md:text-xl text-stone-200 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
        Experience exquisite Cantonese banquets and Michelin-standard service overlooking the breathtaking Victoria Harbour skyline.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onOpenBooking}
          className="bg-white text-stone-900 px-8 py-4 min-w-[200px] font-bold text-sm tracking-widest hover:bg-[#A57C00] hover:text-white transition-all duration-300"
        >
          PLAN YOUR EVENT
        </button>
        <button className="border border-white text-white px-8 py-4 min-w-[200px] font-bold text-sm tracking-widest hover:bg-white hover:text-stone-900 transition-all duration-300">
          VIEW MENUS
        </button>
      </div>
    </div>
  </div>
);

const Features = () => {
  const features = [
    {
      title: "Wedding Banquets",
      desc: "Create unforgettable memories with our bespoke wedding packages, bridal room facilities, and stunning harbour backdrop.",
      img: "https://images.unsplash.com/photo-1519225468359-2996bc017507?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: "Corporate Events",
      desc: "Impress your stakeholders with our versatile venues, capable of hosting conferences, annual dinners, and seminars.",
      img: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2069&auto=format&fit=crop"
    },
    {
      title: "Exquisite Dining",
      desc: "Savor our signature Dim Sum and roasted specialties, crafted by our expert culinary team using premium ingredients.",
      img: "https://images.unsplash.com/photo-1563245372-f217205d2919?q=80&w=2070&auto=format&fit=crop"
    }
  ];

  return (
    <div id="services" className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[#A57C00] text-sm font-bold tracking-[0.2em] uppercase mb-3">Our Services</h2>
          <h3 className="text-4xl font-serif text-stone-900">Curated Experiences</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative h-80 overflow-hidden mb-6">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all z-10"/>
                <img 
                  src={f.img} 
                  alt={f.title} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <h4 className="text-2xl font-serif text-stone-900 mb-3 group-hover:text-[#A57C00] transition-colors">{f.title}</h4>
              <p className="text-stone-500 leading-relaxed text-sm">{f.desc}</p>
              <div className="mt-4 flex items-center text-[#A57C00] text-sm font-bold tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                EXPLORE <ArrowRight size={16} className="ml-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Stats = () => (
  <div className="bg-[#1c1c1c] text-white py-20 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {[
        { icon: Users, label: "Capacity", val: "240+" },
        { icon: Star, label: "Service", val: "Premium" },
        { icon: MapPin, label: "Location", val: "West Kowloon" },
        { icon: ChefHat, label: "Cuisine", val: "Cantonese" }
      ].map((s, i) => (
        <div key={i} className="p-6 border border-white/10 hover:border-[#A57C00] transition-colors duration-300">
          <s.icon className="mx-auto text-[#A57C00] mb-4" size={32} />
          <div className="text-3xl font-serif font-bold mb-2">{s.val}</div>
          <div className="text-stone-400 text-xs uppercase tracking-widest">{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const Footer = () => (
  <footer id="location" className="bg-[#111] text-stone-400 py-16 text-sm">
    <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
      <div>
        <div className="text-white font-serif text-2xl font-bold mb-6">璟瓏軒 <span className="text-[#A57C00]">.</span></div>
        <p className="mb-6 leading-relaxed">
          Situated in the heart of West Kowloon Cultural District, we bring traditional craftsmanship to a modern palace setting.
        </p>
        <div className="flex space-x-4">
          <a href="#" className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-[#A57C00] hover:border-[#A57C00] hover:text-white transition-all"><Instagram size={18}/></a>
          <a href="#" className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-[#A57C00] hover:border-[#A57C00] hover:text-white transition-all"><Facebook size={18}/></a>
        </div>
      </div>
      
      <div>
        <h4 className="text-white font-bold uppercase tracking-widest mb-6">Contact Us</h4>
        <ul className="space-y-4">
          <li className="flex items-start">
            <MapPin className="mr-3 text-[#A57C00] flex-shrink-0" size={18} />
            <span>4/F, Hong Kong Palace Museum, 8 Museum Drive, West Kowloon, TST</span>
          </li>
          <li className="flex items-center">
            <Phone className="mr-3 text-[#A57C00]" size={18} />
            <span>+852 2788 3939</span>
          </li>
          <li className="flex items-center">
            <Mail className="mr-3 text-[#A57C00]" size={18} />
            <span>banquet@kinglungheen.com</span>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="text-white font-bold uppercase tracking-widest mb-6">Opening Hours</h4>
        <ul className="space-y-2">
          <li className="flex justify-between border-b border-white/10 pb-2">
            <span>Mon - Fri</span>
            <span className="text-white">11:00 - 23:00</span>
          </li>
          <li className="flex justify-between border-b border-white/10 pb-2">
            <span>Sat - Sun & PH</span>
            <span className="text-white">10:00 - 23:00</span>
          </li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-white/10 text-center text-xs">
      &copy; {new Date().getFullYear()} King Lung Heen. All rights reserved.
    </div>
  </footer>
);

// --- INTEGRATION: The Booking Modal ---
const BookingModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    type: '婚宴 (Wedding)',
    guests: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🚀 INTEGRATION MAGIC: Writing directly to your VMS database
      await addDoc(collection(db, 'artifacts', 'my-venue-crm', 'public', 'data', 'events'), {
        // Map fields to match your VMS structure (initialFormState)
        eventName: `${formData.type} - ${formData.name}`,
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        date: formData.date,
        eventType: formData.type,
        guestCount: formData.guests,
        otherNotes: `Web Inquiry: ${formData.message}`,
        
        // Default VMS Fields
        status: 'tentative', // Mark as tentative/inquiry
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
      alert("Error submitting form. Please call us directly.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#A57C00] p-6 text-white text-center">
          <h3 className="font-serif text-2xl font-bold mb-1">Plan Your Event</h3>
          <p className="text-white/80 text-sm">Fill in the details below and we'll contact you shortly.</p>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="p-12 text-center h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Star size={32} fill="currentColor" />
            </div>
            <h4 className="text-xl font-bold text-stone-800 mb-2">Inquiry Sent!</h4>
            <p className="text-stone-500">Thank you, {formData.name}. Our team will reach out to you within 24 hours.</p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                <input required type="text" className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] transition-colors" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                <input required type="tel" className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] transition-colors" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+852" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
              <input required type="email" className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] transition-colors" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@address.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                <input required type="date" className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] transition-colors text-stone-600" 
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Guests</label>
                <input required type="number" className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] transition-colors" 
                  value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} placeholder="Approx. count" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Event Type</label>
              <select className="w-full border-b border-stone-300 py-2 outline-none focus:border-[#A57C00] bg-white"
                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option>婚宴 (Wedding)</option>
                <option>公司活動 (Corporate)</option>
                <option>生日派對 (Birthday)</option>
                <option>其他 (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Message</label>
              <textarea className="w-full border border-stone-300 rounded p-3 outline-none focus:border-[#A57C00] transition-colors resize-none h-24 text-sm" 
                value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Any special requests or preferences?" />
            </div>

            <button disabled={loading} type="submit" className="w-full bg-stone-900 text-white py-4 font-bold tracking-widest hover:bg-[#A57C00] transition-all duration-300 disabled:opacity-50 mt-4">
              {loading ? 'SENDING...' : 'SUBMIT INQUIRY'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default function Website() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <div className="font-sans text-stone-800 bg-white selection:bg-[#A57C00] selection:text-white">
      <Navbar onOpenBooking={() => setIsBookingOpen(true)} />
      <Hero onOpenBooking={() => setIsBookingOpen(true)} />
      <Features />
      <Stats />
      <Footer />
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </div>
  );
}