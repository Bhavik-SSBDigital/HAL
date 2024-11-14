import fitz  # PyMuPDF for handling PDFs
import json
from PIL import Image, ImageChops
import io
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import sys

import fitz

import fitz  # PyMuPDF

def compare_text_blocks(pdf_path_1, pdf_path_2):
    discrepancies = []
    
    try:
        pdf1 = fitz.open(pdf_path_1)
        pdf2 = fitz.open(pdf_path_2)
        min_pages = min(pdf1.page_count, pdf2.page_count)

        observations_for_file1 = []
        observations_for_file2 = []

        # Function to merge continuous words and collect their coordinates
        def merge_continuous_words(words):
            merged_words = []
            current_text = words[0][4]  # The text of the first word
            current_coords = [{
                "x1": words[0][0], "y1": words[0][1], "x2": words[0][2], "y2": words[0][3]
            }]
            last_y = words[0][1]

            for i in range(1, len(words)):
                prev_word = words[i - 1]
                curr_word = words[i]

                # Check if current word is continuous with the previous one (based on x-coordinates)
                if curr_word[0] - prev_word[2] < 5 and abs(curr_word[1] - last_y) < 5:  # A threshold for continuity (can be adjusted)
                    # Merge the text and append the current word's coordinates
                    current_text += " " + curr_word[4]
                    current_coords.append({
                        "x1": curr_word[0], "y1": curr_word[1], "x2": curr_word[2], "y2": curr_word[3]
                    })
                else:
                    # Add the current merged word and reset
                    merged_words.append({"text": current_text, "coordinates": current_coords})
                    current_text = curr_word[4]
                    current_coords = [{
                        "x1": curr_word[0], "y1": curr_word[1], "x2": curr_word[2], "y2": curr_word[3]
                    }]
                last_y = curr_word[1]

            # Add the last merged word
            merged_words.append({"text": current_text, "coordinates": current_coords})
            return merged_words

        # Iterate through pages of both PDFs and compare words
        for page_number in range(min_pages):
            page1 = pdf1.load_page(page_number)
            page2 = pdf2.load_page(page_number)
            words1 = page1.get_text("words")
            words2 = page2.get_text("words")

            # Process continuous words for File 1
            merged_words1 = merge_continuous_words(words1)
            for word in merged_words1:
                observations_for_file1.append({
                    "pageNo": page_number + 1,
                    "text": word["text"],
                    "coordinates": word["coordinates"][0]  # Directly append the coordinates list
                })

            # Process continuous words for File 2
            merged_words2 = merge_continuous_words(words2)
            for word in merged_words2:
                observations_for_file2.append({
                    "pageNo": page_number + 1,
                    "text": word["text"],
                    "coordinates": word["coordinates"][0]  # Directly append the coordinates list
                })

        # Now compare the two sets of observations
        temp_coordinates_pdf1 = []
        temp_coordinates_pdf2 = []
        temp_text_pdf1 = ""
        temp_text_pdf2 = ""
        last_page = None  # Track the last observed page number

        # Loop through observations and compare
        for obs1, obs2 in zip(observations_for_file1, observations_for_file2):
            if obs1['text'] != obs2['text']:
                # Merge the coordinates and text of both files where discrepancies are found
                if temp_text_pdf1 and last_page == obs1['pageNo'] - 1:  # Merge if on the same page
                    temp_coordinates_pdf1.append(obs1['coordinates'])  # No additional array wrapping
                    temp_coordinates_pdf2.append(obs2['coordinates'])  # No additional array wrapping
                    temp_text_pdf1 += " " + obs1['text']
                    temp_text_pdf2 += " " + obs2['text']
                else:
                    if temp_text_pdf1:
                        # Add the previous merged block to the result for both files
                        discrepancies.append({
                            "observations_for_file1": [{
                                "pageNo": last_page + 1,
                                "text": temp_text_pdf1,
                                "coordinates": temp_coordinates_pdf1
                            }],
                            "observations_for_file2": [{
                                "pageNo": last_page + 1,
                                "text": temp_text_pdf2,
                                "coordinates": temp_coordinates_pdf2
                            }],
                            "discrepancy_type": "text"
                        })
                    # Reset temp variables for the new discrepancy
                    temp_coordinates_pdf1 = [obs1['coordinates']]  # Directly append coordinates
                    temp_coordinates_pdf2 = [obs2['coordinates']]  # Directly append coordinates
                    temp_text_pdf1 = obs1['text']
                    temp_text_pdf2 = obs2['text']
                    last_page = obs1['pageNo'] - 1  # Update the last page

        # If there's any leftover discrepancy
        if temp_text_pdf1:
            discrepancies.append({
                "observations_for_file1": [{
                    "pageNo": last_page + 1,
                    "text": temp_text_pdf1,
                    "coordinates": temp_coordinates_pdf1
                }],
                "observations_for_file2": [{
                    "pageNo": last_page + 1,
                    "text": temp_text_pdf2,
                    "coordinates": temp_coordinates_pdf2
                }],
                "discrepancy_type": "text"
            })

    except Exception as e:
        return {"detection_type": "text_discrepancy", "observations": [{"error": f"Error: {str(e)}"}]}
    
    return discrepancies


def get_images_from_pdf(pdf_path):
    """Extracts images from the PDF and returns them as a list of byte arrays."""
    images = []
    pdf = fitz.open(pdf_path)

    for page in pdf:
        image_list = page.get_images(full=True)
        for img in image_list:
            xref = img[0]
            base_image = pdf.extract_image(xref)
            img_data = base_image["image"]
            images.append(img_data)

    return images

def compare_images_with_coordinates(img_data1, img_data2, page_number, page_width, page_height):
    """Detects anomalies in images on a specific PDF page."""
    img1 = Image.open(io.BytesIO(img_data1)).convert("RGB")
    img2 = Image.open(io.BytesIO(img_data2)).convert("RGB")

    # Resize img2 if dimensions differ
    if img1.size != img2.size:
        img2 = img2.resize(img1.size, Image.ANTIALIAS)

    # Convert images to grayscale
    img1_gray = cv2.cvtColor(np.array(img1), cv2.COLOR_RGB2GRAY)
    img2_gray = cv2.cvtColor(np.array(img2), cv2.COLOR_RGB2GRAY)

    # Calculate absolute difference and thresholding
    diff = cv2.absdiff(img1_gray, img2_gray)
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)

    # Morphological operations to close gaps
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Find contours in the thresholded image
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    discrepancies = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        discrepancy_x = x / img1.size[0] * page_width
        discrepancy_y = y / img1.size[1] * page_height
        discrepancy_w = w / img1.size[0] * page_width
        discrepancy_h = h / img1.size[1] * page_height

        discrepancies.append({
            "page": page_number,
            "coordinates": {
                "x1": discrepancy_x,
                "y1": discrepancy_y,
                "x2": discrepancy_x + discrepancy_w,
                "y2": discrepancy_y + discrepancy_h
            },
            "radius": max(w, h) / 2
        })
    
    return {
        "ssim_value": "N/A",
        "discrepancies": discrepancies
    }

def find_matching_images(images1, images2, page_number, page_width, page_height):
    """Matches images between two PDF files and detects discrepancies."""
    unmatched_images1 = images1[:]
    unmatched_images2 = images2[:]
    matched_images = []
    results = []

    for img1 in images1:
        best_match = None
        best_ssim = 0
        best_img2 = None

        for img2 in unmatched_images2:
            image1 = Image.open(io.BytesIO(img1)).convert("RGB")
            image2 = Image.open(io.BytesIO(img2)).convert("RGB")

            if image1.size != image2.size:
                image2 = image2.resize(image1.size, Image.ANTIALIAS)

            # Convert to grayscale and calculate SSIM
            gray_img1 = cv2.cvtColor(np.array(image1), cv2.COLOR_RGB2GRAY)
            gray_img2 = cv2.cvtColor(np.array(image2), cv2.COLOR_RGB2GRAY)
            current_ssim, _ = ssim(gray_img1, gray_img2, full=True)

            if current_ssim > best_ssim:
                best_ssim = current_ssim
                best_match = img1
                best_img2 = img2

        if best_ssim > 0.95:  # Threshold for a match
            matched_images.append((best_match, best_img2))
            unmatched_images1.remove(best_match)
            unmatched_images2.remove(best_img2)
        else:
            highest_similarity_pair = compare_images_with_coordinates(best_match, best_img2, page_number, page_width, page_height)
            results.append({
                "page": page_number,
                "type": "resemblance",
                "similarity": best_ssim,
                "discrepancies": highest_similarity_pair
            })
    
    # Handle unmatched images
    for unmatched_img in unmatched_images1:
        results.append({
            "page": page_number,
            "type": "missing_image",
            "discrepancies": f"Image present in file 1 but not in file 2 on page {page_number}"
        })
    for unmatched_img in unmatched_images2:
        results.append({
            "page": page_number,
            "type": "added_image",
            "discrepancies": f"Image present in file 2 but not in file 1 on page {page_number}"
        })
    
    return results


# Compare metadata between two PDFs
def compare_metadata(doc1, doc2):
    metadata_diffs = []
    try:
        metadata1 = doc1.metadata
        metadata2 = doc2.metadata

        for key in metadata1.keys():
            if metadata1[key] != metadata2.get(key):
                metadata_diffs.append({
                    "field": key,
                    "old_value": metadata1[key],
                    "new_value": metadata2.get(key)
                })
    except Exception as e:
        return {"detection_type": "metadata_manipulation", "observations": [{"error": f"Error: {str(e)}"}]}
    
    return {"detection_type": "metadata_manipulation", "observations": metadata_diffs}

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


    
    # Image anomaly detection
    images1 = get_images_from_pdf(doc1_path)
    images2 = get_images_from_pdf(doc2_path)
    
    image_discrepancies = find_matching_images(images1, images2, page_number=1, page_width=600, page_height=800)
    if image_discrepancies:
        result.extend(image_discrepancies)

    # Open PDFs for image and metadata comparison
 
    # Metadata manipulation detection
    # try:
    #     metadata_discrepancies = compare_metadata(doc1, doc2)
    #     if metadata_discrepancies["observations"]:
    #         result.append(metadata_discrepancies)
    # except Exception as e:
    #     result.append({"detection_type": "metadata_manipulation", "observations": [{"error": f"Metadata discrepancies could not be found: {str(e)}"}]})

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
