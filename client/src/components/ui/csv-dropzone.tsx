"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type CsvDropzoneProps = {
  onSelect?: (file: File) => void
  className?: string
  id?: string
  onInputChange?: React.ChangeEventHandler<HTMLInputElement>
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

function isCsv(file: File) {
  return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
}

export default function CsvDropzone({
  onSelect,
  className,
  id = "csv-file",
  onInputChange,
  inputProps,
}: CsvDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const openFileDialog = () => inputRef.current?.click()

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!isCsv(file)) return
    onSelect?.(file)
  }

  const internalOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Call user's handler first if provided to preserve their logic
    onInputChange?.(e)
    if (!onInputChange) {
      handleFiles(e.target.files)
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={cn("w-full", className)}>
      {/* hidden input for accessibility and native picker */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={inputProps?.accept ?? ".csv,text/csv"}
        className={cn("sr-only", inputProps?.className)}
        onChange={internalOnChange}
        {...inputProps}
      />

      <div
        role="button"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            openFileDialog()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={onDrop}
        className={cn(
          "flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          "bg-muted/40",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30",
        )}
      >
        <span id={`${id}-label`} className="text-base font-medium text-primary">
          Select CSV File
        </span>
        <span className="mt-1 text-sm text-muted-foreground">select your file or drag and drop</span>
      </div>
    </div>
  )
}
