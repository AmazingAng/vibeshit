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
  userName: string | null;
  userUsername: string | null;
  userImage: string | null;
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
  const formRef = useRef<HTMLFormElement>(null);

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
      setComments((prev) => [...prev, result.comment]);
    }

    formRef.current?.reset();
    setIsSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(messages.comments.deleteConfirm)) return;
    const result = await deleteComment(commentId);
    if (!result.error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const result = await loadMoreComments(productId, comments.length);
    setComments((prev) => [...prev, ...result.comments]);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  };

  return (
    <div>
      <h3 className="font-mono text-sm font-bold text-muted-foreground">
        {messages.comments.comments} ({comments.length})
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
        {comments.map((comment) => {
          const profileHref = comment.userUsername
            ? `/user/${comment.userUsername}`
            : "#";

          return (
            <div key={comment.id} className="group">
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
                {currentUserId === comment.userId && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    {messages.comments.delete}
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm pl-7">
                {comment.content}
              </p>
            </div>
          );
        })}

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
