import React from 'react';
import {
    PictureAsPdf, Image, Description, Movie, Audiotrack, Archive, Code, InsertDriveFile, Slideshow
} from '@mui/icons-material';
import pdfIcon from '/src/assets/File_Icons/pdf.png'

const getFileExtension = (fileName) => {
    return fileName.split('.').pop().toLowerCase();  // Extracts file extension
};

const getFileIcon = (fileType) => {
    switch (fileType) {
        // Document types
        case 'pdf':
            return <img src={pdfIcon} width={25} style={{ marginRight: "3px" }} />;
        case 'doc':
        case 'docx':
        case 'odt':
            return <Description sx={{ mr: 1, color: 'green' }} />;
        case 'xls':
        case 'xlsx':
            return <Description sx={{ mr: 1, color: 'green' }} />;  // Using same icon as docs, customize as needed
        case 'ppt':
        case 'pptx':
            return <Slideshow sx={{ mr: 1, color: 'orange' }} />;

        // Image types
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'svg':
            return <Image sx={{ mr: 1, color: 'blue' }} />;

        // Audio types
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'aac':
            return <Audiotrack sx={{ mr: 1, color: 'purple' }} />;

        // Video types
        case 'mp4':
        case 'mkv':
        case 'avi':
        case 'mov':
        case 'flv':
            return <Movie sx={{ mr: 1, color: 'brown' }} />;

        // Compressed types
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return <Archive sx={{ mr: 1, color: 'orange' }} />;

        // Code file types
        case 'js':
        case 'json':
        case 'html':
        case 'css':
        case 'xml':
        case 'py':
        case 'java':
        case 'cpp':
        case 'c':
            return <Code sx={{ mr: 1, color: 'blue' }} />;

        // Default file icon for unknown file types
        default:
            return <InsertDriveFile sx={{ mr: 1, color: 'gray' }} />;
    }
};

const FileIcon = ({ name }) => {
    const fileType = getFileExtension(name);
    return getFileIcon(fileType);
};

export default FileIcon;
