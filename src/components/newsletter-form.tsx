"use client";

import { useState, useRef } from "react";
import { subscribeToNewsletter } from "@/lib/actions/newsletter";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function NewsletterForm() {
  const { messages } = useI18n();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setStatus("submitting");
    setErrorMsg("");

    const result = await subscribeToNewsletter(formData);

    if (result.error) {
      if (result.error === "already_subscribed") {
        setErrorMsg(messages.newsletter.alreadySubscribed);
      } else {
        setErrorMsg(result.error);
      }
      setStatus("error");
      return;
    }

    setStatus("success");
    formRef.current?.reset();
  };

  return (
    <div className="mx-auto max-w-sm">
      <p className="font-mono text-sm font-bold text-foreground">
        {messages.newsletter.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {messages.newsletter.subtitle}
      </p>
      <form ref={formRef} action={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="email"
          name="email"
          placeholder={messages.newsletter.placeholder}
          required
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status === "submitting"}
          className="font-mono text-xs"
        >
          {status === "submitting"
            ? messages.newsletter.subscribing
            : messages.newsletter.subscribe}
        </Button>
      </form>
      {status === "success" && (
        <p className="mt-2 text-xs text-green-600">{messages.newsletter.success}</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
