import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './DocumentVersioning.module.css';

const DocumentVersioning = ({ file1, file2, observations }) => {
  const [numPages1, setNumPages1] = useState(null);
  const [numPages2, setNumPages2] = useState(null);
  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);

  const onLoadSuccess1 = ({ numPages }) => setNumPages1(numPages);
  const onLoadSuccess2 = ({ numPages }) => setNumPages2(numPages);

  const renderHighlights = (pageNum) => {
    // Find the relevant observation for the current page
    const pageObservations = observations
      .filter((obs) => obs?.observations?.some((o) => o.page === pageNum))
      .flatMap((obs) => obs?.observations?.filter((o) => o.page === pageNum));

    // Iterate over all changes in the relevant observations
    return pageObservations?.flatMap((obs, obsIndex) =>
      obs.changes.map((change, changeIndex) => {
        const style = {
          left: `${change.coordinates.x1}px`,
          top: `${change.coordinates.y1}px`,
          width: `${change.coordinates.x2 - change.coordinates.x1}px`,
          height: `${change.coordinates.y2 - change.coordinates.y1}px`,
          backgroundColor: change.added
            ? 'rgba(0, 255, 0, 0.3)'
            : 'rgba(255, 0, 0, 0.3)',
        };
        return (
          <div
            key={`${obsIndex}-${changeIndex}`}
            style={style}
            className={styles.highlight}
          >
            {change.text}
          </div>
        );
      }),
    );
  };

  return (
    <div className={styles.documentVersioning}>
      <div className={styles.documentContainer}>
        {file1 && (
          <div className={styles.document}>
            <h3>Version 1</h3>
            {error1 && <p className={styles.error}>{error1}</p>}
            <Document file={file1} onLoadSuccess={onLoadSuccess1}>
              {Array.from(new Array(numPages1), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1}>
                  <div className={styles.pageOverlay}>
                    {renderHighlights(index + 1)}
                  </div>
                </Page>
              ))}
            </Document>
          </div>
        )}

        {file2 && (
          <div className={styles.document}>
            <h3>Version 2</h3>
            {error2 && <p className={styles.error}>{error2}</p>}
            <Document file={file2} onLoadSuccess={onLoadSuccess2}>
              {Array.from(new Array(numPages2), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1}></Page>
              ))}
            </Document>
          </div>
        )}
        <div className={styles.changesList}>
          <h3 className={styles.changesHeading}>Changes</h3>
          {observations
            .flatMap((obs) => obs.observations)
            .map((obs, obsIndex) =>
              obs.changes.map((change, changeIndex) => (
                <div
                  key={`${obsIndex}-${changeIndex}`}
                  className={`${change.added ? styles.added : styles.removed} ${
                    styles.changesElement
                  }`}
                >
                  <p>
                    Page {obs.page}: {change.text} (
                    {change.added ? 'Added' : 'Removed'})
                  </p>
                </div>
              )),
            )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVersioning;
