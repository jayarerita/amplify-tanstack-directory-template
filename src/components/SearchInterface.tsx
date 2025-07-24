import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
// Simple SVG icons to replace Heroicons
const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const FunnelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M9 12h6" />
  </svg>
);
import { useDebounce } from '~/hooks/useDebounce';
import { searchOperations } from '~/lib/search';

interface SearchSuggestion {
  id: string;
  name: string;
  type: 'listing' | 'category' | 'location';
  category?: string;
  location?: string;
}

interface SearchInterfaceProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  showFilters?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchInterface({
  initialQuery = '',
  onSearch,
  showFilters = true,
  placeholder = 'Search businesses, services, or locations...',
  className = '',
}: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const results = await searchOperations.getSuggestions(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length === 0) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Navigate based on suggestion type
    if (suggestion.type === 'listing') {
      navigate({ to: `/listings/${suggestion.id}` });
    } else if (suggestion.type === 'category') {
      navigate({ 
        to: '/search',
        search: { q: suggestion.name, category: suggestion.category }
      });
    } else {
      navigate({ 
        to: '/search',
        search: { q: query, location: suggestion.name }
      });
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      setShowSuggestions(false);
      
      if (onSearch) {
        onSearch(query);
      } else {
        navigate({ 
          to: '/search',
          search: { q: query }
        });
      }
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(e.relatedTarget as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'listing':
        return '🏢';
      case 'category':
        return '📂';
      case 'location':
        return '📍';
      default:
        return '🔍';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          autoComplete="off"
        />
        
        {showFilters && (
          <button
            type="button"
            onClick={() => navigate({ to: '/search' })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            title="Advanced Filters"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {getSuggestionIcon(suggestion.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.name}
                  </div>
                  {(suggestion.category || suggestion.location) && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.category && `in ${suggestion.category}`}
                      {suggestion.location && `• ${suggestion.location}`}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {suggestion.type}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}