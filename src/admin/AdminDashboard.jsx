import React, { useState, useMemo } from 'react';
import { BarChart3, AlertTriangle, Bell, CheckCircle, DollarSign, TrendingUp, CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { formatMoney } from '../services/billingService';
import { Card, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = ({ events, openEditModal, setIsDataAiOpen }) => {
  const { selectedVenueId, outlets, hasPermission, userProfile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- FILTERED EVENTS (Venue + Ownership) ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Venue Filter
      if (selectedVenueId !== 'all' && e.venueId !== selectedVenueId) return false;

      // 2. Ownership Filter (RBAC)
      const isOwner = (e.salesRep?.split(', ').includes(userProfile?.displayName)) || (e.clientEmail === userProfile?.email);
      const isAdmin = userProfile?.role === 'admin';
      const canView = isAdmin || !hasPermission('manage_own_only') || isOwner;
      
      return canView;
    });
  }, [events, selectedVenueId, userProfile, hasPermission]);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let monthRevenue = 0;
    let annualRevenue = 0;
    let confirmedCount = 0;

    filteredEvents.forEach(e => {
      if (e.status === 'cancelled') return;

      const eventDate = new Date(e.date);
      const amount = Number(e.totalAmount) || 0;

      if (e.status === 'confirmed') confirmedCount++;

      // Monthly Revenue (Current Month)
      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        monthRevenue += amount;
      }

      // Annual Revenue (Current Year)
      if (eventDate.getFullYear() === currentYear) {
        annualRevenue += amount;
      }
    });

    return { monthRevenue, annualRevenue, confirmedCount };
  }, [filteredEvents]);

  // --- OUTLET PERFORMANCE (For HQ View) ---
  const outletPerformance = useMemo(() => {
    if (selectedVenueId !== 'all') return null;

    const perf = {};
    outlets.forEach(o => {
      perf[o.id] = { id: o.id, name: o.name, monthRev: 0, yearRev: 0, count: 0 };
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    events.forEach(e => {
      if (e.status === 'cancelled' || !e.venueId || !perf[e.venueId]) return;
      
      const eventDate = new Date(e.date);
      const amount = Number(e.totalAmount) || 0;

      perf[e.venueId].count++;
      if (eventDate.getFullYear() === currentYear) {
        perf[e.venueId].yearRev += amount;
        if (eventDate.getMonth() === currentMonth) {
          perf[e.venueId].monthRev += amount;
        }
      }
    });

    return Object.values(perf).sort((a, b) => b.yearRev - a.yearRev);
  }, [events, selectedVenueId, outlets]);

  // --- OVERDUE PAYMENTS ---
  const overduePayments = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const list = [];

    filteredEvents.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date < todayStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount, venueId: e.venueId });
        }
      };

      check(e.deposit1, e.deposit1Received, e.deposit1Date, '付款 1');
      check(e.deposit2, e.deposit2Received, e.deposit2Date, '付款 2');
      check(e.deposit3, e.deposit3Received, e.deposit3Date, '付款 3');

      // Balance check
      let balanceDate = e.date;
      if (e.balanceDueDateType === '10daysPrior' && e.date) {
        const d = new Date(e.date);
        d.setDate(d.getDate() - 10);
        balanceDate = d.toISOString().split('T')[0];
      }
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1 || 0) - Number(e.deposit2 || 0) - Number(e.deposit3 || 0);
      if (balanceVal > 0 && !e.balanceReceived && balanceDate < todayStr) {
        list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: balanceDate, amount: balanceVal, venueId: e.venueId });
      }
    });
    return list;
  }, [filteredEvents]);

  // --- UPCOMING PAYMENTS (14 DAYS) ---
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);

    const todayStr = today.toLocaleDateString('en-CA');
    const next14DaysStr = next14Days.toLocaleDateString('en-CA');
    const list = [];

    filteredEvents.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date >= todayStr && date <= next14DaysStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount, venueId: e.venueId });
        }
      };

      check(e.deposit1, e.deposit1Received, e.deposit1Date, '付款 1');
      check(e.deposit2, e.deposit2Received, e.deposit2Date, '付款 2');
      check(e.deposit3, e.deposit3Received, e.deposit3Date, '付款 3');

      // Balance check
      let balanceDate = e.date;
      if (e.balanceDueDateType === '10daysPrior' && e.date) {
        const d = new Date(e.date);
        d.setDate(d.getDate() - 10);
        balanceDate = d.toISOString().split('T')[0];
      }
      const balanceVal = Number(e.totalAmount) - Number(e.deposit1 || 0) - Number(e.deposit2 || 0) - Number(e.deposit3 || 0);
      if (balanceVal > 0 && !e.balanceReceived) {
        const checkDate = balanceDate || e.date;
        if (checkDate >= todayStr && checkDate <= next14DaysStr) {
          list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: checkDate, amount: balanceVal, venueId: e.venueId });
        }
      }
    });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredEvents]);

  // --- UPCOMING EVENTS ---
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return filteredEvents
      .filter(e => e.date >= todayStr && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [filteredEvents]);

  // --- CALENDAR LOGIC ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('zh-HK', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(e => {
      if (e.status === 'cancelled') return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const currentMonthEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return filteredEvents
      .filter(e => {
        if (e.status === 'cancelled') return false;
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredEvents, currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {selectedVenueId === 'all' ? '集團概覽 (HQ Overview)' : '分店儀表板 (Outlet Dashboard)'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {selectedVenueId === 'all' ? '所有分店的彙總數據' : `當前分店: ${outlets.find(o => o.id === selectedVenueId)?.name}`}
          </p>
        </div>
        <button
          onClick={() => setIsDataAiOpen(true)}
          className="group relative px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <BarChart3 size={18} className="text-emerald-100 group-hover:-translate-y-0.5 transition-transform" />
          <span>AI 數據分析 (Ask DB)</span>
        </button>
      </div>

      {/* 0. Outlet Performance (HQ ONLY) */}
      {selectedVenueId === 'all' && outletPerformance && (
        <Card className="overflow-hidden border-t-4 border-t-indigo-600">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Building2 size={18} className="mr-2 text-indigo-600" /> 分店業績排行 (Outlet Performance)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-4 py-3">分店 (Outlet)</th>
                  <th className="px-4 py-3 text-right">本月營收</th>
                  <th className="px-4 py-3 text-right">年度營收</th>
                  <th className="px-4 py-3 text-right">訂單總數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outletPerformance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">${formatMoney(item.monthRev)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">${formatMoney(item.yearRev)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{item.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 1. Alerts & Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overduePayments.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-red-800 font-bold flex items-center mb-3">
              <AlertTriangle size={20} className="mr-2" /> 逾期款項 (Overdue)
            </h3>
            <div className="space-y-2">
              {overduePayments.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-50 transition-all" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                    <div className="text-xs text-red-600 font-medium">
                      {selectedVenueId === 'all' && <span className="text-slate-400 mr-1">[{outlets.find(o => o.id === item.venueId)?.name}]</span>}
                      {item.type} • 應付: {item.date}
                    </div>
                  </div>
                  <div className="text-red-700 font-bold font-mono">${formatMoney(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className={`border-t-4 border-t-amber-400 ${overduePayments.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Bell size={18} className="mr-2 text-amber-500" /> 即將到期款項 (14 Days)
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{upcomingPayments.length} 筆</span>
          </div>
          <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
            {upcomingPayments.length === 0 ? (
              <div className="text-center text-slate-400 py-4 text-sm">未來 14 天無到期款項</div>
            ) : (
              upcomingPayments.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-transparent hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                  <div>
                    <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedVenueId === 'all' && <span className="text-slate-400 mr-1">[{outlets.find(o => o.id === item.venueId)?.name}]</span>}
                      {item.type} • 到期: <span className="text-amber-600 font-bold">{item.date}</span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-slate-700">${formatMoney(item.amount)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 2. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">已確認單 (Confirmed)</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.confirmedCount}</h3>
          </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">本月營收 (Monthly)</p>
            <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.monthRevenue)}</h3>
          </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-violet-500">
          <div className="p-3 bg-violet-50 rounded-full text-violet-600"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">年度營業額 (Annual)</p>
            <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.annualRevenue)}</h3>
          </div>
        </Card>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-blue-500">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center">
                <CalendarIcon size={18} className="mr-2 text-blue-500" /> 近期活動 (Upcoming)
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm">暫無近期活動</div>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} className="p-4 bg-white hover:bg-slate-50 flex items-center space-x-4 cursor-pointer transition-all" onClick={() => openEditModal(event)}>
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-600 border border-blue-100">
                      <span className="text-[10px] font-bold uppercase">{new Date(event.date).toLocaleString('en-US', { month: 'short' })}</span>
                      <span className="text-lg font-bold leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{event.eventName}</h4>
                      <div className="text-xs text-slate-500 flex items-center mt-1">
                        <Clock size={12} className="mr-1" /> {event.startTime} - {event.endTime}
                        <span className="mx-2 text-slate-300">|</span>
                        <MapPin size={12} className="mr-1" /> 
                        {selectedVenueId === 'all' ? (outlets.find(o => o.id === event.venueId)?.name || '未定') : (event.venueLocation || '未定')}
                      </div>
                    </div>
                    <Badge status={event.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Calendar Widget */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <h3 className="font-bold text-slate-700">{monthName}</h3>
              <div className="flex space-x-1">
                <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronLeft size={16} /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-slate-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7 }).map((_, i) => {
                  const dayNum = i - firstDayOfMonth + 1;
                  const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                  if (!isCurrentMonth) return <div key={i} className="h-10 bg-slate-50/30 rounded" />;
                  const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                  const dayEvents = eventsByDate[dateKey] || [];
                  return (
                    <div key={i} className={`h-10 rounded border border-slate-100 flex flex-col items-center justify-center relative transition-all ${dayEvents.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <span className={`text-xs font-medium ${dayEvents.length > 0 ? 'text-blue-700' : 'text-slate-600'}`}>{dayNum}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex space-x-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((_, idx) => <div key={idx} className="w-1 h-1 rounded-full bg-blue-500" />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 border-t border-slate-100 bg-slate-50/30 overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center">
                <span>本月活動 ({currentMonthEvents.length})</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {currentMonthEvents.map(event => (
                  <div key={event.id} className="p-3 hover:bg-white transition-all cursor-pointer group" onClick={() => openEditModal(event)}>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="w-8 h-8 bg-white rounded border border-slate-200 flex flex-col items-center justify-center text-slate-600 group-hover:text-blue-600">
                        <span className="text-[9px] font-bold uppercase">{new Date(event.date).toLocaleString('en-US', { weekday: 'short' })}</span>
                        <span className="font-bold">{new Date(event.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-700 truncate group-hover:text-blue-600">{event.eventName}</p>
                        <p className="text-[10px] text-slate-400">{event.startTime} • {selectedVenueId === 'all' ? outlets.find(o => o.id === event.venueId)?.name : event.venueLocation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;