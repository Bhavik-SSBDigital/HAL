import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as XLSX from 'xlsx';
import PdfContainer from './pdfViewer';
import './View.css';
import { IconSquareRoundedX } from '@tabler/icons-react';
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
  const [activeDocument, setActiveDocument] = useState({ uri: docu.url });

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

    if (docu.type === 'xlsx' || docu.type === 'xls') {
      fetch(docu.url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const bstr = evt.target.result;
            const workbook = XLSX.read(bstr, {
              type: 'binary',
              cellDates: true,
            });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
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
        .catch((error) => console.error('Error reading Excel file:', error));
    }

    if (!supportedTypes.includes(docu.type)) {
      toast.warn('Unsupported file type');
      handleViewClose();
      return;
    }
  }, [docu]);

  const handleDocumentChange = (document) => {
    setActiveDocument(document);
  };

  return (
    <CustomModal isOpen={docu} onClose={handleViewClose}>
      <button
        className="absolute top-2.5 right-5 z-50 p-1 hover:bg-gray-200 rounded-full transition"
        onClick={handleViewClose}
      >
        <IconSquareRoundedX size={24} />
      </button>

      {docu && (
        <>
          {docu.type === 'pdf' ? (
            <div className="flex justify-center items-center h-full relative">
              <PdfContainer
                url={docu.url}
                documentId={docu.fileId}
                workflow={workflow}
                maxReceiverStepNumber={maxReceiverStepNumber}
                processId={processId}
                currentStep={currentStep}
                controls={controls}
                signed={docu.signed}
              />
            </div>
          ) : (
            <DocViewer
              documents={[{ uri: docu.url }]}
              activeDocument={activeDocument}
              className="my-doc-viewer-style"
              pluginRenderers={DocViewerRenderers}
              onDocumentChange={handleDocumentChange}
              style={{ display: 'flex', height: '100%', width: '100%' }}
            />
          )}
        </>
      )}
    </CustomModal>
  );
};

export default PdfViewer;
