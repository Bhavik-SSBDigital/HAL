import { Box, Button, Stack, Tooltip } from "@mui/material";
import React, { useEffect } from "react";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { useDispatch, useSelector } from "react-redux";
import { backButtonPath, onReload } from "../../Slices/PathSlice";
import folderIcon from "../../assets/images/folder.png";
import { useNavigate } from "react-router-dom";

export default function PathBar() {
  const navigate = useNavigate();
  const pathValue = useSelector((state) => state.path.value);
  const dispatch = useDispatch();
  const handlePathClick = (index) => {
    const pathSegments = pathValue.split("/");
    if (index >= 0 && index < pathSegments.length) {
      const newPathSegments = pathSegments.slice(0, index + 1); // Include the segment at the specified index
      const newPath = newPathSegments.join("/");
      sessionStorage.setItem("path", newPath);
      // console.log("New path:", newPath);
      dispatch(backButtonPath(newPath));
      if (newPath === "..") {
        // sessionStorage.setItem('path', newPath);
        navigate("/files");
      }
    } else {
      console.error("Invalid index:", index);
    }
  };
  sessionStorage.getItem
  function truncateFileName(fileName, maxLength = 10) {
    if (fileName.length <= maxLength) {
      return fileName;
    } else {
      const truncatedName = fileName.substring(0, maxLength - 3); // Subtracting 3 for the ellipsis
      return truncatedName + "...";
    }
  }
  return (
    <Stack
      padding="4px"
      sx={{
        backgroundColor: "white",
        borderRadius: "10px",
        // boxShadow: "0 2px 3px rgba(0, 0, 0, 0.2)",
        border: "1px dotted darkgray",
      }}
      overflow="auto"
    >
      {/* <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ border: "1px solid" }}
      >
        {pathValue.split("/").map((item, index) => (
          <Button key={index} variant="text">
            PATH: {item === ".." ? "/" : item}
          </Button>
        ))}
      </Breadcrumbs> */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Stack flexDirection="row" gap={1} ml={1}>
          <img width={25} src={folderIcon} alt="" /> :
        </Stack>
        {pathValue.split("/").map((item, index) => (
          <React.Fragment key={item}>
            {index > 0 && (
              <NavigateNextIcon fontSize="small" style={{ margin: "0 5px" }} />
            )}
            <Tooltip title={item.length >= 10 ? item === ".." ? "/" : item : null}>

              <Button
                variant="text"
                sx={{
                  textTransform: "none",
                  minWidth: { xs: "110px" },
                }}
                onClick={() => handlePathClick(index)}
              >

                {item === ".." ? "/" : truncateFileName(item)}
              </Button>
            </Tooltip>
          </React.Fragment>
        ))}
      </Box>
    </Stack>
  );
}
