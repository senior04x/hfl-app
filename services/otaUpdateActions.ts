type UpdateClient = {
    checkForUpdateAsync: () => Promise<unknown>;
    fetchUpdateAsync: () => Promise<{ isNew: boolean; isRollBackToEmbedded: boolean }>;
    reloadAsync: () => Promise<void>;
};

// Share one lock across checking, downloading and restarting. Failed operations
// release it so the user can retry without restarting the application.
export function createOtaUpdateActions(client: UpdateClient) {
    let busy = false;
    return {
        async check() {
            if (busy) return;
            busy = true;
            try { await client.checkForUpdateAsync(); }
            finally { busy = false; }
        },
        async apply(alreadyDownloaded: boolean) {
            if (busy) throw new Error('Update operation pending');
            busy = true;
            try {
                if (!alreadyDownloaded) {
                    const result = await client.fetchUpdateAsync();
                    if (!result.isNew && !result.isRollBackToEmbedded) {
                        throw new Error('No downloaded update');
                    }
                }
                await client.reloadAsync();
            } finally { busy = false; }
        },
    };
}
