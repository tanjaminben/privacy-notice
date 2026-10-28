# Anatomy of a Privacy Notice

Compare two versions of a fictional privacy notice and explore why each section belongs there.

<p>
<a href="https://ben-tan.com/guides/privacy-notice/"><img src="docs/images/buttons/privacy-notice.svg" height="50" alt="Open the guide"></a>&nbsp;
<a href="https://ko-fi.com/itsbent"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/images/buttons/kofi-static.svg"><img src="docs/images/buttons/kofi.svg" height="50" alt="Throw money at me"></picture></a>&nbsp;
</p>

[![privacy-notice illustrated repository banner.](docs/images/banner.png)](docs/images/banner.png)

*[Open at ben-tan.com](https://ben-tan.com/guides/privacy-notice/).*

## What it does

Switch between a detailed newspaper and a plain-language weekly grocery circular. Both editions preserve the same 58 approved facts across 15 topics. Each section keeps its explanation, conditional legal requirement, worked example, drafting advice, and named primary sources visible. A contents list provides direct section links.

The fictional Example Studio notice is teaching material. It is not this website's privacy policy or an adopted compliance template.

## Run locally

Use Node.js 22 or newer. No dependency installation is required. This source snapshot omits runtime images and artwork masters. `npm run verify` checks the included source, unchanged paired facts, and teaching mappings without those images. A complete visual build requires the exact external media listed in `ASSET-REQUIREMENTS.json`. New grocery illustrations use objects and settings without humans; the newspaper keeps its existing artwork.

```sh
npm run build
npm run preview
```

Open [the plain-language edition](http://127.0.0.1:8920/guides/privacy-notice/?edition=plain), or use `edition=full` for the newspaper. `PORT` selects another preview port. Links to other website pages lead to their public destinations. Without JavaScript, the newspaper, all lessons, and complete plain wording remain available.

To keep media outside the source checkout, supply the manifest files beneath another directory, preserving each `site/...` path, then use:

```sh
npm run build -- --output-root /absolute/path/to/local-preview
npm run verify:build -- --output-root /absolute/path/to/local-preview
npm run preview -- --output-root /absolute/path/to/local-preview
```

The build copies included shared dependencies into that output and renders the guide. Artwork masters and review receipts belong outside the generated `site/` directory. The output is a local review candidate with `noindex,nofollow`; building does not authorize publication.

## Build and check

```sh
npm run verify
# After supplying the external runtime images:
npm run build
npm run verify:build
```

`packages/privacy-notice/` contains the paired facts, educational guidance, scoped styling, and builder. `site/guides/privacy-notice/` receives the generated page; runtime artwork must be supplied separately. Shared styles, fonts, vendor scripts, and license texts are included as preview dependencies. The external-media manifest lists only active runtime icons and images, excluding private masters. Build verification checks all 58 facts in both editions, all 15 visible lessons, the no-script fallback, named source links, section targets, and local references. Browser and literal visual review remain separate checks.

## Limitations

Legal examples use the EU GDPR, with UK and US rules where labeled. Primary sources were checked for this teaching revision on October 27, 2026. The government-hosted EU text is distinct from the separately labeled current UK Article 13. Fictional retention periods and the example's 18+ audience choice are illustrative. Check the underlying law and circumstances before relying on an example. Structural checks do not establish legal compliance.

## License and credits

Authored content and artwork retain their existing rights; no blanket reuse license is granted. Preserve the original artwork, attribution, and [third-party notices](THIRD-PARTY-NOTICES.md), including the bundled font and icon licenses.

---

Made by [Ben Tan](https://ben-tan.com). [Report a security issue](SECURITY.md).
