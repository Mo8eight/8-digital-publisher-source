'use client';

import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Input } from '@gitroom/react/form/input';
import { TiktokPreview } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.preview';
import { TikTokMusicSelector } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.music';
import { TikTokLocationSelector } from '@gitroom/frontend/components/new-launch/providers/tiktok/tiktok.location';
import {
  TikTokCreatorInfo,
  TIKTOK_PRIVACY_LEVELS,
  tiktokCommercialLabel,
} from '@gitroom/helpers/utils/tiktok.compliance';

const WarningIcon: FC<{ size?: number; fill?: string }> = ({
  size = 20,
  fill = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.201 17.6335L14.0026 3.39569C13.7977 3.04687 13.5052 2.75764 13.1541 2.55668C12.803 2.35572 12.4055 2.25 12.001 2.25C11.5965 2.25 11.199 2.35572 10.8479 2.55668C10.4968 2.75764 10.2043 3.04687 9.99944 3.39569L1.80101 17.6335C1.60388 17.9709 1.5 18.3546 1.5 18.7454C1.5 19.1361 1.60388 19.5199 1.80101 19.8572C2.00325 20.2082 2.29523 20.499 2.64697 20.6998C2.99871 20.9006 3.39755 21.0043 3.80257 21.0001H20.1994C20.6041 21.0039 21.0026 20.9001 21.354 20.6993C21.7054 20.4985 21.997 20.2079 22.1991 19.8572C22.3965 19.52 22.5007 19.1364 22.5011 18.7456C22.5014 18.3549 22.3978 17.9711 22.201 17.6335ZM11.251 9.75006C11.251 9.55115 11.33 9.36038 11.4707 9.21973C11.6113 9.07908 11.8021 9.00006 12.001 9.00006C12.1999 9.00006 12.3907 9.07908 12.5313 9.21973C12.672 9.36038 12.751 9.55115 12.751 9.75006V13.5001C12.751 13.699 12.672 13.8897 12.5313 14.0304C12.3907 14.171 12.1999 14.2501 12.001 14.2501C11.8021 14.2501 11.6113 14.171 11.4707 14.0304C11.33 13.8897 11.251 13.699 11.251 13.5001V9.75006ZM12.001 18.0001C11.7785 18.0001 11.561 17.9341 11.376 17.8105C11.191 17.6868 11.0468 17.5111 10.9616 17.3056C10.8765 17.1 10.8542 16.8738 10.8976 16.6556C10.941 16.4374 11.0482 16.2369 11.2055 16.0796C11.3628 15.9222 11.5633 15.8151 11.7815 15.7717C11.9998 15.7283 12.226 15.7505 12.4315 15.8357C12.6371 15.9208 12.8128 16.065 12.9364 16.25C13.06 16.4351 13.126 16.6526 13.126 16.8751C13.126 17.1734 13.0075 17.4596 12.7965 17.6706C12.5855 17.8815 12.2994 18.0001 12.001 18.0001Z"
      fill={fill}
    />
  </svg>
);

const Notice: FC<{ children: any; tone?: 'info' | 'error' }> = ({
  children,
  tone = 'info',
}) => (
  <div
    className={clsx(
      'p-[10px] mb-[18px] rounded-[10px] flex gap-[10px] items-start text-[13px] text-balance',
      tone === 'error' ? 'bg-red-600/20 text-red-400' : 'bg-tableBorder'
    )}
  >
    <div className="shrink-0 mt-[2px]">
      <WarningIcon />
    </div>
    <div>{children}</div>
  </div>
);

// Reads the length of the attached video in the browser (metadata only), so
// it can be checked against the creator's max_video_post_duration_sec.
const useVideoDuration = (path?: string) => {
  const [duration, setDuration] = useState<number | undefined>();
  useEffect(() => {
    setDuration(undefined);
    if (!path || typeof document === 'undefined') {
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const done = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(Math.ceil(video.duration));
      }
    };
    video.addEventListener('loadedmetadata', done);
    video.src = path;
    return () => {
      video.removeEventListener('loadedmetadata', done);
      video.removeAttribute('src');
      video.load();
    };
  }, [path]);
  return duration;
};

// TikTok Direct Post UX rules (developers.tiktok.com/doc/content-sharing-guidelines):
// creator_info is queried every time the panel opens; the creator's nickname
// is shown; privacy has no default and its options come from creator_info;
// comment/duet/stitch start unticked and are greyed out when the account
// turned them off; the video length is checked; the Music Usage Confirmation
// is always shown; commercial content needs an explicit choice, shows the
// label the post will get, and branded content can't be private.
const TikTokSettings: FC<{
  values?: any;
}> = (props) => {
  const { watch, register, setValue } = useSettings();
  const { value, integration } = useIntegration();
  const customFunc = useCustomProviderFunction();
  const t = useT();

  // Music and location come from the Business API (v1.3) - the legacy Content
  // Posting API used by the "tiktok" identifier has no such fields.
  const isBusiness = integration?.identifier === 'tiktok-business';

  const isTitle = useMemo(() => {
    return value?.[0]?.image?.some((p) => (p?.path?.indexOf?.('mp4') ?? -1) === -1);
  }, [value]);

  const hasMedia = (value?.[0]?.image?.length ?? 0) > 0;
  const isVideo = hasMedia && !isTitle;

  const disclose = watch('disclose');
  const autoAddMusic = watch('autoAddMusic');
  const brand_organic_toggle = watch('brand_organic_toggle');
  const brand_content_toggle = watch('brand_content_toggle');
  const privacy_level = watch('privacy_level');
  const content_posting_method = watch('content_posting_method');
  const isUploadMode = content_posting_method === 'UPLOAD';

  const [creatorInfo, setCreatorInfo] = useState<
    TikTokCreatorInfo | undefined
  >();
  const [creatorInfoState, setCreatorInfoState] = useState<
    'loading' | 'ready' | 'error' | 'none'
  >(isBusiness ? 'none' : 'loading');

  const loadCreatorInfo = useCallback(async () => {
    if (isBusiness || !integration?.id) {
      setCreatorInfoState('none');
      return;
    }
    setCreatorInfoState('loading');
    try {
      const info = await customFunc.get('creatorInfo');
      if (!info || !Array.isArray(info.privacy_level_options)) {
        throw new Error('creator_info');
      }
      setCreatorInfo(info);
      setCreatorInfoState('ready');
    } catch (e) {
      setCreatorInfo(undefined);
      setCreatorInfoState('error');
    }
  }, [isBusiness, integration?.id]);

  useEffect(() => {
    loadCreatorInfo();
  }, [loadCreatorInfo]);

  // Keep the settings in line with what the account allows: an interaction
  // the creator turned off can't stay ticked, and a privacy option that isn't
  // offered any more is cleared so they pick again.
  useEffect(() => {
    if (!creatorInfo) {
      return;
    }
    if (creatorInfo.comment_disabled) {
      setValue('comment', false);
    }
    if (creatorInfo.duet_disabled) {
      setValue('duet', false);
    }
    if (creatorInfo.stitch_disabled) {
      setValue('stitch', false);
    }
    if (
      privacy_level &&
      !creatorInfo.privacy_level_options.includes(privacy_level)
    ) {
      setValue('privacy_level', '', { shouldValidate: true });
    }
    if (!creatorInfo.upload_available && isUploadMode) {
      setValue('content_posting_method', 'DIRECT_POST');
    }
    setValue(
      'max_video_post_duration_sec',
      creatorInfo.max_video_post_duration_sec
    );
  }, [creatorInfo]);

  // With disclosure off nothing is promoted: hidden brand ticks must not be
  // sent to TikTok.
  useEffect(() => {
    if (!disclose) {
      setValue('brand_organic_toggle', false);
      setValue('brand_content_toggle', false);
    }
  }, [disclose]);

  const videoDuration = useVideoDuration(
    isVideo ? value?.[0]?.image?.[0]?.path : undefined
  );
  useEffect(() => {
    setValue('video_duration_sec', isVideo ? videoDuration : undefined);
  }, [videoDuration, isVideo]);

  const maxDuration = creatorInfo?.max_video_post_duration_sec;
  const videoTooLong =
    !isUploadMode &&
    isVideo &&
    !!maxDuration &&
    !!videoDuration &&
    videoDuration > maxDuration;

  // TikTok ignores every setting except the title / content when the posting
  // method is UPLOAD, so we hide them rather than pretend they apply. The fields
  // stay mounted and registered: their values must survive the switch, and
  // TikTokDto still requires most of them at save time.
  const directPostOnly = clsx(isUploadMode && 'invisible h-0 overflow-hidden');

  const tiktokRestrictionNotice = useMemo(() => {
    if (!hasMedia || !isVideo) return null;
    if (!isUploadMode) {
      return t(
        'tiktok_restriction_direct_video',
        'TikTok restriction: For direct post with video, your post content is used as the title. A separate title field is not available.'
      );
    }
    return t(
      'tiktok_restriction_upload_video',
      'TikTok restriction: For upload-only video, TikTok does not accept a title or message. The content will default to "#Postiz" and you can edit it inside the TikTok app before publishing.'
    );
  }, [hasMedia, isUploadMode, isVideo, t]);

  const privacyLabels: Record<string, string> = {
    PUBLIC_TO_EVERYONE: t('public_to_everyone', 'Public to everyone'),
    MUTUAL_FOLLOW_FRIENDS: t('mutual_follow_friends', 'Mutual follow friends'),
    FOLLOWER_OF_CREATOR: t('follower_of_creator', 'Follower of creator'),
    SELF_ONLY: t('self_only', 'Only me'),
  };

  // Only the options TikTok returns for this account; the business API has no
  // creator_info, so it keeps the full list (still without a default).
  const privacyOptions: string[] = isBusiness
    ? [...TIKTOK_PRIVACY_LEVELS]
    : creatorInfo?.privacy_level_options || [];

  const brandedPrivateNote = t(
    'tiktok_branded_content_cannot_be_private',
    'Branded content visibility cannot be set to private.'
  );

  const contentPostingMethod = [
    {
      value: 'DIRECT_POST',
      label: t(
        'post_content_directly_to_tiktok',
        'Post content directly to TikTok'
      ),
    },
    ...(isBusiness || creatorInfo?.upload_available
      ? [
          {
            value: 'UPLOAD',
            label: t(
              'upload_content_to_tiktok_without_posting',
              'Upload content to TikTok without posting it'
            ),
          },
        ]
      : []),
  ];
  const yesNo = [
    {
      value: 'yes',
      label: t('yes', 'Yes'),
    },
    {
      value: 'no',
      label: t('no', 'No'),
    },
  ];

  const disabledNote = t(
    'tiktok_interaction_disabled_by_creator',
    'Turned off in this account\'s TikTok privacy settings'
  );

  const commercialLabel = tiktokCommercialLabel({
    disclose,
    brand_organic_toggle,
    brand_content_toggle,
  });
  const mediaWord = isTitle ? t('photo', 'photo') : t('video', 'video');

  return (
    <div className="flex flex-col">
      {/* hidden: read by TikTokDto to check the video length */}
      <input type="hidden" {...register('video_duration_sec')} />
      <input type="hidden" {...register('max_video_post_duration_sec')} />

      {!isBusiness && (
        <div className="flex items-center gap-[10px] mb-[18px]">
          {creatorInfo?.creator_avatar_url && (
            <img
              src={creatorInfo.creator_avatar_url}
              alt=""
              className="w-[32px] h-[32px] rounded-full"
            />
          )}
          <div className="text-[14px]">
            {t('tiktok_posting_to', 'Posting to')}:{' '}
            <strong>
              {creatorInfo?.creator_nickname ||
                (creatorInfoState === 'loading'
                  ? t('loading', 'Loading...')
                  : integration?.name)}
            </strong>
            {creatorInfo?.creator_username && (
              <span className="opacity-70">
                {' '}
                (@{creatorInfo.creator_username})
              </span>
            )}
          </div>
        </div>
      )}
      {creatorInfoState === 'error' && (
        <Notice tone="error">
          {t(
            'tiktok_creator_info_failed',
            'Could not load the settings of this TikTok account, so it cannot be posted to right now.'
          )}{' '}
          <button
            type="button"
            className="underline"
            onClick={loadCreatorInfo}
          >
            {t('try_again', 'Try again')}
          </button>
        </Notice>
      )}
      {tiktokRestrictionNotice && <Notice>{tiktokRestrictionNotice}</Notice>}
      {videoTooLong && (
        <Notice tone="error">
          {t(
            'tiktok_video_too_long',
            'This video is {{duration}} seconds long. This TikTok account can post videos up to {{max}} seconds.',
            { duration: videoDuration, max: maxDuration }
          )}
        </Notice>
      )}
      {isTitle && <Input label="Title" {...register('title')} maxLength={89} />}
      <div className={directPostOnly}>
        <Select
          label={t('label_who_can_see_this_video', 'Who can see this video?')}
          disabled={isUploadMode || !privacyOptions.length}
          {...register('privacy_level')}
        >
          <option value="">
            {t('tiktok_choose_privacy', 'Choose who can see this post')}
          </option>
          {privacyOptions.map((item) => {
            const blocked = item === 'SELF_ONLY' && !!brand_content_toggle;
            return (
              <option
                key={item}
                value={item}
                disabled={blocked}
                title={blocked ? brandedPrivateNote : undefined}
              >
                {privacyLabels[item] || item}
                {blocked ? ` (${brandedPrivateNote})` : ''}
              </option>
            );
          })}
        </Select>
      </div>
      <div className="text-[14px] mt-[10px] mb-[18px] text-balance">
        {contentPostingMethod.length > 1
          ? t(
              'choose_upload_without_posting_description',
              `Choose upload without posting if you want to review and edit your content within TikTok's app before publishing.
        This gives you access to TikTok's built-in editing tools and lets you make final adjustments before posting. The additional settings are only available when posting directly to TikTok.`
            )
          : null}
      </div>
      <Select
        label={t('label_content_posting_method', 'Content posting method')}
        {...register('content_posting_method', {
          value: 'DIRECT_POST',
        })}
      >
        {contentPostingMethod.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      {isUploadMode && <div className="-mt-[23px] mb-[23px] text-red-600">After posting you fill find a notification inside your Inbox about your post (not content studio)</div>}
      <div className={clsx('flex flex-col', directPostOnly)}>
        <Select
          label={
            isBusiness
              ? t('label_add_random_music', 'Add random music')
              : t('label_auto_add_music', 'Auto add music')
          }
          disabled={isUploadMode}
          {...register('autoAddMusic', {
            value: 'no',
          })}
        >
          <option value="">{t('select', 'Select')}</option>
          {yesNo.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <div className="text-[14px] mt-[10px] mb-[24px] text-balance">
          {isBusiness
            ? t(
                'tiktok_random_music_only_for_photos',
                'This feature is available only for photos, it adds a random trending track from TikTok\'s commercial music library.'
              )
            : t(
                'this_feature_available_only_for_photos',
                'This feature available only for photos, it will add a default music that\n        you can change later.'
              )}
        </div>
        {isBusiness && (
          <div className="flex flex-col gap-[18px] mb-[24px]">
            {/* Random music replaces a manual choice for photos, so the
                selector is hidden (but stays registered) while it's on. */}
            <div
              className={clsx(
                !isVideo &&
                  autoAddMusic === 'yes' &&
                  'invisible h-0 overflow-hidden'
              )}
            >
              <TikTokMusicSelector
                label={t('tiktok_music_label', 'Music')}
                showVolumes={isVideo}
                {...register('music')}
              />
            </div>
            <TikTokLocationSelector
              label={t('tiktok_location_label', 'Location')}
              {...register('location')}
            />
          </div>
        )}
        <hr className="mb-[15px] border-tableBorder" />
        <div className="text-[14px] mb-[10px]">
          {t('tiktok_allow_users_to', 'Allow users to')}
        </div>
        <div className="flex flex-wrap gap-[40px]">
          <Checkbox
            label={t('label_comments', 'Allow Comments')}
            variant="hollow"
            disabled={isUploadMode || !!creatorInfo?.comment_disabled}
            title={creatorInfo?.comment_disabled ? disabledNote : undefined}
            {...register('comment', {
              value: false,
            })}
          />
          {/* duet / stitch / AI label are video-only: photo posts show Comment only */}
          {!isTitle && (
            <>
              <Checkbox
                variant="hollow"
                label={t('label_duet', 'Allow Duet')}
                disabled={isUploadMode || !!creatorInfo?.duet_disabled}
                title={creatorInfo?.duet_disabled ? disabledNote : undefined}
                {...register('duet', {
                  value: false,
                })}
              />
              <Checkbox
                label={t('label_stitch', 'Allow Stitch')}
                variant="hollow"
                disabled={isUploadMode || !!creatorInfo?.stitch_disabled}
                title={creatorInfo?.stitch_disabled ? disabledNote : undefined}
                {...register('stitch', {
                  value: false,
                })}
              />
            </>
          )}
        </div>
        {!isTitle && (
          <div className="mt-[20px]">
            <Checkbox
              label={t('video_made_with_ai', 'Video made with AI')}
              variant="hollow"
              disabled={isUploadMode}
              {...register('video_made_with_ai', {
                value: false,
              })}
            />
          </div>
        )}
        <hr className="my-[15px] mb-[25px] border-tableBorder" />
        <div className="flex flex-col gap-[20px]">
          <Checkbox
            variant="hollow"
            label={t('label_disclose_video_content', 'Disclose post content')}
            disabled={isUploadMode}
            {...register('disclose', {
              value: false,
            })}
          />
          <div className="text-[14px] text-balance">
            {t(
              'turn_on_to_disclose_video_promotes',
              'Turn on to disclose that this video promotes goods or services in\n          exchange for something of value. You video could promote yourself, a\n          third party, or both.'
            )}
          </div>
          {disclose && commercialLabel && (
            <div className="bg-tableBorder p-[10px] rounded-[10px] flex gap-[20px] items-center">
              <div>
                <WarningIcon size={24} fill="white" />
              </div>
              <div>
                {commercialLabel === 'paid_partnership'
                  ? t(
                      'tiktok_label_paid_partnership',
                      'Your {{media}} will be labeled as "Paid partnership".',
                      { media: mediaWord }
                    )
                  : t(
                      'tiktok_label_promotional_content',
                      'Your {{media}} will be labeled as "Promotional content".',
                      { media: mediaWord }
                    )}
                <br />
                {t(
                  'this_cannot_be_changed_once_posted',
                  'This cannot be changed once your video is posted.'
                )}
              </div>
            </div>
          )}
          {disclose && !commercialLabel && (
            <Notice tone="error">
              {t(
                'tiktok_disclose_needs_choice',
                'You need to indicate if your content promotes yourself, a third party, or both.'
              )}
            </Notice>
          )}
        </div>
        <div className={clsx(!disclose && 'invisible h-0 overflow-hidden', 'mt-[20px]')}>
          <Checkbox
            variant="hollow"
            label={t('label_your_brand', 'Your brand')}
            disabled={isUploadMode}
            {...register('brand_organic_toggle', {
              value: false,
            })}
          />
          <div className="text-balance my-[10px] text-[14px]">
            {t(
              'you_are_promoting_yourself',
              'You are promoting yourself or your own brand.'
            )}
            <br />
            {t(
              'this_video_will_be_classified_brand_organic',
              'This video will be classified as Brand Organic.'
            )}
          </div>
          <Checkbox
            variant="hollow"
            label={t('label_branded_content', 'Branded content')}
            disabled={isUploadMode || privacy_level === 'SELF_ONLY'}
            title={
              privacy_level === 'SELF_ONLY' ? brandedPrivateNote : undefined
            }
            {...register('brand_content_toggle', {
              value: false,
            })}
          />
          <div className="text-balance my-[10px] text-[14px]">
            {t(
              'you_are_promoting_another_brand',
              'You are promoting another brand or a third party.'
            )}
            <br />
            {t(
              'this_video_will_be_classified_branded_content',
              'This video will be classified as Branded Content.'
            )}
            {privacy_level === 'SELF_ONLY' && (
              <>
                <br />
                <span className="opacity-70">{brandedPrivateNote}</span>
              </>
            )}
          </div>
        </div>
        {/* always shown (TikTok UX rule), not only when a brand toggle is on */}
        <div className="my-[10px] text-[14px] text-balance">
          {t(
            'by_posting_you_agree_to_tiktoks',
            "By posting, you agree to TikTok's"
          )}{' '}
          {disclose && brand_content_toggle && (
            <>
              <a
                target="_blank"
                rel="noreferrer"
                className="text-[#B69DEC] hover:underline"
                href="https://www.tiktok.com/legal/page/global/bc-policy/en"
              >
                {t('branded_content_policy', 'Branded Content Policy')}
              </a>{' '}
              {t('and', 'and')}{' '}
            </>
          )}
          <a
            target="_blank"
            rel="noreferrer"
            className="text-[#B69DEC] hover:underline"
            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
          >
            {t('music_usage_confirmation', 'Music Usage Confirmation')}
          </a>
          .
        </div>
      </div>
    </div>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: TikTokSettings,
  comments: false,
  CustomPreviewComponent: TiktokPreview,
  dto: TikTokDto,
  maximumCharacters: 2000,
});
