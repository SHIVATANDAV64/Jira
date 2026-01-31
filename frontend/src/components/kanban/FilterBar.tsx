import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import type { TicketFilters, TicketStatus, TicketPriority, TicketType, ProjectMember } from '@/types';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '@/lib/constants';

interface FilterBarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  members: ProjectMember[];
}

export function FilterBar({ filters, onFiltersChange, members }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const activeFilterCount = [
    filters.status?.length,
    filters.priority?.length,
    filters.type?.length,
    filters.assigneeId,
    filters.labels?.length,
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleStatusToggle = (status: TicketStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handlePriorityToggle = (priority: TicketPriority) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];
    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  const handleTypeToggle = (type: TicketType) => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onFiltersChange({
      ...filters,
      type: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  const handleAssigneeChange = (assigneeId: string | undefined) => {
    onFiltersChange({
      ...filters,
      assigneeId,
    });
  };

  const clearAllFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  return (
    <div className="space-y-3">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--color-text-muted]" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tickets..."
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {(activeFilterCount > 0 || searchValue) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            leftIcon={<X className="h-4 w-4" />}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="p-4 rounded-lg border border-[--color-border-primary] bg-[--color-bg-secondary] space-y-4">
          {/* Status Filter */}
          <FilterSection title="Status">
            <div className="flex flex-wrap gap-2">
              {Object.entries(TICKET_STATUSES).map(([status, config]) => (
                <FilterChip
                  key={status}
                  label={config.label}
                  selected={filters.status?.includes(status as TicketStatus) || false}
                  onClick={() => handleStatusToggle(status as TicketStatus)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Priority Filter */}
          <FilterSection title="Priority">
            <div className="flex flex-wrap gap-2">
              {Object.entries(TICKET_PRIORITIES).map(([priority, config]) => (
                <FilterChip
                  key={priority}
                  label={config.label}
                  selected={filters.priority?.includes(priority as TicketPriority) || false}
                  onClick={() => handlePriorityToggle(priority as TicketPriority)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Type Filter */}
          <FilterSection title="Type">
            <div className="flex flex-wrap gap-2">
              {Object.entries(TICKET_TYPES).map(([type, config]) => (
                <FilterChip
                  key={type}
                  label={config.label}
                  selected={filters.type?.includes(type as TicketType) || false}
                  onClick={() => handleTypeToggle(type as TicketType)}
                />
              ))}
            </div>
          </FilterSection>

          {/* Assignee Filter */}
          <FilterSection title="Assignee">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Unassigned"
                selected={filters.assigneeId === 'unassigned'}
                onClick={() =>
                  handleAssigneeChange(
                    filters.assigneeId === 'unassigned' ? undefined : 'unassigned'
                  )
                }
              />
              {members.map((member) => (
                <FilterChip
                  key={member.userId}
                  label={member.user?.name || 'Unknown'}
                  selected={filters.assigneeId === member.userId}
                  onClick={() =>
                    handleAssigneeChange(
                      filters.assigneeId === member.userId ? undefined : member.userId
                    )
                  }
                />
              ))}
            </div>
          </FilterSection>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status?.map((status) => (
            <Badge key={status} variant="info" className="gap-1">
              {TICKET_STATUSES[status].label}
              <button
                onClick={() => handleStatusToggle(status)}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.priority?.map((priority) => (
            <Badge key={priority} variant="warning" className="gap-1">
              {TICKET_PRIORITIES[priority].label}
              <button
                onClick={() => handlePriorityToggle(priority)}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.type?.map((type) => (
            <Badge key={type} variant="default" className="gap-1">
              {TICKET_TYPES[type].label}
              <button
                onClick={() => handleTypeToggle(type)}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.assigneeId && (
            <Badge variant="success" className="gap-1">
              {filters.assigneeId === 'unassigned'
                ? 'Unassigned'
                : members.find((m) => m.userId === filters.assigneeId)?.user?.name || 'Unknown'}
              <button
                onClick={() => handleAssigneeChange(undefined)}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper Components

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-[--color-text-secondary] mb-2">{title}</h4>
      {children}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
        selected
          ? 'bg-[--color-primary-600] border-[--color-primary-600] text-white'
          : 'border-[--color-border-primary] text-[--color-text-secondary] hover:border-[--color-border-secondary] hover:text-[--color-text-primary]'
      }`}
    >
      {label}
    </button>
  );
}
