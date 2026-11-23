import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import { forgotPassword } from "../lib/user";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);

    try {
      const response = await forgotPassword(email);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not request reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar hideLoginButton />
      <main className="mx-auto mt-12 max-w-md p-4">
        <h1 className="mb-2 text-2xl font-semibold">Forgot password</h1>
        <p className="mb-4 text-sm text-gray-600">
          Enter your account email. If it exists, we’ll send a reset link.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border p-3"
          />
          <button disabled={busy} className="rounded bg-blue-600 p-3 text-white">
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <Link to="/login" className="mt-4 inline-block text-blue-600">Back to login</Link>
      </main>
    </>
  );
}
