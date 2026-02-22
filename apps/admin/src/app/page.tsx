"use client";

"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";

import Dashboard from "./pages/Dashboard/Dashboard";
import AppShell from "@/components/AppShell/AppShell";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    // setUser(null);
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <AppShell
      activePage="dashboard"
      signedIn={user !== null}
      login={() => signInWithPopup(auth, new GoogleAuthProvider())}
      logout={() => handleLogout()}
    >
      <Dashboard user={user} />
    </AppShell>
  );
}
