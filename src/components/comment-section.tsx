"use client";

import { useState, useRef } from "react";
import { addComment, deleteComment, loadMoreComments } from "@/lib/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  parentCommentId: string | null;
  userName: string | null;
  userUsername: string | null;
  userImage: string | null;
  replies?: Comment[];
};

interface CommentSectionProps {
  productId: string;
  comments: Comment[];
  initialHasMore: boolean;
  isAuthenticated: boolean;
  currentUserId?: string;
  currentUserUsername?: string | null;
}

export function CommentSection({
  productId,
  comments: initialComments,
  initialHasMore,
  isAuthenticated,
  currentUserId,
  currentUserUsername,
}: CommentSectionProps) {
  const { messages } = useI18n();
  const [comments, setComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    const result = await addComment(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result?.comment) {
      const newComment = { ...result.comment, replies: [] };
      if (newComment.parentCommentId) {
        // Add reply to parent comment
        setComments((prev) =>
          prev.map((c) =>
            c.id === newComment.parentCommentId
              ? { ...c, replies: [...(c.replies ?? []), newComment] }
              : c
          )
        );
        setReplyingTo(null);
        replyFormRef.current?.reset();
      } else {
        setComments((prev) => [...prev, newComment]);
        formRef.current?.reset();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (commentId: string, parentId?: string | null) => {
    if (!confirm(messages.comments.deleteConfirm)) return;
    const result = await deleteComment(commentId);
    if (!result.error) {
      if (parentId) {
        // Remove reply from parent
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
              : c
          )
        );
      } else {
        // Remove top-level comment (and its replies)
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const result = await loadMoreComments(productId, comments.length);
    setComments((prev) => [...prev, ...result.comments]);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  };

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  );

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const profileHref = comment.userUsername
      ? `/user/${comment.userUsername}`
      : "#";

    return (
      <div key={comment.id} className={`group ${isReply ? "pl-10" : ""}`}>
        <div className="flex items-center gap-2">
          {comment.userImage && comment.userUsername && (
            <Link href={profileHref}>
              <img
                src={comment.userImage}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            </Link>
          )}
          {comment.userUsername ? (
            <Link
              href={profileHref}
              className="text-sm font-medium hover:underline"
            >
              @{comment.userUsername}
            </Link>
          ) : (
            <span className="text-sm font-medium">
              {comment.userName ?? messages.comments.anonymous}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
          {!isReply && isAuthenticated && (
            <button
              onClick={() =>
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {messages.comments.reply}
            </button>
          )}
          {currentUserId === comment.userId && (
            <button
              onClick={() => handleDelete(comment.id, isReply ? comment.parentCommentId : null)}
              className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              {messages.comments.delete}
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm pl-7">
          {comment.content}
        </p>

        {/* Inline reply form */}
        {replyingTo === comment.id && (
          <form
            ref={replyFormRef}
            action={handleSubmit}
            className="mt-3 pl-7"
          >
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="parentCommentId" value={comment.id} />
            <Textarea
              name="content"
              placeholder={messages.comments.replyTo.replace("{user}", comment.userUsername ? `@${comment.userUsername}` : (comment.userName ?? ""))}
              rows={2}
              maxLength={2000}
              required
              className="resize-none"
              autoFocus
            />
            <div className="mt-2 flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="font-mono text-xs"
              >
                {messages.comments.cancelReply}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="font-mono text-xs"
              >
                {isSubmitting ? messages.comments.posting : messages.comments.reply}
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 className="font-mono text-sm font-bold text-muted-foreground">
        {messages.comments.comments} ({totalCount})
      </h3>

      {isAuthenticated ? (
        <form ref={formRef} action={handleSubmit} className="mt-4">
          <input type="hidden" name="productId" value={productId} />
          {error && (
            <p className="mb-2 text-sm text-destructive">{error}</p>
          )}
          <Textarea
            name="content"
            placeholder={messages.comments.placeholder}
            rows={3}
            maxLength={2000}
            required
            className="resize-none"
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="font-mono text-xs"
            >
              {isSubmitting ? messages.comments.posting : messages.comments.post}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/signin" className="underline">
            {messages.common.signIn}
          </Link>
          {messages.comments.signInToComment}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id}>
            {renderComment(comment)}
            {/* Render replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">{messages.comments.noComments}</p>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="font-mono text-xs text-muted-foreground"
            >
              {isLoadingMore ? messages.comments.loading : messages.comments.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
