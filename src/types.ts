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
