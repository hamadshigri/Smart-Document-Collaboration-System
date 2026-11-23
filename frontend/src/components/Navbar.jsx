import { IoMdSearch } from "react-icons/io";
import Button from "./Button";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { FiChevronDown, FiKey, FiLogOut, FiMail } from "react-icons/fi";

const Navbar = ({ isLoggedIn, setSearchTerm, hideLoginButton = false }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isHomePage = pathname === "/";
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const profile = {
        name: localStorage.getItem("userName") || "",
        email: localStorage.getItem("userEmail") || "",
    };

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        navigate("/login", { replace: true });
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div
                    onClick={() => navigate("/")}
                    className="flex shrink-0 cursor-pointer select-none items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
                >
                    <img
                        src="/logo.png"
                        alt="Docs logo"
                        className="h-9 w-9 object-contain"
                    />
                    <span className="text-[22px] font-medium tracking-tight text-slate-800">
                        Docs
                    </span>
                </div>

                {isHomePage && (
                    <div className="group flex max-w-2xl flex-1 items-center rounded-full border border-transparent bg-[#F0F4F9] px-4 transition-all duration-200 focus-within:border-slate-300/80 focus-within:bg-white focus-within:shadow-md focus-within:shadow-slate-200/50">
                        <IoMdSearch className="h-5 w-5 shrink-0 text-slate-500 transition-colors duration-200 group-focus-within:text-blue-600" />
                        <input
                            id="document-search"
                            name="search"
                            type="text"
                            onChange={(e) => setSearchTerm?.(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
                        />
                    </div>
                )}

                {isLoggedIn ? (
                    <div className="relative shrink-0" ref={menuRef}>
                        <button type="button" aria-label="Open profile menu" aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((open) => !open)}
                            className="flex items-center gap-2 cursor-pointer rounded-full p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <FaUserCircle className="h-7 w-7 text-blue-600" />
                            <span className="max-w-28 truncate text-sm font-medium">{profile.name || "Profile"}</span>
                            <FiChevronDown className="h-4 w-4" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                                {profile.name && <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{profile.name}</div>}
                                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                                    <FiMail className="h-4 w-4 shrink-0" />
                                    <span className="truncate" title={profile.email}>{profile.email || "Signed in"}</span>
                                </div>
                                <button type="button" onClick={() => { setMenuOpen(false); navigate("/change-password"); }}
                                    className="flex w-full items-center cursor-pointer gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50">
                                    <FiKey className="h-4 w-4" /> Change password
                                </button>
                                <button type="button" onClick={logout}
                                    className="flex w-full items-center cursor-pointer gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50">
                                    <FiLogOut className="h-4 w-4" /> Log out
                                </button>
                            </div>
                        )}
                    </div>
                ) : !(hideLoginButton) ? (
                    <div className="shrink-0"><Button onClick={() => navigate("/login")} name="Login" /></div>
                ) : null}
            </div>
        </header>
    );
};

export default Navbar;
