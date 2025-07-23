'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { CoachAccessSelector } from '@/components/coach-access-selector'
import { CoachAccessConfig } from '@/lib/coach-mapping'
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  X,
  FileUp,
  FolderUp,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface FileUpload {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  documentId?: string
}

interface DocumentUploadProps {
  onUploadComplete?: () => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileUpload[]>([])
  const [coachAccess, setCoachAccess] = useState<CoachAccessConfig[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop()
      return ['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext || '')
    })

    if (validFiles.length < newFiles.length) {
      toast.error('Only .txt, .md, .pdf, .doc, and .docx files are supported')
    }

    const fileUploads: FileUpload[] = validFiles.map(file => ({
      file,
      status: 'pending' as const,
      progress: 0
    }))

    setFiles(prev => [...prev, ...fileUploads])
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [addFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    // Validate coach selection
    const selectedCoaches = coachAccess.filter(access => access.selected)
    if (selectedCoaches.length === 0) {
      toast.error('Please select at least one coach for document access')
      return
    }

    setUploading(true)
    const pendingFiles = files.filter(f => f.status === 'pending')

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileUpload = pendingFiles[i]
      const fileIndex = files.indexOf(fileUpload)

      try {
        // Update status to uploading
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, status: 'uploading', progress: 30 } : f
        ))

        // Map selected coaches for API
        const coachAccessData = selectedCoaches
          .map(access => ({
            coachId: access.coachId,
            accessTier: access.accessTier
          }))

        // Create form data
        const formData = new FormData()
        formData.append('file', fileUpload.file)
        formData.append('coachAccess', JSON.stringify(coachAccessData))

        // Upload file
        const response = await fetch('/api/rag/upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed')
        }

        // Update status to success
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex 
            ? { ...f, status: 'success', progress: 100, documentId: data.document?.id }
            : f
        ))

        toast.success(`${fileUpload.file.name} uploaded successfully`)
      } catch (error: any) {
        // Update status to error
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex 
            ? { ...f, status: 'error', progress: 0, error: error.message }
            : f
        ))

        toast.error(`${fileUpload.file.name}: ${error.message}`)
      }
    }

    setUploading(false)
    onUploadComplete?.()
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'))
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)
  const completedCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Drag and drop files or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                "cursor-pointer hover:border-primary hover:bg-primary/5"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileInput}
                className="hidden"
              />
              <FolderUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to browse or drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .md, .pdf, .doc, .docx
              </p>
            </div>

            <div className="space-y-2">
              <Label>Coach Access</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select which coaches can access these documents
              </p>
              <CoachAccessSelector
                onChange={setCoachAccess}
                defaultTier="pro"
                defaultSelectAll={true}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total size: {(totalSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((fileUpload, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fileUpload.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(fileUpload.file.size / 1024).toFixed(1)} KB
                        </p>
                        {fileUpload.status === 'uploading' && (
                          <Progress value={fileUpload.progress} className="h-1 mt-1" />
                        )}
                        {fileUpload.error && (
                          <p className="text-xs text-destructive mt-1">{fileUpload.error}</p>
                        )}
                      </div>
                      {fileUpload.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {fileUpload.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {fileUpload.status === 'error' && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={uploadFiles}
                    disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.filter(f => f.status === 'pending').length} Files
                  </Button>
                  {(completedCount > 0 || errorCount > 0) && (
                    <Button
                      variant="outline"
                      onClick={clearCompleted}
                      disabled={uploading}
                    >
                      Clear Completed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completed</span>
                <span className="font-medium">{completedCount}/{files.length}</span>
              </div>
              <Progress 
                value={files.length > 0 ? (completedCount / files.length) * 100 : 0} 
              />
            </div>
            
            {errorCount > 0 && (
              <div className="text-sm text-destructive">
                {errorCount} file{errorCount !== 1 ? 's' : ''} failed to upload
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Select which coaches can access the documents</li>
              <li>• By default, all coaches have Pro tier access</li>
              <li>• Upload multiple files at once</li>
              <li>• Files are automatically processed and chunked</li>
              <li>• Embeddings are generated for each chunk</li>
              <li>• Maximum file size: 10MB per file</li>
              <li>• Supported formats: Text, Markdown, PDF, Word</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}