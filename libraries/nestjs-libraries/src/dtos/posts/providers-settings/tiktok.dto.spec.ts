import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';

const base = {
  content_posting_method: 'DIRECT_POST',
  privacy_level: 'FOLLOWER_OF_CREATOR',
  duet: false,
  stitch: false,
  comment: false,
  autoAddMusic: 'no',
  brand_content_toggle: false,
  brand_organic_toggle: false,
};

// same call as PostsService.validatePosts
const errorsOf = async (settings: any) => {
  const errors = await validate(
    plainToInstance(TikTokDto, settings, {
      enableImplicitConversion: false,
    }) as object,
    { skipMissingProperties: false }
  );
  return errors.flatMap((e) => Object.values(e.constraints || {}));
};

describe('TikTokDto', () => {
  it('accepts valid Direct Post settings', async () => {
    expect(await errorsOf(base)).toEqual([]);
  });

  it('requires a privacy level for Direct Post (no default)', async () => {
    expect(await errorsOf({ ...base, privacy_level: '' })).toContain(
      'Choose who can see this post'
    );
    const { privacy_level, ...noPrivacy } = base;
    expect(await errorsOf(noPrivacy)).toContain('Choose who can see this post');
  });

  it('does not require privacy for UPLOAD (inbox)', async () => {
    const { privacy_level, ...noPrivacy } = base;
    expect(
      await errorsOf({ ...noPrivacy, content_posting_method: 'UPLOAD' })
    ).toEqual([]);
  });

  it('rejects private branded content', async () => {
    expect(
      await errorsOf({
        ...base,
        privacy_level: 'SELF_ONLY',
        disclose: true,
        brand_content_toggle: true,
      })
    ).toContain(
      'Branded content visibility cannot be set to private ("Only me")'
    );
  });

  it('rejects disclosure without a choice', async () => {
    expect(await errorsOf({ ...base, disclose: true })).toContain(
      'You need to indicate if your content promotes yourself, a third party, or both'
    );
  });

  it('rejects a video longer than the account allows', async () => {
    expect(
      await errorsOf({
        ...base,
        video_duration_sec: 75,
        max_video_post_duration_sec: 60,
      })
    ).toContain('This video is longer than this TikTok account allows');
    expect(
      await errorsOf({
        ...base,
        video_duration_sec: 45,
        max_video_post_duration_sec: 60,
      })
    ).toEqual([]);
  });
});
