import { formatDistanceToNow } from 'date-fns';
import {
  PlusCircle,
  Edit,
  Trash2,
  MoveRight,
  UserPlus,
  MessageCircle,
  Users,
  FolderPlus,
  Settings,
  Activity,
  Loader2,
} from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import type { ActivityLog as ActivityLogType, ActivityAction } from '@/types';
import { formatActivityAction } from '@/hooks/useActivity';

interface ActivityLogProps {
  activities: ActivityLogType[];
  isLoading?: boolean;
  emptyMessage?: string;
  showProject?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function ActivityLog({
  activities,
  isLoading,
  emptyMessage = 'No activity yet',
  showProject = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: ActivityLogProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-10 w-10 text-[var(--color-text-muted)] mb-2" />
        <p className="text-[var(--color-text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityItem
          key={activity.$id}
          activity={activity}
          showProject={showProject}
        />
      ))}
      
      {/* ACT-03: Load More button for pagination */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="ghost"
            size="sm"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityLogType;
  showProject?: boolean;
}

function ActivityItem({ activity, showProject }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.action);
  const actionText = formatActivityAction(activity);
  const timeAgo = formatDistanceToNow(new Date(activity.$createdAt), {
    addSuffix: true,
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
      {/* User Avatar */}
      <Avatar
        userId={activity.userId}
        name={activity.user?.name || 'User'}
        size="sm"
      />

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[var(--color-text-primary)]">
            {activity.user?.name || 'Unknown User'}
          </span>
          <span className="text-[var(--color-text-secondary)]">{actionText}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
          <Icon className="h-3 w-3" />
          <span>{timeAgo}</span>
          {showProject && typeof activity.details === 'object' && activity.details !== null && typeof (activity.details as Record<string, unknown>).projectName === 'string' && (
            <>
              <span>in</span>
              <span className="font-medium text-[var(--color-text-secondary)]">
                {(activity.details as Record<string, unknown>).projectName as string}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get the appropriate icon component for an activity action
 */
function getActivityIcon(action: ActivityAction) {
  switch (action) {
    case 'ticket_created':
      return PlusCircle;
    case 'ticket_updated':
      return Edit;
    case 'ticket_deleted':
      return Trash2;
    case 'ticket_moved':
      return MoveRight;
    case 'ticket_assigned':
      return UserPlus;
    case 'comment_added':
    case 'comment_deleted':
      return MessageCircle;
    case 'member_added':
    case 'member_removed':
    case 'member_role_changed':
      return Users;
    case 'project_created':
      return FolderPlus;
    case 'project_updated':
      return Settings;
    default:
      return Activity;
  }
}
