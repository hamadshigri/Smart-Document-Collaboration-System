import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { resetPassword } from "../lib/user";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await resetPassword(token, newPassword);
      toast.success(response.data.message);
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar hideLoginButton />
      <main className="mx-auto mt-12 max-w-md p-4">
        <h1 className="mb-4 text-2xl font-semibold">Choose a new password</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="New password (at least 8 characters)"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="rounded border p-3"
          />
          <button disabled={busy} className="rounded bg-blue-600 p-3 text-white">
            {busy ? "Saving..." : "Reset password"}
          </button>
        </form>
        <Link to="/login" className="mt-4 inline-block text-blue-600">Back to login</Link>
      </main>
    </>
  );
}