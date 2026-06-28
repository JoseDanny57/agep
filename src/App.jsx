import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Ingresos from "./pages/Ingresos";
import Gastos from "./pages/Gastos";
import Inventario from "./pages/Inventario";
import Pedidos from "./pages/Pedidos";
import Configuracion from "./pages/Configuracion";
import Layout from "./components/Layout";

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [page, setPage] = useState("dashboard");
  const splashMostrado = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id, false);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        // Solo mostrar splash en login nuevo y si no se ha mostrado ya
        const esLoginNuevo = event === "SIGNED_IN" && !splashMostrado.current;
        cargarPerfil(session.user.id, esLoginNuevo);
      } else {
        setPerfil(null);
        setLoading(false);
        splashMostrado.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function cargarPerfil(userId, mostrarSplash = false) {
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();
    setPerfil(data);
    setLoading(false);
    if (mostrarSplash && !splashMostrado.current) {
      splashMostrado.current = true;
      setShowSplash(true);
      setTimeout(() => setShowSplash(false), 2000);
    }
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

  if (showSplash) {
    const color = perfil?.color_principal || "#2E75B6";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: color }}>
        <div className="text-center">
          {perfil?.logo_url ? (
            <img src={perfil.logo_url} alt="Logo"
              className="w-36 h-36 rounded-3xl object-contain mx-auto mb-6 shadow-2xl bg-white/10 p-2" />
          ) : (
            <div className="w-36 h-36 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <span className="text-6xl">🏪</span>
            </div>
          )}
          <p className="text-white text-2xl font-bold tracking-tight">
            {perfil?.nombre_negocio || "Mi Negocio"}
          </p>
          {perfil?.nombre_propietario && (
            <p className="text-white/70 text-sm mt-2">{perfil.nombre_propietario}</p>
          )}
        </div>
      </div>
    );
  }

  const pages = { dashboard: Dashboard, ingresos: Ingresos, gastos: Gastos, inventario: Inventario, pedidos: Pedidos, configuracion: Configuracion };
  const PageComponent = pages[page] || Dashboard;

  return (
    <Layout page={page} setPage={setPage} perfil={perfil}>
      <PageComponent perfil={perfil} setPerfil={setPerfil} userId={session.user.id} />
    </Layout>
  );
}
