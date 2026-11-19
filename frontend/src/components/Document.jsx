import { LuUsers } from "react-icons/lu";
import { RiDeleteBin6Line } from "react-icons/ri";
import { formatDisplayDate } from "../utils/DateTime.js";
import { Link } from "react-router-dom";
import { HiDotsVertical } from "react-icons/hi";
import { GoInfo } from "react-icons/go";
import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import { getDocumentAbout } from "../lib/documentShare.js";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const Document = ({ title, content, createdAt, updatedAt, documentId, role, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [peopleOpen, setPeopleOpen] = useState(false);
    const [peopleLoading, setPeopleLoading] = useState(false);
    const [people, setPeople] = useState([]);
    const [peopleError, setPeopleError] = useState("");

    const handlePeopleClick = async () => {
        setPeopleOpen(true);
        setPeopleLoading(true);
        setPeopleError("");

        try {
            const token = localStorage.getItem("token");
            const response = await getDocumentAbout(documentId, token);
            setPeople(response.data.about.sharedWith || []);
        } catch (error) {
            setPeopleError(error.response?.data?.message || error.message || "Could not load people.");
        } finally {
            setPeopleLoading(false);
        }
    };

    const handleAbout = async () => {
        setMenuOpen(false);

        try {
            const token = localStorage.getItem("token");
            const response = await getDocumentAbout(documentId, token);
            const about = response.data.about;

            const ownerName = about.owner?.name || "Unknown owner";
            await Swal.fire({
                title: "Document details",
                html: `
            <p><strong>Title:</strong> ${escapeHtml(title || "Untitled document")}</p>
            <p><strong>Created at:</strong> ${escapeHtml(formatDisplayDate(about.createdAt || createdAt))}</p>
            <p><strong>Updated at:</strong> ${escapeHtml(formatDisplayDate(about.updatedAt || updatedAt))}</p>
            <p><strong>Owner:</strong> ${escapeHtml(ownerName)}</p>
            `,
                confirmButtonColor: "#3186FF",
            })
        } catch (error) {
            Swal.fire({
                title: "Could not load sharing details",
                text: error.response?.data?.message || error.message || "Please try again.",
                icon: "error",
            })
        }
    }

    const handleDelete = () => {
        setMenuOpen(false);
        onDelete(documentId);
    }

    return (
        <div className="group relative h-[292px] w-[240px] overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70">
            <div className="h-full rounded-2xl p-3">
                <Link
                    to={`/document/${documentId}`}
                    className="block rounded-xl p-2 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <div className="mb-3 flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                            <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                        </span>
                        <h4 className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-800">
                            {title || "Untitled document"}
                        </h4>
                    </div>

                    <div
                        className="h-[150px] overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3 text-[9px] leading-relaxed text-slate-600 shadow-inner [&_*]:max-w-full [&_img]:h-auto [&_img]:max-h-20 [&_img]:object-contain"
                        style={{ overflowWrap: "anywhere" }}
                        dangerouslySetInnerHTML={{ __html: content || "" }}
                    />
                </Link>
                <div className="relative z-40 mt-2 flex items-center justify-between border-t border-slate-100 px-1 pt-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePeopleClick}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            aria-label={role === "owner" ? "Show shared people" : "Show document owner"}
                            title={role === "owner" ? "Show shared people" : "Show document owner"}
                        >
                            <LuUsers size={17} />
                        </button>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${role === "owner" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"}`}>
                            {role === "owner" ? "Owned" : "Shared"}
                        </span>
                    </div>
                    <div className="relative">
                        <button type="button" aria-label="Document options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <HiDotsVertical size={18} />
                        </button>

                        {
                            menuOpen && (
                                <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl shadow-slate-300/40">
                                    <button type="button" onClick={handleAbout} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50">
                                        <GoInfo className="text-blue-600" />
                                        Info
                                    </button>
                                    {
                                        role === "owner" && (
                                            <button type="button" onClick={handleDelete} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50">
                                                <RiDeleteBin6Line className="text-red-600" />
                                                Delete
                                            </button>
                                        )
                                    }
                                </div>
                            )
                        }
                    </div>
                </div>
                <div>

                </div>

            </div>
            {peopleOpen && createPortal((
                <div className="fixed inset-0 z-[100]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/30"
                        aria-label="Close people panel"
                        onClick={() => setPeopleOpen(false)}
                    />
                    <aside
                        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
                        style={{ animation: "slideInFromRight 280ms ease-out" }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Document people"
                    >
                        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {role === "owner" ? "Shared with" : "Document owner"}
                                </h2>
                                <p className="mt-0.5 truncate text-sm text-gray-500">{title || "Untitled document"}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPeopleOpen(false)}
                                className="rounded-full cursor-pointer p-2 text-gray-500 hover:bg-gray-100"
                                aria-label="Close panel"
                            >
                                <IoClose size={22} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-5">
                            {peopleLoading ? (
                                <p className="text-sm text-gray-500">Loading people...</p>
                            ) : peopleError ? (
                                <p className="text-sm text-red-600">{peopleError}</p>
                            ) : people.length ? (
                                <ul className="space-y-3">
                                    {people.map((person, index) => (
                                        <li key={`${person.email || person.name}-${index}`} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                                {(person.name || person.email || "?").charAt(0).toUpperCase()}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-gray-900">{person.name || person.email}</span>
                                                {person.email && <span className="block truncate text-xs text-gray-500">{person.email}</span>}
                                                <span className="mt-1 block text-xs capitalize text-gray-500">{person.status === "owner" ? "Owner" : `${person.role} / ${person.status}`}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">No shared people yet.</p>
                            )}
                        </div>
                    </aside>
                </div>
            ), document.body)}
        </div>
    )
};

export default Document;
