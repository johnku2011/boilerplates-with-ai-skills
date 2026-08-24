# bwai Catalog

The bwai catalog is the curated set of project starters and agent resources that the CLI can validate, scan, package, and scaffold.

## Language

**Catalog Artifact**:
A boilerplate, skill, or workflow stored in the catalog.
_Avoid_: Catalog item, resource

**Catalog Snapshot**:
A complete in-memory description of discovered Catalog Artifacts and every diagnostic found while loading them. An invalid artifact remains represented rather than disappearing silently.
_Avoid_: Catalog scan, catalog index

**Catalog Diagnostic**:
A structured finding that identifies an invalid or suspicious relationship among Catalog Artifacts.
_Avoid_: Validation message, loader error

**Catalog Artifact Identity**:
The stable, scope-qualified identity of a Catalog Artifact. Boilerplates use `boilerplate:<name>`; Shared Skills use `shared:<skill-name>`; Local Skills use `boilerplate:<boilerplate-name>/skills/<skill-name>`; shared workflows use `shared:workflows/<name>`; local workflows use `boilerplate:<boilerplate-name>/workflow/<name>`.
_Avoid_: Label, path, short name

**Local Skill**:
A skill owned by one boilerplate and declared by that boilerplate's manifest. A local skill directory without its declaration is catalog drift.
_Avoid_: Boilerplate-specific skill, private skill

**Shared Skill**:
A catalog skill available for multiple boilerplates to declare. It remains valid when no boilerplate currently bundles it.
_Avoid_: Global skill, common skill
