export default function Loading() {
  return (
    <div className="page">
      <div className="skeleton" style={{ width: "40%", height: 28, marginBottom: 16 }} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton ratio" />
        ))}
      </div>
    </div>
  );
}
