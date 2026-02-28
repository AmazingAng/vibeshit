"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const MAX_IMAGES = 4;

interface GalleryUploadProps {
  name: string;
  defaultValue?: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
}

export function GalleryUpload({ name, defaultValue = [], value, onChange }: GalleryUploadProps) {
  const [images, setImages] = useState<string[]>(defaultValue);
  const [previews, setPreviews] = useState<string[]>(defaultValue);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingIdx = useRef<number>(0);
  const isControlled = value !== undefined;
  const currentImages = isControlled ? value : images;

  useEffect(() => {
    if (!isControlled) return;
    const nextValue = value ?? [];
    setImages(nextValue);
    setPreviews(nextValue);
  }, [isControlled, value]);

  const applyImages = useCallback(
    (next: string[]) => {
      if (!isControlled) {
        setImages(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const upload = useCallback(async (file: File, idx: number, existedBefore: boolean) => {
    setError(null);
    setUploadingIdx(idx);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", "banner");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setPreviews((prev) => {
          const next = [...prev];
          if (!existedBefore) next.splice(idx, 1);
          return next;
        });
        return;
      }

      const url = data.url ?? "";
      const next = [...currentImages];
      next[idx] = url;
      applyImages(next);
      setPreviews((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    } catch {
      setError("Upload failed. Please try again.");
      setPreviews((prev) => {
        const next = [...prev];
        if (!existedBefore) next.splice(idx, 1);
        return next;
      });
    } finally {
      setUploadingIdx(null);
    }
  }, [currentImages, applyImages]);

  const handleFile = useCallback(
    (file: File | undefined, idx: number) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      const localPreview = URL.createObjectURL(file);
      setPreviews((prev) => {
        const next = [...prev];
        next[idx] = localPreview;
        return next;
      });
      upload(file, idx, Boolean(currentImages[idx]));
    },
    [upload, currentImages]
  );

  const handleAddClick = useCallback(
    (idx: number) => {
      pendingIdx.current = idx;
      inputRef.current?.click();
    },
    []
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0], pendingIdx.current);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback((idx: number) => {
    applyImages(currentImages.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
  }, [applyImages, currentImages]);

  const handleDrop = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      setDragOverIdx(null);
      handleFile(e.dataTransfer.files[0], idx);
    },
    [handleFile]
  );

  const showAddSlot = previews.length < MAX_IMAGES;

  return (
    <div className="space-y-2">
      <label className="font-mono text-xs font-medium">
        Screenshots *
      </label>
      <p className="text-xs text-muted-foreground">
        Up to 4 images. First image is used as banner &amp; social preview.
      </p>

      <input type="hidden" name={name} value={JSON.stringify(currentImages)} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="grid grid-cols-2 gap-3">
        {previews.map((src, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-lg border border-border ${
              idx === 0 ? "col-span-2 aspect-1200/630" : "aspect-video"
            }`}
          >
            <img
              src={src}
              alt={`Image ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            {idx === 0 && (
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
                Banner
              </span>
            )}
            {uploadingIdx === idx && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <span className="animate-pulse font-mono text-xs text-muted-foreground">
                  Uploading...
                </span>
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleAddClick(idx)}
                className="rounded-md bg-background/80 px-2 py-1 font-mono text-xs text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="rounded-md bg-background/80 px-2 py-1 font-mono text-xs text-destructive shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {showAddSlot && (
          <div
            onClick={() => handleAddClick(previews.length)}
            onDrop={(e) => handleDrop(e, previews.length)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIdx(previews.length);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOverIdx(null);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              previews.length === 0 ? "col-span-2 aspect-1200/630" : "aspect-video"
            } ${
              dragOverIdx === previews.length
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <svg
              className="mb-1 h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="font-mono text-[11px] text-muted-foreground">
              {previews.length === 0 ? "Add image" : `Add (${previews.length}/${MAX_IMAGES})`}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
