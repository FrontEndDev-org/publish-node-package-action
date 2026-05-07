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
  packageFields: string[];
};

export type InternalPublishOptions = Required<PublishOptions>;

export type InternalPublishMeta = {
  isWorkspace: boolean;
  isRootPkg: boolean;
  prjRoot: string;
  pkgRoot: string;
  pkgFile: string;
  pkgPath: string;
  pkgObject: PKG;
  rootPkgObject: PKG;
  pkgString: string;
  pkgsByName: Record<string, PKG>;
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
  repository?: Record<string, string> | string;
};
