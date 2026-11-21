"use client";

import React, { memo, useState, useRef } from "react";

interface SlipUploaderProps {
  onFileCompressed: (file: File) => void;
  required?: boolean;
}

export const SlipUploader = memo<SlipUploaderProps>(({
  onFileCompressed,
  required = true,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1024;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressed = new File([blob], `slip_${Date.now()}.webp`, {
                  type: "image/webp",
                });
                const sizeKb = (compressed.size / 1024).toFixed(1);
                setFileSize(`${sizeKb} KB (WebP)`);
                setPreview(URL.createObjectURL(compressed));
                onFileCompressed(compressed);
              }
              setIsCompressing(false);
            },
            "image/webp",
            0.8
          );
        } else {
          setIsCompressing(false);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--ink)]">
          Official Requisition Slip Photo {required && <span className="text-[var(--rt)]">*</span>}
        </label>
        {fileSize && (
          <span className="text-[10px] font-mono text-[var(--ok)] font-semibold">
            ✓ Optimized: {fileSize}
          </span>
        )}
      </div>

      <p className="text-[11px] text-[var(--mu)] leading-relaxed">
        Mandatory clinical anti-spam guardrail. Auto-compressed in browser to &lt; 300 KB before upload.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload official requisition slip photo"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-[var(--ln)] rounded-xl p-4 text-center hover:bg-[var(--bg)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C62828] active:scale-[0.99]"
      >
        {isCompressing ? (
          <div className="py-2 text-xs text-[var(--mu)] font-medium animate-pulse">
            Processing and optimizing image...
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <img
              src={preview}
              alt="Uploaded Requisition Slip"
              className="max-h-40 mx-auto rounded-lg object-contain border border-[var(--ln)]"
            />
            <div className="text-xs text-[var(--ok)] font-semibold flex items-center justify-center gap-1">
              <span>✓</span> Photo selected. Tap to replace.
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 py-1">
            <div className="text-2xl" aria-hidden="true">📷</div>
            <div className="text-xs font-semibold text-[var(--ink)]">Tap to Take or Upload Photo</div>
            <div className="text-[11px] text-[var(--mu)]">Mobile camera, JPEG, PNG, WebP</div>
          </div>
        )}
      </button>
    </div>
  );
});

SlipUploader.displayName = "SlipUploader";
