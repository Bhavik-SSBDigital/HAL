import fitz  # PyMuPDF for handling PDFs
import json
from datetime import datetime
from PIL import Image, ImageChops
import difflib
import sys
import io
import pdfplumber

def compare_text_blocks(pdf_path_1, pdf_path_2):
    discrepancies = []

    try:
        # Open PDFs with fitz (make sure the paths are correct)
        pdf1 = fitz.open(pdf_path_1)  # Open the first file
        pdf2 = fitz.open(pdf_path_2)  # Open the second file

        # Ensure both PDFs have the same number of pages
        min_pages = min(pdf1.page_count, pdf2.page_count)

        # Loop through all pages
        for page_number in range(min_pages):
            page1 = pdf1.load_page(page_number)  # Load page from the first file
            page2 = pdf2.load_page(page_number)  # Load page from the second file

            # Extract words as a list of (x0, y0, x1, y1, word, block_no, line_no, word_no)
            words1 = page1.get_text("words")  # Extract words from page 1
            words2 = page2.get_text("words")  # Extract words from page 2

            # Compare words on the same page from both files
            for word1, word2 in zip(words1, words2):
                text1 = word1[4]  # Text from the first file
                text2 = word2[4]  # Text from the second file

             
                # If there's a discrepancy between the words, we capture the difference
                if text1 != text2:
                    missing_text = ''.join(set(text1) - set(text2))  # Text in file 1 but not in file 2
                    added_text = ''.join(set(text2) - set(text1))    # Text in file 2 but not in file 1

                    # Check if the second file is missing text, treat it as removal (added: false)
                    if missing_text:
                        discrepancies.append({
                            "page": page_number + 1,
                            "changes": [
                                {
                                    "text": missing_text,
                                    "coordinates": [word1[0], word1[1], word1[2], word1[3]],
                                    "added": False  # This text is missing (removed) in the second file
                                }
                            ]
                        })

                    # Check if the second file has extra text, treat it as added (added: true)
                    if added_text:
                        discrepancies.append({
                            "page": page_number + 1,
                            "changes": [
                                {
                                    "text": added_text,
                                    "coordinates": [word2[0], word2[1], word2[2], word2[3]],
                                    "added": True  # This text is added in the second file
                                }
                            ]
                        })

    except Exception as e:
        # Return error message if there's any issue with file opening or processing
        return {"observations": [{"error": f"Error: {str(e)}"}]}

    # Return the discrepancies found between the two PDFs
    return {"observations": discrepancies}


def compare_images_advanced(img_data1, img_data2):
    img1 = Image.open(io.BytesIO(img_data1)).convert("RGB")
    img2 = Image.open(io.BytesIO(img_data2)).convert("RGB")

    # Convert images to grayscale for SSIM
    img1_gray = np.array(img1.convert('L'))
    img2_gray = np.array(img2.convert('L'))

    # Calculate SSIM
    ssim_index, diff = ssim(img1_gray, img2_gray, full=True)
    
    
    # If SSIM is low, there are differences
    if ssim_index < 0.95:
        return diff  # Return the difference image
    return None

def compare_images_with_coordinates(img_data1, img_data2):
    img1 = Image.open(io.BytesIO(img_data1)).convert("RGB")
    img2 = Image.open(io.BytesIO(img_data2)).convert("RGB")

    # Use ImageChops.difference to detect discrepancies
    diff = ImageChops.difference(img1, img2)

    # Get bounding box of the difference
    bbox = diff.getbbox()
    if bbox:
        return bbox  # Return coordinates of the discrepancy (bounding box)
    return None


def compare_metadata(doc1, doc2):
    """
    Compares metadata of two PDF documents, capturing changes in creation date, author, etc.
    """
    metadata_diffs = []
    metadata1 = doc1.metadata
    metadata2 = doc2.metadata

    for key in metadata1.keys():
        if metadata1[key] != metadata2.get(key):
            metadata_diffs.append({
                "field": key,
                "old_value": metadata1[key],
                "new_value": metadata2.get(key)
            })

    return {"detection_type": "metadata_manipulation", "observations": metadata_diffs}


def compare_formatting(doc1, doc2):
    """
    Detects formatting differences, such as font size or color.
    """
    formatting_diffs = []
    for page_num in range(min(len(doc1), len(doc2))):
        page1 = doc1[page_num]
        page2 = doc2[page_num]

        blocks1 = page1.get_text("dict")
        blocks2 = page2.get_text("dict")

        page_diffs = {"page": page_num + 1, "changes": []}

        for block1, block2 in zip(blocks1["blocks"], blocks2["blocks"]):
            if block1["type"] == 0 and block2["type"] == 0:  # Only text blocks
                if block1["font_size"] != block2["font_size"]:
                    page_diffs["changes"].append({
                        "text": block1["text"],
                        "change_details": "Font size change detected",
                        "coordinates": block1["bbox"]
                    })
                if block1.get("color") != block2.get("color"):
                    page_diffs["changes"].append({
                        "text": block1["text"],
                        "change_details": "Font color change detected",
                        "coordinates": block1["bbox"]
                    })

        if page_diffs["changes"]:
            formatting_diffs.append(page_diffs)

    return {"detection_type": "formatting_changes", "observations": formatting_diffs}


def compare_documents(doc1_path, doc2_path):
    image_diffs = []

    # Open the documents using fitz
    doc1 = fitz.open(doc1_path)
    doc2 = fitz.open(doc2_path)

    # Iterate over pages and compare images
    for page_num in range(min(len(doc1), len(doc2))):
        page1 = doc1.load_page(page_num)
        page2 = doc2.load_page(page_num)

        images1 = page1.get_images(full=True)
        images2 = page2.get_images(full=True)

        page_diffs = {"page": page_num + 1, "changes": []}

        for img1, img2 in zip(images1, images2):
            if img1[7] != img2[7]:  # Checksum-based initial check
                xref1, xref2 = img1[0], img2[0]
                img_data1 = doc1.extract_image(xref1)["image"]
                img_data2 = doc2.extract_image(xref2)["image"]

                # Compare images and get bounding box of discrepancies
                diff_bbox = compare_images_with_coordinates(img_data1, img_data2)
                if diff_bbox:
                    page_diffs["changes"].append({
                        "coordinates": diff_bbox,
                        "added": True,
                        "type": "image_discrepancy"
                    })

                # Advanced SSIM comparison
                ssim_diff = compare_images_advanced(img_data1, img_data2)
                if ssim_diff is not None:
                    # Further process SSIM differences if needed
                    page_diffs["changes"].append({
                        "coordinates": "SSIM difference detected",
                        "added": True,
                        "type": "image_discrepancy"
                    })

        if page_diffs["changes"]:
            image_diffs.append(page_diffs)

    return {"detection_type": "image_manipulation", "observations": image_diffs}


if __name__ == "__main__":
    try:
        file1_path = sys.argv[1]
        file2_path = sys.argv[2]
        result = compare_documents(file1_path, file2_path)
        print(result)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
