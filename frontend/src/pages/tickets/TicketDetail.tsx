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
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/common/Button';
import { PriorityBadge, TypeBadge, StatusBadge } from '@/components/common/Badge';
import { Avatar } from '@/components/common/Avatar';
import { Textarea } from '@/components/common/Textarea';
import { EditTicketModal } from '@/components/tickets/EditTicketModal';
import {
  useTicket,
  useDeleteTicket,
  useUpdateTicket,
} from '@/hooks/useTickets';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/useComments';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import type { UpdateTicketForm } from '@/types';

export function TicketDetail() {
  const { projectId, ticketId } = useParams<{
    projectId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // React Query hooks
  const { ticket, isLoading: isLoadingTicket } = useTicket(ticketId);
  const { comments, isLoading: isLoadingComments } = useComments(ticketId);
  const { members } = useProjectMembers(projectId);
  const deleteTicketMutation = useDeleteTicket();
  const updateTicketMutation = useUpdateTicket();
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
    if (!ticketId) return;
    
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      deleteTicketMutation.mutate(ticketId, {
        onSuccess: () => {
          navigate(`/projects/${projectId}`);
        },
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleUpdateTicket = async (data: UpdateTicketForm) => {
    if (!ticketId) return;
    
    await updateTicketMutation.mutateAsync({ ticketId, data });
    setShowEditModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-[--color-text-primary]">
          Ticket not found
        </h2>
        <p className="mt-2 text-[--color-text-secondary]">
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
        className="flex items-center gap-2 text-[--color-text-secondary] hover:text-[--color-text-primary] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <TypeBadge type={ticket.type} />
                <span className="text-sm text-[--color-text-muted]">
                  TICKET-{ticket.ticketNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 cursor-pointer"
                  onClick={handleDeleteTicket}
                  isLoading={deleteTicketMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[--color-text-primary] mb-4">
              {ticket.title}
            </h1>

            <div className="prose prose-invert max-w-none">
              <p className="text-[--color-text-secondary]">
                {ticket.description || 'No description provided.'}
              </p>
            </div>

            {/* Labels */}
            {ticket.labels && ticket.labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[--color-border-primary]">
                {ticket.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-[--color-bg-tertiary] px-3 py-1 text-sm text-[--color-text-secondary]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[--color-text-primary] mb-4">
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
              <p className="text-center py-8 text-[--color-text-muted]">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.$id}
                    className="flex gap-3 p-4 rounded-lg bg-[--color-bg-primary]"
                  >
                    {comment.user && (
                      <Avatar
                        userId={comment.user.$id}
                        name={comment.user.name}
                        size="md"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[--color-text-primary]">
                            {comment.user?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-[--color-text-muted]">
                            {format(new Date(comment.$createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteComment(comment.$id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[--color-text-secondary]">
                        {comment.content}
                      </p>
                      
                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[--color-border-primary] space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.$id} className="flex gap-2">
                              {reply.user && (
                                <Avatar
                                  userId={reply.user.$id}
                                  name={reply.user.name}
                                  size="sm"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-[--color-text-primary]">
                                    {reply.user?.name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-[--color-text-muted]">
                                    {format(new Date(reply.$createdAt), 'MMM d, yyyy h:mm a')}
                                  </span>
                                </div>
                                <p className="text-sm text-[--color-text-secondary]">
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
          <div className="rounded-xl border border-[--color-border-primary] bg-[--color-bg-secondary] p-6">
            <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
              Details
            </h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[--color-text-muted] mb-1">Status</dt>
                <dd>
                  <StatusBadge status={ticket.status} />
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[--color-text-muted] mb-1">Priority</dt>
                <dd>
                  <PriorityBadge priority={ticket.priority} />
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[--color-text-muted] mb-1">Assignee</dt>
                <dd className="flex items-center gap-2">
                  {ticket.assignee ? (
                    <>
                      <Avatar
                        userId={ticket.assignee.$id}
                        name={ticket.assignee.name}
                        size="sm"
                      />
                      <span className="text-[--color-text-primary]">
                        {ticket.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-[--color-text-muted]">
                      <User className="h-4 w-4" />
                      Unassigned
                    </span>
                  )}
                </dd>
              </div>

              {ticket.dueDate && (
                <div>
                  <dt className="text-sm text-[--color-text-muted] mb-1">Due Date</dt>
                  <dd className="flex items-center gap-2 text-[--color-text-primary]">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(ticket.dueDate), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm text-[--color-text-muted] mb-1">Created</dt>
                <dd className="text-[--color-text-secondary]">
                  {format(new Date(ticket.$createdAt), 'MMM d, yyyy')}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-[--color-text-muted] mb-1">Updated</dt>
                <dd className="text-[--color-text-secondary]">
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
    </div>
  );
}
