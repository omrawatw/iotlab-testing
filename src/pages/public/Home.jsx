import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProjectCard from '../../components/public/ProjectCard';
import Filters from '../../components/public/Filters';
import SignalTrace from '../../components/public/SignalTrace';
import { Spinner, EmptyState, ErrorState } from '../../components/shared/States';
import { getPublishedProjects, getCategories, getTechnologies } from '../../supabase/database';

export default function Home() {
  const { settings } = useOutletContext();
  const [projects, setProjects] = useState(null);
  const [categories, setCategories] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', status: '', technology: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getCategories(), getTechnologies()])
      .then(([cats, techs]) => { setCategories(cats); setTechnologies(techs); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setError(null);
    getPublishedProjects({ ...filters, search })
      .then(setProjects)
      .catch((e) => setError(e.message));
  }, [filters, search]);

  const stats = useMemo(() => {
    if (!projects) return [];
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'in-progress').length;
    return [
      { label: 'Projects', value: projects.length },
      { label: 'Completed', value: completed },
      { label: 'In progress', value: inProgress },
      { label: 'Categories', value: categories.length },
    ];
  }, [projects, categories]);

  return (
    <>
      <section className="container grid-fade" style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div style={{ maxWidth: 640, marginBottom: 36 }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--signal)', letterSpacing: '0.08em', marginBottom: 14 }}>
            {'// hardware + firmware + connectivity'}
          </div>
          <h1 style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 16 }}>
            {settings?.siteName ? `${settings.siteName}` : 'Engineering logs from the workbench.'}
          </h1>
          <p style={{ fontSize: 16 }}>
            {settings?.description ||
              'Circuits, firmware, and the sensors that connect them — documented end to end, from schematic to source code.'}
          </p>
        </div>
        <SignalTrace stats={stats} />
      </section>

      <section className="container" style={{ paddingBottom: 80 }}>
        <Filters
          categories={categories}
          technologies={technologies}
          filters={filters}
          onChange={setFilters}
          search={search}
          onSearchChange={setSearch}
        />

        {error && <ErrorState message={error} onRetry={() => setFilters({ ...filters })} />}
        {!error && projects === null && <Spinner label="Reading project registry…" />}
        {!error && projects?.length === 0 && (
          <EmptyState title="No projects match these filters" message="Try clearing a filter or searching a different term." />
        )}
        {!error && !!projects?.length && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
