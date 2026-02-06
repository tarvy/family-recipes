# PR-037: Media Capture (Camera & Microphone) - Requirements

> **Status**: Draft
> **PR Branch**: `claude/add-media-capture-RJ4z8`
> **Dependencies**: None

---

## Problem Statement

The family recipe app stores recipe photos in MongoDB (`primaryPhotoUrl`, `photoUrls`) and plans to use Vercel Blob for storage, but has no way for users to capture or upload photos. Users cooking from recipes often want to photograph their dishes, capture the state of their cooking, or record short audio notes. Currently there is no media capture capability, forcing users to take photos externally and losing the connection to the recipe context.

This PR adds camera and microphone access via the W3C Media Capture and Streams API (`getUserMedia`), enabling users to take photos directly within the app and associate them with recipes.

**Reference**: [W3C Media Capture and Streams Spec](https://www.w3.org/TR/mediacapture-streams/)

---

## User Stories

### Story 1: Take a Photo of a Dish

**As a** home cook
**I want** to take a photo using my device camera from within the recipe page
**So that** I can capture my cooking results without leaving the app

#### Acceptance Criteria

```gherkin
Feature: Camera photo capture

  Scenario: Open camera from recipe page
    Given I am viewing a recipe detail page
    When I tap the "Take Photo" button
    Then the camera viewfinder opens in a modal overlay
    And I see a live camera preview
    And I can switch between front and rear cameras (if available)

  Scenario: Capture a photo
    Given the camera viewfinder is open
    When I tap the capture button
    Then a still image is captured from the video stream
    And I see a preview of the captured image
    And I have options to "Retake" or "Use Photo"

  Scenario: Save captured photo
    Given I have captured a photo and see the preview
    When I tap "Use Photo"
    Then the photo is uploaded to Vercel Blob storage
    And the photo URL is associated with the current recipe
    And a success confirmation appears

  Scenario: Retake photo
    Given I have captured a photo and see the preview
    When I tap "Retake"
    Then the preview is dismissed
    And the live camera viewfinder resumes
```

### Story 2: Grant Camera & Microphone Permissions

**As a** user
**I want** clear permission prompts when the app needs camera or microphone access
**So that** I understand why the app needs access and feel in control

#### Acceptance Criteria

```gherkin
Feature: Media permission handling

  Scenario: First-time camera access
    Given I have never granted camera permission
    When I tap "Take Photo"
    Then the browser permission prompt appears
    And the app shows a helpful message about why camera access is needed

  Scenario: Permission denied
    Given I have denied camera permission
    When I tap "Take Photo"
    Then I see a message explaining that camera access is required
    And I see instructions for how to re-enable permissions in browser settings

  Scenario: Permission previously granted
    Given I have previously granted camera permission
    When I tap "Take Photo"
    Then the camera opens immediately without a permission prompt
```

### Story 3: Microphone Access for Audio Notes

**As a** home cook
**I want** to record a short audio note while cooking
**So that** I can capture verbal tips or modifications hands-free

#### Acceptance Criteria

```gherkin
Feature: Microphone audio recording

  Scenario: Record audio note
    Given I am viewing a recipe detail page
    When I tap the "Record Note" button
    And I grant microphone permission (if not already granted)
    Then audio recording begins
    And I see a recording indicator with elapsed time

  Scenario: Stop and save recording
    Given I am recording an audio note
    When I tap the stop button
    Then the recording stops
    And I can play back the recording
    And I can save or discard it
```

---

## Out of Scope

- Video recording (only still photos and audio notes)
- Photo editing or filters
- Photo gallery management (bulk delete, reorder)
- Cloud-based photo sync across devices
- AI-powered photo recognition or tagging
- Offline photo queueing (photos require network to upload)
- Integration with native device photo library/file picker

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Camera opens successfully | >95% on supported browsers | Future analytics |
| Photo capture-to-save rate | >70% of opened cameras result in saved photos | Future analytics |
| Permission grant rate | >80% of prompted users grant permission | Future analytics |

---

## Open Questions

- [x] Where should the camera button appear? → Recipe detail page, near the photo area
- [x] What image format for captured photos? → JPEG (good compression, universal support)
- [ ] Should audio notes be stored as Vercel Blobs alongside photos?
- [ ] Maximum photo resolution / file size limit?

---

## References

- [W3C Media Capture and Streams API](https://www.w3.org/TR/mediacapture-streams/)
- `src/db/models/recipe.model.ts` - Recipe model with `primaryPhotoUrl` and `photoUrls` fields
- `src/components/pwa/pwa-provider.tsx` - PWA context pattern reference
- `src/components/cooking-session/` - Context provider pattern reference
- `.env.example` - `BLOB_READ_WRITE_TOKEN` for Vercel Blob
