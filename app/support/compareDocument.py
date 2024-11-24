import fitz  # PyMuPDF for handling PDFs
import json
import sys
import pytesseract
from PIL import Image


def merge_adjacent_coordinates_with_space(coordinates, page, page_no):
    """
    Merge coordinates with the same y1 and y2 if there is space between them.
    Dynamically update the merged coordinates for further comparisons.
    """
    merged_coordinates = []
    i = 0

    while i < len(coordinates):
        coord = coordinates[i]
        current_merged = coord

        while (
            i + 1 < len(coordinates)
            and current_merged["y1"] == coordinates[i + 1]["y1"]
            and current_merged["y2"] == coordinates[i + 1]["y2"]
        ):
            # Check for space between current x2 and next x1
            x1 = current_merged["x1"]
            x2 = coordinates[i + 1]["x2"]
            y1, y2 = current_merged["y1"], current_merged["y2"]

            # Clip the region between current_merged and the next coordinate
            clip_area = (current_merged["x2"], y1, coordinates[i + 1]["x1"], y2)
            try:
                pix = page.get_pixmap(clip=clip_area)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # Run OCR to check for spaces
                custom_config = r'--psm 6'  # Treat the area as a block of text
                ocr_text = pytesseract.image_to_string(img, config=custom_config).strip()

                if not ocr_text:  # If OCR detects space (no text)
                    # Merge coordinates
                    current_merged = {
                        "x1": x1,
                        "x2": x2,
                        "y1": y1,
                        "y2": y2,
                    }
                    i += 1  # Move to the next coordinate to continue merging
                else:
                    break  # Stop merging if text is detected
            except Exception as e:
                print(f"Error processing OCR between coordinates: {e}")
                break

        # Add the final merged coordinate to the list
        merged_coordinates.append(current_merged)
        i += 1  # Move to the next coordinate

    return merged_coordinates


def compare_text_blocks(pdf_path_1, pdf_path_2):
    discrepancies = {"observations_for_file1": [], "observations_for_file2": [], "discrepancy_type": "text"}

    try:
        # Open both PDFs
        pdf1 = fitz.open(pdf_path_1)
        pdf2 = fitz.open(pdf_path_2)

        # Ensure we compare up to the minimum number of pages
        min_pages = min(pdf1.page_count, pdf2.page_count)

        for pageNo in range(min_pages):
            page1 = pdf1[pageNo]
            page2 = pdf2[pageNo]

            # Extract lines as dictionaries: {"text": line_text, "bbox": bounding_box}
            lines1 = page1.get_text("dict")["blocks"]
            lines2 = page2.get_text("dict")["blocks"]

            # Iterate through lines in both files
            for block1, block2 in zip(lines1, lines2):
                for l1, l2 in zip(block1.get("lines", []), block2.get("lines", [])):
                    text1 = " ".join(span["text"] for span in l1["spans"])
                    text2 = " ".join(span["text"] for span in l2["spans"])
                    
                    # Compare the two lines for discrepancies
                    if text1 != text2:
                        observations1, observations2 = analyze_line_discrepancies(
                            l1["spans"], text1, l2["spans"], text2, pageNo + 1, page1, page2
                        )

                        discrepancies["observations_for_file1"].extend(observations1)
                        discrepancies["observations_for_file2"].extend(observations2)

        # Check for extra pages in either PDF
        if pdf1.page_count > pdf2.page_count:
            for pageNo in range(min_pages, pdf1.page_count):
                page1 = pdf1[pageNo]
                full_page_coordinates = get_full_page_coordinates(page1)
                discrepancies["observations_for_file1"].append({
                    "pageNo": pageNo + 1,  # Add 1 for user-friendly page numbers
                    "coordinates": full_page_coordinates
                })

        elif pdf2.page_count > pdf1.page_count:
            for pageNo in range(min_pages, pdf2.page_count):
                page2 = pdf2[pageNo]
                full_page_coordinates = get_full_page_coordinates(page2)
                discrepancies["observations_for_file2"].append({
                    "pageNo": pageNo + 1,
                    "coordinates": full_page_coordinates
                })

        return discrepancies

    except Exception as e:
        print(f"Error: {e}")
        return discrepancies


def get_full_page_coordinates(page):
    """
    Get the coordinates covering the entire content of a page.
    """
    # Get the page dimensions
    width, height = page.rect.width, page.rect.height

    # Define the full bounding box covering the entire page
    full_page_coordinates = [{"x1": 0, "y1": 0, "x2": width, "y2": height}]
    
    return full_page_coordinates


def analyze_line_discrepancies(spans1, text1, spans2, text2, pageNo, page1, page2):
    """
    Compare two lines of text and return discrepancies.
    """
    observations1 = []
    observations2 = []

    # Use difflib to find portions of text that differ
    from difflib import SequenceMatcher
    matcher = SequenceMatcher(None, text1, text2)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace" or tag == "delete":
            # Mismatched portion in File 1
            coords1 = find_coordinates_for_text(spans1, text1[i1:i2])
            if coords1:
                observations1.append({
                    "pageNo": pageNo,
                    "text": text1[i1:i2],
                    "coordinates": merge_adjacent_coordinates_with_space(coords1, page1, pageNo)
                })
        if tag == "replace" or tag == "insert":
            # Mismatched portion in File 2
            coords2 = find_coordinates_for_text(spans2, text2[j1:j2])
            if coords2:
                observations2.append({
                    "pageNo": pageNo,
                    "text": text2[j1:j2],
                    "coordinates": merge_adjacent_coordinates_with_space(coords2, page2, pageNo)
                })

    return observations1, observations2

def find_coordinates_for_text(spans, text_portion):
    """
    Find the exact coordinates for a specific portion of text.
    """
    coordinates = []
    for span in spans:
        span_text = span["text"]
        if text_portion in span_text:
            start_idx = span_text.find(text_portion)
            end_idx = start_idx + len(text_portion)

            # Approximate the coordinates for the substring based on the proportion of text
            total_len = len(span_text)
            x1 = span["bbox"][0] + (start_idx / total_len) * (span["bbox"][2] - span["bbox"][0])
            x2 = span["bbox"][0] + (end_idx / total_len) * (span["bbox"][2] - span["bbox"][0])
            y1, y2 = span["bbox"][1], span["bbox"][3]

            coordinates.append({
                "x1": x1, "y1": y1, "x2": x2, "y2": y2
            })

    return coordinates if coordinates else None


# Main comparison function to consolidate all detection types
def compare_documents(doc1_path, doc2_path):
    result = []
    
    # Text discrepancy detection
    try:
        text_discrepancies = compare_text_blocks(doc1_path, doc2_path)
        if text_discrepancies:
            result.append(text_discrepancies)
    except Exception as e:
        result.append({"detection_type": "text_discrepancy", "observations": [{"error": f"Text discrepancies could not be found: {str(e)}"}]})

    return result

# Main entry point for command-line execution
if __name__ == "__main__":
    try:
        file1_path = sys.argv[1]
        file2_path = sys.argv[2]
        result = compare_documents(file1_path, file2_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
