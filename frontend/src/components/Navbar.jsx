import { IoMdSearch } from "react-icons/io";
import Button from "./Button";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ isLoggedIn, setSearchTerm, hideLoginButton = false }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isHomePage = pathname === "/";

    const logout = () => {
        localStorage.removeItem("token");
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
                            type="text"
                            onChange={(e) => setSearchTerm?.(e.target.value)}
                            placeholder="Search"
                            className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
                        />
                    </div>
                )}

                {!(hideLoginButton && !isLoggedIn) && (
                    <div className="shrink-0">
                        <Button
                            onClick={
                                isLoggedIn
                                    ? logout
                                    : () => navigate("/login")
                            }
                            name={isLoggedIn ? "Logout" : "Login"}
                        />
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;
