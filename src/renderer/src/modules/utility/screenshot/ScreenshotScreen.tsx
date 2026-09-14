import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCamera,
  FiClock,
  FiEye,
  FiFolder,
  FiGrid,
  FiHardDrive,
  FiImage,
  FiList,
  FiMaximize2,
  FiRefreshCw,
  FiSearch,
  FiX
} from 'react-icons/fi'
import { DataTable, type Column } from '@components/ui'
import AppAlert from '../../../components/ui/AppAlert'
import { getFriendlyErrorMessage } from '../../../utils/getFriendlyErrorMessage'

type AlertType = 'success' | 'error' | 'warning'
type ScreenshotItem = ScreenshotListRecord & { id: string }
type ViewMode = 'list' | 'grid'

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return dateStr
}

function ScreenshotScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({})

  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('success')

  const [previewShot, setPreviewShot] = useState<ScreenshotItem | null>(null)
  const [previewImage, setPreviewImage] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const alertTimerRef = useRef<number | null>(null)

  const showAlert = useCallback((type: AlertType, message: string): void => {
    setAlertType(type)
    setAlertMessage(message)

    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }

    alertTimerRef.current = window.setTimeout(() => {
      setAlertMessage('')
    }, 3500)
  }, [])

  const loadScreenshots = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.api.screenshot.list()
      const items: ScreenshotItem[] = (data || []).map((d) => ({
        ...d,
        id: d.filePath || d.fileName
      }))
      setScreenshots(items)
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    void loadScreenshots()

    return () => {
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [loadScreenshots])

  // Lazy load thumbnails for items
  useEffect(() => {
    if (screenshots.length === 0) return

    let isMounted = true
    const loadThumbs = async (): Promise<void> => {
      const missing = screenshots.filter((s) => !thumbnailCache[s.fileName])
      if (missing.length === 0) return

      for (const shot of missing.slice(0, 30)) {
        if (!isMounted) break
        try {
          const dataUrl = await window.api.screenshot.getImage(shot.fileName)
          if (isMounted) {
            setThumbnailCache((prev) => ({ ...prev, [shot.fileName]: dataUrl }))
          }
        } catch {
          // Ignore thumbnail error
        }
      }
    }

    void loadThumbs()

    return () => {
      isMounted = false
    }
  }, [screenshots, thumbnailCache])

  const handleOpenFolder = async (): Promise<void> => {
    try {
      await window.api.screenshot.openFolder()
      showAlert('success', 'Opened screenshots folder in file explorer.')
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
    }
  }

  const handleView = async (shot: ScreenshotItem): Promise<void> => {
    setPreviewShot(shot)
    setPreviewLoading(true)

    // Check cache first
    if (thumbnailCache[shot.fileName]) {
      setPreviewImage(thumbnailCache[shot.fileName])
      setPreviewLoading(false)
      return
    }

    setPreviewImage('')
    try {
      const dataUrl = await window.api.screenshot.getImage(shot.fileName)
      setPreviewImage(dataUrl)
      setThumbnailCache((prev) => ({ ...prev, [shot.fileName]: dataUrl }))
    } catch (error) {
      showAlert('error', getFriendlyErrorMessage(error))
      setPreviewShot(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = (): void => {
    setPreviewShot(null)
    setPreviewImage('')
  }

  // Keyboard shortcut (Escape) to close preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && previewShot) {
        closePreview()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewShot])

  const filteredScreenshots = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return screenshots

    return screenshots.filter(
      (shot) =>
        shot.fileName.toLowerCase().includes(keyword) ||
        shot.capturedAt.toLowerCase().includes(keyword)
    )
  }, [screenshots, searchText])

  const latestCapture = useMemo(() => {
    if (screenshots.length === 0) return 'None'
    return screenshots[0].capturedAt
  }, [screenshots])

  const columns: Column<ScreenshotItem>[] = useMemo(
    () => [
      {
        key: 'sr',
        header: 'Sr No',
        align: 'center',
        width: '55px',
        render: (_, index) => (
          <span className="text-slate-400 font-mono text-[11px] font-semibold">{index + 1}</span>
        )
      },
      {
        key: 'thumb',
        header: 'Preview',
        align: 'center',
        width: '75px',
        render: (shot) => {
          const thumb = thumbnailCache[shot.fileName]
          return (
            <div
              onClick={(e) => {
                e.stopPropagation()
                void handleView(shot)
              }}
              title="Click to zoom preview"
              className="w-12 h-8 mx-auto bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-amber-400 hover:shadow-xs transition-all"
            >
              {thumb ? (
                <img src={thumb} alt={shot.fileName} className="w-full h-full object-cover" />
              ) : (
                <FiImage className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          )
        }
      },
      {
        key: 'fileName',
        header: 'File Name',
        render: (shot) => (
          <div className="flex flex-col">
            <span className="font-mono font-bold text-slate-900 text-xs tracking-tight">
              {shot.fileName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">PNG Lossless Image</span>
          </div>
        )
      },
      {
        key: 'format',
        header: 'Format',
        align: 'center',
        width: '90px',
        render: () => (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <FiImage className="w-3 h-3 text-amber-600" /> PNG
          </span>
        )
      },
      {
        key: 'capturedAt',
        header: 'Captured Date & Time',
        width: '200px',
        render: (shot) => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 font-medium">
            <FiClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatDateTime(shot.capturedAt)}</span>
          </div>
        )
      },
      {
        key: 'action',
        header: 'Action',
        align: 'center',
        width: '95px',
        render: (shot) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void handleView(shot)
            }}
            title={`Preview ${shot.fileName}`}
            className="h-7 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <FiEye className="w-3.5 h-3.5 text-amber-700" />
            <span>View</span>
          </button>
        )
      }
    ],
    [thumbnailCache]
  )

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-slate-800 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="h-13 px-4 border-b border-slate-200/90 bg-white flex items-center justify-between shadow-2xs shrink-0 z-10 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 text-base shadow-2xs font-bold">
            <FiCamera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <span>Screenshots & Visual Audits</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                {filteredScreenshots.length} Captures
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              Review, inspect, and manage system screenshot captures and audit snapshots
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleOpenFolder()}
            className="h-8 px-3.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <FiFolder className="w-3.5 h-3.5 text-amber-600" />
            <span>Open Folder</span>
          </button>

          <button
            type="button"
            onClick={() => void loadScreenshots()}
            disabled={loading}
            className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border border-amber-600 cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-sm font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden">
        {alertMessage && (
          <div className="shrink-0 no-print">
            <AppAlert type={alertType} message={alertMessage} onClose={() => setAlertMessage('')} />
          </div>
        )}

        {/* Toolbar: Search, Hint Banner, and View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 no-print">
          {/* Quick Search */}
          <div className="relative w-full sm:w-72 shrink-0">
            <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by file name or date..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs font-medium"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                type="button"
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                onClick={() => setSearchText('')}
              >
                &times;
              </button>
            )}
          </div>

          {/* Clean Info Banner */}
          <div className="flex-1 bg-amber-50/80 border border-amber-200/90 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-amber-950 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <FiCamera className="w-3 h-3" />
            </div>
            <span className="text-[11px] leading-tight font-medium">
              Click the <strong className="font-bold text-amber-900">Camera icon</strong> in the top header on any screen to capture an instant snapshot.
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/80 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiGrid className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Screenshots
              </span>
              <strong className="text-base font-extrabold font-mono text-amber-900 block mt-0.5">
                {screenshots.length} Files
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
              <FiCamera className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Latest Capture
              </span>
              <strong className="text-[11px] font-bold font-mono text-blue-900 block mt-1 truncate max-w-[140px]" title={latestCapture}>
                {latestCapture}
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                Storage Format
              </span>
              <strong className="text-xs font-bold text-indigo-950 block mt-1">
                Lossless PNG
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <FiHardDrive className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/50 to-white shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Directory
              </span>
              <strong className="text-xs font-bold text-slate-800 block mt-1">
                AppData Folder
              </strong>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FiFolder className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Workspace Display: Table List or Gallery Grid */}
        <div className="flex-1 overflow-hidden border border-slate-200/90 rounded-xl bg-white shadow-2xs flex flex-col">
          {viewMode === 'list' ? (
            <DataTable<ScreenshotItem>
              columns={columns}
              data={filteredScreenshots}
              keyExtractor={(shot) => shot.filePath || shot.fileName}
              loading={loading}
              loadingMessage="Loading screenshots..."
              onRowClick={(shot) => void handleView(shot)}
              emptyTitle="No Screenshots Found"
              emptyMessage={
                searchText
                  ? 'No screenshots match your search keyword.'
                  : 'Click the camera icon in the top header from any screen to capture a screenshot.'
              }
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 py-16">
                  <span className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Loading screenshot gallery...</span>
                </div>
              ) : filteredScreenshots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500">
                  <FiCamera className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">No Screenshots Found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    {searchText
                      ? 'No screenshots match your search query.'
                      : 'Capture screenshots from any screen by clicking the camera icon in the header.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredScreenshots.map((shot, idx) => {
                    const thumb = thumbnailCache[shot.fileName]
                    return (
                      <div
                        key={shot.filePath || shot.fileName}
                        onClick={() => void handleView(shot)}
                        className="group bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-amber-400 p-2.5 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                      >
                        <div className="relative aspect-video bg-slate-200 rounded-lg overflow-hidden border border-slate-200/80 mb-2 flex items-center justify-center group-hover:shadow-inner">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={shot.fileName}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <FiImage className="w-6 h-6 text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="h-7 px-2.5 rounded-md bg-white/90 text-slate-900 font-bold text-xs flex items-center gap-1 shadow-sm backdrop-blur-xs">
                              <FiMaximize2 className="w-3 h-3 text-amber-600" /> Zoom
                            </span>
                          </div>
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[10px] font-mono font-semibold">
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 px-0.5">
                          <span className="font-mono font-bold text-[11px] text-slate-900 truncate" title={shot.fileName}>
                            {shot.fileName}
                          </span>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                            <span className="flex items-center gap-1">
                              <FiClock className="w-3 h-3 text-slate-400" />
                              {shot.capturedAt}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                              PNG
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {filteredScreenshots.length > 0 && (
            <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0 no-print">
              <span>
                Screenshots are stored locally in your application directory. Double-click or click &quot;View&quot; to inspect.
              </span>
              <span className="font-mono font-semibold text-slate-700">
                Showing {filteredScreenshots.length} of {screenshots.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal Dialog */}
      {previewShot && (
        <div
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FiImage className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-xs text-slate-900 leading-tight">
                    {previewShot.fileName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Captured on {previewShot.capturedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleOpenFolder()}
                  className="h-7 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  <FiFolder className="w-3.5 h-3.5 text-amber-600" />
                  <span>Open Folder</span>
                </button>

                <button
                  type="button"
                  onClick={closePreview}
                  title="Close preview (Esc)"
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-base font-bold"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 bg-slate-950/90 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 text-slate-300">
                  <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Loading high-resolution preview...</span>
                </div>
              ) : previewImage ? (
                <img
                  src={previewImage}
                  alt={previewShot.fileName}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl border border-slate-700"
                />
              ) : (
                <div className="text-xs text-rose-400 font-semibold">
                  Failed to load image preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreenshotScreen
