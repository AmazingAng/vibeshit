"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadProps {
  name: string;
  type: "logo" | "banner";
  defaultValue?: string | null;
  label: string;
  hint?: string;
}

export function ImageUpload({
  name,
  type,
  defaultValue,
  label,
  hint,
}: ImageUploadProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", type);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };

        if (!res.ok) {
          setError(data.error ?? "Upload failed");
          setUploading(false);
          return;
        }

        setUrl(data.url ?? "");
        setPreview(data.url ?? "");
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [type]
  );

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      upload(file);
    },
    [upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setUrl("");
    setPreview("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const isLogo = type === "logo";
  const aspectClass = isLogo ? "aspect-square w-24" : "aspect-[1200/630] w-full";

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-medium">{label}</label>

      <input type="hidden" name={name} value={url} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className={`${aspectClass} rounded-lg border border-border object-cover`}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
              <span className="font-mono text-xs text-muted-foreground animate-pulse">
                Uploading...
              </span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleClick}
              className="rounded-md bg-background/80 px-2 py-1 font-mono text-xs text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-md bg-background/80 px-2 py-1 font-mono text-xs text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`${aspectClass} flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          } ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <svg
            className="mb-2 h-6 w-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
            />
          </svg>
          <span className="font-mono text-xs text-muted-foreground">
            {uploading ? "Uploading..." : "Drag & drop or click"}
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
