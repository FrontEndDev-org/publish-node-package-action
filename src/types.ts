export type PublishOptions = {
  token: string;
  tag: string;
  dryRun: boolean;
  includePrivate: boolean;
  disableProvenance: boolean;
  disableSync: boolean;
  syncTimeout: number;
  disableStrip: boolean;
  disableCopyLicense: boolean;
  disableCopyReadme: boolean;
  registry: string;
};

export type InternalPublishOptions = Required<PublishOptions>;

export type InternalPublishMeta = {
  pkgRoot: string;
  pkgFile: string;
  pkgObject: PKG;
  pkgString: string;
  pkgsByName: Record<string, PKG>;
  repoOwner: string;
  repoType: 'Organization' | 'User';
};

export type PKG = {
  name: string;
  version: string;
  private?: boolean;
  workspaces?: string[];
  publishConfig?: {
    access?: 'public' | 'restricted';
    registry?: string;
  };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};
