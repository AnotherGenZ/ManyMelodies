const Collection = require('./util/Collection');

class VoiceConnectionManager extends Collection {
    constructor(vcObject) {
        super(vcObject || require('./VoiceConnection'));
        this.pendingGuilds = {};
    }

    join(guildID, channelID, options) {
        let connection = this.get(guildID);
        if (connection && connection.ws) {
            connection.switchChannel(channelID);
            if (connection.ready) {
                return Promise.resolve(connection);
            } else {
                return new Promise((res, rej) => {
                    let disconnectHandler = () => {
                        connection.removeListener('ready', readyHandler);
                        connection.removeListener('error', errorHandler);
                        rej(new Error('Disconnected'));
                    };
                    let readyHandler = () => {
                        connection.removeListener('disconnect', disconnectHandler);
                        connection.removeListener('error', errorHandler);
                        res(connection);
                    };
                    let errorHandler = (err) => {
                        connection.removeListener('disconnect', disconnectHandler);
                        connection.removeListener('ready', readyHandler);
                        connection.disconnect();
                        rej(err);
                    };
                    connection.once('ready', readyHandler).once('disconnect', disconnectHandler).once('error', errorHandler);
                });
            }
        }
        return new Promise((res, rej) => {
            this.pendingGuilds[guildID] = {
                channelID: channelID,
                options: options || {},
                res: res,
                rej: rej,
                timeout: setTimeout(() => {
                    delete this.pendingGuilds[guildID];
                    rej(new Error('Voice connection timeout'));
                }, 10000)
            };
        });
    }

    voiceServerUpdate(data) {
        if (this.pendingGuilds[data.guild_id] && this.pendingGuilds[data.guild_id].timeout) {
            clearTimeout(this.pendingGuilds[data.guild_id].timeout);
            this.pendingGuilds[data.guild_id].timeout = null;
        }
        let connection = this.get(data.guild_id);
        if (!connection) {
            if (!this.pendingGuilds[data.guild_id]) {
                return;
            }
            connection = this.add(new this.baseObject(data.guild_id, {
                shard: data.shard,
                opusOnly: this.pendingGuilds[data.guild_id].options.opusOnly,
                shared: this.pendingGuilds[data.guild_id].options.shared
            }));
        }
        connection.connect({
            channel_id: (this.pendingGuilds[data.guild_id] || connection).channelID,
            endpoint: data.endpoint,
            token: data.token,
            session_id: data.session_id,
            user_id: data.user_id
        });
        if (!this.pendingGuilds[data.guild_id] || this.pendingGuilds[data.guild_id].waiting) {
            return;
        }
        this.pendingGuilds[data.guild_id].waiting = true;
        let disconnectHandler = () => {
            connection = this.get(data.guild_id);
            if (!this.pendingGuilds[data.guild_id]) {
                if (connection) {
                    connection.removeListener('ready', readyHandler);
                }
                return;
            }
            connection.removeListener('ready', readyHandler);
            this.pendingGuilds[data.guild_id].rej(new Error('Disconnected'));
            delete this.pendingGuilds[data.guild_id];
        };
        let readyHandler = () => {
            connection = this.get(data.guild_id);
            if (!this.pendingGuilds[data.guild_id]) {
                if (connection) {
                    connection.removeListener('disconnect', disconnectHandler);
                }
                return;
            }
            connection.removeListener('disconnect', disconnectHandler);
            this.pendingGuilds[data.guild_id].res(connection);
            delete this.pendingGuilds[data.guild_id];
        };
        connection.once('ready', readyHandler).once('disconnect', disconnectHandler);
    }

    leave(guildID) {
        let connection = this.get(guildID);
        if (!connection) {
            return;
        }
        connection.disconnect();
        connection._destroy();
        this.remove(connection);
    }

    switch(guildID, channelID) {
        let connection = this.get(guildID);
        if (!connection) {
            return;
        }
        connection.switch(channelID);
    }

    toJSON() {
        let base = {};
        for (let key in this) {
            if (this.hasOwnProperty(key) && !key.startsWith('_')) {
                if (this[key] && typeof this[key].toJSON === 'function') {
                    base[key] = this[key].toJSON();
                } else {
                    base[key] = this[key];
                }
            }
        }
        return base;
    }
}

module.exports = VoiceConnectionManager;
