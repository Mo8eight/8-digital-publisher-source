import { describe, expect, it } from 'vitest';
import {
  TIKTOK_DEFAULT_SCOPES,
  TikTokCreatorInfo,
  tiktokCommercialLabel,
  tiktokDirectPostIssues,
  tiktokScopes,
} from '@gitroom/helpers/utils/tiktok.compliance';

const creator: TikTokCreatorInfo = {
  creator_nickname: 'Test',
  privacy_level_options: ['FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
  comment_disabled: true,
  duet_disabled: true,
  stitch_disabled: false,
  max_video_post_duration_sec: 60,
};

const ok = {
  content_posting_method: 'DIRECT_POST',
  privacy_level: 'FOLLOWER_OF_CREATOR',
  comment: false,
  duet: false,
  stitch: false,
};

describe('tiktokDirectPostIssues', () => {
  it('passes a post that follows every rule', () => {
    expect(tiktokDirectPostIssues(ok, { creatorInfo: creator })).toEqual([]);
  });

  it('has no privacy default', () => {
    expect(
      tiktokDirectPostIssues(
        { ...ok, privacy_level: '' },
        { creatorInfo: creator }
      )
    ).toContain('privacy_required');
    expect(
      tiktokDirectPostIssues({ ...ok, privacy_level: undefined })
    ).toContain('privacy_required');
  });

  it('only allows the privacy options creator_info returned', () => {
    expect(
      tiktokDirectPostIssues(
        { ...ok, privacy_level: 'PUBLIC_TO_EVERYONE' },
        { creatorInfo: creator }
      )
    ).toEqual(['privacy_not_allowed']);
  });

  it('rejects interactions the creator turned off', () => {
    expect(
      tiktokDirectPostIssues(
        { ...ok, comment: true, duet: true, stitch: true },
        { creatorInfo: creator }
      )
    ).toEqual(['comment_disabled', 'duet_disabled']);
  });

  it('ignores duet/stitch on photo posts', () => {
    expect(
      tiktokDirectPostIssues(
        { ...ok, duet: true },
        { creatorInfo: creator, isPhoto: true }
      )
    ).toEqual([]);
  });

  it('branded content cannot be private', () => {
    expect(
      tiktokDirectPostIssues({
        ...ok,
        privacy_level: 'SELF_ONLY',
        disclose: true,
        brand_content_toggle: true,
      })
    ).toEqual(['branded_content_private']);
  });

  it('disclosure needs your brand and/or branded content', () => {
    expect(tiktokDirectPostIssues({ ...ok, disclose: true })).toEqual([
      'disclose_needs_choice',
    ]);
    expect(
      tiktokDirectPostIssues({
        ...ok,
        disclose: true,
        brand_organic_toggle: true,
      })
    ).toEqual([]);
  });

  it('checks the video length against max_video_post_duration_sec', () => {
    expect(
      tiktokDirectPostIssues(
        { ...ok, video_duration_sec: 61 },
        { creatorInfo: creator }
      )
    ).toEqual(['video_too_long']);
    expect(
      tiktokDirectPostIssues(
        { ...ok, video_duration_sec: 60 },
        { creatorInfo: creator }
      )
    ).toEqual([]);
    expect(
      tiktokDirectPostIssues(
        { ...ok, video_duration_sec: 61 },
        { creatorInfo: creator, isPhoto: true }
      )
    ).toEqual([]);
  });

  it('skips Direct Post rules in UPLOAD (inbox) mode', () => {
    expect(
      tiktokDirectPostIssues({ content_posting_method: 'UPLOAD' })
    ).toEqual([]);
  });
});

describe('tiktokCommercialLabel', () => {
  it('labels branded content as paid partnership', () => {
    expect(
      tiktokCommercialLabel({
        disclose: true,
        brand_organic_toggle: true,
        brand_content_toggle: true,
      })
    ).toBe('paid_partnership');
  });
  it('labels your brand only as promotional content', () => {
    expect(
      tiktokCommercialLabel({ disclose: true, brand_organic_toggle: true })
    ).toBe('promotional_content');
  });
  it('has no label without disclosure', () => {
    expect(tiktokCommercialLabel({ brand_content_toggle: true })).toBeNull();
  });
});

describe('tiktokScopes', () => {
  it('defaults to the trimmed set', () => {
    expect(tiktokScopes(undefined)).toEqual(TIKTOK_DEFAULT_SCOPES);
    expect(tiktokScopes('')).toEqual(TIKTOK_DEFAULT_SCOPES);
    expect(TIKTOK_DEFAULT_SCOPES).not.toContain('video.upload');
    expect(TIKTOK_DEFAULT_SCOPES).not.toContain('user.info.stats');
  });
  it('reads TIKTOK_SCOPES (comma or space separated)', () => {
    expect(
      tiktokScopes('user.info.basic, video.publish video.upload,video.upload')
    ).toEqual(['user.info.basic', 'video.publish', 'video.upload']);
  });
});
