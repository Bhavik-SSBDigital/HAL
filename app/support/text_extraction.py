#!/usr/bin/env python3
import sys
import json
import os
import tempfile
from pathlib import Path
import fitz  # PyMuPDF
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import pdfminer
from pdfminer.high_level import extract_text as pdfminer_extract_text
import cv2
import numpy as np

def extract_text_from_pdf(file_path):
    """Extract text from PDF using multiple methods with fallbacks"""
    text = ""
    
    # Method 1: Try PyMuPDF (fastest for text-based PDFs)
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text() + "\n"
        if text.strip():
            print("Extracted text using PyMuPDF", file=sys.stderr)
            return text
    except Exception as e:
        print(f"PyMuPDF failed: {e}", file=sys.stderr)
    
    # Method 2: Try pdfplumber
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip():
            print("Extracted text using pdfplumber", file=sys.stderr)
            return text
    except Exception as e:
        print(f"pdfplumber failed: {e}", file=sys.stderr)
    
    # Method 3: Try pdfminer
    try:
        text = pdfminer_extract_text(file_path)
        if text.strip():
            print("Extracted text using pdfminer", file=sys.stderr)
            return text
    except Exception as e:
        print(f"pdfminer failed: {e}", file=sys.stderr)
    
    # Method 4: OCR for scanned PDFs
    try:
        # Convert PDF to images
        images = convert_from_path(file_path, dpi=300)
        ocr_text = ""
        
        for i, image in enumerate(images):
            # Convert PIL image to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Preprocess image for better OCR
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            # Apply threshold to get image with only black and white
            _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
            
            # Convert back to PIL image
            processed_image = Image.fromarray(thresh)
            
            # Perform OCR
            page_text = pytesseract.image_to_string(processed_image, lang='eng')
            ocr_text += page_text + "\n"
        
        if ocr_text.strip():
            print("Extracted text using OCR", file=sys.stderr)
            return ocr_text
            
    except Exception as e:
        print(f"OCR failed: {e}", file=sys.stderr)
    
    return ""

def extract_text_from_image(file_path):
    """Extract text from image files using OCR"""
    try:
        image = Image.open(file_path)
        
        # Preprocess image for better OCR
        if image.mode != 'L':  # Convert to grayscale if not already
            image = image.convert('L')
        
        # Enhance contrast
        np_image = np.array(image)
        np_image = cv2.convertScaleAbs(np_image, alpha=1.5, beta=0)
        enhanced_image = Image.fromarray(np_image)
        
        text = pytesseract.image_to_string(enhanced_image, lang='eng')
        return text.strip()
    except Exception as e:
        print(f"Image OCR failed: {e}", file=sys.stderr)
        return ""

def extract_text_from_txt(file_path):
    """Extract text from plain text files"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        print(f"Text file reading failed: {e}", file=sys.stderr)
        return ""

def extract_text_from_docx(file_path):
    """Extract text from DOCX files using pdfplumber fallback to textract if available"""
    try:
        # Try using python-docx if available
        try:
            import docx
            doc = docx.Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except ImportError:
            pass
        
        # Fallback: try to convert to text using system tools
        import subprocess
        result = subprocess.run(['textutil', '-convert', 'txt', '-stdout', file_path], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout
        return ""
    except Exception as e:
        print(f"DOCX extraction failed: {e}", file=sys.stderr)
        return ""

def extract_text_from_xlsx(file_path):
    """Extract text from XLSX files"""
    try:
        import pandas as pd
        xl = pd.ExcelFile(file_path)
        text_parts = []
        
        for sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name)
            text_parts.append(f"Sheet: {sheet_name}")
            text_parts.append(df.to_string())
        
        return "\n".join(text_parts)
    except Exception as e:
        print(f"XLSX extraction failed: {e}", file=sys.stderr)
        return ""

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python text_extraction.py <file_path>"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)
    
    if os.path.getsize(file_path) == 0:
        print(json.dumps({"error": "File is empty"}))
        sys.exit(1)
    
    file_ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if file_ext == '.pdf':
            text = extract_text_from_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif']:
            text = extract_text_from_image(file_path)
        elif file_ext == '.txt':
            text = extract_text_from_txt(file_path)
        elif file_ext in ['.docx', '.doc']:
            text = extract_text_from_docx(file_path)
        elif file_ext in ['.xlsx', '.xls']:
            text = extract_text_from_xlsx(file_path)
        else:
            text = ""
            print(f"Unsupported file type: {file_ext}", file=sys.stderr)
        
        # Return result as JSON
        result = {
            "text": text,
            "success": bool(text.strip()),
            "file_type": file_ext,
            "file_size": os.path.getsize(file_path)
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": f"Extraction failed: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()