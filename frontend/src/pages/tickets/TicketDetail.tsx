import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MessageSquare,
  Calendar,
  User,
  Loader2,
  Send,
  UserPlus,
  Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { PriorityBadge, TypeBadge, StatusBadge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Textarea } from '@/components/common/Textarea';
import { Modal } from '@/components/common/Modal';
import { EditTicketModal } from '@/components/tickets/EditTicketModal';
import { AttachmentList } from '@/components/common/FileUpload';
import {
  useTicket,
  useDeleteTicket,
  useUpdateTicket,
  useAssignTicket,
} from '@/hooks/useTickets';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/useComments';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { usePermissions } from '@/hooks/usePermissions';
import type { UpdateTicketForm } from '@/types';

export function TicketDetail() {
  const { projectId, ticketId } = useParams<{
    projectId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // React Query hooks
  const { ticket, isLoading: isLoadingTicket } = useTicket(ticketId);
  const { comments, isLoading: isLoadingComments } = useComments(ticketId);
  const { members } = useProjectMembers(projectId);
  const { permissions } = usePermissions(members);
  const deleteTicketMutation = useDeleteTicket();
  const updateTicketMutation = useUpdateTicket();
  const assignTicketMutation = useAssignTicket();
  // NTF-01c: Pass ticket context for comment notifications
  const createCommentMutation = useCreateComment(ticketId);
  const deleteCommentMutation = useDeleteComment(ticketId);

  const isLoading = isLoadingTicket || isLoadingComments;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    createCommentMutation.mutate(
      { content: newComment },
      {
        onSuccess: () => {
          setNewComment('');
        },
      }
    );
  };

  const handleDeleteTicket = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTicket = () => {
    if (!ticketId) return;
    setShowDeleteConfirm(false);
    deleteTicketMutation.mutate(ticketId, {
      onSuccess: () => {
        navigate(`/projects/${projectId}`);
      },
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleUpdateTicket = async (data: UpdateTicketForm) => {
    if (!ticketId) return;
    
    try {
      await updateTicketMutation.mutateAsync({ ticketId, data });
      setShowEditModal(false);
    } catch (error) {
      // Error handling is delegated to the mutation's onError callback
      console.error('Failed to update ticket:', error);
    }
  };

  // TKT-24: Handle self-assign
  const handleSelfAssign = async () => {
    if (!ticketId || !user) return;
    assignTicketMutation.mutate({
      ticketId,
      assigneeId: user.$id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Ticket not found
        </h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          The ticket you're looking for doesn't exist or you don't have access.
        </p>
        <Button
          variant="secondary"
          className="mt-4 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <TypeBadge type={ticket.type} />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {ticket.ticketKey ? ticket.ticketKey : `TICKET-${ticket.ticketNumber}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {permissions.canEditTickets && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {permissions.canDeleteTickets && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 cursor-pointer"
                    onClick={handleDeleteTicket}
                    isLoading={deleteTicketMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              {ticket.title}
            </h1>

            <div className="prose prose-invert max-w-none">
              <p className="text-[var(--color-text-secondary)]">
                {ticket.description || 'No description provided.'}
              </p>
            </div>

            {/* Labels */}
            {ticket.labels && ticket.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-border-primary)]">
                {ticket.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-[var(--color-bg-tertiary)] px-3 py-1 text-sm text-[var(--color-text-secondary)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments.length})
            </h2>

            {/* Add comment */}
            <div className="mb-6">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  isLoading={createCommentMutation.isPending}
                  disabled={!newComment.trim()}
                  className="cursor-pointer"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-center py-8 text-[var(--color-text-muted)]">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.$id}
                    className="group flex gap-3 p-4 rounded-lg bg-[var(--color-bg-primary)]"
                  >
                    {comment.user && (
                      <Avatar
                        userId={comment.user.$id}
                        name={comment.user.name}
                        avatarId={comment.user.avatar || comment.user.prefs?.avatar}
                        size="md"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {comment.user?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {format(new Date(comment.$createdAt), 'MMM d, yyyy h:mm a')}
                            {/* CMT-06: Show (edited) indicator if comment was edited */}
                            {comment.$updatedAt &&
                              new Date(comment.$updatedAt).getTime() -
                                new Date(comment.$createdAt).getTime() >
                                1000 && (
                              <span className="ml-1 text-xs text-[var(--color-text-muted)] italic">
                                (edited)
                              </span>
                            )}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteComment(comment.$id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">
                        {comment.content}
                      </p>
                      
                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[var(--color-border-primary)] space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.$id} className="flex gap-2">
                              {reply.user && (
                                <Avatar
                                  userId={reply.user.$id}
                                  name={reply.user.name}
                                  avatarId={reply.user.avatar || reply.user.prefs?.avatar}
                                  size="sm"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-[var(--color-text-primary)]">
                                    {reply.user?.name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-[var(--color-text-muted)]">
                                    {format(new Date(reply.$createdAt), 'MMM d, yyyy h:mm a')}
                                    {/* CMT-06: Show (edited) indicator for replies too */}
                                    {reply.$updatedAt &&
                                      new Date(reply.$updatedAt).getTime() -
                                        new Date(reply.$createdAt).getTime() >
                                        1000 && (
                                      <span className="ml-1 italic">
                                        (edited)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Details
            </h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[var(--color-text-muted)] mb-1">Status</dt>
                <dd>
                  <StatusBadge status={ticket.status} />
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[var(--color-text-muted)] mb-1">Priority</dt>
                <dd>
                  <PriorityBadge priority={ticket.priority} />
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[var(--color-text-muted)] mb-1">Assignee</dt>
                <dd className="flex items-center gap-2">
                  {ticket.assignee ? (
                    <>
                      <Avatar
                        userId={ticket.assignee.$id}
                        name={ticket.assignee.name}
                        avatarId={ticket.assignee.avatar || ticket.assignee.prefs?.avatar}
                        size="sm"
                      />
                      <span className="text-[var(--color-text-primary)]">
                        {ticket.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                      <User className="h-4 w-4" />
                      Unassigned
                    </span>
                  )}
                </dd>
                {/* TKT-24: Show self-assign button if not assigned and user has permission */}
                {!ticket.assignee &&
                  user &&
                  permissions.canAssignTickets &&
                  ticket.assigneeId !== user.$id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 cursor-pointer"
                    onClick={handleSelfAssign}
                    isLoading={assignTicketMutation.isPending}
                    leftIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Assign to me
                  </Button>
                )}
              </div>

              {ticket.dueDate && (
                <div>
                  <dt className="text-sm text-[var(--color-text-muted)] mb-1">Due Date</dt>
                  <dd className="flex items-center gap-2 text-[var(--color-text-primary)]">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(ticket.dueDate), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <dt className="text-sm text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Attachments ({ticket.attachments.length})
                  </dt>
                  <dd className="mt-2">
                    <AttachmentList attachments={ticket.attachments} />
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm text-[var(--color-text-muted)] mb-1">Created</dt>
                <dd className="text-[var(--color-text-secondary)]">
                  {format(new Date(ticket.$createdAt), 'MMM d, yyyy')}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[var(--color-text-muted)] mb-1">Updated</dt>
                <dd className="text-[var(--color-text-secondary)]">
                  {format(new Date(ticket.$updatedAt), 'MMM d, yyyy')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      {ticket && (
        <EditTicketModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateTicket}
          ticket={ticket}
          members={members}
          isSubmitting={updateTicketMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Ticket"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)]">
            Are you sure you want to delete this ticket? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmDeleteTicket}
              isLoading={deleteTicketMutation.isPending}
              className="cursor-pointer bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
