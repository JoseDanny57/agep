export default function Mantenimiento() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-3">App en mantenimiento</h1>
        <p className="text-blue-100 text-sm leading-relaxed">
          Estamos realizando mejoras. La App estará momentáneamente fuera de servicio.
          Disculpá el inconveniente, volvé a intentar en unos minutos.
        </p>
      </div>
    </div>
  );
}
