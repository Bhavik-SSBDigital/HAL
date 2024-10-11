// import React, { useEffect, useState } from "react";
// import { Box, IconButton } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import { Document, Page, pdfjs } from "react-pdf";
// import PdfContainer from "./pdfViewer";
// import "react-pdf/dist/Page/AnnotationLayer.css";
// import "react-pdf/dist/Page/TextLayer.css";
// import styles from "./View.module.css";
// import moment from "moment";

// import {
//   Table,
//   TableHead,
//   TableBody,
//   TableRow,
//   TableCell,
// } from "@mui/material";

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`;

// const PdfViewer = ({ docu, handleViewClose }) => {
//   const [excelData, setExcelData] = useState();
//   const closeIconStyle = {
//     position: "absolute",
//     top: "10px",
//     right: "20px",
//     zIndex: "99",
//   };

//   useEffect(() => {
//     if (docu.type === "xlsx" || docu.type === "xls") {
//       fetch(docu.url)
//         .then((response) => response.blob())
//         .then((blob) => {
//           const reader = new FileReader();

//           reader.onload = (evt) => {
//             const bstr = evt.target.result;
//             const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
//             const wsname = wb.SheetNames[0];
//             const ws = wb.Sheets[wsname];
//             const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
//             let maxLength = 0;
//             let rowIndex = -1;

//             for (let i = 0; i < data.length; i++) {
//               if (data[i].length > maxLength) {
//                 maxLength = data[i].length;
//                 rowIndex = i;
//               }
//             }
//             for (let i = 0; i < data.length; i++) {
//               for (let j = 0; j < maxLength; j++) {
//                 if (data[i][j] === undefined) {
//                   data[i][j] = "";
//                 }
//               }
//             }

//             setExcelData(data);
//           };
//           reader.readAsBinaryString(blob);
//         })
//         .catch((error) => {
//           console.error("Error fetching Excel file:", error);
//         });
//     }
//   }, [docu]);
//   return (
//     <div
//       style={{
//         position: "fixed",
//         // top: "70px",
//         // left: "2px",
//         // right: "2px",
//         // bottom: "2px",
//         left: '50%',
//         top: "50%",
//         width: '100vw',
//         height: "100vh",
//         transform: 'translate(-50%, -50%)',
//         backgroundColor: "lightgray",
//         zIndex: "99999",
//       }}
//     >
//       <IconButton style={closeIconStyle} onClick={handleViewClose}>
//         <CloseIcon />
//       </IconButton>
//       {docu && (
//         <div style={{ height: "100%" }}>
//           {(() => {
//             if (docu.type === "pdf") {
//               return (
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     position: "relative",
//                     height: "100%",
//                   }}
//                 >
//                   <PdfContainer url={docu.url} />
//                 </div>
//               );
//             }
//           })()}
//         </div>
//       )}
//     </div>
//   );
// };

// export default PdfViewer;

import React, { useEffect, useState } from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { pdfjs } from "react-pdf";
import PdfContainer from "./pdfViewer";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfViewer = ({ docu, handleViewClose }) => {
  const [excelData, setExcelData] = useState();
  const closeIconStyle = {
    position: "absolute",
    top: "10px",
    right: "20px",
    zIndex: "9999999",
  };

  useEffect(() => {
    if (docu.type === "xlsx" || docu.type === "xls") {
      fetch(docu.url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();

          reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            let maxLength = 0;
            let rowIndex = -1;

            for (let i = 0; i < data.length; i++) {
              if (data[i].length > maxLength) {
                maxLength = data[i].length;
                rowIndex = i;
              }
            }
            for (let i = 0; i < data.length; i++) {
              for (let j = 0; j < maxLength; j++) {
                if (data[i][j] === undefined) {
                  data[i][j] = "";
                }
              }
            }

            setExcelData(data);
          };
          reader.readAsBinaryString(blob);
        })
        .catch((error) => {
          console.error("Error fetching Excel file:", error);
        });
    }
  }, [docu]);

  return (
    <div
      style={{
        position: "fixed",
        left: '0px',
        top: "0px",
        width: '100vw',
        height: "100vh",
        backgroundColor: "lightgray",
        zIndex: "99999",
      }}
    >
      <IconButton sx={closeIconStyle} onClick={handleViewClose}>
        <CloseIcon />
      </IconButton>
      {docu && (
        <>
          {(() => {
            if (docu.type === "pdf") {
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                    height: "100%",
                  }}
                >
                  <PdfContainer url={docu.url} documentId={docu.fileId} />
                </div>
              );
            }
          })()}
        </>
      )}
    </div>
  );
};

export default PdfViewer;
