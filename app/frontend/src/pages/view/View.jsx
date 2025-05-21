import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as XLSX from 'xlsx';
import PdfContainer from './pdfViewer';
import './View.css';
import {
  IconSquareRoundedX,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';
import CustomModal from '../../CustomComponents/CustomModal';

const PdfViewer = ({
  docu,
  handleViewClose,
  workflow,
  maxReceiverStepNumber,
  processId,
  currentStep,
  controls,
}) => {
  const [excelData, setExcelData] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const documents = docu?.multi ? docu.docs : [docu];
  const currentDoc = documents[currentIndex];

  useEffect(() => {
    const supportedTypes = [
      'bmp',
      'csv',
      'odt',
      'doc',
      'docx',
      'gif',
      'htm',
      'html',
      'jpg',
      'jpeg',
      'pdf',
      'png',
      'ppt',
      'pptx',
      'tiff',
      'txt',
      'xls',
      'xlsx',
      'mp4',
      'webp',
      'dwg',
    ];

    if (!currentDoc || !supportedTypes.includes(currentDoc.type)) {
      toast.warn('Unsupported file type');
      handleViewClose();
      return;
    }

    setActiveDocument({ uri: currentDoc.url });

    if (currentDoc.type === 'xlsx' || currentDoc.type === 'xls') {
      fetch(currentDoc.url)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const bstr = e.target.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const maxLength = jsonData.reduce(
              (max, row) => Math.max(max, row.length),
              0,
            );
            const normalizedData = jsonData.map((row) =>
              Array.from({ length: maxLength }, (_, i) => row[i] || ''),
            );

            setExcelData(normalizedData);
          };
          reader.readAsBinaryString(blob);
        })
        .catch((err) => console.error('Error reading Excel file:', err));
    }
  }, [currentDoc]);

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDocumentChange = (document) => {
    setActiveDocument(document);
  };

  return (
    <CustomModal
      isOpen={!!docu}
      onClose={handleViewClose}
      className={'max-h-[90vh] overflow-auto'}
    >
      {/* Top Navigation/Header */}
      <div className="sticky top-0 border left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-white shadow-md border-b rounded-t-lg">
        <div className="flex items-center gap-2">
          {documents.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`p-1 rounded-full transition ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-gray-200'
                }`}
                title="Previous Document"
              >
                <IconArrowLeft size={22} />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === documents.length - 1}
                className={`p-1 rounded-full transition ${
                  currentIndex === documents.length - 1
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-gray-200'
                }`}
                title="Next Document"
              >
                <IconArrowRight size={22} />
              </button>
            </>
          )}
          <span className="text-sm font-medium text-gray-700 truncate max-w-[250px]">
            {currentDoc?.name ||
              currentDoc?.fileName ||
              currentDoc?.url?.split('/')?.pop()}
          </span>
          {documents.length > 1 && (
            <span className="text-xs text-gray-500 ml-2">
              ({currentIndex + 1} of {documents.length})
            </span>
          )}
        </div>

        <button
          onClick={handleViewClose}
          className="hover:bg-gray-200 p-1 rounded-full transition"
          title="Close Viewer"
        >
          <IconSquareRoundedX size={22} />
        </button>
      </div>

      {/* Viewer Area */}
      <div className="pt-7 w-fit">
        {currentDoc ? (
          currentDoc.type === 'pdf' ? (
            <PdfContainer
              url={currentDoc.url}
              documentId={currentDoc.fileId}
              workflow={workflow}
              maxReceiverStepNumber={maxReceiverStepNumber}
              processId={processId}
              currentStep={currentStep}
              controls={controls}
              signed={currentDoc.signed}
            />
          ) : (
            <DocViewer
              documents={[{ uri: currentDoc.url }]}
              activeDocument={activeDocument}
              className="my-doc-viewer-style"
              pluginRenderers={DocViewerRenderers}
              onDocumentChange={handleDocumentChange}
              style={{
                display: 'flex',
                height: '100%',
                width: '100%',
                padding: '1rem',
              }}
            />
          )
        ) : (
          <div className="text-center text-gray-500">Loading document...</div>
        )}
      </div>
    </CustomModal>
  );
};

export default PdfViewer;
