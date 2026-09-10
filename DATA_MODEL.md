# Data Model

This document describes the current alpha data model and the canonical source of translation data.

## Canonical Source

The canonical source for a project's translation tree is the separate `Key` collection.

`Project.keys` is not part of the persisted project model. If old database documents still contain an embedded `keys` field, it should be treated as a legacy artifact and ignored by the application.

Current ownership split:

- `Project` stores project metadata, lifecycle status, project languages, and project tag definitions.
- `Key` stores the project tree: folders, components, and translation keys.
- `KeyValue` stores translated values for keys and languages.
- `RawLanguage` stores the global language catalog.
- `User` stores account settings and preferences.
- `Session` stores server-side session data.
- `Token` stores password reset and email verification tokens.

## Project

Collection model: `Project`

Fields:

- `userId`: owner id.
- `projectId`: public project id used by the app.
- `projectName`: project display name.
- `status`: `active` or `deleted`.
- `deletedAt`: soft-delete timestamp.
- `deletedBy`: user id that deleted the project.
- `languages`: embedded project-specific language settings.
- `tags`: embedded project tag definitions.

Notes:

- Deleted projects are hidden from normal project queries through `deletedAt: null`.
- Project deletion is soft-delete. Physical cleanup should be handled by a later hard-delete lifecycle.
- The project does not persist embedded keys.
- Operations that read or mutate `Key` and `KeyValue` must first verify that the owning project is active.

## Key

Collection model: `Key`

Fields:

- `userId`: owner id.
- `projectId`: parent project id.
- `id`: app-level key/entity id.
- `parentId`: parent entity id, or the project id for root-level entities.
- `label`: key, folder, or component label.
- `description`: optional key description.
- `type`: entity type: `string`, `folder`, or `component`.
- `pathCache`: cached tree path used by move, duplicate, delete, import, and export operations.
- `createdAt`: creation timestamp.
- `updatedAt`: update timestamp.
- `tags`: references to project tag ids.

Notes:

- Tree operations must update both `parentId` and `pathCache` consistently.
- Cross-project and cross-user operations must always filter by `userId` and `projectId`.
- Multi-entity tree operations must fail if any requested root entity id is missing.
- Move operations must reject moves into the entity itself or into one of its descendants.
- Descendant matching must treat entity ids as `pathCache` segments, not arbitrary substrings.

## KeyValue

Collection model: `KeyValue`

Fields:

- `userId`: owner id.
- `projectId`: parent project id.
- `id`: app-level value id.
- `keyId`: parent key/entity id.
- `parentId`: parent entity id.
- `languageId`: project language id.
- `value`: translated text.
- `pathCache`: cached tree path aligned with the parent key.
- `createdAt`: creation timestamp.

Notes:

- `KeyValue` documents belong to keys through `keyId`.
- Removing a language from a project preserves existing `KeyValue` documents as dormant data.
- Normal read, search, and export operations filter values by current `Project.languages`.
- Project soft delete currently hides the project but does not physically delete related keys and values.

## Project Lifecycle

Project deletion is currently a soft delete:

- `Project.status` is set to `deleted`.
- `Project.deletedAt` is set to the deletion timestamp.
- `Project.deletedBy` is set to the deleting user id.
- Related `Key` and `KeyValue` documents are not physically deleted.

Active project access rules:

- Project list and project detail queries use `deletedAt: null`.
- Key and value operations must call the active project check before direct `Key` or `KeyValue` access.
- Search must also verify that the project is active before reading key/value collections.
- Export and import verify the active project before touching project data.

Future hard-delete lifecycle:

- A scheduled cleanup can physically remove `Key` and `KeyValue` documents after a retention period.
- A future trash view can list projects with `deletedAt` set before hard-delete runs.
- Restore behavior should clear `status`, `deletedAt`, and `deletedBy` without needing to recreate keys or values.

## Tree Lifecycle

Tree operations use `Key` as the canonical structure and `KeyValue` as attached translation values.

Delete behavior:

- Deleting entities requires every requested root entity id to exist.
- Child keys are selected by full `pathCache` segments.
- Child values are selected by full `pathCache` segments.
- Root entities are deleted by `id`.

Duplicate behavior:

- Duplicating entities requires every requested root entity id to exist.
- Root ids, child ids, and value ids are regenerated.
- Parent references and path caches are remapped to the cloned ids.

Move behavior:

- Moving entities requires every requested root entity id to exist.
- The destination must exist unless moving to the project root.
- Moving an entity into itself or into its descendant is rejected.
- Root entity `parentId` and `pathCache` are updated.
- Descendant key and value `pathCache` fields are remapped.

## Languages

`RawLanguage` is the global language catalog.

`Project.languages` stores per-project language settings:

- `id`
- `label`
- `code`
- `baseLanguage`
- `visible`
- `customCodeEnabled`
- `customLabelEnabled`
- `customCode`
- `customLabel`

Language lifecycle:

- Adding and editing languages require an active project.
- Deleting a language requires that the language exists in the project.
- Deleting a language removes it from `Project.languages`.
- Existing `KeyValue` documents for the removed language are preserved as dormant data.
- Normal read, search, and export paths filter values by current `Project.languages`.
- Future cleanup or restore behavior for dormant language values should be explicit.

## Tags

`Project.tags` stores tag definitions for a project.

`Key.tags` stores lightweight references to tag ids:

- `id`

Rules:

- Tag creation, deletion, and editing are scoped by `userId` and `projectId`.
- Deleting a tag removes tag references from matching keys.
- Keys should not contain tag ids that do not exist in the owning project.
- Assigning, detaching, or creating tags for entities must fail if any requested entity id is missing.

Tag lifecycle:

- Creating a tag through entity tagging creates the project tag definition if needed.
- Assigning a tag requires the tag to exist in the same active project.
- Detaching a tag requires the tag to exist in the same active project.
- Updating a tag requires the tag to exist in the same active project.
- Deleting a tag removes the tag definition and cleans references from keys in that project.

## Known Follow-Ups

- Decide hard-delete retention period and cleanup job mechanics for soft-deleted projects.
- Decide whether dormant language values should support explicit restore or scheduled cleanup later.
- Tighten internal tree and aggregated value types.

## Indexes

Current indexes are intentionally scoped by `userId` and `projectId` for user-owned data.

`Project`:

- `{ userId: 1, deletedAt: 1 }`: active/deleted project lists.
- `{ userId: 1, projectId: 1, deletedAt: 1 }`: project lookup with ownership and soft-delete filtering.

`Key`:

- `{ userId: 1, projectId: 1, parentId: 1, type: 1 }`: editor tree lists, type filters, child lookups.
- `{ userId: 1, projectId: 1, id: 1 }`: direct key/entity lookup and updates.
- `{ userId: 1, projectId: 1, pathCache: 1 }`: tree move, duplicate, delete descendants, export traversal.
- `{ userId: 1, projectId: 1, "tags.id": 1 }`: tag filters and tag cleanup.
- `{ userId: 1, projectId: 1, label: 1 }`: label search and sorting support.

`KeyValue`:

- `{ userId: 1, projectId: 1, keyId: 1 }`: value lookup by key.
- `{ userId: 1, projectId: 1, parentId: 1 }`: aggregated values by parent.
- `{ userId: 1, projectId: 1, languageId: 1 }`: language-scoped value checks and future cleanup.
- `{ userId: 1, projectId: 1, pathCache: 1 }`: descendant value operations.
- `{ userId: 1, projectId: 1, value: 1 }`: value search support.

`RawLanguage`:

- `{ id: 1 }`: lookup by language ids.
- `{ code: 1 }`: import lookup by language code.

Notes:

- Indexes are not marked as unique yet. Existing alpha data may contain duplicates, so uniqueness should be added only after an audit/migration.
- Regex search without anchored prefixes may not fully benefit from normal B-tree indexes. If search becomes a bottleneck, consider text indexes or a dedicated search path later.
