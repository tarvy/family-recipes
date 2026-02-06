# PR-037: Media Capture (Camera & Microphone) - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-02-06
> **Branch**: `claude/add-media-capture-RJ4z8`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Completed 2026-02-06 |
| Design | [x] Draft [ ] Review [ ] Approved | Completed 2026-02-06 |
| Implementation | [ ] Not Started [x] In Progress [ ] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

From `scripts/deliverables.yaml`:

- [ ] `src/lib/media/use-media-stream.ts` - getUserMedia hook
- [ ] `src/components/media/camera-capture.tsx` - Camera viewfinder + capture
- [ ] `src/components/media/audio-recorder.tsx` - Audio recording UI
- [ ] `src/components/media/media-capture-section.tsx` - Container component
- [ ] `src/components/media/permission-prompt.tsx` - Permission guidance
- [ ] `src/app/api/photos/upload/route.ts` - Photo upload endpoint

---

## Implementation Phases

### Phase 1: Core Media Hook + Camera Capture

**Dependencies**: None

**Deliverables**:
- [ ] `src/lib/media/use-media-stream.ts`
- [ ] `src/components/media/camera-capture.tsx`
- [ ] `src/components/media/permission-prompt.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-037/design.md for component specs
- Reference: src/components/pwa/pwa-provider.tsx for hook patterns
- Reference: src/components/cooking-session/ for context patterns

Task:
1. Create useMediaStream hook that wraps getUserMedia
   - Accept constraints (video/audio)
   - Return stream, error, permission state
   - Handle cleanup (stop tracks on unmount)
   - Handle camera switching (facingMode)
2. Create CameraCapture component
   - Modal overlay with live video preview
   - Capture button → canvas drawImage → JPEG blob
   - Preview mode with Retake/Use Photo buttons
   - Camera switch button (front/rear)
3. Create PermissionPrompt component
   - Shows when permission is denied
   - Displays browser-specific instructions

Verification:
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] Camera opens in dev mode
```

---

### Phase 2: Audio Recorder

**Dependencies**: Phase 1 (uses useMediaStream hook)

**Deliverables**:
- [ ] `src/components/media/audio-recorder.tsx`

**Agent Prompt**:
```
Context:
- Read: src/lib/media/use-media-stream.ts (from Phase 1)
- Reference: work/PR-037/design.md

Task:
1. Create AudioRecorder component
   - Uses useMediaStream with audio constraints
   - MediaRecorder API for recording
   - Recording indicator with elapsed time
   - Stop → playback preview
   - Save/discard controls

Verification:
- [ ] npm run lint passes
- [ ] npm run typecheck passes
```

---

### Phase 3: Photo Upload API + Integration

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/app/api/photos/upload/route.ts`
- [ ] `src/components/media/media-capture-section.tsx`

**Agent Prompt**:
```
Context:
- Read: src/app/api/recipes/[slug]/route.ts for API patterns
- Read: src/db/models/recipe.model.ts for schema
- Read: src/lib/auth/session.ts for auth patterns

Task:
1. Install @vercel/blob package
2. Create POST /api/photos/upload endpoint
   - Auth required
   - Accept multipart/form-data (file + recipeId)
   - Validate file type and size
   - Upload to Vercel Blob
   - Update Recipe.photoUrls in MongoDB
   - Return blob URL
3. Create MediaCaptureSection container
   - Wraps CameraCapture and AudioRecorder
   - Handles upload flow after capture
   - Shows on recipe detail page

Verification:
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] Photo upload works end-to-end
```

---

## Session Log

### Session 1 - 2026-02-06

**Agent**: Claude Code
**Completed**:
- [x] Read AGENTS.md and CLAUDE.md
- [x] Explored codebase (PWA patterns, components, DB schema)
- [x] Analyzed W3C Media Capture spec
- [x] Created work/PR-037/ tracking documents
- [ ] Implementation in progress

**Issues Encountered**:
- None

**Next Steps**:
- [ ] Add deliverables to scripts/deliverables.yaml
- [ ] Implement Phase 1: Core hook + camera capture
- [ ] Implement Phase 2: Audio recorder
- [ ] Implement Phase 3: Upload API + integration

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-037/` directory
- [ ] Update permanent docs (`docs/*.md`) with any new information
- [ ] Remove any debug code or test data
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
