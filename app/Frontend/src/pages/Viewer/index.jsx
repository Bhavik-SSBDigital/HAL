import React, { useState, useRef, useEffect } from 'react';
import CustomModal from '../../CustomComponents/CustomModal';

export default function DocumentViewer({ url = [], isOpen }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState('signSelection'); // 'signSelection' | 'textSelection'

  const [isSelecting, setIsSelecting] = useState(false);
  const [activeSelection, setActiveSelection] = useState(null);

  // Separate selection states for sign and text
  const [signSelectionAreas, setSignSelectionAreas] = useState([]);
  const [textSelectionAreas, setTextSelectionAreas] = useState([]);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const pageRefs = useRef([]);

  const currentUrl = Array.isArray(url) ? url[currentIndex] : url;

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < url.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleMouseDown = (e) => {
    const container = pageRefs.current[currentIndex];
    if (container && container.contains(e.target)) {
      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setIsSelecting(true);
      setActiveSelection({
        page: currentIndex + 1,
        x: startX,
        y: startY,
        width: 0,
        height: 0,
        type: mode, // track type of selection
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !activeSelection) return;

    const container = pageRefs.current[currentIndex];
    if (container) {
      const rect = container.getBoundingClientRect();
      const width = Math.max(0, e.clientX - rect.left - activeSelection.x);
      const height = Math.max(0, e.clientY - rect.top - activeSelection.y);

      setActiveSelection((prev) => ({
        ...prev,
        width,
        height,
      }));
    }
  };

  const handleMouseUp = () => {
    if (
      isSelecting &&
      activeSelection?.width > 0 &&
      activeSelection?.height > 0
    ) {
      // Add to correct selection area based on the mode
      if (mode === 'signSelection') {
        setSignSelectionAreas((prev) => [...prev, activeSelection]);
      } else if (mode === 'textSelection') {
        setTextSelectionAreas((prev) => [...prev, activeSelection]);
      }

      setUserDialogOpen(true);
    }

    setIsSelecting(false);
    setActiveSelection(null);
  };

  useEffect(() => {
    const container = pageRefs.current[currentIndex];
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [currentIndex, activeSelection, isSelecting]);

  // This would be triggered on submit, based on mode
  const handleSubmit = () => {
    const currentSelections =
      mode === 'signSelection'
        ? signSelectionAreas.filter((a) => a.page === currentIndex + 1)
        : textSelectionAreas.filter((a) => a.page === currentIndex + 1);

    if (mode === 'signSelection') {
      console.log('Send to /sign-endpoint', currentSelections);
      // send to /sign-endpoint
    } else if (mode === 'textSelection') {
      console.log('Send to /highlight-endpoint', currentSelections);
      // send to /highlight-endpoint
    }

    setUserDialogOpen(false);
  };

  return (
    <CustomModal className="h-[96vh] w-[96vw] relative" isOpen={url}>
      <div className="relative w-full h-full">
        {/* Mode Tabs */}
        <div className="absolute bottom-4 left-4 z-30 flex gap-2 bg-white/80 px-4 py-2 rounded shadow-md">
          <button
            onClick={() => setMode('signSelection')}
            className={`px-3 py-1 rounded ${
              mode === 'signSelection'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Sign
          </button>
          <button
            onClick={() => setMode('textSelection')}
            className={`px-3 py-1 rounded ${
              mode === 'textSelection'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            Highlight
          </button>
        </div>

        {/* Selection Overlay */}
        <div
          className="absolute inset-0 z-10"
          ref={(ref) => (pageRefs.current[currentIndex] = ref)}
        >
          {/* Render sign selection areas */}
          {signSelectionAreas
            .filter((a) => a.page === currentIndex + 1)
            .map((area, idx) => (
              <div
                key={idx}
                className="absolute group"
                style={{
                  left: area.x,
                  top: area.y,
                  width: area.width,
                  height: area.height,
                }}
              >
                <div className="w-full h-full border-2 border-blue-500 bg-blue-500/10" />
                <button
                  className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 text-white bg-red-500 rounded-full w-5 h-5 text-xs hidden group-hover:block"
                  onClick={() => {
                    setSignSelectionAreas((prev) =>
                      prev.filter((_, i) => i !== idx),
                    );
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}

          {/* Render text selection areas */}
          {textSelectionAreas
            .filter((a) => a.page === currentIndex + 1)
            .map((area, idx) => (
              <div
                key={idx}
                className="absolute group"
                style={{
                  left: area.x,
                  top: area.y,
                  width: area.width,
                  height: area.height,
                }}
              >
                <div className="w-full h-full border-2 border-yellow-500 bg-yellow-500/10" />
                <button
                  className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 text-white bg-red-500 rounded-full w-5 h-5 text-xs hidden group-hover:block"
                  onClick={() => {
                    setTextSelectionAreas((prev) =>
                      prev.filter((_, i) => i !== idx),
                    );
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}

          {activeSelection?.page === currentIndex + 1 && (
            <div
              className={`absolute border-2 ${
                mode === 'signSelection'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-yellow-500 bg-yellow-500/10'
              }`}
              style={{
                left: activeSelection.x,
                top: activeSelection.y,
                width: activeSelection.width,
                height: activeSelection.height,
              }}
            />
          )}
        </div>

        {/* Document Viewer */}
        <iframe
          title={`document-${currentIndex}`}
          height="100%"
          width="100%"
          src={currentUrl}
          frameBorder="0"
          className="rounded-xl shadow-lg pointer-events-none"
        />
      </div>

      {/* Pagination Controls */}
      {Array.isArray(url) && url.length > 1 && (
        <div className="absolute flex items-center gap-2 top-8 right-10 bg-[#323639] border border-white text-white px-4 py-2 rounded-lg z-30">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="disabled:opacity-50 hover:underline"
          >
            Prev
          </button>
          <span className="mx-2">
            {currentIndex + 1} / {url.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex === url.length - 1}
            className="disabled:opacity-50 hover:underline"
          >
            Next
          </button>
        </div>
      )}

      {/* Dialog on Selection */}
      {userDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow-xl max-w-md text-center">
            <p className="mb-4">
              {mode === 'signSelection'
                ? 'Signature area saved. Submit to Sign?'
                : 'Text area saved. Submit to Highlight?'}
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleSubmit}
              >
                Submit
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-black rounded"
                onClick={() => setUserDialogOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
