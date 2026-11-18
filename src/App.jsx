import React, { useState, useCallback } from 'react';
import { DEFAULT_PROCESSING_CONFIG, PHOTO_STATUS } from './constants/presets';
import { useTheme } from './hooks/useTheme';
import { usePhotoQueue } from './hooks/usePhotoQueue';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import DropzoneUploader from './components/DropzoneUploader';
import BulkActionBar from './components/BulkActionBar';
import PhotoGrid from './components/PhotoGrid';
import ManualCropModal from './components/ManualCropModal';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState(DEFAULT_PROCESSING_CONFIG);
  const [editingItemId, setEditingItemId] = useState(null);

  const {
    items,
    isBatchRunning,
    isReRenderingAll,
    modelDownloadState,
    addFiles,
    updateItemCustomName,
    processSinglePhoto,
    processAllPending,
    stopBatchProcessing,
    reRenderProcessedItems,
    applyManualEditToItem,
    removeItem,
    clearAll,
  } = usePhotoQueue(config);

  const handleConfigChange = useCallback(
    (newConfig, triggerInstantReRender = false) => {
      setConfig(newConfig);
      if (triggerInstantReRender) {
        reRenderProcessedItems(newConfig);
      }
    },
    [reRenderProcessedItems]
  );

  const handleResetEnhancements = useCallback(() => {
    const resetConfig = {
      ...config,
      brightness: DEFAULT_PROCESSING_CONFIG.brightness,
      contrast: DEFAULT_PROCESSING_CONFIG.contrast,
      sharpness: DEFAULT_PROCESSING_CONFIG.sharpness,
      edgeSmoothing: DEFAULT_PROCESSING_CONFIG.edgeSmoothing,
      headRatioPercent: DEFAULT_PROCESSING_CONFIG.headRatioPercent,
    };
    setConfig(resetConfig);
    reRenderProcessedItems(resetConfig);
  }, [config, reRenderProcessedItems]);

  const totalCount = items.length;
  const readyCount = items.filter((i) => i.status === PHOTO_STATUS.READY).length;
  const pendingCount = items.filter((i) => i.status === PHOTO_STATUS.PENDING).length;

  const activeEditingItem = editingItemId
    ? items.find((i) => i.id === editingItemId) || null
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        totalCount={totalCount}
        readyCount={readyCount}
        pendingCount={pendingCount}
        isModelLoaded={modelDownloadState.isLoaded}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right Sidebar in RTL: Settings & Specifications Panel */}
          <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-24">
            <SettingsPanel
              config={config}
              onChangeConfig={handleConfigChange}
              onResetEnhancements={handleResetEnhancements}
              onApplyToProcessed={() => reRenderProcessedItems(config)}
              readyCount={readyCount}
              isReRenderingAll={isReRenderingAll}
            />
          </div>

          {/* Left Main Content in RTL: Dropzone, Bulk Actions & Interactive Review Grid */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-5">
            {/* Batch Drag & Drop Uploader */}
            <DropzoneUploader
              onAddFiles={addFiles}
              hasExistingItems={totalCount > 0}
            />

            {/* Bulk Actions & Global Progress Bar */}
            <BulkActionBar
              items={items}
              isBatchRunning={isBatchRunning}
              modelDownloadState={modelDownloadState}
              onProcessAll={processAllPending}
              onStopBatch={stopBatchProcessing}
              onClearAll={clearAll}
            />

            {/* Interactive Review Cards Grid */}
            <PhotoGrid
              items={items}
              config={config}
              onProcessSingle={processSinglePhoto}
              onOpenManualEdit={(item) => setEditingItemId(item.id)}
              onRemove={removeItem}
              onRename={updateItemCustomName}
            />
          </div>
        </div>
      </main>

      {/* Manual Crop & Enhancement Modal */}
      {activeEditingItem && (
        <ManualCropModal
          item={activeEditingItem}
          config={config}
          onClose={() => setEditingItemId(null)}
          onSave={applyManualEditToItem}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            استوديو التأشيرات الذكي — مصمم خصيصاً لمطابقة مواصفات صور وزارة الخارجية السعودية (600×600 • 15–240 KB)
          </span>
          <span>يعمل 100% داخل المتصفح عبر WebAssembly &amp; ONNX بدون أي خادم خارجي</span>
        </div>
      </footer>
    </div>
  );
}
