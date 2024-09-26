import cv2
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
import numpy as np
import fitz  # PyMuPDF
import sys
import json

def detect_last_content_y_coordinate(pdf_path):
    """Detect the maximum Y-coordinate of the last content on the last page, combining text and image analysis."""
    y_coords = []

    # Load the PDF with PyMuPDF to get the actual page height
    doc = fitz.open(pdf_path)
    last_page_pymupdf = doc.load_page(-1)
    pdf_page_height = last_page_pymupdf.rect.height

    # Convert the last page of the PDF to an image
    images = convert_from_path(pdf_path, first_page=doc.page_count, last_page=doc.page_count)
    if images:
        last_page_image = images[0]
        img_height = last_page_image.height
        
        # Calculate the scaling factor between the image and the actual PDF page height
        scale_factor = pdf_page_height / img_height

        # Load image with OpenCV
        np_image = np.array(last_page_image)
        gray_image = cv2.cvtColor(np_image, cv2.COLOR_BGR2GRAY)

        # Perform OCR on the image to extract text and detect content
        ocr_data = pytesseract.image_to_data(last_page_image, output_type=pytesseract.Output.DICT)

        # Get the highest Y coordinate of detected text blocks
        max_text_y_coord = 0
        for i in range(len(ocr_data['text'])):
            text = ocr_data['text'][i]
            if text.strip():  # Ensure the detected text is not just whitespace
                y_coord = ocr_data['top'][i] + ocr_data['height'][i]
                max_text_y_coord = max(max_text_y_coord, y_coord)

        # Normalize the OCR Y-coordinate to PDF page height
        max_text_y_coord = max_text_y_coord * scale_factor

        # Detect edges using Canny edge detection
        edges = cv2.Canny(gray_image, threshold1=50, threshold2=150)
        edge_indices = np.argwhere(edges > 0)

        if edge_indices.any():
            bottom_edge = np.max(edge_indices[:, 0])

            # Normalize the bottom edge Y-coordinate to PDF page height
            normalized_bottom_edge = bottom_edge * scale_factor
            y_coords.append((float(normalized_bottom_edge), 'Edge'))

            # Check if there's non-text content between max_text_y_coord and bottom_edge
            if normalized_bottom_edge > max_text_y_coord:
                region_of_interest = gray_image[int(max_text_y_coord / scale_factor):bottom_edge, :]
                non_text_content = np.any(region_of_interest < 255)

                if non_text_content:
                    y_coords.append((float(normalized_bottom_edge), 'Non-text Content Detected'))
                else:
                    y_coords.append((float(max_text_y_coord), 'Text'))

    # If OCR data is unreliable, fallback to using image height
    if not y_coords:
        y_coords.append((float(pdf_page_height), 'Image Height'))

    # Use the maximum Y-coordinate from valid sources
    if y_coords:
        max_y_coord, source = max(y_coords, key=lambda x: x[0])
        return int(max_y_coord)  # Ensure it's a standard Python int
    return 0  # No valid content found on the page

def get_last_page_height(pdf_path):
    """Get the height of the last page in the PDF."""
    doc = fitz.open(pdf_path)  # Open the PDF document
    last_page_number = len(doc) - 1  # Get the index of the last page (0-based index)
    last_page = doc.load_page(last_page_number)  # Load the last page
    rect = last_page.rect  # Get the rectangle defining the page dimensions
    height = rect.height  # Extract the height from the rectangle
    return height


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    last_content_y_coord = detect_last_content_y_coordinate(pdf_path)
    page_height = get_last_page_height(pdf_path)

    result = {
        "height": page_height,
        "last_y": last_content_y_coord
    }
    # Output the maximum Y-coordinate of the last content
    print(json.dumps(result))
