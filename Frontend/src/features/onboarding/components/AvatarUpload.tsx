import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { UploadIcon } from 'lucide-react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { FormAlert } from '@/components/common/FormAlert'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { usersApi } from '../api/users.api'
import { getAvatarFileError } from '../schemas/onboarding.schemas'
import { cropToBlob } from './crop-image'

type AvatarUploadProps = {
  name: string
  value: string | null
  onChange: (url: string | null) => void
  onBusyChange: (busy: boolean) => void
}

export function AvatarUpload({ name, value, onChange, onBusyChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => onBusyChange(Boolean(imageUrl)), [imageUrl, onBusyChange])

  function closeCropper() {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setProgress(null)
  }

  function pickFile(file: File | undefined) {
    if (!file) return
    const fileError = getAvatarFileError(file)
    setError(fileError)
    if (fileError) return
    closeCropper()
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setImageUrl(URL.createObjectURL(file))
  }

  async function upload() {
    if (!imageUrl || !area) return
    setError(null)
    setProgress(0)
    try {
      const blob = await cropToBlob(imageUrl, area)
      onChange(await usersApi.uploadAvatar(blob, setProgress))
      closeCropper()
    } catch {
      setProgress(null)
      setError("Couldn't upload your photo — check your internet and try again")
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    pickFile(event.target.files?.[0])
    // Lets the user pick the same file again after cancelling.
    event.target.value = ''
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    pickFile(event.dataTransfer.files[0])
  }

  const isUploading = progress !== null

  if (imageUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Position your photo</p>
        <div className="relative h-64 overflow-hidden rounded-lg bg-muted">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar-zoom">Zoom</Label>
          <input
            id="avatar-zoom"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            disabled={isUploading}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-11 w-full accent-primary"
          />
        </div>
        {isUploading && (
          <div className="space-y-1">
            <Progress value={progress} aria-label="Uploading your photo" />
            <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
          </div>
        )}
        {error && <FormAlert message={error} />}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-11" disabled={isUploading} onClick={upload}>
            {error ? 'Try again' : 'Use this photo'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={isUploading}
            onClick={() => {
              setError(null)
              closeCropper()
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Photo (optional)</p>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-input p-4',
          isDragging && 'border-primary bg-accent',
        )}
      >
        <UserAvatar name={name || '?'} src={value} />
        <div className="min-w-40 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon aria-hidden />
              {value ? 'Change photo' : 'Upload photo'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            JPG, PNG or WebP up to 5 MB. You can also drag it here.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose a photo"
          tabIndex={-1}
          className="sr-only"
          onChange={handleInput}
        />
      </div>
      {error && <FormAlert message={error} />}
    </div>
  )
}
