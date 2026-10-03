/**
 * Shared types used across the @fiduswriter/editor package.
 *
 * These types describe the public shape of the Editor instance and the
 * auxiliary objects attached to it. They are intentionally permissive for
 * module-specific sub-objects (`mod.*`) while the individual modules are
 * being converted to TypeScript.
 */
export const COMMENT_ONLY_ROLES = ["review", "comment"];
export const READ_ONLY_ROLES = ["read", "read-without-comments"];
export const REVIEW_ROLES = ["review", "review-tracked"];
export const WRITE_ROLES = [
    "write",
    "write-tracked",
    "review-tracked"
];
//# sourceMappingURL=types.js.map