import { useState } from "react";

function AuthPage({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const endpoint = isRegistering ? "register" : "login";

    try {
      const response = await fetch(
        `http://localhost:5050/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      if (isRegistering) {
        setMessage("Account created. Please sign in.");
        setIsRegistering(false);
        setForm({
          name: "",
          email: form.email,
          password: "",
        });
        return;
      }

      onLogin(data);
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="label">INVENTORY MANAGEMENT</p>
        <h1>StockFlow</h1>
        <p>{isRegistering ? "Create your account." : "Welcome back."}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
          )}

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            required
          />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            minLength="6"
            required
          />

          <button type="submit">
            {isRegistering ? "Create Account" : "Sign In"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setMessage("");
          }}
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
      </section>
    </main>
  );
}

export default AuthPage;