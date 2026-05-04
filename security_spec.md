# Security Specification - University Hub

## Data Invariants
- Every `suggestion`, `notice`, `lecture`, and `note` must have a valid `createdAt` timestamp.
- A `suggestion` status can only be transitioned by an `admin`.
- A user's `role` can only be set or changed by an `admin`.
- Notifications are private to the `userId` field.

## The Dirty Dozen Payloads (Target: Access Denied)
1. **Role Escalation**: Student attempting to update their own role to 'admin'.
2. **Shadow Field injection**: Adding `isVerified: true` to a Suggestion.
3. **Impersonation**: Creating a Suggestion with `createdBy` set to another user's UID.
4. **ID Poisoning**: Using a 2KB string as a `suggestionId`.
5. **Unauthorized Approval**: Student attempting to change a Suggestion status from 'pending' to 'approved'.
6. **Notification Snooping**: User A attempting to read User B's notifications.
7. **System Field Tampering**: Overwriting `createdAt` with a past date (instead of server timestamp).
8. **Blanket Delete**: Student attempting to delete a Notice.
9. **Spam Creation**: Creating a Suggestion with a 1MB `content` field.
10. **Data Corruption**: Setting a Lecture's `week` to a negative number or a string.
11. **Orphaned Writes**: Creating a Suggestion after membership revocation (though membership is simpler here, let's say after account deactivation).
12. **Cross-Tenant Leak**: Not applicable here as single tenant, but attempting to access non-existent global docs.

## Test Runner (Logic Check)
The `firestore.rules` will be verified against these scenarios.
