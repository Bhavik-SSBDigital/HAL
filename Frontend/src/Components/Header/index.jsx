import styles from "./Header.module.css";

import { useState } from "react";
import {
    Dialog,
    DialogPanel,
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    Popover,
    PopoverButton,
    PopoverGroup,
    PopoverPanel,
} from "@headlessui/react";
import {
    ArrowPathIcon,
    ChartPieIcon,
    CursorArrowRaysIcon,
    FingerPrintIcon,
    SquaresPlusIcon,
    UserCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";


export default function Header() {
    const location = useLocation();
    const currentPath = location.pathname;
    const paths = [
        { path: "/", name: "Home" },
        { path: "/Contact", name: "Contact" },
        { path: "/Blogs", name: "Blogs" },
    ];
    return (
        <header className="sticky top-0 backdrop-blur-md z-10 h-20 p-3 shadow-sm">
            <div className="flex flex-row h-full items-center justify-between">
                <div className="flex flex-row gap-8">
                    {paths.map((path, index) => <Link key={index} to={path.path} className={`${styles.linkHover} ${currentPath == path.path ? 'bg-blue-300' : ''}`}>
                        {path.name}
                    </Link>)}

                </div>
                <UserCircleIcon height={40} color="black" fontSize={10}>
                </UserCircleIcon>
            </div>
        </header>
    );
}
