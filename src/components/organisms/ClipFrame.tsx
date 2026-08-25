import { CLIP_TEXT } from '../../config/clips';
import { Note } from '../atoms';

export interface ClipFrameProps {
  /** 名シーンの題名。読み上げ用の文はここから組み立てる。 */
  title: string;
  /** 動画の埋め込み URL。画像のときは空。 */
  embedUrl: string;
  /** 画像の URL。動画のときは空。 */
  imageUrl?: string;
  /** どちらも出せないときに枠の中へ出す説明。 */
  message: string;
}

/**
 * 名シーン 1 件の表示枠。
 *
 * 動画は iframe、画像は img で見せる。どちらも同じ縦横比の枠に収めて、
 * 切り替えても下の内容が飛び跳ねないようにする。
 * 画像は切り抜かず、枠の中に全体が入る大きさで置く。
 */
export function ClipFrame({ title, embedUrl, imageUrl, message }: ClipFrameProps) {
  if (imageUrl) {
    return (
      <div className="overflow-hidden rounded-md border-hairline border-divider bg-sunken">
        <img
          src={imageUrl}
          alt={CLIP_TEXT.imageAlt(title)}
          loading="lazy"
          className="block aspect-video w-full object-contain"
        />
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="grid aspect-video place-items-center rounded-md border-hairline border-divider bg-sunken px-lg text-center">
        <Note>{message}</Note>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border-hairline border-divider bg-sunken">
      <iframe
        title={CLIP_TEXT.iframeTitle(title)}
        src={embedUrl}
        className="block aspect-video w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
