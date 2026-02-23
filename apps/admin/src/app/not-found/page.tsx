import Link from "next/link";

export default function NotFound() {
  return (
    <div className="starfield-overlay" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Page not found</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        That route doesn’t exist (yet).
      </p>
    </div>
  );
}
