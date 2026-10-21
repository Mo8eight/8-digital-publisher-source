// TikTok Content Posting API - Direct Post UX rules
// (https://developers.tiktok.com/doc/content-sharing-guidelines).
// Shared by the post settings panel (frontend), the settings DTO and the
// TikTok provider (backend) so the same rule is enforced in every place a post
// can come from - the UI, the public API or the AI agent.

export const TIKTOK_PRIVACY_LEVELS = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
] as const;

export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];

// What creator_info/query returns, plus whether the app was granted
// video.upload (the "send to inbox" mode).
export interface TikTokCreatorInfo {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec?: number;
  upload_available?: boolean;
}

// Only what the Direct Post flow needs: who the account is (basic + profile
// for the @username used in post links), publishing, and reading back the
// creator's own posts (post links and per-post stats). video.upload (inbox
// drafts) and user.info.stats (follower counts) are opt-in via TIKTOK_SCOPES,
// because every scope requested must be justified and shown in the app review.
export const TIKTOK_DEFAULT_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'video.publish',
  'video.list',
];

export const tiktokScopes = (fromEnv?: string): string[] => {
  const list = (fromEnv || '')
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return list.length ? [...new Set(list)] : [...TIKTOK_DEFAULT_SCOPES];
};

export type TikTokUxIssue =
  | 'privacy_required'
  | 'privacy_not_allowed'
  | 'branded_content_private'
  | 'disclose_needs_choice'
  | 'comment_disabled'
  | 'duet_disabled'
  | 'stitch_disabled'
  | 'video_too_long';

export const TIKTOK_UX_MESSAGES: Record<TikTokUxIssue, string> = {
  privacy_required: 'Choose who can see this post',
  privacy_not_allowed:
    'This privacy option is not available for this TikTok account, choose another one',
  branded_content_private:
    'Branded content visibility cannot be set to private ("Only me")',
  disclose_needs_choice:
    'You need to indicate if your content promotes yourself, a third party, or both',
  comment_disabled: 'Comments are turned off for this TikTok account',
  duet_disabled: 'Duet is turned off for this TikTok account',
  stitch_disabled: 'Stitch is turned off for this TikTok account',
  video_too_long: 'This video is longer than this TikTok account allows',
};

export interface TikTokUxSettings {
  content_posting_method?: string;
  privacy_level?: string;
  comment?: boolean;
  duet?: boolean;
  stitch?: boolean;
  disclose?: boolean;
  brand_organic_toggle?: boolean;
  brand_content_toggle?: boolean;
  video_duration_sec?: number;
}

const bool = (value: unknown) => value === true || value === 'true';

// Every Direct Post rule the settings break. Without creatorInfo (DTO
// validation) only the rules that need no account data are checked; the
// provider runs it again with a fresh creator_info right before posting.
export const tiktokDirectPostIssues = (
  settings: TikTokUxSettings,
  context: {
    isPhoto?: boolean;
    creatorInfo?: TikTokCreatorInfo;
    maxVideoDurationSec?: number;
  } = {}
): TikTokUxIssue[] => {
  if (settings?.content_posting_method === 'UPLOAD') {
    return [];
  }

  const { isPhoto, creatorInfo } = context;
  const issues: TikTokUxIssue[] = [];
  const privacy = settings?.privacy_level;

  if (!privacy) {
    issues.push('privacy_required');
  } else if (
    creatorInfo?.privacy_level_options?.length &&
    !creatorInfo.privacy_level_options.includes(privacy)
  ) {
    issues.push('privacy_not_allowed');
  }

  if (bool(settings?.brand_content_toggle) && privacy === 'SELF_ONLY') {
    issues.push('branded_content_private');
  }

  if (
    bool(settings?.disclose) &&
    !bool(settings?.brand_organic_toggle) &&
    !bool(settings?.brand_content_toggle)
  ) {
    issues.push('disclose_needs_choice');
  }

  if (creatorInfo?.comment_disabled && bool(settings?.comment)) {
    issues.push('comment_disabled');
  }

  if (!isPhoto && creatorInfo?.duet_disabled && bool(settings?.duet)) {
    issues.push('duet_disabled');
  }

  if (!isPhoto && creatorInfo?.stitch_disabled && bool(settings?.stitch)) {
    issues.push('stitch_disabled');
  }

  const max =
    context.maxVideoDurationSec ?? creatorInfo?.max_video_post_duration_sec;
  const duration = Number(settings?.video_duration_sec);
  if (!isPhoto && max && duration > 0 && Math.ceil(duration) > max) {
    issues.push('video_too_long');
  }

  return issues;
};

// The label TikTok will put on the post once it's live.
export const tiktokCommercialLabel = (settings: TikTokUxSettings) => {
  if (!bool(settings?.disclose)) {
    return null;
  }
  if (bool(settings?.brand_content_toggle)) {
    return 'paid_partnership' as const;
  }
  if (bool(settings?.brand_organic_toggle)) {
    return 'promotional_content' as const;
  }
  return null;
};
