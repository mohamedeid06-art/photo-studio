import React, { useState, useCallback, useEffect } from 'react';
import {
  DEFAULT_PROCESSING_CONFIG,
  PHOTO_STATUS,
  APP_PAGES,
  PHOTO_PRESETS,
} from './constants/presets';
import { useTheme } from './hooks/useTheme';
import { usePhotoQueue } from './hooks/usePhotoQueue';
import SidebarNav from './components/SidebarNav';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PresetsConfigPage from './pages/PresetsConfigPage';
import StudioWorkspacePage from './pages/StudioWorkspacePage';
import ReviewGalleryPage from './pages/ReviewGalleryPage';
import ExportCenterPage from './pages/ExportCenterPage';
import ManualCropModal from './components/ManualCropModal';

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '').trim();
  if (Object.values(APP_PAGES).includes(hash)) {
    return hash;
  }
  return APP_PAGES.HOME;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState(getPageFromHash);
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

  // Sync URL hash for multi-page navigation & browser Back/Forward buttons
  useEffect(() => {
    const onHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((pageId) => {
    setActivePage(pageId);
    window.location.hash = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConfigChange = useCallback(
    (newConfig, triggerInstantReRender = false) => {
      setConfig(newConfig);
      if (triggerInstantReRender) {
        reRenderProcessedItems(newConfig);
      }
    },
    [reRenderProcessedItems]
  );

  const handleSelectPresetAndGo = useCallback(
    (presetId, targetPage = APP_PAGES.STUDIO) => {
      const preset = PHOTO_PRESETS[presetId];
      if (preset) {
        const updated = {
          ...config,
          presetId: preset.id,
          width: preset.width,
          height: preset.height,
          minSizeKB: preset.minSizeKB,
          maxSizeKB: preset.maxSizeKB,
          strictLimitKB: preset.strictLimitKB,
          headRatioPercent: preset.headRatioPercent,
          topMarginPercent: preset.topMarginPercent,
        };
        setConfig(updated);
        reRenderProcessedItems(updated);
      }
      navigateTo(targetPage);
    },
    [config, reRenderProcessedItems, navigateTo]
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
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 bg-studio-grid">
      {/* Right-Hand RTL Sidebar Navigation */}
      <SidebarNav
        activePage={activePage}
        onNavigate={navigateTo}
        totalCount={totalCount}
        readyCount={readyCount}
        pendingCount={pendingCount}
        config={config}
        isModelLoaded={modelDownloadState.isLoaded}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Glassmorphic Page Header */}
        <Header
          activePage={activePage}
          onNavigate={navigateTo}
          theme={theme}
          onToggleTheme={toggleTheme}
          totalCount={totalCount}
          readyCount={readyCount}
          pendingCount={pendingCount}
          config={config}
        />

        {/* Active Page Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
          {activePage === APP_PAGES.HOME && (
            <HomePage
              config={config}
              onSelectPresetAndGo={handleSelectPresetAndGo}
              onNavigate={navigateTo}
              totalCount={totalCount}
              readyCount={readyCount}
              pendingCount={pendingCount}
            />
          )}

          {activePage === APP_PAGES.PRESETS && (
            <PresetsConfigPage
              config={config}
              onChangeConfig={handleConfigChange}
              onResetEnhancements={handleResetEnhancements}
              onApplyToProcessed={() => reRenderProcessedItems(config)}
              readyCount={readyCount}
              isReRenderingAll={isReRenderingAll}
              onNavigate={navigateTo}
            />
          )}

          {activePage === APP_PAGES.STUDIO && (
            <StudioWorkspacePage
              items={items}
              config={config}
              onChangeConfig={handleConfigChange}
              isBatchRunning={isBatchRunning}
              isReRenderingAll={isReRenderingAll}
              modelDownloadState={modelDownloadState}
              onAddFiles={addFiles}
              onProcessSingle={processSinglePhoto}
              onProcessAll={processAllPending}
              onStopBatch={stopBatchProcessing}
              onClearAll={clearAll}
              onOpenManualEdit={(item) => setEditingItemId(item.id)}
              onRemove={removeItem}
              onRename={updateItemCustomName}
              onApplyToProcessed={() => reRenderProcessedItems(config)}
              onNavigate={navigateTo}
            />
          )}

          {activePage === APP_PAGES.REVIEW && (
            <ReviewGalleryPage
              items={items}
              config={config}
              onOpenManualEdit={(item) => setEditingItemId(item.id)}
              onProcessSingle={processSinglePhoto}
              onRename={updateItemCustomName}
              onNavigate={navigateTo}
            />
          )}

          {activePage === APP_PAGES.EXPORT && (
            <ExportCenterPage
              items={items}
              config={config}
              onRename={updateItemCustomName}
              onNavigate={navigateTo}
            />
          )}
        </main>
      </div>

      {/* Full-Screen Pro Manual Crop & Enhancement Modal */}
      {activeEditingItem && (
        <ManualCropModal
          item={activeEditingItem}
          config={config}
          onClose={() => setEditingItemId(null)}
          onSave={applyManualEditToItem}
        />
      )}
    </div>
  );
}
