import { useState } from 'react';

function FilterDropdown({ label, options, selected, onToggle, isOpen, onOpen }) {
  if (options.length === 0) return null;

  return (
    <div className="filter-dropdown">
      <button
        type="button"
        className="filter-dropdown-summary"
        aria-expanded={isOpen}
        onClick={() => onOpen(!isOpen)}
      >
        {label}
        {selected.length > 0 && <span className="filter-dropdown-count">{selected.length}</span>}
      </button>
      {isOpen && (
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
      )}
    </div>
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
  // Solo un dropdown abierto a la vez: al abrir uno, el otro se cierra solo.
  const [openFilter, setOpenFilter] = useState(null);

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
          isOpen={openFilter === 'model'}
          onOpen={(open) => setOpenFilter(open ? 'model' : null)}
        />
        <FilterDropdown
          label="Color"
          options={colorOptions}
          selected={selectedColors}
          onToggle={onToggleColor}
          isOpen={openFilter === 'color'}
          onOpen={(open) => setOpenFilter(open ? 'color' : null)}
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
