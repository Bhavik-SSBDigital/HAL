import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';
import '@cyntler/react-doc-viewer/dist/index.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as XLSX from 'xlsx';
import PdfContainer from './pdfViewer';
import Editor from './Editor';
import './View.css';
import {
  IconSquareRoundedX,
  IconArrowLeft,
  IconArrowRight,
  IconPencil,
} from '@tabler/icons-react';
import CustomModal from '../../CustomComponents/CustomModal';

// Supported file types for the viewer
const SUPPORTED_TYPES = [
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

// File types that support editing
const EDITABLE_TYPES = [
  'docx',
  'doc',
  'odt',
  'xlsx',
  'xls',
  'ods',
  'pptx',
  'ppt',
  'odp',
  'odg',
  'tiff',
];

const PdfViewer = ({
  docu,
  handleViewClose,
  workflow,
  maxReceiverStepNumber,
  processId,
  currentStep,
  controls,
  setFileView,
  signedDocument, // Added missing prop
}) => {
  const [excelData, setExcelData] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(docu?.isEditing);
  const accessToken = sessionStorage.getItem('accessToken') || '';

  const documents = docu?.multi ? docu.docs : [docu];
  const currentDoc = documents[currentIndex];

  useEffect(() => {
    if (!currentDoc) {
      toast.warn('No document provided');
      handleViewClose();
      return;
    }

    if (!SUPPORTED_TYPES.includes(currentDoc?.type)) {
      toast.warn('Unsupported file type');
      handleViewClose();
      return;
    }
  }, [currentDoc, handleViewClose, isEditing]);

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsEditing(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsEditing(false);
    }
  };

  const handleDocumentChange = (document) => {
    setActiveDocument(document);
  };

  const toggleEditMode = () => {
    if (EDITABLE_TYPES.includes(currentDoc.type)) {
      setIsEditing((prev) => !prev);
      setFileView((prev) => ({ ...prev, isEditing: !prev.isEditing }));
    } else {
      toast.warn('Editing not supported for this file type');
    }
  };

  const handleEditorError = (err) => {
    console.error('Editor error:', err);
    setIsEditing(false);
    setFileView((prev) => ({ ...prev, isEditing: false }));
    toast.error(`Editor failed: ${err.message}`);
  };

  const renderExcelTable = () => {
    if (!excelData.length) {
      return <div>Loading Excel data...</div>;
    }

    return (
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="min-w-full border-collapse border border-gray-300">
          <tbody>
            {excelData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-300 px-2 py-1 text-sm"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <CustomModal
      isOpen={!!docu}
      onClose={handleViewClose}
      className="max-h-[90vh] overflow-auto"
      size={'full'}
      title={
        <>
          {currentDoc?.name ||
            currentDoc?.fileName ||
            currentDoc?.url?.split('/')?.pop()}

          {documents.length > 1 && (
            <div className="inline flex items-center">
              <span className="text-xs text-gray-500 ml-2">
                ({currentIndex + 1} of {documents.length})
              </span>
              <CustomButton
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant={'icon'}
                title="Previous Document"
              >
                <IconArrowLeft size={22} />
              </CustomButton>
              <CustomButton
                onClick={handleNext}
                disabled={currentIndex === documents.length - 1}
                variant={'icon'}
                title="Next Document"
              >
                <IconArrowRight size={22} />
              </CustomButton>
            </div>
          )}
        </>
      }
    >

      {currentDoc ? (
        EDITABLE_TYPES.includes(currentDoc.type) ? (
          <Editor
            documentId={currentDoc.fileId}
            fileType={currentDoc.type}
            name={currentDoc.name}
            path={currentDoc.department?.path || currentDoc.path}
            accessToken={accessToken}
            onError={handleEditorError}
            readOnly={!isEditing}
          />
        ) : currentDoc.type === 'pdf' ? (
       <PdfContainer
  url={currentDoc.url}
  documentId={currentDoc.fileId}
  workflow={workflow}
  maxReceiverStepNumber={maxReceiverStepNumber}
  processId={processId}
  currentStep={currentDoc.step}
  controls={controls}
  signed={signedDocument}
  onClose={handleViewClose}   // ✅ FIXED
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
            signed={signedDocument}
          />
        )
      ) : (
        <div className="text-center text-gray-500">Loading document...</div>
      )}
    </CustomModal>
  );
};

export default PdfViewer;
