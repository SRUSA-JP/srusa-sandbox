import { Note } from '../atoms';

export interface ClipFrameProps {
  title: string;
  embedUrl: string;
  message: string;
}

/** iframe 埋め込みの表示枠。動画サービス側の UI を邪魔しないよう枠だけを持つ。 */
export function ClipFrame({ title, embedUrl, message }: ClipFrameProps) {
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
        title={title}
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
