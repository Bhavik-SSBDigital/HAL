import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button, Menu, MenuItem } from "@mui/material";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import styles from "./Header.module.css";

export default function Header() {
    const location = useLocation();
    const currentPath = location.pathname;
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const paths = [
        { path: "/", name: "Home" },
        { path: "/files", name: "File System" },
        { path: "/branches", name: "Branches" },
        { path: "/users", name: "Users" },
        { path: "/processes", name: "Processes" },
        { path: "/logs", name: "Logs" },
        { path: "/meeting", name: "Meeting" },
        { path: "/initiate", name: "Initiate Processes" },
    ];

    return (
        <header className={`sticky top-0 backdrop-blur-md z-10 h-20 p-3 pb-0 bg-opacity-40 ${styles.headerContainer}`}>
            <div className="flex flex-row h-full items-end justify-between">
                <div className="flex flex-row gap-3">
                    {paths.map((path, index) => (
                        <div key={index} className="relative">
                            {path.subRoutes ? (
                                <>
                                    <Button
                                        className={`${styles.linkHover} ${currentPath === path.path ? `${styles.selected}` : ''}`}
                                        aria-controls={open ? 'process-menu' : undefined}
                                        aria-haspopup="true"
                                        sx={{ width: "200px" }}
                                        onMouseEnter={handleMenuOpen}
                                    // onMouseLeave={handleMenuClose}
                                    >
                                        {path.name}
                                    </Button>
                                    <Menu
                                        id="process-menu"
                                        anchorEl={anchorEl}
                                        open={open}
                                        onClose={handleMenuClose}
                                        anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'left',
                                        }}
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'left',
                                        }}
                                        elevation={0}
                                        PaperProps={{
                                            sx: {
                                                border: '1px solid lightgray',
                                            },
                                        }}                                    >
                                        {path.subRoutes.map((subRoute, subIndex) => (
                                            <MenuItem key={subIndex} onClick={handleMenuClose}>
                                                <Link to={subRoute.path} className={styles.subLink} style={{ textDecoration: 'none' }}>
                                                    {subRoute.name}
                                                </Link>
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </>
                            ) : (
                                <Link
                                    to={path.path}
                                    className={`${styles.linkHover} ${currentPath === path.path ? `${styles.selected}` : ''}`}
                                >
                                    {path.name}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
                {/* <Button variant="contained" onClick={() => sessionStorage.clear()}>
                    Clear
                </Button> */}
                <UserCircleIcon height={40} color="black" fontSize={10} />
            </div>
        </header>
    );
}
