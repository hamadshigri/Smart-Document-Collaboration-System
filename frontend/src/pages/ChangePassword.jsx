import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { changePassword } from '../lib/user';

export default function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);

        try {
            const token = localStorage.getItem("token");
            const response = await changePassword(
                { currentPassword, newPassword}, token
            );
            toast.success(response.data.message);
            navigate("/");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not change password");
        } finally {
            setBusy(false);
        }
    }
  return (
    <>
    <Navbar isLoggedIn/>
    <main className="mx-auto mt-12 max-w-md p-4">
        <h1 className="mb-4 text-2xl font-semibold">Change password</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
            <input type="password" autoComplete="current-password" required placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="rounded border p-3" /> 
            <input type="password" autoComplete="new-password" minLength={8} required placeholder="New password (at least 8 characters)" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded border p-3" />
            <button disabled={busy} className="rounded bg-blue-600 p-3 text-white">{busy? "Saving..." : "Save new password"}</button>
        </form>
        <Link to="/" className="mt-4 inline-block text-blue-600">Cancel</Link>
    </main>
    </>
  )
}
