// UI de carga de ruta compartida por los route groups `(admin)`, `(auth)` y `(public)`.
export default function RouteLoading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="h-8 w-48 rounded bg-neutral-200" />
    </div>
  );
}
