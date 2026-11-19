import { useEffect, useMemo, useState, useRef } from "react";
import ReactQuill from "react-quill-new";
import { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../App.css";
import Button from "./Button";
import {
  createDocument,
  getDocumentById,
  updateDocument,
} from "../lib/document";
import { Link, useParams, useNavigate } from "react-router-dom";
import { IoArrowBack, IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import ShareModal from "./ShareModal";
import { FaShareFromSquare } from "react-icons/fa6";
import { createSocketConnection } from "../socket/socket";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import { getDocumentAbout } from "../lib/documentShare";
import { LuUsers } from "react-icons/lu";



const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = [
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "24px",
  "32px",
];
Quill.register(SizeStyle, true);

const formats = [
  "header",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "align",
  "list",
  "link",
  "blockquote",
];

const encodeYjsUpdate = (update) => {
  let binary = "";
  for (const byte of update) binary += String.fromCharCode(byte);
  return window.btoa(binary);
};

const decodeYjsUpdate = (encoded) => {
  if (typeof encoded !== "string") {
    throw new Error("The server sent an invalid Yjs update");
  }

  const binary = window.atob(encoded);
  const update = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    update[index] = binary.charCodeAt(index);
  }
  return update;
};

export default function RichTextEditor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled document");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [sharedPeople, setSharedPeople] = useState([]);
  const [peopleError, setPeopleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [readyDocumentId, setReadyDocumentId] = useState(null);
  const [yjsSyncedDocumentId, setYjsSyncedDocumentId] = useState(null);


  const socketRef = useRef(null);
  const isJoinedRef = useRef(false);
  const roleRef = useRef(role);
  const quillRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const bindingRef = useRef(null);


  const navigate = useNavigate();
  const { id } = useParams();

  const token = localStorage.getItem("token");

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const addNotify = () => toast("Document Saved!");
  const emptyNotify = () =>
    toast("Please add text in the title or content");

  const handleShowPeople = async () => {
    if (!id) return;
    setShowPeoplePanel(true);
    setPeopleLoading(true);
    setPeopleError("");

    try {
      const response = await getDocumentAbout(id, token);
      setSharedPeople(response.data.about.sharedWith || []);
    } catch (requestError) {
      setPeopleError(
        requestError.response?.data?.message || requestError.message || "Could not load shared people.",
      );
    } finally {
      setPeopleLoading(false);
    }
  };


  useEffect(() => {
    if (!token || !id || readyDocumentId !== id) {
      return;
    }
    const socket = createSocketConnection(token);

    socketRef.current = socket;

    const handleConnect = () => {
      isJoinedRef.current = false;

      socket.emit("join-document", id, (response) => {
        if (!response?.success) {
          const message = response?.message || "Could not join the live document";
          console.error(message);
          setError(message);
          return;
        }

        isJoinedRef.current = true;
        setRole(response.role);

        const ydoc = ydocRef.current;
        const ytext = ytextRef.current;
        if (!ydoc || !ytext) return;

        try {
          Y.applyUpdate(ydoc, decodeYjsUpdate(response.state), "socket");

          if (response.shouldSeed) {
            const quill = quillRef.current.getEditor();
            const initialDelta = quill.clipboard.convert({
              html: response.initialContent || "",
              text: "",
            });

            ytext.applyDelta(initialDelta.ops);
            socket.emit(
              "seed-document",
              {
                documentId: id,
                update: encodeYjsUpdate(Y.encodeStateAsUpdate(ydoc)),
                content: quill.root.innerHTML,
              },
              (seedResponse) => {
                if (seedResponse?.success) {
                  setYjsSyncedDocumentId(id);
                } else {
                  const message = seedResponse?.message || "Could not initialize document";
                  console.error(message);
                  setError(message);
                }
              },
            );
          } else if (response.seeded) {
            setYjsSyncedDocumentId(id);
          }
        } catch (error) {
          console.error("Could not read the shared document state:", error);
          setError("Could not sync the document. Reload the page and try again.");
        }
      });
    };

    const handleDocumentSync = (data) => {
      if (data.documentId !== id || !ydocRef.current) return;
      try {
        Y.applyUpdate(ydocRef.current, decodeYjsUpdate(data.state), "socket");
        setYjsSyncedDocumentId(id);
        if (quillRef.current) {
          setContent(quillRef.current.getEditor().root.innerHTML);
        }
      } catch (error) {
        console.error("Could not apply shared document state:", error);
        setError("Could not sync the document. Reload the page and try again.");
      }
    };

    const handleYjsUpdate = (data) => {
      if (data.documentId !== id || !ydocRef.current) return;
      try {
        Y.applyUpdate(ydocRef.current, decodeYjsUpdate(data.update), "socket");
        if (quillRef.current) {
          const html = quillRef.current.getEditor().root.innerHTML;
          setContent(html);
          if (roleRef.current !== "viewer") {
            socket.emit("document-content", { documentId: id, content: html });
          }
        }
      } catch (error) {
        console.error("Could not apply collaborative update:", error);
        setError("A live update could not be applied. Reload the document.");
      }
    };

    socket.on("connect", handleConnect);

    socket.on("document-sync", handleDocumentSync);
    socket.on("yjs-update", handleYjsUpdate);

    socket.on("disconnect", () => {
      isJoinedRef.current = false;
    })

    socket.on("connect_error", (error) => {
      console.log("Socket authentication failed:", error.message);
      setError(`Realtime connection failed: ${error.message}`);
    });

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("document-sync", handleDocumentSync);
      socket.off("yjs-update", handleYjsUpdate);
      socket.disconnect();

      socketRef.current = null;
      isJoinedRef.current = false;
    }
  }, [id, token, readyDocumentId]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("quill");

    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    return () => {
      ydoc.destroy();

      ydocRef.current = null;
      ytextRef.current = null;
    }

  }, [id])


  const handleContentChange = (value) => {
    setContent(value);
  }
  useEffect(() => {
    if (!id) {
      setRole("owner");
      setReadyDocumentId("new-document");
      setYjsSyncedDocumentId("new-document");
      return;
    }

    let active = true;

    const loadDocument = async () => {
      setReadyDocumentId(null);
      setYjsSyncedDocumentId(null);
      setLoading(true);
      setError("");
      setRole("");

      try {
        const response = await getDocumentById(id, token);
        if (!active) return;
        const document = response.data.document;

        setTitle(document.title ?? "Untitled document");
        setContent(document.content ?? "");

        setOriginalTitle(document.title ?? "Untitled document");
        setRole(response.data.role);
        setReadyDocumentId(id);
      } catch (error) {
        if (!active) return;

        if (error.response?.status === 404) {
          toast.info("That document was deleted or is no longer available.");
          navigate("/", { replace: true });
          return;
        }

        setError(
          error.response?.data?.message ??
          "Could not load the document"
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDocument();
    return () => {
      active = false;
    };
  }, [id, token, navigate]);


  useEffect(() => {
    const expectedId = id ?? "new-document";

    if (readyDocumentId !== expectedId) return;
    if (id && yjsSyncedDocumentId !== id) return;
    if (!quillRef.current || !ydocRef.current || !ytextRef.current) return;

    const quill = quillRef.current.getEditor();
    const ydoc = ydocRef.current;
    const ytext = ytextRef.current;


    if (!id && ytext.length === 0) {
      ydoc.transact(() => ytext.applyDelta(quill.getContents().ops), "initial-local-content");
    }

    const binding = new QuillBinding(ytext, quill);
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [id, readyDocumentId, yjsSyncedDocumentId]);

  useEffect(() => {
    if (!id || yjsSyncedDocumentId !== id || role === "viewer") return;

    const ydoc = ydocRef.current;
    const socket = socketRef.current;
    if (!ydoc || !socket?.connected || !isJoinedRef.current) return;

    const handleLocalUpdate = (update, origin) => {
      if (origin === "socket") return;
      if (!socket.connected || !isJoinedRef.current || !quillRef.current) return;

      socket.emit(
        "yjs-update",
        {
          documentId: id,
          update: encodeYjsUpdate(update),
          content: quillRef.current.getEditor().root.innerHTML,
        },
        (response) => {
          if (!response?.success) {
            console.error("Could not save collaborative update:", response?.message);
            setError(response?.message || "Could not save collaborative update");
          }
        },
      );
    };

    ydoc.on("update", handleLocalUpdate);
    return () => ydoc.off("update", handleLocalUpdate);
  }, [id, role, yjsSyncedDocumentId]);


  const modules = useMemo(
    () => ({
      toolbar: [
        [
          { header: [1, 2, 3, false] },
          {
            size: [
              false,
              "10px",
              "12px",
              "14px",
              "16px",
              "18px",
              "24px",
              "32px",
            ],
          },
        ],
        ["bold", "italic", "underline", "strike"],
        [{ align: [] }],
        [
          { list: "ordered" },
          { list: "bullet" },
          "blockquote",
          "link",
        ],
        ["clean"],
      ],
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true,
      },
      keyboard: {
        bindings: {
          enter: {
            key: 'Enter',
            handler: function (range, context) {
              const formats = this.quill.getFormat(range);

              this.quill.insertText(range.index, '\n', 'user');

              this.quill.setSelection(range.index + 1, 'silent');

              Object.keys(formats.length ? formats : {}).forEach((name) => {
                this.quill.format(name, formats[name]);
              });

              return false;
            }
          }
        }
      }
    }),
    []
  );


  const normalizeContent = (value) => {
    return value
      .replace(/<p><br><\/p>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };


  const executeSubmit = async () => {
    if (saving || loading) return;

    setSaving(true);
    setError("");

    try {
      if (!title.trim() || !normalizeContent(content)) {
        emptyNotify();
        return;
      }

      const response = await createDocument(
        { title, content },
        token
      );

      const savedDocument = response.data.document;

      addNotify();

      navigate(`/document/${savedDocument._id}`, {
        replace: true,
      });
    } catch (error) {
      setError(
        error.response?.data?.message ??
        "Could not save the document"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await executeSubmit();
  };

  const handleUpdate = async () => {
    if (!id || saving || loading || role === "viewer") return;


    const titleChanged = title.trim() !== originalTitle.trim();
    if (!titleChanged) {
      toast.info("Document content saves automatically while you edit.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (!title.trim()) {
        toast.error("Document title cannot be empty.");
        return;
      }

      await updateDocument(id, { title }, token);

      setOriginalTitle(title);

      toast.success("Document title updated.");
    } catch (error) {
      setError(
        error.response?.data?.message ??
        "Could not update the document"
      );
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();

        if (id) {
          handleUpdate();
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [id, title, content, token, role, saving, loading]);


  return (
    <>

      <div className="document-container">
        {error && (
          <div className="text-red p-3">{error}</div>
        )}

        {loading ? (
          <div
            className="flex min-h-[70vh] items-center justify-center"
            role="status"
            aria-label="Loading document"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>
        ) : (
          <>
            <header className="document-header">
              <div className="flex items-center gap-4">
                <Link to="/">
                  <IoArrowBack className="text-2xl" />
                </Link>

                <input
                  className="document-title"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  disabled={role === "viewer"}
                  aria-label="Document title"
                />
              </div>

              <div className="flex items-center gap-3">
                {id && (
                  <button
                    type="button"
                    onClick={handleShowPeople}
                    className="text-gray-700 hover:text-[#3186FF]"
                    aria-label="Show shared people"
                    title="Show shared people"
                  >
                    <LuUsers className="cursor-pointer text-2xl" />
                  </button>
                )}

                {id && role === "owner" && (
                  <FaShareFromSquare
                    onClick={() =>
                      setShowShareModal(true)
                    }
                    className="cursor-pointer text-2xl hover:text-[#3186FF]"
                  />
                )}

                {id && role !== "viewer" && (
                  <Button
                    name={
                      saving ? "Updating..." : "Update"
                    }
                    disabled={saving || loading}
                    onClick={handleUpdate}
                  />
                )}


                {!id && (
                  <Button
                    name={saving ? "Saving..." : "Save"}
                    disabled={saving || loading}
                    onClick={handleSubmit}
                  />
                )}
              </div>
            </header>

            <div className="document-editor">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                defaultValue={content}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                readOnly={role === "viewer" || Boolean(id && yjsSyncedDocumentId !== id)}
                placeholder="Type here... Press Ctrl+S to save changes."
              />
            </div>

            {showShareModal && id && role === "owner" && (
              <ShareModal
                documentId={id}
                onClose={() =>
                  setShowShareModal(false)
                }
              />
            )}

            {showPeoplePanel && id && (
              <div className="fixed inset-0 z-[100]">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/30"
                  aria-label="Close shared people panel"
                  onClick={() => setShowPeoplePanel(false)}
                />
                <aside
                  className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
                  style={{ animation: "slideInFromRight 280ms ease-out" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Shared people"
                >
                  <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {role === "owner" ? "Shared with" : "Document owner"}
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-gray-500">{title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPeoplePanel(false)}
                      className="rounded-full p-2 cursor-pointer text-gray-500 hover:bg-gray-100"
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
                    ) : sharedPeople.length ? (
                      <ul className="space-y-3">
                        {sharedPeople.map((person, index) => (
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
            )}
          </>
        )}
      </div>
    </>
  );
}
