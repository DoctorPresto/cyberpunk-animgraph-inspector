import React, { useState, useCallback } from 'react';

interface SearchControlsProps {
  onSearchById: (handleId: string) => void;
  onTypeFilter: (selectedTypes: string[]) => void;
  availableNodeTypes: string[];
  isLoading: boolean;
}

export function SearchControls({ 
  onSearchById, 
  onTypeFilter, 
  availableNodeTypes, 
  isLoading 
}: SearchControlsProps) {
  const [searchId, setSearchId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      onSearchById(searchId.trim());
    }
  }, [searchId, onSearchById]);

  const handleTypeToggle = useCallback((nodeType: string) => {
    const newSelectedTypes = selectedTypes.includes(nodeType)
      ? selectedTypes.filter(type => type !== nodeType)
      : [...selectedTypes, nodeType];
    
    setSelectedTypes(newSelectedTypes);
    onTypeFilter(newSelectedTypes);
  }, [selectedTypes, onTypeFilter]);

  const handleClearTypeFilter = useCallback(() => {
    setSelectedTypes([]);
    onTypeFilter([]);
  }, [onTypeFilter]);

  const handleClearAll = useCallback(() => {
    setSearchId('');
    setSelectedTypes([]);
    onTypeFilter([]);
  }, [onTypeFilter]);

  return (
    <div className="search-controls">
      {/* HandleID Search */}
      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="text"
          placeholder="Search by HandleID..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="search-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="search-button"
          disabled={isLoading || !searchId.trim()}
        >
          🔍
        </button>
      </form>

      {/* Node Type Filter */}
      <div className="type-filter">
        <div className="type-filter-header">
          <button
            className={`type-filter-button ${selectedTypes.length > 0 ? 'active' : ''}`}
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            disabled={isLoading || availableNodeTypes.length === 0}
          >
            Filter by Type {selectedTypes.length > 0 && `(${selectedTypes.length})`}
            <span className={`dropdown-arrow ${isTypeDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {selectedTypes.length > 0 && (
            <button
              className="clear-filter-button"
              onClick={handleClearTypeFilter}
              title="Clear type filter"
            >
              ✕
            </button>
          )}
        </div>

        {isTypeDropdownOpen && (
          <div className="type-dropdown">
            <div className="type-dropdown-header">
              <span className="type-count">{availableNodeTypes.length} types available</span>
              <button
                className="select-all-button"
                onClick={handleClearAll}
              >
                Clear All
              </button>
            </div>
            <div className="type-list">
              {availableNodeTypes.map(nodeType => (
                <label key={nodeType} className="type-option">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(nodeType)}
                    onChange={() => handleTypeToggle(nodeType)}
                  />
                  <span className="type-name">{nodeType}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}