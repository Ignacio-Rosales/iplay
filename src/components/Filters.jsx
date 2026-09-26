function FilterDropdown({ label, options, selected, onToggle }) {
  if (options.length === 0) return null;

  return (
    <details className="filter-dropdown">
      <summary className="filter-dropdown-summary">
        {label}
        {selected.length > 0 && <span className="filter-dropdown-count">{selected.length}</span>}
      </summary>
      <div className="filter-dropdown-menu">
        {options.map(({ value, count }) => (
          <label key={value} className="filter-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
            />
            {value} ({count})
          </label>
        ))}
      </div>
    </details>
  );
}

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

      <div className="filter-dropdowns">
        <FilterDropdown
          label="Modelo"
          options={modelOptions}
          selected={selectedModels}
          onToggle={onToggleModel}
        />
        <FilterDropdown
          label="Color"
          options={colorOptions}
          selected={selectedColors}
          onToggle={onToggleColor}
        />

        {hasActiveFilters && (
          <button type="button" className="btn-clear-filters" onClick={onClear}>
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
