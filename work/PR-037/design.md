# PR-037: Media Capture (Camera & Microphone) - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-06
> **Author**: Claude Code

---

## Overview

Add media capture capabilities using the W3C MediaStream API (`getUserMedia`). A React hook (`useMediaStream`) encapsulates stream lifecycle management. A `CameraCapture` component provides the viewfinder UI. An `AudioRecorder` component handles microphone recording. A new API route handles photo uploads to Vercel Blob storage.

---

## Architecture

### System Context

```
User Device (Camera/Mic)
        │
        ▼
  getUserMedia() ──► MediaStream
        │
        ▼
  CameraCapture / AudioRecorder Components
        │
        ▼ (Blob data)
  POST /api/photos/upload
        │
        ▼
  Vercel Blob Storage ──► URL stored in Recipe (MongoDB)
```

### Component Design

```
RecipeDetailPage
├── RecipeDetailClient
│   ├── ... (existing components)
│   └── MediaCaptureSection
│       ├── CameraCapture (modal overlay)
│       │   ├── useMediaStream (hook - camera)
│       │   ├── Video preview (live viewfinder)
│       │   ├── Canvas (hidden, for still capture)
│       │   └── Photo preview + controls
│       └── AudioRecorder
│           ├── useMediaStream (hook - microphone)
│           ├── MediaRecorder API
│           └── Playback + controls
```

### Data Flow

```
1. User taps "Take Photo"
2. useMediaStream requests getUserMedia({ video: { facingMode: 'environment' } })
3. Browser prompts for permission (if not granted)
4. MediaStream feeds into <video> element (live preview)
5. User taps capture → canvas.drawImage(video) → canvas.toBlob('image/jpeg')
6. Preview shown → User confirms "Use Photo"
7. POST /api/photos/upload (multipart/form-data with recipeId)
8. Server uploads to Vercel Blob, updates Recipe.photoUrls in MongoDB
9. Response returns blob URL → UI updates
```

---

## Database Changes

### Schema Modifications

No new collections. Uses existing fields on Recipe model:

| Collection | Field | Change | Migration Required |
|------------|-------|--------|-------------------|
| recipes | `primaryPhotoUrl` | Already exists (String) | No |
| recipes | `photoUrls` | Already exists ([String]) | No |

---

## API Design

### Endpoints

#### `POST /api/photos/upload`

**Purpose**: Upload a captured photo to Vercel Blob and associate with a recipe.

**Request**: `multipart/form-data`
```typescript
interface PhotoUploadRequest {
  file: File;        // JPEG blob from canvas
  recipeId: string;  // Recipe to associate with
}
```

**Response**:
```typescript
interface PhotoUploadResponse {
  url: string;       // Vercel Blob URL
  recipeId: string;
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | MISSING_FILE | No file provided in request |
| 400 | INVALID_TYPE | File is not an image |
| 401 | UNAUTHORIZED | User not authenticated |
| 404 | RECIPE_NOT_FOUND | Recipe ID doesn't exist |
| 413 | FILE_TOO_LARGE | File exceeds size limit (10MB) |

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `useMediaStream` | `src/lib/media/use-media-stream.ts` | Hook for getUserMedia lifecycle |
| `CameraCapture` | `src/components/media/camera-capture.tsx` | Camera viewfinder + photo capture modal |
| `AudioRecorder` | `src/components/media/audio-recorder.tsx` | Microphone recording UI |
| `MediaCaptureSection` | `src/components/media/media-capture-section.tsx` | Container for camera + audio on recipe pages |
| `PermissionPrompt` | `src/components/media/permission-prompt.tsx` | Permission state display and guidance |

### State Management

- `useMediaStream` hook manages MediaStream lifecycle (open, close, error states)
- Local component state for capture preview, recording state
- No global context needed — media capture is page-scoped

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── photos/
│           └── upload/
│               └── route.ts          # Photo upload endpoint
├── components/
│   └── media/
│       ├── camera-capture.tsx        # Camera viewfinder + capture
│       ├── audio-recorder.tsx        # Audio recording UI
│       ├── media-capture-section.tsx  # Container component
│       └── permission-prompt.tsx     # Permission guidance UI
└── lib/
    └── media/
        └── use-media-stream.ts       # getUserMedia hook
```

---

## Dependencies

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@vercel/blob` | ^0.27.0 | Blob storage for uploaded photos |

### Internal Dependencies

- Uses: `src/lib/logger.ts` for logging
- Uses: `src/lib/telemetry.ts` for tracing
- Uses: `src/lib/auth/session.ts` for auth verification
- Uses: `src/db/models/recipe.model.ts` for updating recipe photos

---

## Security Considerations

- [x] Input validation: file type, size limits enforced server-side
- [x] Authentication required: upload endpoint requires valid session
- [x] Authorization: user must own or have access to the recipe
- [x] No sensitive data in logs: only log file metadata, not file contents
- [x] NoSQL injection prevented: Mongoose schema validation on recipeId

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Photo upload started | info | recipeId, fileSize, mimeType |
| Photo upload success | info | recipeId, blobUrl |
| Photo upload failed | error | recipeId, error message |
| Media permission denied | warn | mediaType (camera/microphone) |
| MediaStream error | error | error name, constraint details |

### Traces

| Span | Attributes |
|------|------------|
| `api.photos.upload` | recipeId, fileSize, duration |
| `blob.upload` | blobUrl, contentType |
| `db.recipe.updatePhotos` | recipeId, photoCount |

---

## Testing Strategy

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| Camera opens on mobile Chrome | Live preview shows | [ ] |
| Camera opens on desktop Chrome | Live preview shows | [ ] |
| Photo capture saves JPEG | Photo appears on recipe | [ ] |
| Permission denied shows guidance | Helpful message shown | [ ] |
| Audio recording captures audio | Playback works | [ ] |
| Camera stops when modal closes | No camera indicator | [ ] |
| Upload fails gracefully on network error | Error message shown | [ ] |

---

## Alternatives Considered

### Option A: File Input (`<input type="file" capture>`)
- **Pros**: Simpler, uses native OS camera app
- **Cons**: No in-app viewfinder, less control, inconsistent across browsers
- **Why rejected**: Doesn't provide the in-app camera experience requested

### Option B: getUserMedia + Custom UI (Selected)
- **Pros**: Full control over camera UX, in-app viewfinder, can switch cameras
- **Cons**: More code, browser compatibility considerations
- **Why selected**: Provides the integrated camera experience needed for a PWA cooking app

---

## Open Design Questions

- [x] Image capture method? → Canvas `drawImage` + `toBlob('image/jpeg', 0.85)`
- [ ] Audio format for recordings? → Likely `audio/webm` (MediaRecorder default)
