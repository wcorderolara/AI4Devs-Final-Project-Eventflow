/**
 * Caja de contenido del área de vendor. **No monta navegación**: la sidebar y el drawer los
 * aporta el shell del route group `(app)`.
 *
 * Hasta ahora este layout renderizaba una segunda `<Sidebar>` dentro del shell, de modo que en
 * desktop se pintaban dos landmarks `<nav>` con el mismo nombre accesible. Aquí queda sólo el
 * contenedor de densidad (`p-6`), idéntico al anterior.
 */
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <section className="flex-1 p-6">{children}</section>
    </div>
  );
}
