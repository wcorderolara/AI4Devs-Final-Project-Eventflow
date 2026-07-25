import { useId } from 'react';
import { cx } from '../internal/cx';
import type { NavigationSection } from './navigationModel';
import { SidebarItem } from './SidebarItem';

/**
 * SidebarSection — grupo de `SidebarItem` con título opcional.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20.
 *
 * - Semántica de lista real (`<ul>` / `<li>`) para que el lector de pantalla anuncie el número
 *   de destinos del grupo.
 * - Con `label` el grupo es una `<section>` con nombre accesible (`aria-labelledby`). Con
 *   `labelHidden` el título se oculta visualmente pero **el nombre accesible se conserva**.
 * - Sin `label` no se envuelve en `<section>`: un grupo anónimo no aporta semántica.
 */
export interface SidebarSectionProps {
  section: NavigationSection;
  className?: string;
}

export function SidebarSection({ section, className }: SidebarSectionProps): React.JSX.Element {
  const headingId = useId();
  const { label, labelHidden = false, items } = section;

  const list = (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          <SidebarItem item={item} />
        </li>
      ))}
    </ul>
  );

  if (!label) {
    return <div className={className}>{list}</div>;
  }

  return (
    <section aria-labelledby={headingId} className={cx(className)}>
      <h2
        id={headingId}
        className={cx(
          labelHidden
            ? 'sr-only'
            : 'mb-1 px-3 font-ui text-caption font-semibold uppercase tracking-ef-wide text-muted',
        )}
      >
        {label}
      </h2>
      {list}
    </section>
  );
}
