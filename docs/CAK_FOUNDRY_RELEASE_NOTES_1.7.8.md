**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.8

This release completes the protected WWE 2K25 FDIR v9.3 rebuild path while preserving the existing WWE 2K26 path.

## What changed

- Builds WWE 2K25 archives with the filename-derived protected catalog expected by the game.
- Protects the header and declared catalog sections, scrambles catalog strings, and retains plaintext section checksums.
- Keeps exact filenames and paths during extraction and rebuild.
- Retains archive-wide selection, progress reporting, hidden non-payload references, collision reporting, and explicit WWE 2K25/WWE 2K26 profiles.

## Verification

- A complete 2,004-file `bakedfile80` extraction/rebuild/reopen cycle reproduced every payload byte-for-byte.
- The protected rebuilt archive contains 2,004 files and 1,137 folders and passed the independent validator.
- WWE 2K25 v1.23 returned success when Secure DataCtrlLink mounted the protected rebuilt archive.
- A deliberately changed visible asset has not yet been checked in-game, so content-override behavior remains **Experimental**.

No WWE files, Oodle library, extracted assets, or test archives are included.
