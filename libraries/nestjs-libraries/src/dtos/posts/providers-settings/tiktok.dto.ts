import {
  IsBoolean, ValidateIf, IsIn, IsString, MaxLength, IsOptional, IsDefined, IsNumber, Min, Max, ValidateNested,
  Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments
} from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';
import {
  TIKTOK_PRIVACY_LEVELS,
  TIKTOK_UX_MESSAGES,
  tiktokDirectPostIssues,
} from '@gitroom/helpers/utils/tiktok.compliance';

// The Direct Post rules that need no account data (no privacy default,
// commercial content disclosure, branded content can't be private, video
// length when the client measured it). The provider re-checks them, plus the
// creator_info ones, right before posting.
@ValidatorConstraint({ name: 'tiktokDirectPost', async: false })
export class TikTokDirectPostRules implements ValidatorConstraintInterface {
  private issues(args: ValidationArguments) {
    const settings = args.object as TikTokDto;
    return tiktokDirectPostIssues(settings, {
      maxVideoDurationSec: settings.max_video_post_duration_sec,
    }).filter((p) => p !== 'privacy_required');
  }

  validate(_: unknown, args: ValidationArguments) {
    return this.issues(args).length === 0;
  }

  defaultMessage(args: ValidationArguments) {
    const [first] = this.issues(args);
    return first ? TIKTOK_UX_MESSAGES[first] : 'Invalid TikTok settings';
  }
}

export class TikTokMusic {
  @IsDefined()
  @IsString()
  @JSONSchema({
    description:
      'The commercial music library track id, taken from the "id" returned by the musicSearch function.',
  })
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  audio_volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  video_volume?: number;
}

export class TikTokLocation {
  @IsDefined()
  @IsString()
  @JSONSchema({
    description:
      'The location tag id, taken from the "id" returned by the locationSearch function.',
  })
  id: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

// TikTok only honors most of these settings on a DIRECT_POST. With
// content_posting_method=UPLOAD the media lands in the user's TikTok inbox as a
// draft, and TikTok's inbox/upload endpoints accept nothing but the title /
// description - every other field below is silently discarded.
// video_made_with_ai / duet / stitch are additionally video-only: TikTok's photo
// post_info has no is_aigc, disable_duet or disable_stitch field.
// music / location are TikTok Business only: the legacy TikTok provider ignores
// them (its Content Posting API has no music_sound_info / location fields).
// Fields stay required here (existing clients depend on it); the constraints are
// documented, not enforced.
export class TikTokDto {
  @ValidateIf((p) => p.title)
  @MaxLength(90)
  @JSONSchema({
    description:
      'Used as the title of the post. The only setting TikTok keeps when content_posting_method=UPLOAD.',
  })
  title: string;

  // No default (TikTok UX rule): a DIRECT_POST must carry the privacy level
  // the creator picked from creator_info's privacy_level_options.
  @ValidateIf((p) => p.content_posting_method !== 'UPLOAD')
  @IsIn([...TIKTOK_PRIVACY_LEVELS], {
    message: 'Choose who can see this post',
  })
  @IsString({ message: 'Choose who can see this post' })
  @Validate(TikTokDirectPostRules)
  @JSONSchema({
    description:
      'Required when content_posting_method=DIRECT_POST - there is no default, it must be one of the privacy_level_options returned for the account by the creatorInfo function. Ignored by TikTok on UPLOAD. Branded content (brand_content_toggle) cannot be SELF_ONLY.',
  })
  privacy_level:
    | 'PUBLIC_TO_EVERYONE'
    | 'MUTUAL_FOLLOW_FRIENDS'
    | 'FOLLOWER_OF_CREATOR'
    | 'SELF_ONLY';

  @IsBoolean()
  @JSONSchema({
    description:
      'Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no duet setting for photo posts.',
  })
  duet: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no stitch setting for photo posts.',
  })
  stitch: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  comment: boolean;

  @IsIn(['yes', 'no'])
  @JSONSchema({
    description:
      'Photo posts only, and only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD. ' +
      'On TikTok Business, "yes" attaches a random commercial music library track and overrides the music setting; ' +
      'on legacy TikTok, "yes" lets TikTok auto-add its recommended music.',
  })
  autoAddMusic: 'yes' | 'no';

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  brand_content_toggle: boolean;

  @IsBoolean()
  @IsOptional()
  @JSONSchema({
    description:
      'Labels the post as AI generated. Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no AI-generated label for photo posts, and discards it on UPLOAD.',
  })
  video_made_with_ai: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  brand_organic_toggle: boolean;

  @Type(() => TikTokMusic)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only, and only when content_posting_method=DIRECT_POST. Attaches a commercial music library track to the post (use the musicSearch function to find one). audio_volume / video_volume apply to video posts only. For photos, ignored when autoAddMusic is "yes" (a random track is attached instead).',
  })
  music?: TikTokMusic;

  @Type(() => TikTokLocation)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only, and only when content_posting_method=DIRECT_POST. Tags the post with a location (use the locationSearch function to find one).',
  })
  location?: TikTokLocation;

  @IsBoolean()
  @IsOptional()
  @JSONSchema({
    description:
      'The commercial content disclosure switch. When true, brand_organic_toggle (your own brand) and/or brand_content_toggle (a third party, "Paid partnership") must be true.',
  })
  disclose?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @JSONSchema({
    description:
      'Video length in seconds, measured by the client. Checked against max_video_post_duration_sec.',
  })
  video_duration_sec?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @JSONSchema({
    description:
      'The maximum video length of the account, from the creatorInfo function. The provider re-reads it from TikTok before posting.',
  })
  max_video_post_duration_sec?: number;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  @JSONSchema({
    description:
      'Required. Use "DIRECT_POST" to actually publish the post to TikTok. ' +
      '"UPLOAD" does NOT publish: it only sends the media to the user\'s TikTok app inbox, ' +
      'where they must manually finish and publish it within 24 hours or it is discarded, ' +
      'and it makes TikTok ignore every other setting here. ' +
      'Only use "UPLOAD" when the user explicitly asks to review or edit the post inside the TikTok app before publishing.',
  })
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}
