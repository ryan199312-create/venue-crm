import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Calendar as CalendarIcon, Clock, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney } from '../utils/vmsUtils';
import { Card, Badge } from '../components/ui';

const EventsListView = ({ events, openNewEventModal, openEditModal, handleDelete }) => {
  const [filter, setFilter] = useState('');
  // 1. New State for Status Filter & Pagination
  const [statusFilter, setStatusFilter] = useState('incomplete'); // 'incomplete', 'completed', 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter]);

  // 2. Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    return events.filter(e => {
      // Status Filter Logic
      // "未完成" (Incomplete) = Tentative or Confirmed. Excludes Completed & Cancelled.
      if (statusFilter === 'completed' && e.status !== 'completed') return false;
      if (statusFilter === 'incomplete' && (e.status === 'completed' || e.status === 'cancelled')) return false;

      // Text Search Filter
      const searchLower = filter.toLowerCase();
      const matchesSearch =
        (e.eventName || '').toLowerCase().includes(searchLower) ||
        (e.clientName || '').toLowerCase().includes(searchLower) ||
        (e.orderId || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      return true;
    });
  }, [events, filter, statusFilter]);

  // 3. Pagination Logic
  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 4. Inject "Month Header" Rows
  const tableRows = useMemo(() => {
    const rows = [];
    let currentMonthStr = '';

    paginatedEvents.forEach(event => {
      if (!event.date) {
        rows.push({ type: 'event', data: event, id: event.id });
        return;
      }

      const dateObj = new Date(event.date);
      const monthStr = `${dateObj.getFullYear()}年 ${dateObj.getMonth() + 1}月`;

      // If the month changes, push a Header Row first
      if (monthStr !== currentMonthStr) {
        rows.push({ type: 'month-header', label: monthStr, id: `header-${monthStr}-${event.id}` });
        currentMonthStr = monthStr;
      }

      // Then push the actual event
      rows.push({ type: 'event', data: event, id: event.id });
    });

    return rows;
  }, [paginatedEvents]);

  return (
    <Card className="animate-in fade-in flex flex-col h-full">
      {/* TOP BAR: Search & Filters */}
      <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">

        {/* Search Box */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜尋訂單編號、活動名稱或客戶..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Status Filter Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('incomplete')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'incomplete' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              未完成
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'completed' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              已完成
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              全部
            </button>
          </div>

          <button onClick={openNewEventModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium shadow-sm whitespace-nowrap w-full sm:w-auto justify-center">
            <Plus size={18} className="mr-2" /> 新增訂單 (New EO)
          </button>
        </div>
      </div>

      {/* TABLE AREA */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4">活動詳情 (Event)</th>
              <th className="px-6 py-4">客戶 (Client)</th>
              <th className="px-6 py-4">席數/人數 (Pax)</th>
              <th className="px-6 py-4">狀態 (Status)</th>
              <th className="px-6 py-4 text-right">總費用 (Total)</th>
              <th className="px-6 py-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-400">
                  找不到符合條件的訂單 (No records found)
                </td>
              </tr>
            ) : (
              tableRows.map(row => {

                // A. Render Month Separator Row
                if (row.type === 'month-header') {
                  return (
                    <tr key={row.id} className="bg-indigo-50/50 border-y border-indigo-100">
                      <td colSpan="6" className="px-6 py-2">
                        <div className="flex items-center text-sm font-black text-indigo-800 tracking-widest">
                          <CalendarIcon size={16} className="mr-2 text-indigo-500" />
                          {row.label}
                        </div>
                      </td>
                    </tr>
                  );
                }

                // B. Render Standard Event Row
                const event = row.data;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-base">{event.eventName}</span>
                        <span className="text-xs text-blue-600 font-mono mt-1">{event.orderId}</span>
                        <div className="text-xs text-slate-500 mt-1 flex items-center">
                          <Clock size={12} className="mr-1" /> {event.date}
                          <span className="mx-1">•</span>
                          {event.startTime}-{event.endTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{event.clientName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{event.clientPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="font-bold">{event.tableCount ? `${event.tableCount} 席` : '-'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{event.guestCount ? `${event.guestCount} 人` : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={event.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">
                      ${formatMoney(event.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => openEditModal(event)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="編輯">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="刪除">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM BAR: Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
          <span className="text-sm font-bold text-slate-500">
            顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} 項，共 {filteredAndSorted.length} 項
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center"
            >
              <ChevronLeft size={16} className="mr-1" /> 上一頁
            </button>
            <div className="text-sm font-bold text-slate-700 px-3 font-mono">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center"
            >
              下一頁 <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EventsListView;