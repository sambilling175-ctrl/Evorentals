"use client";

import * as React from "react";
import { UploadCloud, File, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Make sure react-dropzone is installed or build a standard HTML5 drag-and-drop.
// To ensure it works out of the box without any package issues, let's write a standard HTML5 drag and drop file input, which is highly reliable, robust, and styleable!
interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 3,
  maxSizeMB = 5,
  accept = "image/*,application/pdf",
  className,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadingFile[] = [];
    const validFiles: File[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (files.length + newFiles.length >= maxFiles) return;

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        newFiles.push({
          id: Math.random().toString(),
          file,
          progress: 0,
          status: "error",
          error: `Size exceeds ${maxSizeMB}MB limit`,
        });
        return;
      }

      const id = Math.random().toString();
      newFiles.push({
        id,
        file,
        progress: 0,
        status: "uploading",
      });
      validFiles.push(file);

      // Simulate upload progress
      let p = 0;
      const interval = setInterval(() => {
        p += 10;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  progress: p,
                  status: p >= 100 ? "success" : "uploading",
                }
              : f
          )
        );
        if (p >= 100) clearInterval(interval);
      }, 150);
    });

    setFiles((prev) => [...prev, ...newFiles]);
    if (onFilesSelected && validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className={cn("space-y-4 w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/10"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={handleChange}
        />
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3 group-hover:scale-105 transition-transform duration-200">
          <UploadCloud className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">
          Click to upload or drag & drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, PNG, JPG (max {maxSizeMB}MB)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground shrink-0">
                <File className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <p className="font-medium truncate">{f.file.name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(f.file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                {f.status === "uploading" && (
                  <Progress value={f.progress} className="h-1" />
                )}
                {f.status === "error" && (
                  <p className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {f.error}
                  </p>
                )}
                {f.status === "success" && (
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> Upload complete
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="w-8 h-8 rounded-full shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
