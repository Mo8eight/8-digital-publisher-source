import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TiktokProvider } from '@gitroom/nestjs-libraries/integrations/social/tiktok.provider';

const creatorInfo = {
  creator_avatar_url: 'https://p16.example/avatar.jpg',
  creator_username: 'test.account',
  creator_nickname: 'Test Account',
  privacy_level_options: ['FOLLOWER_OF_CREATOR', 'SELF_ONLY'],
  comment_disabled: true,
  duet_disabled: false,
  stitch_disabled: false,
  max_video_post_duration_sec: 600,
};

const json = (body: any) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const photoPost = (settings: any) =>
  [
    {
      id: 'post-1',
      message: 'Hello',
      settings: {
        content_posting_method: 'DIRECT_POST',
        privacy_level: 'FOLLOWER_OF_CREATOR',
        comment: false,
        duet: false,
        stitch: false,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        ...settings,
      },
      media: [{ path: 'https://social.example.com/uploads/a.jpg' }],
    },
  ] as any;

describe('TiktokProvider (Direct Post UX rules)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const calls = () => fetchMock.mock.calls.map(([url]) => String(url));

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/creator_info/query/')) {
        return json({ data: creatorInfo, error: { code: 'ok' } });
      }
      if (url.includes('/content/init/')) {
        return json({ data: { publish_id: 'p_pub_1' }, error: { code: 'ok' } });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TIKTOK_SCOPES;
  });

  it('requests only the trimmed scopes by default', () => {
    expect(new TiktokProvider().scopes).toEqual([
      'user.info.basic',
      'user.info.profile',
      'video.publish',
      'video.list',
    ]);
  });

  it('lets TIKTOK_SCOPES add scopes back', () => {
    process.env.TIKTOK_SCOPES = 'user.info.basic,video.publish,video.upload';
    expect(new TiktokProvider().scopes).toEqual([
      'user.info.basic',
      'video.publish',
      'video.upload',
    ]);
  });

  it('returns creator_info for the post panel', async () => {
    expect(await new TiktokProvider().creatorInfo('token')).toEqual({
      ...creatorInfo,
      upload_available: false,
    });
  });

  it('publishes with the privacy level the creator chose', async () => {
    const [res] = await new TiktokProvider().postPending(
      'id',
      'token',
      photoPost({}),
      {} as any
    );
    expect(res.status).toBe('pending');
    const init = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/content/init/')
    )!;
    const body = JSON.parse(init[1].body);
    expect(body.post_info.privacy_level).toBe('FOLLOWER_OF_CREATOR');
    expect(body.post_info.disable_comment).toBe(true);
  });

  it('throws instead of defaulting when privacy is missing', async () => {
    await expect(
      new TiktokProvider().postPending(
        'id',
        'token',
        photoPost({ privacy_level: undefined }),
        {} as any
      )
    ).rejects.toThrow('Choose who can see this post');
    expect(calls().some((u) => u.includes('/content/init/'))).toBe(false);
  });

  it('refuses a privacy option creator_info did not return', async () => {
    await expect(
      new TiktokProvider().postPending(
        'id',
        'token',
        photoPost({ privacy_level: 'PUBLIC_TO_EVERYONE' }),
        {} as any
      )
    ).rejects.toThrow('This privacy option is not available');
    expect(calls().some((u) => u.includes('/content/init/'))).toBe(false);
  });

  it('refuses comments when the creator turned them off', async () => {
    await expect(
      new TiktokProvider().postPending(
        'id',
        'token',
        photoPost({ comment: true }),
        {} as any
      )
    ).rejects.toThrow('Comments are turned off');
  });

  it('refuses inbox upload when video.upload is not requested', async () => {
    await expect(
      new TiktokProvider().postPending(
        'id',
        'token',
        photoPost({ content_posting_method: 'UPLOAD' }),
        {} as any
      )
    ).rejects.toThrow('turned off on this server');
    expect(
      await new TiktokProvider().checkValidity(
        [[{ path: 'https://social.example.com/uploads/a.mp4' } as any]],
        { content_posting_method: 'UPLOAD' }
      )
    ).toMatch('turned off on this server');
  });
});
