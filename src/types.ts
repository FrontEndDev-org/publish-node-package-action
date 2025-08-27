export type PublishTarget = 'npm' | 'github';

export type PublishOptions = {
    token: string;
    target: PublishTarget;
    tag: string;
    dryRun: boolean;
    includePrivate: boolean;
    disableProvenance: boolean;
    syncNpmmirror: boolean;
    syncTimeout: number;
};

export type InternalPublishOptions = Required<PublishOptions>;

export type InternalPublishPkg = {
    name: string;
    version: string;
    cwd: string;
};

export type PKG = {
    name: string;
    version: string;
    private?: boolean;
    workspaces?: string[];
};
