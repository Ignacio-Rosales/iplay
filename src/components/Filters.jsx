export default function Filters({
  search,
  onSearchChange,
  modelOptions,
  colorOptions,
  selectedModels,
  selectedColors,
  onToggleModel,
  onToggleColor,
  onClear
}) {
  const hasActiveFilters = search || selectedModels.length > 0 || selectedColors.length > 0;

  return (
    <div className="filters-panel">
      <input
        type="text"
        className="search-input"
        placeholder="🔍 Buscar productos..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {modelOptions.length > 0 && (
        <div className="filter-group">
          <h4>Modelo</h4>
          <div className="filter-options">
            {modelOptions.map(({ value, count }) => (
              <label key={value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedModels.includes(value)}
                  onChange={() => onToggleModel(value)}
                />
                {value} ({count})
              </label>
            ))}
          </div>
        </div>
      )}

      {colorOptions.length > 0 && (
        <div className="filter-group">
          <h4>Color</h4>
          <div className="filter-options">
            {colorOptions.map(({ value, count }) => (
              <label key={value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColors.includes(value)}
                  onChange={() => onToggleColor(value)}
                />
                {value} ({count})
              </label>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button type="button" className="btn-clear-filters" onClick={onClear}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
