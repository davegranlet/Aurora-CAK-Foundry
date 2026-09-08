**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry

Aurora CAK Foundry is the standalone WWE 2K25 and WWE 2K26 `.cak` extractor, rebuilder, baker, and validator from Aurora Forge.

## Release identity

- Public release: **v1.7.8**
- Runtime version: **1.7.8**
- Status: **Ready** for WWE 2K25 v1.23 catalog/name recovery, extraction, identity-preserving protected rebuild, verified archive mount acceptance, and one protected v9.3 changed-content visual replacement. Other asset classes, multi-archive collisions, and existing WWE 2K26 labels remain unchanged or **Experimental**.

Each public artifact keeps its own name, version, checksum, notes, bug report, and fix report. An older package is never silently replaced by a newer build.

## What it does

- Opens WWE 2K25 FDIR v9.3 and WWE 2K26 FDIR v9.9 CAK archives read-only.
- Extracts selected files or all game CAKs into one merged folder representing game `/root`.
- Uses the included catalog to recover known paths and filenames.
- Records unresolved identities honestly instead of inventing names.
- Rebuilds an extracted mod folder into a protected game-ready CAK.
- Reopens and byte-checks rebuilt payloads.

No WWE archives, Oodle DLLs, extracted game assets, or personal paths are included. The program uses the Oodle library from the user's own game installation when required.

See [v1.7.8 release notes](docs/CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md), [bug report](docs/AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md), and [fix report](docs/AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md).

The WWE 2K25 FDIR 9.3 compatibility layer uses Nenkai's MIT-licensed Bakery/CakeTool source with its copyright, license, upstream README, and integration notice preserved. Aurora does not present that third-party work as original Aurora code.

## Source layout note

This repository begins from the exact runtime source used by the completed standalone release. Some shared Aurora Forge Electron services remain present because the released entrypoint imports the shared runtime. Removing that coupling is tracked cleanup work; it is not being hidden behind an unverified rewrite.
