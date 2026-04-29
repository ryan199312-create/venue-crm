import React, { useState, useMemo } from 'react';
import { BarChart3, AlertTriangle, Bell, CheckCircle, DollarSign, TrendingUp, CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney } from '../services/billingService';
import { Card, Badge } from '../components/ui';

const AdminDashboard = ({ events, openEditModal, setIsDataAiOpen }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let monthRevenue = 0;
    let annualRevenue = 0;
    let confirmedCount = 0;

    events.forEach(e => {
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
  }, [events]);

  // --- OVERDUE PAYMENTS ---
  const overduePayments = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const list = [];

    events.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date < todayStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount });
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
        list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: balanceDate, amount: balanceVal });
      }
    });
    return list;
  }, [events]);

  // --- UPCOMING PAYMENTS (14 DAYS) ---
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const next14Days = new Date();
    next14Days.setDate(today.getDate() + 14);

    const todayStr = today.toLocaleDateString('en-CA');
    const next14DaysStr = next14Days.toLocaleDateString('en-CA');
    const list = [];

    events.forEach(e => {
      if (e.status === 'cancelled' || e.status === 'completed') return;

      const check = (amount, received, date, type) => {
        if (amount && !received && date && date >= todayStr && date <= next14DaysStr) {
          list.push({ id: e.id, name: e.eventName, type, date, amount });
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
          list.push({ id: e.id, name: e.eventName, type: '尾數 (Balance)', date: checkDate, amount: balanceVal });
        }
      }
    });
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  // --- UPCOMING EVENTS ---
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return events
      .filter(e => e.date >= todayStr && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [events]);

  // --- CALENDAR LOGIC ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('zh-HK', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(e => {
      if (e.status === 'cancelled') return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const currentMonthEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return events
      .filter(e => {
        if (e.status === 'cancelled') return false;
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">儀表板 (Dashboard)</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">實時營業數據與訂單追蹤</p>
        </div>
        <button
          onClick={() => setIsDataAiOpen(true)}
          className="group relative px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <BarChart3 size={18} className="text-emerald-100 group-hover:-translate-y-0.5 transition-transform" />
          <span>AI 數據分析 (Ask DB)</span>
        </button>
      </div>
      {/* 0. Payment Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overduePayments.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-pulse-slow">
            <h3 className="text-red-800 font-bold flex items-center mb-3">
              <AlertTriangle size={20} className="mr-2" /> 逾期款項 (Overdue Payments)
            </h3>
            <div className="space-y-2">
              {overduePayments.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-50 active:bg-red-100 transition-all duration-200 hover:shadow-md hover:z-10 relative active:scale-[0.995]" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                    <div className="text-xs text-red-600 font-medium">{item.type} • 應付日期: {item.date}</div>
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
                <div key={idx} className="flex justify-between items-center p-3 bg-transparent hover:bg-white active:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all duration-200 cursor-pointer hover:shadow-sm hover:z-10 relative active:scale-[0.995]" onClick={() => openEditModal(events.find(e => e.id === item.id))}>
                  <div>
                    <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.type} • 到期: <span className="text-amber-600 font-bold">{item.date}</span></div>
                  </div>
                  <div className="font-mono font-bold text-slate-700">${formatMoney(item.amount)}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold">已確認單數量 (Confirmed)</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.confirmedCount}</h3>
          </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-emerald-500">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold">本月預計營收 (Monthly)</p>
            <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.monthRevenue)}</h3>
          </div>
        </Card>
        <Card className="p-5 flex items-center space-x-4 border-l-4 border-l-violet-500">
          <div className="p-3 bg-violet-50 rounded-full text-violet-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold">年度營業額 (Annual)</p>
            <h3 className="text-2xl font-black text-slate-800">${formatMoney(stats.annualRevenue)}</h3>
          </div>
        </Card>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Upcoming Events Only */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-t-4 border-t-blue-500">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center">
                <CalendarIcon size={18} className="mr-2 text-blue-500" /> 近期活動 (Upcoming Events)
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm">暫無近期活動</div>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} className="p-4 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center space-x-4 cursor-pointer group transition-all duration-200 hover:shadow-sm hover:z-10 relative active:scale-[0.995]" onClick={() => openEditModal(event)}>
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-600 border border-blue-100 group-hover:border-blue-300 transition-colors">
                      <span className="text-[10px] font-bold uppercase">{new Date(event.date).toLocaleString('en-US', { month: 'short' })}</span>
                      <span className="text-lg font-bold leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{event.eventName}</h4>
                      <div className="text-xs text-slate-500 flex items-center mt-1">
                        <Clock size={12} className="mr-1" /> {event.startTime} - {event.endTime}
                        <span className="mx-2 text-slate-300">|</span>
                        <MapPin size={12} className="mr-1" /> {event.venueLocation || '未定'}
                      </div>
                    </div>
                    <Badge status={event.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Calendar Widget */}
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
              <div className="grid grid-cols-7 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7 }).map((_, i) => {
                  const dayNum = i - firstDayOfMonth + 1;
                  const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;

                  if (!isCurrentMonth) return <div key={i} className="h-10 bg-slate-50/30 rounded"></div>;

                  const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                  const dayEvents = eventsByDate[dateKey] || [];
                  const hasEvent = dayEvents.length > 0;

                  return (
                    <div key={i} className={`h-10 rounded border border-slate-100 flex flex-col items-center justify-center relative transition-all cursor-default ${hasEvent ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-white'}`}>
                      <span className={`text-xs font-medium ${hasEvent ? 'text-blue-700' : 'text-slate-600'}`}>{dayNum}</span>
                      {hasEvent && (
                        <div className="flex space-x-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1 h-1 rounded-full bg-blue-500"></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List of Events for the Month */}
            <div className="flex-1 border-t border-slate-100 bg-slate-50/30 overflow-hidden flex flex-col">
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span>本月活動 (Events)</span>
                <span className="bg-slate-200 text-slate-600 px-1.5 rounded-full">{currentMonthEvents.length}</span>
              </div>
              <div className="overflow-y-auto flex-1 max-h-[300px]">
                {currentMonthEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">本月暫無活動安排</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentMonthEvents.map(event => (
                      <div key={event.id} className="p-3 bg-transparent hover:bg-white active:bg-slate-50 transition-all duration-200 cursor-pointer group hover:shadow-sm hover:z-10 relative active:scale-[0.995]" onClick={() => openEditModal(event)}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-white rounded border border-slate-200 flex flex-col items-center justify-center text-slate-600 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                            <span className="text-[9px] font-bold uppercase leading-none">{new Date(event.date).toLocaleString('en-US', { weekday: 'short' })}</span>
                            <span className="text-xs font-bold leading-none">{new Date(event.date).getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-600">{event.eventName}</p>
                            <div className="flex items-center text-[10px] text-slate-400 mt-0.5">
                              <Clock size={10} className="mr-1" /> {event.startTime}-{event.endTime}
                              {event.venueLocation && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="truncate">{event.venueLocation}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${event.status === 'confirmed' ? 'bg-emerald-500' :
                            event.status === 'completed' ? 'bg-slate-400' : 'bg-amber-500'
                            }`} title={event.status}></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;