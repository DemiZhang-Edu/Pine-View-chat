# Security Specification: LiveFire Chat

## Data Invariants
1. A message cannot be created without a valid sender UID that matches the authenticated user.
2. The `createdAt` field must be the server timestamp.
3. Users can only modify their own profiles.
4. Messages are immutable once created (except for admins, if implemented).
5. No one can delete messages (except for admins).

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Create message with `senderId` different from authenticated user.
2. **Timestamp Manipulation**: Create message with a client-side date instead of server timestamp.
3. **Shadow Update**: Add `isAdmin: true` to a message update.
4. **ID Poisoning**: Use a document ID longer than 128 characters or with invalid characters.
5. **PII Leak**: A non-owner attempting to read `users/{userId}` where private info is stored.
6. **Malicious Content**: Text field exceeded size limit (e.g., > 10,000 characters).
7. **Type Mismatch**: `text` field sent as a boolean or number.
8. **Orphaned Writes**: Creating a message with a non-existent user reference (though we'll keep it simple for now).
9. **State Shortcut**: Updating a message `text` (immutability check).
10. **Bulk Delete**: Attempting to delete the entire collection.
11. **Resource Exhaustion**: Sending a massive array in a message (if arrays were allowed).
12. **Unverified Write**: Writing a message without a verified email (if strict verification is enforced).

## Test Runner (Logic Outline)
The logic in `firestore.rules` will be tested against these cases by ensuring `PERMISSION_DENIED` is returned.
* `messages/msg1`: `create` where `request.auth.uid != request.resource.data.senderId` -> DENY
* `messages/msg1`: `update` -> DENY
* `users/user1`: `update` where `request.auth.uid != userId` -> DENY
