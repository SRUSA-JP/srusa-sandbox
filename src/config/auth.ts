/**
 * 最低限の認証（合言葉）の設定。
 *
 * クライアント側だけの確認で、本物のアクセス制御ではない。
 * ビルドした JS を読めば合言葉はそのまま分かるので、悪意のある相手は防げない。
 * 公開範囲をまだ検討している間、通りすがりを止める程度の初期実装として置く。
 */
export const AUTH = {
  password: 'srusa1234',
  /** 合言葉を通ったことを覚えておく localStorage のキー。 */
  storageKey: 'srusa-sandbox:unlocked',
} as const;
