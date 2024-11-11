import fitz  # PyMuPDF for handling PDFs
import difflib
import json
import sys
from datetime import datetime

def compare_text_blocks(doc1, doc2):
    # Detects text additions and deletions, returns list with discrepancies and coordinates.
    text_diffs = []
    for page_num in range(min(len(doc1), len(doc2))):
        page1 = doc1[page_num]
        page2 = doc2[page_num]
        
        blocks1 = page1.get_text("blocks")
        blocks2 = page2.get_text("blocks")

        # Find differences in text blocks
        diff_blocks = {"page": page_num + 1, "changes": []}

        for block in blocks2:
            if block not in blocks1:  # Added text
                diff_blocks["changes"].append({
                    "text": block[4],
                    "coordinates": block[:4],  # Coordinates of added text block
                    "added": True
                })

        for block in blocks1:
            if block not in blocks2:  # Removed text
                diff_blocks["changes"].append({
                    "text": block[4],
                    "coordinates": block[:4],  # Coordinates of removed text block
                    "added": False
                })

        if diff_blocks["changes"]:
            text_diffs.append(diff_blocks)

    return {"detection_type": "text_difference", "observations": text_diffs}


def compare_metadata(doc1, doc2):
    # Compares metadata of two PDF documents, capturing changes in creation date, author, etc.
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


def compare_images(doc1, doc2):
    # Detects image manipulations including additions, removals, and pixel differences.
    image_diffs = []
    for page_num in range(min(len(doc1), len(doc2))):
        page1 = doc1[page_num]
        page2 = doc2[page_num]

        images1 = page1.get_images(full=True)
        images2 = page2.get_images(full=True)

        # Collect coordinates of discrepancies in images
        page_diffs = {"page": page_num + 1, "changes": []}
        added_images = [img for img in images2 if img not in images1]
        removed_images = [img for img in images1 if img not in images2]

        for img in added_images:
            page_diffs["changes"].append({
                "coordinates": page2.get_image_rect(img[0]),  # Rectangular coordinates
                "added": True,
                "type": "image"
            })
        
        for img in removed_images:
            page_diffs["changes"].append({
                "coordinates": page1.get_image_rect(img[0]),  # Rectangular coordinates
                "added": False,
                "type": "image"
            })

        if page_diffs["changes"]:
            image_diffs.append(page_diffs)

    return {"detection_type": "image_manipulation", "observations": image_diffs}


def compare_formatting(doc1, doc2):
    # Detects formatting differences, such as font size or color.
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


def miscellaneous_discrepancies(doc1, doc2):
    # Miscellaneous checks for discrepancies when certain types (e.g., images as text) are missed.
    misc_diffs = []
    for page_num in range(min(len(doc1), len(doc2))):
        page1 = doc1[page_num]
        page2 = doc2[page_num]

        # Scan for potential hidden layers or discrepancies
        misc_changes = {"page": page_num + 1, "changes": []}

        # Example: Add dummy coordinates or specific details found as needed
        # Actual miscellaneous checks can be added here
        # misc_changes["changes"].append({"coordinates": [x1, y1, x2, y2], "details": "Suspicious region"})

        if misc_changes["changes"]:
            misc_diffs.append(misc_changes)

    return {"detection_type": "miscellaneous", "observations": misc_diffs}


def compare_documents(file1_path, file2_path):
    # Compares two PDF documents by their absolute paths across all specified detection types.
    # Returns a structured JSON result with detected discrepancies.

    # Load PDF documents
    doc1 = fitz.open(file1_path)
    doc2 = fitz.open(file2_path)

    # Run comparisons for all specified detection types
    results = []
    results.append(compare_text_blocks(doc1, doc2))
    results.append(compare_metadata(doc1, doc2))
    results.append(compare_images(doc1, doc2))
    # results.append(compare_formatting(doc1, doc2))
    results.append(miscellaneous_discrepancies(doc1, doc2))

    # Close documents
    doc1.close()
    doc2.close()

    # Print the results as JSON for Node.js to capture
    print(json.dumps(results, indent=4))


if __name__ == "__main__":
    # Get the file paths from command-line arguments
    file1_path = sys.argv[1]
    file2_path = sys.argv[2]

    # Call the compare function and print results
    compare_documents(file1_path, file2_path)
