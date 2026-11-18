import React, { useState, useMemo } from 'react';
import { Search, Filter, Images } from 'lucide-react';
import { PHOTO_STATUS } from '../constants/presets';
import PhotoCard from './PhotoCard';

export default function PhotoGrid({
  items,
  config,
  onProcessSingle,
  onOpenManualEdit,
  onRemove,
  onRename,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    return {
      all: items.length,
      [PHOTO_STATUS.READY]: items.filter((i) => i.status === PHOTO_STATUS.READY).length,
      [PHOTO_STATUS.PENDING]: items.filter((i) => i.status === PHOTO_STATUS.PENDING).length,
      [PHOTO_STATUS.PROCESSING]: items.filter((i) => i.status === PHOTO_STATUS.PROCESSING).length,
      [PHOTO_STATUS.FAILED]: items.filter((i) => i.status === PHOTO_STATUS.FAILED).length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeFilter === 'all' || item.status === activeFilter;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (item.customName && item.customName.toLowerCase().includes(q)) ||
        (item.originalName && item.originalName.toLowerCase().includes(q))
      );
    });
  }, [items, activeFilter, searchQuery]);

  if (items.length === 0) return null;

  const filterTabs = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: PHOTO_STATUS.READY, label: 'جاهز للتحميل', count: counts[PHOTO_STATUS.READY] },
    { id: PHOTO_STATUS.PENDING, label: 'في الانتظار', count: counts[PHOTO_STATUS.PENDING] },
    { id: PHOTO_STATUS.PROCESSING, label: 'جاري المعالجة', count: counts[PHOTO_STATUS.PROCESSING] },
    ...(counts[PHOTO_STATUS.FAILED] > 0
      ? [{ id: PHOTO_STATUS.FAILED, label: 'فشل', count: counts[PHOTO_STATUS.FAILED] }]
      : []),
  ];

  return (
    <section className="space-y-4">
      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 ml-1 shrink-0 hidden sm:block" />
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input by Filename */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الملف أو المعتمر..."
            className="w-full pr-9 pl-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              config={config}
              onProcessSingle={onProcessSingle}
              onOpenManualEdit={onOpenManualEdit}
              onRemove={onRemove}
              onRename={onRename}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
          <Images className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            لا توجد صور مطابقة للفلتر أو البحث الحالي
          </p>
        </div>
      )}
    </section>
  );
}
