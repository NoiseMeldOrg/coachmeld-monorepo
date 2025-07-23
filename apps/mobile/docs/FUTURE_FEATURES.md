# Future Features

This document tracks features that have been considered or partially implemented but are not currently included in the app.

## Message Rephrase/Regenerate Feature

**Status:** Removed due to UI clutter concerns
**Date Considered:** June 2025

### Description
A "Rephrase" button that appears on the last coach message, allowing users to regenerate the AI response if they want a different or expanded answer.

### Implementation Details
- Button appeared below coach messages with a refresh icon
- Only shown on the most recent coach response
- Would delete the existing message and generate a new one
- Used the same user prompt to get a different AI response

### Why It Was Removed
- Added visual clutter to the chat interface
- Could be confusing for users (multiple responses to same question)
- Made the chat UI feel less clean and simple

### Potential Improvements for Future
1. **Context Menu**: Instead of a visible button, use long-press to show options
2. **Swipe Gesture**: Swipe left on a message to reveal action buttons
3. **Chat Header Action**: Add a "Retry last response" option in the chat header menu
4. **Limited Visibility**: Only show after a delay or on hover/focus
5. **User Preference**: Make it an optional feature users can enable in settings

### Code References
The feature was implemented in:
- `src/components/MessageBubble.tsx` - Added rephrase button UI
- `src/screens/ChatScreen.tsx` - Added `handleRegenerate` function
- Commit: Part of the enhanced chat experience PR

### Technical Considerations
- Need to handle typing indicator state properly
- Should consider message history when regenerating
- Could implement a limit on regeneration attempts
- Might want to show "Rephrased" indicator on regenerated messages

### Alternative Approaches
1. **Edit & Resend**: Allow users to edit their last message and resend
2. **Follow-up Prompts**: Suggest follow-up questions instead
3. **Feedback System**: Simple thumbs up/down on responses
4. **Alternative Responses**: Show multiple responses at once (carousel)

---

## Other Potential Features

### Conversation Branches
Allow users to explore different conversation paths without losing context.

### Message Search
Search through chat history to find specific information.

### Voice Input/Output
Integration with speech-to-text and text-to-speech for hands-free interaction.

### Export Formats
Additional export options like Markdown, PDF with formatting, or integration with note-taking apps.

### Smart Suggestions
Context-aware quick reply suggestions based on conversation flow.

### Offline Mode
Cache responses and allow limited functionality without internet connection.