import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Ingresos from "./pages/Ingresos";
import Gastos from "./pages/Gastos";
import Inventario from "./pages/Inventario";
import Configuracion from "./pages/Configuracion";
import Layout from "./components/Layout";

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else { setPerfil(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function cargarPerfil(userId) {
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();
    setPerfil(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando AGEP...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;
  if (!perfil) return <Onboarding onComplete={(p) => setPerfil(p)} userId={session.user.id} />;

  const pages = { dashboard: Dashboard, ingresos: Ingresos, gastos: Gastos, inventario: Inventario, configuracion: Configuracion };
  const PageComponent = pages[page] || Dashboard;

  return (
    <Layout page={page} setPage={setPage} perfil={perfil}>
      <PageComponent perfil={perfil} setPerfil={setPerfil} userId={session.user.id} />
    </Layout>
  );
}
