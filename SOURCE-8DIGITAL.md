# 8 Digital Publisher: source code (AGPL-3.0)

This repository is the complete corresponding source of **8 Digital Publisher**, the content calendar that 8 Digital Marketing Inc. runs at social.8-digitalmarketing.com. It is published to meet the GNU Affero General Public License v3.0, section 13.

## Upstream credit
8 Digital Publisher is a modified version of **Postiz** by Gitroom (https://github.com/gitroomhq/postiz-app), licensed AGPL-3.0. All upstream copyright and licence notices are kept unchanged; see `LICENSE`. Thank you to the Postiz maintainers and contributors.

- Based on upstream `main` at commit `651876e2` (version v1.47.0, 2026-10-20).
- Our changes are in the commits after `651876e2` on `main`.

## What we changed
TikTok Direct Post now follows TikTok's Content Sharing Guidelines:
- reads `creator_info` whenever the TikTok post panel opens and shows "Posting to: nickname (@username)";
- privacy has no default and lists only the options TikTok returns; a Direct Post without a privacy choice is rejected;
- Comment, Duet and Stitch start unticked and are locked when the creator has disabled them (the shared `Checkbox` now honours `disabled`);
- checks the video length against `max_video_post_duration_sec`;
- always shows the Music Usage Confirmation; commercial-content disclosure needs a choice, shows "Promotional content" / "Paid partnership", and branded content cannot be private;
- re-checks every rule against a fresh `creator_info` right before publishing;
- shows "it may take a few minutes" after posting;
- requests only `user.info.basic`, `user.info.profile`, `video.publish`, `video.list` by default (`TIKTOK_SCOPES` env var overrides);
- unit tests: `pnpm test:unit` (vitest).

Files: `libraries/helpers/src/utils/tiktok.compliance.ts`, `libraries/nestjs-libraries/src/dtos/posts/providers-settings/tiktok.dto.ts`, `libraries/nestjs-libraries/src/integrations/social/tiktok.provider.ts`, `apps/frontend/src/components/new-launch/providers/tiktok/tiktok.provider.tsx`, `apps/frontend/src/components/new-launch/manage.modal.tsx`, `libraries/react-shared-libraries/src/form/checkbox.tsx`, plus the `*.spec.ts` tests.

## Build
Same as upstream: `docker build -f Dockerfile.dev -t postiz-8digital .` See the upstream docs at https://docs.postiz.com for configuration.

## Licence
GNU Affero General Public License v3.0 (`LICENSE`). No warranty. Contact: hello@8-digitalmarketing.com.
