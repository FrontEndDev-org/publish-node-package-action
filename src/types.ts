export type PublishTarget = 'npm' | 'github';

export type PublishOptions = {
    token: string;
    target: PublishTarget;
    tag: string;
    dryRun: boolean;
    includePrivate: boolean;
    disableProvenance: boolean;
    disableSync: boolean;
    disableStrip: boolean;
    syncTimeout: number;
};

export type InternalPublishOptions = Required<PublishOptions>;

export type InternalPublishMeta = {
    name: string;
    version: string;
    cwd: string;
    pkgFile: string;
    repoOwner: string;
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
};
