import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import axios from "axios";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { sideBarPath } from "../../../Slices/PathSlice";
import img from "../../../assets/images/folder.png";
import styles from "./FileStructure.module.css";
// import { ImageConfig } from "../../../config/ImageConfig";

function FileExplorer(props) {
  const [fileSystemData, setFileSystemData] = useState([]);
  useEffect(() => {
    setFileSystemData(props.fileFolders);
  }, [props.fileFolders]);

  const dispatch = useDispatch();

  async function fetchFileSystemData(folderId, folderPath) {
    const url = process.env.REACT_APP_BACKEND_URL + `/accessFolder`;
    const accessToken = sessionStorage.getItem("accessToken");

    try {
      const response = await axios.post(
        url,
        {
          path: `${folderPath}`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const updatedData = [...fileSystemData];
      const folder = findFolderById(updatedData, folderId);

      if (folder && folder.type === "folder") {
        folder.isOpen = !folder.isOpen;

        if (folder.isOpen && folder.children.length === 0) {
          folder.children = response.data.children;
        }

        setFileSystemData(updatedData);
      }
    } catch (error) {
      console.error("Error fetching folder children:", error);
    }
  }

  function handleFolderClick(folderId, e, folderPath) {
    fetchFileSystemData(folderId, folderPath);
    e.stopPropagation();
  }

  function findFolderById(data, folderId) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].id === folderId) {
        return data[i];
      }
      if (data[i].children) {
        const folder = findFolderById(data[i].children, folderId);
        if (folder) {
          return folder;
        }
      }
    }
    return null;
  }

  const containerStyle = {
    padding: "10px",
    height: "75vh",
    overflow: "auto",
    position: "relative",
  };

  const folderStyle = {
    display: "grid",
    alignItems: "center",
    gridTemplateColumns: "1fr",
  };

  function renderFileSystem(
    data,
    level = 0,
    parentFullAccess,
    parentViewSelected
  ) {
    if ((props.loading || props.fetching) && data.length === 0) {
      return (
        <div
          style={{
            // display: "flex",
            // justifyContent: "center",
            // alignItems: "center",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <CircularProgress color="inherit" size={30} />
        </div>
      );
    }

    if (props.loading && props.fetching && data.length === 0) {
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          No content
        </div>
      );
    }

    return (
      <div>
        {data.map((item) => {
          const isParentFullAccessAndViewSelected =
            parentFullAccess && parentViewSelected;

          const isFolderWithDisabledView =
            isParentFullAccessAndViewSelected && item.type === "folder";

          return (
            <div
              key={item.id}
              style={
                item.type === "folder"
                  ? { padding: "5px", paddingBottom: "0px" }
                  : {}
              }
            >
              <div style={{ paddingLeft: `${level * 5}px` }}>
                <span style={folderStyle}>
                  {item.type === "folder" && (
                    <>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {item.isOpen ? (
                          <KeyboardArrowUpIcon
                            className="icon"
                            onClick={(e) =>
                              handleFolderClick(item.id, e, item.path)
                            }
                          />
                        ) : (
                          <KeyboardArrowDownIcon
                            className="icon"
                            onClick={(e) =>
                              handleFolderClick(item.id, e, item.path)
                            }
                          />
                        )}
                        <Link to={item.name}>
                          <span
                            className={styles["folderName"]}
                            style={{
                              display: "flex",
                              textAlign: "center",
                              justifyContent: "center",
                            }}
                            onClick={() => dispatch(sideBarPath(item.path))}
                          >
                            <img
                              style={{ width: "20px", height: "20px" }}
                              src={img}
                              alt="folderIcon"
                            />
                            <p style={{ fontSize: "15px" }}>{item.name}</p>
                          </span>
                        </Link>
                      </span>
                    </>
                  )}
                  {/* {item.type === "file" && (
        <>
          <span
            style={{ alignContent: "flex-end", display: "flex" }}
          >
            <img
              style={{ width: "20px", height: "20px" }}
              src={
                ImageConfig[item.name.split(".")[1]] ||
                ImageConfig["default"]
              }
              alt=""
            />
            <p style={{ fontSize: "15px" }}>{item.name}</p>
          </span>
        </>
      )} */}
                </span>
                {item.isOpen &&
                  item.children.length > 0 &&
                  renderFileSystem(
                    item.children,
                    level + 1,
                    item.type === "folder"
                      ? item.fullAccess &&
                      item.fullAccess.view &&
                      item.fullAccess.upload
                      : false,
                    item.type === "folder"
                      ? item.selectedView && item.selectedUpload
                      : false
                  )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <div style={containerStyle}>{renderFileSystem(fileSystemData)}</div>;
}

function App(props) {
  return (
    <div className="App">
      <FileExplorer
        fileFolders={props.fileFolders}
        loading={props.isLoading}
        fetching={props.isFetching}
      />
    </div>
  );
}

export default App;
