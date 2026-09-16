import { useState } from 'react';
import { CLIP_TEXT, youtubeThumbnailUrl } from '../../config/clips';
import { ICON } from '../../theme/tokens';
import { Icon, Note } from '../atoms';

export interface ClipFrameProps {
  /** 名シーンの題名。読み上げ用の文はここから組み立てる。 */
  title: string;
  /** 動画の埋め込み URL。画像のときは空。 */
  embedUrl: string;
  /** 画像の URL。動画のときは空。 */
  imageUrl?: string;
  /** 動画の下敷き（サムネイル）。無指定なら YouTube の動画から自動で作る。 */
  posterUrl?: string;
  /** どちらも出せないときに枠の中へ出す説明。 */
  message: string;
}

/**
 * 名シーン 1 件の表示枠。
 *
 * 画像は img でそのまま見せる。動画は最初にサムネイルと再生ボタンだけを出し、
 * 押してから iframe を差し込む。埋め込み先が重い・繋がらない場合でも、
 * ボタン自体は必ず表示できる（サムネイル画像が読めなくても、面と再生ボタンは残る）。
 */
export function ClipFrame({ title, embedUrl, imageUrl, posterUrl, message }: ClipFrameProps) {
  const [started, setStarted] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

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

  if (!started) {
    const poster = posterUrl || youtubeThumbnailUrl(embedUrl);
    return (
      <button
        type="button"
        aria-label={CLIP_TEXT.playButton(title)}
        onClick={() => setStarted(true)}
        className="relative block aspect-video w-full overflow-hidden rounded-md border-hairline border-divider bg-sunken"
      >
        {poster && !posterFailed && (
          <img
            src={poster}
            alt=""
            loading="lazy"
            onError={() => setPosterFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="absolute inset-0 grid place-items-center bg-overlay/35 text-heading">
          <Icon name="play" size={ICON.sizeLarge} />
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border-hairline border-divider bg-sunken">
      <iframe
        title={CLIP_TEXT.iframeTitle(title)}
        src={embedUrl}
        className="block aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
