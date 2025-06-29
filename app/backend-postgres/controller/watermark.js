import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFParser,
  PDFName,
  PDFArray,
  degrees,
} from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export async function watermarkDocument(inputPath, outputPath, watermarkText) {
  try {
    // Check file extension
    const ext = path.extname(inputPath).toLowerCase();
    if (ext !== ".pdf") {
      throw new Error(
        `Unsupported file extension: ${ext}. Please convert to PDF first (e.g., use libreoffice for DOCX or image-to-PDF tools).`
      );
    }

    // Read the input PDF file
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get all pages
    const pages = pdfDoc.getPages();

    // Iterate through each page and add watermark
    for (const page of pages) {
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont("Helvetica"); // Use default Helvetica font
      const fontSize = 50;
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = fontSize;

      // Calculate position for diagonal watermark (center of the page)
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw watermark text with 45-degree rotation
      page.drawText(watermarkText, {
        x: centerX - textWidth / 2,
        y: centerY + textHeight / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5, 0.3), // Semi-transparent gray
        rotate: degrees(-45), // Diagonal
        opacity: 0.3, // Transparency
      });
    }

    // Save the watermarked PDF
    const pdfBytesWatermarked = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytesWatermarked);

    console.log(`Watermarked document saved to ${outputPath}`);
    return { success: true, outputPath };
  } catch (error) {
    console.error("Error watermarking document:", error.message);
    return { success: false, error: error.message };
  }
}
