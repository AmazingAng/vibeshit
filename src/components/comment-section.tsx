"use client";

import { useState, useRef } from "react";
import { addComment, deleteComment } from "@/lib/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

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
  isAuthenticated: boolean;
  currentUserId?: string;
  currentUserUsername?: string | null;
}

export function CommentSection({
  productId,
  comments: initialComments,
  isAuthenticated,
  currentUserId,
  currentUserUsername,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
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
    if (!confirm("Delete this comment?")) return;
    const result = await deleteComment(commentId);
    if (!result.error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <div>
      <h3 className="font-mono text-sm font-bold text-muted-foreground">
        Comments ({comments.length})
      </h3>

      {isAuthenticated ? (
        <form ref={formRef} action={handleSubmit} className="mt-4">
          <input type="hidden" name="productId" value={productId} />
          {error && (
            <p className="mb-2 text-sm text-destructive">{error}</p>
          )}
          <Textarea
            name="content"
            placeholder="Leave a comment..."
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
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/api/auth/signin/github" className="underline">
            Sign in
          </Link>{" "}
          to leave a comment.
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
                    {comment.userName ?? "Anonymous"}
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
                    Delete
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
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
      </div>
    </div>
  );
}
