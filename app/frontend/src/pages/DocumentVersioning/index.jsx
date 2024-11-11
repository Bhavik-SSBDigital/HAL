import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const DocumentVersioning = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [numPages1, setNumPages1] = useState(null);
  const [numPages2, setNumPages2] = useState(null);

  const onLoadSuccess1 = ({ numPages }) => setNumPages1(numPages);
  const onLoadSuccess2 = ({ numPages }) => setNumPages2(numPages);

  const handleFileChange1 = (event) => {
    setFile1(URL.createObjectURL(event.target.files[0]));
  };

  const handleFileChange2 = (event) => {
    setFile2(URL.createObjectURL(event.target.files[0]));
  };

  return (
    <div>
      <div>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange1}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange2}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '20px',
        }}
      >
        {file1 && (
          <div style={{ width: '48%' }}>
            <h3>Version 1</h3>
            <Document file={file1} onLoadSuccess={onLoadSuccess1}>
              {Array.from(new Array(numPages1), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} />
              ))}
            </Document>
          </div>
        )}

        {file2 && (
          <div style={{ width: '48%' }}>
            <h3>Version 2</h3>
            <Document file={file2} onLoadSuccess={onLoadSuccess2}>
              {Array.from(new Array(numPages2), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} />
              ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVersioning;
