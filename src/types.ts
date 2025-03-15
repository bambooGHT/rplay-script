export interface IContent {
  /** id */
  _id: string;
  /** 标题 */
  title: string;
  /** 日期 */
  modified: string;
  /** 日期 */
  publishedAt: string;
  /** 用户名 */
  nickname: string;
  /** 语言  */
  bucketRegion: "ap-northeast-1" | "ap-northeast-2";
  /** url */
  streamables: [{ s3key: string; }];
}

export type PublishedContentSet = Record<string, IContent>;
export interface ICreator {
  /** id */
  _id: string;
  /** 用户名 */
  nickname: string;
  /** 发布的视频id列表 */
  published: string[];
  /** 发布的录播id列表 */
  publishedReplays: string[];
  /** 数据 */
  metadataSet: {
    publishedContentSet: PublishedContentSet;
    publishedScenarioSet: any;
    publishedFileContentsSet: any;
  };
}
