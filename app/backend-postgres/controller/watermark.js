import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import os from "os";

// Unified watermarking function
export async function watermarkDocument(inputPath, outputPath, watermarkText) {
  let tempPath;
  try {
    // Validate input
    await fs.access(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".tiff", ".png"].includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    // Create temp file
    tempPath = path.join(os.tmpdir(), `watermarked-${Date.now()}${ext}`);

    // Process file
    if (ext === ".pdf") {
      await watermarkPDF(inputPath, tempPath, watermarkText);
    } else {
      await processImageFile(inputPath, tempPath, watermarkText, ext);
    }

    // Move to final location
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.rename(tempPath, outputPath);

    return { success: true, outputPath };
  } catch (error) {
    console.error("Watermarking error:", error);
    return { success: false, error: error.message };
  } finally {
    if (tempPath) await fs.unlink(tempPath).catch(() => {});
  }
}

// PDF watermarking
async function watermarkPDF(inputPath, outputPath, watermarkText) {
  const pdfBytes = await fs.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(Math.min(width, height) * 0.07, 20);
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4, 0.5),
      rotate: degrees(-45),
      opacity: 0.5,
    });
  }

  await fs.writeFile(outputPath, await pdfDoc.save());
}

// New robust image processing
async function processImageFile(inputPath, outputPath, watermarkText, ext) {
  const image = sharp(inputPath, { failOnError: true });
  const metadata = await image.metadata();

  // Create SVG watermark
  const svg = `
    <svg width="${metadata.width}" height="${
    metadata.height
  }" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="50%" y="50%"
        font-family="Helvetica"
        font-size="${Math.max(
          Math.min(metadata.width, metadata.height) * 0.07,
          20
        )}"
        fill="#666666"
        fill-opacity="0.5"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-45, ${metadata.width / 2}, ${metadata.height / 2})"
      >${watermarkText}</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // TIFF-specific handling with compatibility fixes
  if (ext === ".tiff") {
    const inputBuffer = await fs.readFile(inputPath);

    // For multi-page TIFF
    if (metadata.pages > 1) {
      const processedPages = [];

      for (let i = 0; i < metadata.pages; i++) {
        const pageImage = sharp(inputBuffer, { page: i });
        const pageMeta = await pageImage.metadata();

        const pageSvg = `
          <svg width="${pageMeta.width}" height="${
          pageMeta.height
        }" xmlns="http://www.w3.org/2000/svg">
            <text 
              x="50%" y="50%"
              font-size="${Math.max(
                Math.min(pageMeta.width, pageMeta.height) * 0.07,
                20
              )}"
              fill="#666666"
              fill-opacity="0.5"
              text-anchor="middle"
              dominant-baseline="middle"
              transform="rotate(-45, ${pageMeta.width / 2}, ${
          pageMeta.height / 2
        })"
            >${watermarkText}</text>
          </svg>
        `;

        processedPages.push(
          await pageImage
            .composite([{ input: Buffer.from(pageSvg), blend: "over" }])
            .toBuffer()
        );
      }

      // Use first page as base and append others
      const baseImage = sharp(processedPages[0]);
      for (let i = 1; i < processedPages.length; i++) {
        baseImage.append(processedPages[i]);
      }

      await baseImage
        .withMetadata()
        .toFormat("tiff", {
          compression: "lzw",
          predictor: "horizontal",
          resolutionUnit: "inch", // Explicitly set resolution unit
          density: metadata.density || 72, // Preserve original DPI
        })
        .toFile(outputPath);
    }
    // Single-page TIFF
    else {
      await image
        .composite([{ input: svgBuffer, blend: "over" }])
        .withMetadata()
        .toFormat("tiff", {
          compression: "lzw",
          predictor: "horizontal",
          resolutionUnit: "inch",
          density: metadata.density || 72,
        })
        .toFile(outputPath);
    }
  }
  // Other image formats
  else {
    await image
      .composite([{ input: svgBuffer, blend: "over" }])
      .toFormat(ext.substring(1), {
        ...(ext === ".jpg" || ext === ".jpeg"
          ? { mozjpeg: true, quality: 100 }
          : {}),
        ...(ext === ".png" ? { compressionLevel: 0 } : {}),
      })
      .toFile(outputPath);
  }
}
