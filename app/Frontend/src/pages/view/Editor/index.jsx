import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import './Editor.css';
import {
  MultiRootEditor,
  Bold,
  Essentials,
  Italic,
  Paragraph,
  Underline,
  Heading,
  List,
  Link,
  Alignment,
  FontSize,
  Indent,
} from 'ckeditor5';
import { useMultiRootEditor } from '@ckeditor/ckeditor5-react';

import 'ckeditor5/ckeditor5.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const Editor = () => {
  const editorProps = {
    editor: MultiRootEditor,
    data: {
      content: '<p>ASdasdasd</p>',
    },
    config: {
      licenseKey: 'GPL',
      plugins: [
        Essentials,
        Bold,
        Italic,
        Paragraph,
        Underline,
        Heading,
        List,
        Link,
        Alignment,
        FontSize,
        Indent,
      ],
      toolbar: [
        'undo',
        'redo',
        '|',
        'bold',
        'italic',
        'underline',
        'heading',
        'fontSize',
        'alignment',
        'link',
        '|',
        'bulletedList',
        'numberedList',
        'outdent',
        'indent',
        '|',
        'blockQuote',
      ],
    },
  };

  const {
    editor,
    toolbarElement,
    editableElements,
    data,
    setData,
    attributes,
    setAttributes,
  } = useMultiRootEditor(editorProps);

  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);

  // PDF load success handler
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Submit handler to generate PDF file (fake for this example)
  const handleSubmit = () => {
    console.log('Document data:', data);
    setPdfFile('./branch 1_compliance dept_2024_cb1_24.pdf');
  };

  return (
    <div className="Editor">
      {toolbarElement}
      {editableElements}

      <button
        style={{
          backgroundColor: '#4caf50',
          marginTop: '10px',
          color: 'white',
          borderRadius: '5px',
          marginLeft: 'auto',
          display: 'block',
          padding: '10px 15px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
        onClick={handleSubmit}
      >
        Submit Document
      </button>

      {pdfFile && (
        <div style={{ marginTop: '20px' }}>
          <h3>PDF Preview:</h3>
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            style={{
              border: '1px solid #ccc',
              padding: '10px',
              borderRadius: '5px',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} />
            ))}
          </Document>
        </div>
      )}
    </div>
  );
};

export default Editor;
