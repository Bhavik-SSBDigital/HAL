import fitz  # PyMuPDF for handling PDFs
import json
from PIL import Image, ImageChops
import io
import numpy as np
from skimage.metrics import structural_similarity as ssim
import sys

# Compare text blocks between two PDF pages
def compare_text_blocks(pdf_path_1, pdf_path_2):
    discrepancies = []
    try:
        pdf1 = fitz.open(pdf_path_1)
        pdf2 = fitz.open(pdf_path_2)
        min_pages = min(pdf1.page_count, pdf2.page_count)

        for page_number in range(min_pages):
            page1 = pdf1.load_page(page_number)
            page2 = pdf2.load_page(page_number)
            words1 = page1.get_text("words")
            words2 = page2.get_text("words")

            for word1, word2 in zip(words1, words2):
                text1 = word1[4]
                text2 = word2[4]

                if text1 != text2:
                    missing_text = ''.join(set(text1) - set(text2))
                    added_text = ''.join(set(text2) - set(text1))

                    if missing_text:
                        discrepancies.append({
                            "page": page_number + 1,
                            "changes": [
                                {
                                    "text": missing_text,
                                    "coordinates": {
                                        "x1": word1[0],
                                        "y1": word1[1],
                                        "x2": word1[2],
                                        "y2": word1[3]
                                    },
                                    "added": False
                                }
                            ]
                        })

                    if added_text:
                        discrepancies.append({
                            "page": page_number + 1,
                            "changes": [
                                {
                                    "text": added_text,
                                    "coordinates": {
                                        "x1": word2[0],
                                        "y1": word2[1],
                                        "x2": word2[2],
                                        "y2": word2[3]
                                    },
                                    "added": True
                                }
                            ]
                        })

    except Exception as e:
        return {"detection_type": "text_discrepancy", "observations": [{"error": f"Error: {str(e)}"}]}
    
    return {"detection_type": "text_discrepancy", "observations": discrepancies}

# Advanced image comparison function
def detect_image_anomalies(img1, img2):
    """
    Detects and compares image anomalies such as folds, extra lines, distortions, and added marks.
    
    Args:
        img1: The first image (as numpy array).
        img2: The second image (as numpy array).
    
    Returns:
        A dictionary with detected discrepancies and coordinates.
    """
    # Convert images to grayscale
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    # Resize images if necessary
    if gray1.shape != gray2.shape:
        gray2 = cv2.resize(gray2, (gray1.shape[1], gray1.shape[0]))

    # Feature Detection (ORB)
    orb = cv2.ORB_create()
    kp1, des1 = orb.detectAndCompute(gray1, None)
    kp2, des2 = orb.detectAndCompute(gray2, None)

    # Use Brute Force Matcher to match features between the two images
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)

    # Sort matches based on distance (quality of match)
    matches = sorted(matches, key = lambda x: x.distance)

    # Anomaly Detection: Use Edge Detection to find discrepancies like extra lines or folds
    edges1 = cv2.Canny(gray1, 100, 200)
    edges2 = cv2.Canny(gray2, 100, 200)

    # Find the difference between edge maps
    edge_diff = cv2.absdiff(edges1, edges2)

    # Gaussian filter to remove noise and focus on significant differences
    edge_diff = gaussian_filter(edge_diff, sigma=1)

    # Calculate Structural Similarity Index (SSIM)
    ssim_value, _ = ssim(gray1, gray2, full=True)
    
    # Detect large discrepancies
    diff_area = np.where(edge_diff > 50)  # Threshold based on intensity difference

    discrepancies = []
    
    # Store the keypoints (features) that are significantly different
    for match in matches[:10]:  # Top 10 matches (or adjust this value)
        discrepancy_point = {
            "x": kp1[match.queryIdx].pt[0],
            "y": kp1[match.queryIdx].pt[1],
            "distance": match.distance
        }
        discrepancies.append(discrepancy_point)

    # Highlight the regions of differences found by edge detection
    diff_regions = list(zip(diff_area[0], diff_area[1]))

    # Output the final discrepancies
    return {
        "ssim_value": ssim_value,
        "discrepancies": discrepancies,
        "edge_diff_points": diff_regions
    }

def compare_images_with_coordinates(img_data1, img_data2, page_width, page_height):
    """
    Analyzes two images for discrepancies and anomalies, using both SSIM and edge detection.
    
    Args:
        img_data1: The first image as byte data.
        img_data2: The second image as byte data.
        page_width: The width of the page for scaling discrepancy coordinates.
        page_height: The height of the page for scaling discrepancy coordinates.
    
    Returns:
        A dictionary with SSIM value, detected discrepancies, and edge differences.
    """
    # Open both images as RGB
    img1 = Image.open(io.BytesIO(img_data1)).convert("RGB")
    img2 = Image.open(io.BytesIO(img_data2)).convert("RGB")

    # Ensure images have the same size, resize if necessary
    if img1.size != img2.size:
        img2 = img2.resize(img1.size, Image.ANTIALIAS)

    # Convert to numpy arrays for SSIM comparison
    img1_array = np.array(img1)
    img2_array = np.array(img2)

    # Compute SSIM between the two images
    ssim_index, diff = ssim(img1_array, img2_array, full=True, multichannel=True)
    
    # Normalize the difference image to the range [0, 255]
    diff = (diff * 255).astype(np.uint8)

    # Detect significant differences in the image (pixel-wise comparison)
    diff_image = Image.fromarray(diff)
    
    # Use ImageChops to get the pixel-level difference between the two images
    diff_img = ImageChops.difference(img1, img2)

    # If the difference image is significant, find the bounding box of the discrepancy
    diff_bbox = diff_img.getbbox()

    discrepancy_coords = None
    if diff_bbox:
        # Coordinates of the discrepancy (scaled to page dimensions)
        discrepancy_coords = []
        
        # Extract the bounding box and create a circle around the detected differences
        x1, y1, x2, y2 = diff_bbox
        width, height = img1.size

        for i in range(5):  # Adjust the number of discrepancies to find
            # Randomly generate coordinates within the bounding box
            discrepancy_x = x1 + (i * (x2 - x1) // 5)
            discrepancy_y = y1 + (i * (y2 - y1) // 5)
            
            # Add discrepancy as a circle around the coordinate
            discrepancy_coords.append({
                "x": discrepancy_x / width * page_width,
                "y": discrepancy_y / height * page_height,
                "radius": 10  # Example radius
            })

    # Convert images to numpy arrays for anomaly detection
    img1_cv = np.array(img1)
    img2_cv = np.array(img2)

    # Perform advanced anomaly detection
    anomaly_results = detect_image_anomalies(img1_cv, img2_cv)

    # Return the combined results
    return {
        "ssim_value": ssim_index,
        "discrepancies": discrepancy_coords,
        "edge_diff_points": anomaly_results['edge_diff_points'],
        "anomalies": anomaly_results['discrepancies']
    }


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
        if text_discrepancies["observations"]:
            result.append(text_discrepancies)
    except Exception as e:
        result.append({"detection_type": "text_discrepancy", "observations": [{"error": f"Text discrepancies could not be found: {str(e)}"}]})

    # Open PDFs for image and metadata comparison
    try:
        doc1 = fitz.open(doc1_path)
        doc2 = fitz.open(doc2_path)

        # Image manipulation detection
        image_diffs = []
        for page_num in range(min(doc1.page_count, doc2.page_count)):
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

                    diff_coords = compare_images_with_coordinates(
                        img_data1, img_data2, page1.rect.width, page1.rect.height
                    )
                    if diff_coords:
                        page_diffs["changes"].append({
                            "coordinates": diff_coords,
                            "added": True,
                            "type": "image_discrepancy"
                        })


            if page_diffs["changes"]:
                image_diffs.append(page_diffs)
        
        if image_diffs:
            result.append({"detection_type": "image_manipulation", "observations": image_diffs})
    except Exception as e:
        result.append({"detection_type": "image_manipulation", "observations": [{"error": "Image discrepancies could not be found"}]})

    # Metadata manipulation detection
    try:
        metadata_discrepancies = compare_metadata(doc1, doc2)
        if metadata_discrepancies["observations"]:
            result.append(metadata_discrepancies)
    except Exception as e:
        result.append({"detection_type": "metadata_manipulation", "observations": [{"error": f"Metadata discrepancies could not be found: {str(e)}"}]})

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
