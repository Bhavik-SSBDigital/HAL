import axios from 'axios';
import CryptoJS from 'crypto-js';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const PAYLOAD_SECRET = import.meta.env.VITE_PAYLOAD_SECRET;

// ─── Encryption helper ────────────────────────────────────────────────────────
// Encrypts a string value and URL-encodes it for safe header transmission
function encryptHeader(value) {
  return encodeURIComponent(
    CryptoJS.AES.encrypt(String(value), PAYLOAD_SECRET).toString(),
  );
}

// ─── MIME types ───────────────────────────────────────────────────────────────
export function getContentTypeFromExtension(extension) {
  const mimeTypes = {
    txt: 'text/plain',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    tar: 'application/x-tar',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// ─── getFileSize ──────────────────────────────────────────────────────────────
export const getFileSize = async (fileName, path, token) => {
  try {
    const response = await axios({
      method: 'get',
      url: `${backendUrl}/getFileData`,
      headers: {
        Range: 'bytes=0-0',
        'X-File-name': encryptHeader(fileName),   // ✅ encrypted
        'X-File-path': encryptHeader(path),        // ✅ encrypted
        'x-authorization': `Bearer ${token}`,
        'Content-Type': getContentTypeFromExtension(
          fileName.split('.').pop(),
        ),
      },
    });
    return response.data.fileSize;
  } catch (error) {
    console.error('getFileSize error:', error);
  }
};

// ─── get_file_data ────────────────────────────────────────────────────────────
// Used for both viewing (view=true → returns blobUrl) and downloading (view=false)
// Binary arraybuffer response is completely unchanged — no encryption on body
export const get_file_data = async (fileName, path, view) => {
  let chunks = [];
  const token = sessionStorage.getItem('accessToken');
  let start = 0;
  const chunkSize = 100 * 1024 * 1024; // 100MB
  let end = chunkSize - 1;
  const fileExtension = fileName.split('.').pop();

  const fileSize = await getFileSize(fileName, path, token);
  if (fileSize === undefined) {
    console.log('File does not exist');
    return null;
  }

  end = Math.min(end, fileSize - 1);

  try {
    while (start < fileSize) {
      const response = await axios({
        method: 'get',
        url: `${backendUrl}/getFileData`,
        headers: {
          Range: `bytes=${start}-${end}`,
          'x-file-name': encryptHeader(fileName),  // ✅ encrypted
          'x-file-path': encryptHeader(path),       // ✅ encrypted
          'content-type': getContentTypeFromExtension(fileExtension),
          'x-authorization': `Bearer ${token}`,
          'access-control-expose-headers': 'Content-Range',
        },
        responseType: 'arraybuffer', // ✅ unchanged — binary stays binary
      });

      chunks.push(new Blob([response.data]));

      start = end + 1;
      end = Math.min(start + chunkSize - 1, fileSize - 1);
    }

    // ✅ Blob construction unchanged — PDFs, images, docs all work as before
    const combinedBlob = new Blob(chunks, {
      type: getContentTypeFromExtension(fileExtension),
    });
    const blobUrl = URL.createObjectURL(combinedBlob);

    if (view) {
      // Caller receives blobUrl + fileType — rendering logic unaffected
      return {
        data: blobUrl,
        fileType: fileExtension,
      };
    }

    // Trigger download
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(anchor);

    chunks = [];
    start = 0;
  } catch (error) {
    alert(`Download failed for ${fileName}`);
    console.error('Error downloading file:', error);
  }
};

// ─── download ─────────────────────────────────────────────────────────────────
// view=true → returns { data, fileType } for in-browser preview
// view=false → triggers file download via get_file_data
export const download = async (fileName, path, view) => {
  const token = sessionStorage.getItem('accessToken');

  try {
    const response = await axios.post(
      `${backendUrl}/download`,
      null,
      {
        headers: {
          'x-file-name': encryptHeader(fileName),  // ✅ encrypted
          'x-file-path': encryptHeader(path),       // ✅ encrypted
          'x-authorization': `Bearer ${token}`,
        },
      },
    );

    if (view) {
      // ✅ Returns data URL/path from server — unchanged, no blob manipulation
      return {
        data: response.data.data,
        fileType: response.data.fileType,
      };
    } else {
      // ✅ Falls through to chunked download — same as before
      await get_file_data(fileName, path, false);
    }
  } catch (error) {
    alert(`Download failed for ${fileName}`);
    console.error('Error:', error);
  }
};

// ─── uploadFileWithChunks ─────────────────────────────────────────────────────
// Chunk binary body is untouched — only name/path headers are encrypted
export async function uploadFileWithChunks(
  file,
  path,
  customName,
  isInvolvedInProcess,
  tags,
  documentId,
) {
  try {
    const chunkSize = 500 * 1024 * 1024; // 500MB
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
      const start = chunkNumber * chunkSize;
      const end = Math.min(start + chunkSize - 1, file.size - 1);
      const contentType = getContentTypeFromExtension(
        file.name.split('.').pop(),
      );
      const resolvedName =
        customName !== undefined ? customName : file.name;

      const headers = {
        'X-File-Name': encryptHeader(resolvedName),  // ✅ encrypted
        'X-Total-Chunks': totalChunks,
        'X-Current-Chunk': chunkNumber,
        'X-Chunk-Size': chunkSize,
        'Content-Type': contentType,
        'X-file-path': encryptHeader(path),           // ✅ encrypted
        'X-file-id': documentId,
        'X-Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`,
        Range: `bytes=${start}-${end}`,
      };

      if (chunkNumber === 0) {
        headers['x-involved-in-process'] = isInvolvedInProcess;
        headers['x-tags'] = tags;
      }

      const chunk = file.slice(start, end + 1); // ✅ binary body untouched

      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: chunk,
        headers,
      });

      if (response.status === 409) {
        throw new Error('File with given name already exists');
      }
      if (!response.ok) {
        throw new Error('upload failed');
      }

      const data = await response.json();
      return data;
    }
  } catch (error) {
    throw error;
  }
}

// ─── upload ───────────────────────────────────────────────────────────────────
export async function upload(
  fileList,
  path,
  customName,
  isInvolvedInProcess,
  tags,
  documentId,
) {
  if (fileList.length === 0) return;

  try {
    const documentIds = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const res = await uploadFileWithChunks(
        file,
        path,
        customName !== undefined ? customName : undefined,
        isInvolvedInProcess,
        tags,
        documentId,
      );
      documentIds.push(res.documentId);
      return documentIds;
    }
  } catch (error) {
    throw error;
  }
}