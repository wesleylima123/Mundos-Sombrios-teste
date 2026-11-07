window.MS_DB_READY = (async function () {
    const config = window.MS_CONFIG?.supabase || window.MS_DB_CONFIG || {};
    const hasRemoteConfig = Boolean(config.url && config.anonKey && config.configured !== false);
    if (!hasRemoteConfig) console.warn('[Mundos Sombrios] Pacote local/desvinculado: persistência Supabase online permanece desativada até configuração manual.');

    if (!hasRemoteConfig) {
        window.MS_DB = { ready:false, enabled:false };
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('[Mundos Sombrios] Supabase configurado, mas o SDK está indisponível.');
        window.MS_DB = { ready:false, enabled:false, offline:false };
        return;
    }

    const supabase = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });

    const activeRealtimeChannels = new Map();

    const tableNames = {
        profiles: 'profiles',
        tables: 'tables',
        characters: 'characters',
        admin_requests: 'admin_requests',
        site_content: 'site_content',
        posts: 'posts',
        site_settings: 'site_settings',
        table_members: 'table_members',
        table_state: 'table_state',
        table_events: 'table_events',
        gm_notes: 'gm_notes',
        gm_npcs: 'gm_npcs',
        gm_files: 'gm_files'
    };

    async function runQuery(table, action, payload) {
        try {
            const result = await action(table, payload);
            return result;
        } catch (error) {
            console.warn('[Mundos Sombrios] Falha no banco online:', table, error);
            return { data: null, error };
        }
    }


    function normalizeTablePayload(table) {
        if (!table) return null;
        return {
            id: String(table.id || 't-' + Date.now()),
            code: String(table.code || '').toUpperCase(),
            name: String(table.name || 'Fenda sem nome'),
            theme: table.theme || 'default',
            game_mode: table.gameMode || 'exodo',
            owner_id: String(table.ownerId || 'system'),
            participants: Array.isArray(table.participants) ? table.participants : [],
            banned: Array.isArray(table.banned) ? table.banned : [],
            created_at: table.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            settings: table.settings || {}
        };
    }

    function normalizeCharacterPayload(character) {
        if (!character) return null;
        return {
            id: String(character.id || 'c-' + Date.now()),
            owner_id: String(character.ownerId || 'system'),
            user_id: String(character.userId || character.ownerId || 'system'),
            name: String(character.name || 'Alma sem nome'),
            mode: character.mode || 'exodo',
            nature: character.nature || '',
            class_name: character.className || '',
            payload: character,
            created_at: character.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    supabase.auth.onAuthStateChange((event, session) => {
        window.dispatchEvent(new CustomEvent('ms-auth-state', { detail: { event, session, user: session?.user || null } }));
    });

    const api = {
        ready: true,
        enabled: true,
        client: supabase,

        async getSession() {
            const { data, error } = await supabase.auth.getSession();
            return { session: data?.session || null, user: data?.session?.user || null, error: error || null };
        },

        async signIn(identifier, password) {
            const value = String(identifier || '').trim();
            let email = value;
            if (!value.includes('@')) {
                const { data: resolvedEmail, error: lookupError } = await supabase.rpc('resolve_login_email', { p_identifier: value });
                if (lookupError) {
                    const error = new Error('Não foi possível resolver o nome de usuário. Tente entrar com o e-mail da conta.');
                    error.code = 'USERNAME_RESOLVER_UNAVAILABLE';
                    error.cause = lookupError;
                    return { data: null, error };
                }
                email = String(resolvedEmail || '').trim();
            }
            if (!email) {
                const error = new Error('Credenciais inválidas.');
                error.code = 'INVALID_LOGIN_IDENTIFIER';
                return { data: null, error };
            }
            const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password: String(password || '') });
            return { data, error };
        },

        async signUp({ username, email, password, requestMaster = false }) {
            const { data, error } = await supabase.auth.signUp({
                email: String(email || '').trim(),
                password: String(password || ''),
                options: {
                    data: { username: String(username || '').trim(), request_master: !!requestMaster },
                    // Volta para a página do site (inclui o caminho do GitHub Pages), não só para o domínio.
                    emailRedirectTo: window.location.href.split('#')[0].split('?')[0]
                }
            });
            if (!error && data?.user && data.user.identities?.length === 0) {
                return { data, error: new Error('Este e-mail já possui uma conta.') };
            }
            return { data, error };
        },

        async signOut() {
            return supabase.auth.signOut();
        },

        async resetPasswordForEmail(email, redirectTo) {
            return supabase.auth.resetPasswordForEmail(String(email || '').trim(), { redirectTo });
        },

        async updatePassword(password) {
            return supabase.auth.updateUser({ password: String(password || '') });
        },
        async fetchMyProfile() {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData?.session?.user) return { data: null, error: sessionError || new Error('Sessão ausente.') };
            const authUser = sessionData.session.user;
            const direct = await supabase.from(tableNames.profiles).select('*').eq('auth_user_id', authUser.id).maybeSingle();
            if (direct.error) return { data: null, error: direct.error };
            if (direct.data) return { data: direct.data, error: null };

            // V2.8.1: tenta vincular com segurança perfis legados pelo e-mail autenticado,
            // preservando role/status já existentes. A RPC nunca confia em user_metadata para papel.
            const linked = await supabase.rpc('ensure_current_profile');
            if (linked.error) {
                const error = new Error('A conta autenticou, mas o perfil do site não pôde ser vinculado. Aplique a migração de autenticação V2.8.1.');
                error.code = 'PROFILE_LINK_REQUIRED';
                error.cause = linked.error;
                return { data: null, error };
            }
            return { data: linked.data || null, error: null };
        },

        async ensureMyProfile(profile = {}) {
            const session = await this.getSession();
            if (!session.user) return null;
            const linked = await supabase.rpc('ensure_current_profile');
            if (!linked.error && linked.data) return linked.data;
            // Compatibilidade para bancos ainda sem a RPC: cria somente um perfil novo de jogador.
            // Não altera papel de um perfil existente e não reescreve IDs legados.
            const payload = {
                auth_user_id: session.user.id,
                id: String(session.user.id),
                username: String(profile.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'jogador').trim(),
                email: String(session.user.email || profile.email || '').trim(),
                role: 'jogador',
                banned: false,
                status: 'active',
                data: profile.data && typeof profile.data === 'object' ? profile.data : {}
            };
            const { data, error } = await supabase.from(tableNames.profiles).insert(payload).select().maybeSingle();
            if (error) console.warn('[Mundos Sombrios] ensureMyProfile falhou:', error);
            return data || null;
        },

        async adminSetUserRole(userId, role) {
            const { data, error } = await supabase.rpc('admin_set_user_role', { p_user_id: String(userId), p_role: String(role) });
            return { data, error };
        },

        async adminUpdateUsername(userId, username) {
            const { data, error } = await supabase.rpc('admin_update_username', { p_user_id: String(userId), p_username: String(username || '').trim() });
            return { data, error };
        },

        async adminSetUserBanned(userId, banned) {
            const { data, error } = await supabase.rpc('admin_set_user_banned', { p_user_id: String(userId), p_banned: !!banned });
            return { data, error };
        },

        async fetchSoulAccountState() {
            const { data, error } = await supabase.rpc('soul_get_account_state');
            return { data: data || null, error };
        },

        async touchSoulActivity(source = 'interaction') {
            const { data, error } = await supabase.rpc('soul_touch_activity', { p_source: String(source || 'interaction').slice(0,80) });
            return { data: data || null, error };
        },

        async tickSoulHarvest() {
            const { data, error } = await supabase.rpc('soul_harvest_tick');
            return { data: data || null, error };
        },

        async purchaseSoulProduct(productKey) {
            const { data, error } = await supabase.rpc('soul_purchase', { p_product_key: String(productKey || '') });
            return { data: data || null, error };
        },

        async adminGetSoulAccount(profileId) {
            const { data, error } = await supabase.rpc('soul_admin_get_account', { p_profile_id: String(profileId || '') });
            return { data: data || null, error };
        },

        async adminAdjustSoulBalance(profileId, amount, reason) {
            const { data, error } = await supabase.rpc('soul_admin_adjust_balance', { p_profile_id: String(profileId || ''), p_amount: Number(amount || 0), p_reason: String(reason || '') });
            return { data: data || null, error };
        },

        async adminSetSoulEntitlement(profileId, type, key, quantity, reason) {
            const { data, error } = await supabase.rpc('soul_admin_set_entitlement', { p_profile_id: String(profileId || ''), p_type: String(type || ''), p_key: String(key || ''), p_quantity: Number(quantity || 0), p_reason: String(reason || '') });
            return { data: data || null, error };
        },

        async createTableRemote(table) {
            const payload = normalizeTablePayload(table);
            const { data, error } = await supabase.rpc('create_table_secure', {
                p_id: payload.id, p_code: payload.code, p_name: payload.name, p_theme: payload.theme,
                p_game_mode: payload.game_mode, p_settings: payload.settings || {}
            });
            return { data: data || null, error: error || null };
        },

        async joinTableRemote(code, characterId) {
            const { data, error } = await supabase.rpc('join_table_secure', { p_code: String(code).toUpperCase(), p_character_id: characterId ? String(characterId) : null });
            return { data, error };
        },

        async leaveTableRemote(code) {
            const { data, error } = await supabase.rpc('leave_table_secure', { p_code: String(code).toUpperCase() });
            return { data, error };
        },

        async deleteTableSecure(tableId) {
            const { data, error } = await supabase.rpc('delete_table_secure', { p_table_id: String(tableId) });
            return { data, error };
        },

        async updateTableSettingsSecure(tableId, settings) {
            const { data, error } = await supabase.rpc('update_table_settings_secure', { p_table_id: String(tableId), p_settings: settings || {} });
            return { data, error };
        },

        async fetchTableRoster(tableId) {
            const { data, error } = await supabase.rpc('fetch_table_roster', { p_table_id: String(tableId) });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async fetchTableCharacters(tableId) {
            const { data, error } = await supabase.rpc('fetch_table_characters', { p_table_id: String(tableId) });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async setTableMemberStatus(tableId, userId, status) {
            const { data, error } = await supabase.rpc('set_table_member_status', { p_table_id: String(tableId), p_user_id: String(userId), p_status: String(status) });
            return { data, error };
        },

        async setTableMemberRole(tableId, userId, role) {
            const { data, error } = await supabase.rpc('set_table_member_role', { p_table_id: String(tableId), p_user_id: String(userId), p_role: String(role) });
            return { data, error };
        },

        async linkTableCharacter(tableId, characterId) {
            const { data, error } = await supabase.rpc('link_table_character', { p_table_id: String(tableId), p_character_id: String(characterId) });
            return { data, error };
        },

        async createTableInvite(tableId, expiresAt = null, maxUses = 0) {
            const { data, error } = await supabase.rpc('create_table_invite', { p_table_id: String(tableId), p_expires_at: expiresAt, p_max_uses: Number(maxUses) || 0 });
            return { data, error };
        },

        async fetchCampaign(tableId) {
            const { data, error } = await supabase.from('campaigns').select('*').eq('table_id', String(tableId)).maybeSingle();
            return { data: data || null, error };
        },

        async createCampaign(tableId, name, description = '') {
            const { data, error } = await supabase.from('campaigns').insert({ table_id: String(tableId), name: String(name || 'Campanha'), description: String(description || '') }).select().maybeSingle();
            return { data, error };
        },

        async fetchSessions(tableId) {
            const { data, error } = await supabase.from('game_sessions').select('*').eq('table_id', String(tableId)).order('created_at', { ascending: false });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async createSession(tableId, title, campaignId = null) {
            const { data, error } = await supabase.from('game_sessions').insert({ table_id: String(tableId), campaign_id: campaignId, title: String(title || 'Sessão'), status: 'planned' }).select().maybeSingle();
            return { data, error };
        },

        async updateSessionStatus(sessionId, status) {
            const nextStatus = String(status);
            const patch = { status: nextStatus };
            if (nextStatus === 'active') patch.started_at = new Date().toISOString();
            if (nextStatus === 'ended') patch.ended_at = new Date().toISOString();
            const { data, error } = await supabase.from('game_sessions').update(patch).eq('id', String(sessionId)).select().maybeSingle();
            return { data, error };
        },

        async fetchMyTables() {
            const { data, error } = await supabase.from(tableNames.tables).select('*').order('updated_at', { ascending: false });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async fetchMyTableSummaries() {
            const { data, error } = await supabase.rpc('fetch_my_table_summaries');
            if (!error) return { data: Array.isArray(data) ? data : [], error: null };
            // Compatibilidade enquanto a migração V2.7 ainda não foi executada.
            const fallback = await api.fetchMyTables();
            return { data: (fallback.data || []).map(t => ({ ...t, active_members: Array.isArray(t.participants) ? t.participants.length : 0, my_member_role: String(t.owner_id) === String(window.currentUser?.id) ? 'mestre' : 'jogador', my_character_id: null, is_owner: String(t.owner_id) === String(window.currentUser?.id), status: t.status || 'active' })), error: fallback.error };
        },

        async archiveTableSecure(tableId, archived = true) {
            const { data, error } = await supabase.rpc('archive_table_secure', { p_table_id: String(tableId), p_archived: !!archived });
            return { data: data || null, error: error || null };
        },

        async setTableLiveStatus(tableId, status) {
            const { data, error } = await supabase.rpc('set_table_live_status', { p_table_id: String(tableId), p_status: String(status) });
            return { data: data || null, error: error || null };
        },

        async fetchPublicTableDirectory() {
            const { data, error } = await supabase.rpc('fetch_public_table_directory');
            return { data: Array.isArray(data) ? data : [], error: error || null };
        },

        async requestTableJoin(tableId, characterId) {
            const { data, error } = await supabase.rpc('request_table_join', { p_table_id: String(tableId), p_character_id: String(characterId) });
            return { data: data || null, error: error || null };
        },

        async cancelTableJoinRequest(requestId) {
            const { data, error } = await supabase.rpc('cancel_table_join_request', { p_request_id: String(requestId) });
            return { data: data === true, error: error || null };
        },

        async fetchTableJoinRequests(tableId) {
            const { data, error } = await supabase.rpc('fetch_table_join_requests', { p_table_id: String(tableId) });
            return { data: Array.isArray(data) ? data : [], error: error || null };
        },

        async resolveTableJoinRequest(requestId, approved, reason = '') {
            const { data, error } = await supabase.rpc('resolve_table_join_request', { p_request_id: String(requestId), p_approved: !!approved, p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async createTableRecruitmentInvite(tableId, scope, targetUsername = '', message = '', expiresAt = null) {
            const { data, error } = await supabase.rpc('create_table_recruitment_invite', { p_table_id: String(tableId), p_scope: String(scope), p_target_username: targetUsername ? String(targetUsername) : null, p_message: String(message || ''), p_expires_at: expiresAt || null });
            return { data: data || null, error: error || null };
        },

        async acceptTableRecruitmentInvite(inviteId, characterId) {
            const { data, error } = await supabase.rpc('accept_table_recruitment_invite', { p_invite_id: String(inviteId), p_character_id: String(characterId) });
            return { data: data || null, error: error || null };
        },

        async cancelTableRecruitmentInvite(inviteId) {
            const { data, error } = await supabase.rpc('cancel_table_recruitment_invite', { p_invite_id: String(inviteId) });
            return { data: data === true, error: error || null };
        },

        async fetchTableRecruitmentInvites(tableId) {
            const { data, error } = await supabase.rpc('fetch_table_recruitment_invites', { p_table_id: String(tableId) });
            return { data: Array.isArray(data) ? data : [], error: error || null };
        },

        async updateTableRecruitment(tableId, gameMode, description, recruitment) {
            const { data, error } = await supabase.rpc('update_table_recruitment_secure', { p_table_id: String(tableId), p_game_mode: String(gameMode), p_description: String(description || ''), p_recruitment: recruitment || {} });
            return { data: data || null, error: error || null };
        },

        async touchTablePresence(tableId, online = true) {
            const { data, error } = await supabase.rpc('touch_table_presence', { p_table_id: String(tableId), p_online: !!online });
            return { data: data === true, error: error || null };
        },

        async fetchCharacterView(characterId, tableId = null) {
            const { data, error } = await supabase.rpc('fetch_character_view', { p_character_id: String(characterId), p_table_id: tableId ? String(tableId) : null });
            return { data: data || null, error: error || null };
        },

        async fetchProgressionTableState(tableId) {
            const { data, error } = await supabase.rpc('progression_table_state', { p_table_id: String(tableId) });
            return { data: data || null, error: error || null };
        },

        async buyTableProgressionPoints(tableId, points) {
            const { data, error } = await supabase.rpc('progression_buy_table_points', { p_table_id: String(tableId), p_points: Number(points || 0) });
            return { data: data || null, error: error || null };
        },

        async grantCharacterProgression(tableId, characterId, amount, reason) {
            const { data, error } = await supabase.rpc('progression_grant_character', { p_table_id: String(tableId), p_character_id: String(characterId), p_amount: Number(amount || 0), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async recordCareerSuccess(tableId, characterId, amount, reason) {
            const { data, error } = await supabase.rpc('progression_record_career_success', { p_table_id: String(tableId), p_character_id: String(characterId), p_amount: Number(amount || 0), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async reverseProgressionGrant(transactionId, reason = '') {
            const { data, error } = await supabase.rpc('progression_reverse_grant', { p_transaction_id: Number(transactionId), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async upgradeProgressionAttribute(tableId, characterId, attribute) {
            const { data, error } = await supabase.rpc('progression_upgrade_attribute', { p_table_id: String(tableId), p_character_id: String(characterId), p_attribute: String(attribute || '') });
            return { data: data || null, error: error || null };
        },

        async submitProgressionProposal(tableId, characterId, payload, requestedCost, note = '') {
            const { data, error } = await supabase.rpc('progression_submit_proposal', { p_table_id: String(tableId), p_character_id: String(characterId), p_payload: payload || {}, p_requested_cost: Number(requestedCost || 0), p_note: String(note || '') });
            return { data: data || null, error: error || null };
        },

        async resolveProgressionProposal(proposalId, approved, finalCost = null, reason = '') {
            const { data, error } = await supabase.rpc('progression_resolve_proposal', { p_proposal_id: String(proposalId), p_approved: !!approved, p_final_cost: finalCost == null ? null : Number(finalCost), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async adjustCharacterResource(tableId, characterId, resourceKey, delta, reason) {
            const { data, error } = await supabase.rpc('progression_adjust_resource', { p_table_id: String(tableId), p_character_id: String(characterId), p_resource_key: String(resourceKey || ''), p_delta: Number(delta || 0), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async requestCharacterResource(tableId, characterId, resourceKey, delta, reason) {
            const { data, error } = await supabase.rpc('progression_request_resource', { p_table_id: String(tableId), p_character_id: String(characterId), p_resource_key: String(resourceKey || ''), p_delta: Number(delta || 0), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async resolveCharacterResourceRequest(requestId, approved) {
            const { data, error } = await supabase.rpc('progression_resolve_resource', { p_request_id: String(requestId), p_approved: !!approved });
            return { data: data || null, error: error || null };
        },

        async fetchProgressionAdminTables() {
            const { data, error } = await supabase.rpc('progression_admin_tables');
            return { data: Array.isArray(data) ? data : [], error: error || null };
        },

        async fetchProgressionAdminTableLedger(tableId, limit = 100) {
            const { data, error } = await supabase.rpc('progression_admin_table_ledger', { p_table_id: String(tableId), p_limit: Number(limit || 100) });
            return { data: data || null, error: error || null };
        },

        async adminAdjustTableProgression(tableId, amount, reason) {
            const { data, error } = await supabase.rpc('progression_admin_adjust_table', { p_table_id: String(tableId), p_amount: Number(amount || 0), p_reason: String(reason || '') });
            return { data: data || null, error: error || null };
        },

        async subscribeTableDirectory(onRefresh, onStatus) {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.access_token && typeof supabase.realtime.setAuth === 'function') await supabase.realtime.setAuth(sessionData.session.access_token);
            } catch (_) {}
            const channel = supabase.channel('ms:lobby', { config: { private: true, broadcast: { self: false } } });
            channel.on('broadcast', { event: 'lobby:refresh' }, msg => { try { onRefresh?.(msg?.payload || msg); } catch (_) {} });
            channel.subscribe(status => { try { onStatus?.(status); } catch (_) {} });
            return () => { try { supabase.removeChannel(channel); } catch (_) {} };
        },

        async publishTableEvent(tableId, eventType, payload = {}, options = {}) {
            const id = String(tableId);
            const clientEventId = options.clientEventId || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : null);
            const { data, error } = await supabase.rpc('append_table_event_v3', {
                p_table_id: id, p_event_type: String(eventType), p_payload: payload || {}, p_client_event_id: clientEventId
            });
            if (!error) {
                // O Broadcast disparado pelo gatilho do banco chega com alguns segundos de atraso.
                // Retransmite a linha já gravada pelo canal aberto para entrega imediata;
                // os receptores descartam a cópia do gatilho pelo mesmo id.
                const live = activeRealtimeChannels.get(id)?.channel;
                if (live && data?.id) {
                    Promise.resolve(live.send({ type: 'broadcast', event: 'table:event', payload: data }))
                        .catch(err => console.warn('[Mundos Sombrios] Broadcast imediato falhou; o gatilho do banco entrega:', err));
                }
                return { data: data || null, error: null };
            }
            // Compatibilidade controlada com instalações ainda sem a migração V2.7.
            if (!/append_table_event_v3|schema cache|function/i.test(String(error.message || error))) return { data: null, error };
            const actorId = String(window.currentUser?.authUserId || window.currentUser?.id || '');
            const legacy = await supabase.from(tableNames.table_events).insert({ table_id:id,event_type:String(eventType),payload:payload||{},actor_id:actorId||null }).select().maybeSingle();
            if (legacy.error) return legacy;
            try { await api.broadcastTableEvent(id,eventType,payload,{id:legacy.data?.id}); } catch (broadcastError) { console.warn('[Mundos Sombrios] Broadcast legado indisponível; evento persistido:',broadcastError); }
            return { data: legacy.data, error: null };
        },

        async fetchTableEvents(tableId, limit = 200) {
            const { data, error } = await supabase.from(tableNames.table_events).select('*').eq('table_id', String(tableId)).order('id', { ascending: true }).limit(limit);
            return { data: Array.isArray(data) ? data : [], error };
        },

        async fetchTableEventsAfter(tableId, afterId = 0, limit = 500) {
            let q=supabase.from(tableNames.table_events).select('*').eq('table_id',String(tableId)).order('id',{ascending:true}).limit(limit);
            if(Number(afterId)>0) q=q.gt('id',Number(afterId));
            const {data,error}=await q; return {data:Array.isArray(data)?data:[],error};
        },

        async subscribeTable(tableId, handlers = {}) {
            const id = String(tableId);
            const onEvent = typeof handlers === 'function' ? handlers : handlers?.event;
            const onPresence = typeof handlers?.presence === 'function' ? handlers.presence : null;
            const onStatus = typeof handlers?.status === 'function' ? handlers.status : null;
            if (!id) return () => {};
            const entry = { onEvent, onPresence, onStatus };
            const unsubscribe = () => {
                const current = activeRealtimeChannels.get(id);
                const first = current?.handlers;
                const target = [...(first || [])].find(x => x === entry || (x.onEvent === onEvent && x.onPresence === onPresence && x.onStatus === onStatus));
                if (target) first.delete(target);
                if (first && first.size === 0) { try { supabase.removeChannel(current.channel); } catch (_) {} activeRealtimeChannels.delete(id); }
            };
            if (activeRealtimeChannels.has(id)) {
                const existing = activeRealtimeChannels.get(id);
                existing.handlers.add(entry);
                onPresence?.(existing.channel.presenceState());
                return unsubscribe;
            }
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.access_token && typeof supabase.realtime.setAuth === 'function') await supabase.realtime.setAuth(sessionData.session.access_token);
            } catch (_) {}
            const channel = supabase.channel(`ms:table:${id}`, { config: { private: true, broadcast: { ack: true, self: false }, presence: { key: String(window.currentUser?.id || 'anonymous') } } });
            const handlersSet = new Set([entry]);
            const notify = (fn, payload) => handlersSet.forEach(h => { try { h[fn]?.(payload); } catch (e) { console.warn('[Mundos Sombrios] Realtime handler:', e); } });
            channel.on('broadcast', { event: 'table:event' }, msg => notify('onEvent', msg?.payload || msg));
            channel.on('broadcast', { event: 'table:refresh' }, msg => notify('onEvent', { event_type: 'table_refresh', payload: msg?.payload || {} }));
            channel.on('broadcast', { event: 'table:deleted' }, msg => notify('onEvent', { event_type: 'table_deleted', payload: msg?.payload || {} }));
            channel.on('presence', { event: 'sync' }, () => notify('onPresence', channel.presenceState()));
            channel.on('presence', { event: 'join' }, () => notify('onPresence', channel.presenceState()));
            channel.on('presence', { event: 'leave' }, () => notify('onPresence', channel.presenceState()));
            const status = await new Promise(resolve => {
                let done = false;
                channel.subscribe(st => { notify('onStatus', st); if (!done && ['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(st)) { done = true; resolve(st); } });
                setTimeout(() => { if (!done) { done = true; resolve('TIMED_OUT'); } }, 12000);
            });
            if (status !== 'SUBSCRIBED') { try { await supabase.removeChannel(channel); } catch (_) {} throw new Error(`Não foi possível conectar à mesa em tempo real (${status}).`); }
            activeRealtimeChannels.set(id, { channel, handlers: handlersSet });
            try { await channel.track({ user_id: String(window.currentUser?.id || ''), username: String(window.currentUser?.username || 'Jogador'), role: String(window.currentUser?.role || 'jogador'), online_at: new Date().toISOString() }); } catch (_) {}
            return unsubscribe;
        },


        async broadcastTableEvent(tableId, eventType, payload, options = {}) {
            const id = String(tableId);
            if (!id) throw new Error('Mesa inválida.');
            const existing = activeRealtimeChannels.get(id);
            if (existing) {
                return existing.channel.send({ type: 'broadcast', event: 'table:event', payload: { id: options.id || null, table_id: id, event_type: String(eventType), payload: payload || {}, actor_id: String(window.currentUser?.id || ''), created_at: new Date().toISOString() } });
            }
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.access_token && typeof supabase.realtime.setAuth === 'function') await supabase.realtime.setAuth(sessionData.session.access_token);
            } catch (_) {}
            const channel = supabase.channel(`ms:table:${id}`, { config: { private: true, broadcast: { ack: true, self: false } } });
            try {
                const status = await new Promise(resolve => { let done=false; channel.subscribe(st=>{ if(!done&&['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(st)){done=true;resolve(st);} }); setTimeout(()=>{if(!done){done=true;resolve('TIMED_OUT');}},12000); });
                if (status !== 'SUBSCRIBED') throw new Error(`Canal da mesa indisponível (${status}).`);
                return await channel.send({ type: 'broadcast', event: 'table:event', payload: { id: options.id || null, table_id: id, event_type: String(eventType), payload: payload || {}, actor_id: String(window.currentUser?.id || ''), created_at: new Date().toISOString() } });
            } finally { try { await supabase.removeChannel(channel); } catch (_) {} }
        },

        async saveTableState(tableId, state) {
            const { data, error } = await supabase.from(tableNames.table_state).upsert({ table_id: String(tableId), state: state || {} }, { onConflict: 'table_id' }).select().maybeSingle();
            return { data, error };
        },

        async fetchTableState(tableId) {
            const { data, error } = await supabase.from(tableNames.table_state).select('state').eq('table_id', String(tableId)).maybeSingle();
            return { data: data?.state || null, error };
        },

        async saveGMNote(tableId, note) {
            const { data, error } = await supabase.from(tableNames.gm_notes).upsert({ id: String(note.id), table_id: String(tableId), payload: note }, { onConflict: 'id' }).select().maybeSingle();
            return { data, error };
        },

        async deleteGMNote(noteId) {
            const { data, error } = await supabase.from(tableNames.gm_notes).delete().eq('id', String(noteId));
            return { data, error };
        },

        async fetchGMNotes(tableId) {
            const { data, error } = await supabase.from(tableNames.gm_notes).select('payload').eq('table_id', String(tableId)).order('updated_at', { ascending: false });
            return { data: (data || []).map(row => row.payload).filter(Boolean), error };
        },

        async saveGMNpc(tableId, npc) {
            const { data, error } = await supabase.from(tableNames.gm_npcs).upsert({ id: String(npc.id), table_id: String(tableId), payload: npc }, { onConflict: 'id' }).select().maybeSingle();
            return { data, error };
        },

        async deleteGMNpc(npcId) {
            const { data, error } = await supabase.from(tableNames.gm_npcs).delete().eq('id', String(npcId));
            return { data, error };
        },

        async fetchGMNpcs(tableId) {
            const { data, error } = await supabase.from(tableNames.gm_npcs).select('payload').eq('table_id', String(tableId)).order('updated_at', { ascending: false });
            return { data: (data || []).map(row => row.payload).filter(Boolean), error };
        },

        async uploadGMFile(tableId, file) {
            const session = await this.getSession();
            if (!session.user) return { data: null, error: new Error('Sessão ausente.') };
            const safe = String(file.name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${session.user.id}/${String(tableId)}/${Date.now()}-${safe}`;
            const { data: upload, error: uploadError } = await supabase.storage.from('gm-assets').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
            if (uploadError) return { data: null, error: uploadError };
            const { data, error } = await supabase.from(tableNames.gm_files).insert({ table_id: String(tableId), path, name: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size || 0 }).select().maybeSingle();
            return { data, error };
        },

        async fetchGMFiles(tableId) {
            const { data, error } = await supabase.from(tableNames.gm_files).select('*').eq('table_id', String(tableId)).order('created_at', { ascending: false });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async createSignedGMFileUrl(path, expiresIn = 3600) {
            const { data, error } = await supabase.storage.from('gm-assets').createSignedUrl(String(path), expiresIn);
            return { data, error };
        },

        async deleteGMFile(id, path) {
            const { error: storageError } = await supabase.storage.from('gm-assets').remove([String(path)]);
            const { data, error } = await supabase.from(tableNames.gm_files).delete().eq('id', String(id));
            return { data, error: error || storageError || null };
        },

        async saveProfile(profile) {
            const session = await this.getSession();
            if (!session.user) return null;
            const patch = {
                username: String(profile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || '').trim(),
                email: String(session.user.email || profile?.email || '').trim(),
                data: profile?.data && typeof profile.data === 'object' ? profile.data : {}
            };
            // Nunca reescreve id/role/status durante sincronização comum de perfil.
            const { data, error } = await supabase.from(tableNames.profiles)
                .update(patch).eq('auth_user_id', session.user.id).select().maybeSingle();
            if (error) console.warn('[Mundos Sombrios] saveProfile falhou:', error);
            if (data) return data;
            return this.ensureMyProfile(profile || {});
        },

        async fetchUsers() {
            const { data, error } = await runQuery(tableNames.profiles, (table) =>
                supabase.from(table).select('*').order('created_at', { ascending: false })
            );
            if (error) return [];
            return Array.isArray(data) ? data : [];
        },

        async updateCharacterAsGM(tableId, character) {
            if (!tableId || !character?.id) return null;
            const { data, error } = await supabase.rpc('gm_update_character', {
                p_table_id: String(tableId),
                p_character_id: String(character.id),
                p_name: String(character.name || ''),
                p_mode: String(character.mode || 'exodo'),
                p_nature: character.nature || null,
                p_class_name: character.className || null,
                p_payload: character
            });
            if (error) {
                console.warn('[Mundos Sombrios] updateCharacterAsGM falhou:', error);
                return null;
            }
            return data || null;
        },

        async fetchMyCharacters() {
            const session = await this.getSession();
            if (!session.user) return { data: [], error: new Error('Sessão ausente.') };
            const { data, error } = await supabase.from(tableNames.characters).select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async saveCharacter(character) {
            const payload = normalizeCharacterPayload(character);
            if (!payload) return { data: null, error: new Error('Ficha inválida.') };
            const { data, error } = await supabase.rpc('save_character_secure', {
                p_id: payload.id, p_name: payload.name, p_mode: payload.mode, p_nature: payload.nature || null,
                p_class_name: payload.class_name || null, p_payload: payload.payload || {}
            });
            if (error) console.warn('[Mundos Sombrios] saveCharacter falhou:', error);
            return { data: data || null, error };
        },

        async deleteMyCharacter(characterId) {
            const { data, error } = await supabase.rpc('delete_my_character', { p_character_id: String(characterId) });
            return { data, error };
        },

        async fetchCharacterVersions(characterId) {
            const { data, error } = await supabase.from('character_versions').select('*').eq('character_id', String(characterId)).order('version_no', { ascending: false });
            return { data: Array.isArray(data) ? data : [], error };
        },

        async restoreCharacterVersion(characterId, versionId) {
            const { data, error } = await supabase.rpc('restore_character_version', { p_character_id: String(characterId), p_version_id: String(versionId) });
            return { data, error };
        },

        async fetchCharacters() {
            const { data, error } = await runQuery(tableNames.characters, (tableName) =>
                supabase.from(tableName).select('*').order('updated_at', { ascending: false })
            );
            if (error) return [];
            return Array.isArray(data) ? data : [];
        },

        async saveAdminRequest(request) {
            if (!request) return null;
            const payload = {
                id: String(request.id || 'req-' + Date.now()),
                user_id: String(request.userId || request.user_id || 'system'),
                username: String(request.username || 'desconhecido'),
                status: request.status || 'pending',
                created_at: request.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (request.data && typeof request.data === 'object' && Object.keys(request.data).length) {
                payload.data = request.data;
            }
            const { data, error } = await runQuery(tableNames.admin_requests, (tableName) =>
                supabase.from(tableName).upsert(payload, { onConflict: 'id' }).select()
            );
            if (error) console.warn('[Mundos Sombrios] saveAdminRequest falhou:', error);
            return data && data[0] ? data[0] : null;
        },

        async fetchAdminRequests() {
            const { data, error } = await runQuery(tableNames.admin_requests, (tableName) =>
                supabase.from(tableName).select('*').order('created_at', { ascending: false })
            );
            if (error) return [];
            return Array.isArray(data) ? data : [];
        },

        async updateAdminRequestStatus(requestId, status, dataPayload) {
            const patch = { status: String(status || 'pending'), updated_at: new Date().toISOString() };
            if (dataPayload && typeof dataPayload === 'object') patch.data = dataPayload;
            const { data, error } = await runQuery(tableNames.admin_requests, (tableName) =>
                supabase.from(tableName).update(patch).eq('id', String(requestId)).select().maybeSingle()
            );
            if (error) console.warn('[Mundos Sombrios] updateAdminRequestStatus falhou:', error);
            return data || null;
        },

        async resolveAdminRequestSecure(requestId, approved) {
            const id=String(requestId);
            const primary=await supabase.rpc('resolve_admin_request_secure', { p_request_id: id, p_approved: !!approved });
            if (!primary.error) return { data: primary.data || null, error: null };

            // Compatibilidade para instalações que ainda não aplicaram a RPC V2.8.2.
            // Mantém autorização no backend: leitura/UPDATE de admin_requests dependem de RLS
            // e elevação de papel usa admin_set_user_role (SECURITY DEFINER + ADMIN_REQUIRED).
            const code=String(primary.error?.code||'');
            const msg=String(primary.error?.message||'');
            const fallbackAllowed=code==='PGRST202'||code==='42883'||/resolve_admin_request_secure|schema cache|request_user_not_found/i.test(msg);
            if(!fallbackAllowed)return { data:null,error:primary.error };

            const reqResult=await supabase.from(tableNames.admin_requests).select('*').eq('id',id).maybeSingle();
            if(reqResult.error||!reqResult.data)return {data:null,error:reqResult.error||new Error('REQUEST_NOT_FOUND')};
            const req=reqResult.data;
            if(String(req.status||'pending').toLowerCase()!=='pending')return {data:req,error:null};

            if(approved){
                const requestType=String(req.data?.type||'master_role').toLowerCase();
                if(requestType==='master_role'||requestType==='admin_role'){
                    const profiles=await this.fetchUsers();
                    const requestUser=String(req.user_id||'');
                    const requestName=String(req.username||'').toLowerCase();
                    const target=(Array.isArray(profiles)?profiles:[]).find(profile=>
                        String(profile.auth_user_id||'')===requestUser ||
                        String(profile.id||'')===requestUser ||
                        String(profile.username||'').toLowerCase()===requestName
                    );
                    if(!target)return {data:null,error:new Error('REQUEST_USER_NOT_FOUND')};
                    const roleResult=await this.adminSetUserRole(target.id,requestType==='admin_role'?'admin':'mestre');
                    if(roleResult?.error)return {data:null,error:roleResult.error};
                }
            }
            const patch={status:approved?'approved':'rejected',updated_at:new Date().toISOString()};
            const resolved=await supabase.from(tableNames.admin_requests).update(patch).eq('id',id).select().maybeSingle();
            return {data:resolved.data||null,error:resolved.error||null};
        },

        async silenceAdminRequestSecure(requestId) {
            const { data, error } = await supabase.rpc('silence_admin_request_secure', { p_request_id: String(requestId) });
            return { data: data || null, error: error || null };
        },

        async deleteAdminRequestSecure(requestId) {
            const { data, error } = await supabase.rpc('delete_admin_request_secure', { p_request_id: String(requestId) });
            return { data: data === true, error: error || null };
        },

        async saveSiteContent(content, key = 'portal-official') {
            if (!content || typeof content !== 'object') return null;
            const payload = {
                key: String(key),
                content: content,
                updated_at: new Date().toISOString()
            };
            const { data, error } = await runQuery(tableNames.site_content, (tableName) =>
                supabase.from(tableName).upsert(payload, { onConflict: 'key' }).select()
            );
            if (error) console.warn('[Mundos Sombrios] saveSiteContent falhou:', error);
            return data && data[0] ? data[0] : null;
        },

        async fetchSiteContent(key = 'portal-official') {
            const { data, error } = await runQuery(tableNames.site_content, (tableName) =>
                supabase.from(tableName).select('*').eq('key', String(key)).maybeSingle()
            );
            if (error) return null;
            if (!data) return null;
            return data.content && typeof data.content === 'object' ? data.content : {};
        },

        async savePost(post) {
            if (!post) return null;
            const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            const id = String(post.id || 'post-' + suffix);
            const rawSlug = String(post.slug || post.id || 'post-' + suffix).trim();
            const slug = rawSlug
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'post-' + suffix;
            const payload = {
                id,
                slug: `${slug}-${suffix}`,
                type: String(post.type || 'post'),
                title: String(post.title || 'Post sem título'),
                subtitle: post.subtitle || '',
                summary: post.summary || '',
                body: post.body || '',
                category: post.category || '',
                world: post.world || '',
                status: post.status || 'draft',
                published: !!post.published,
                metadata: post.metadata || {},
                created_at: post.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { data, error } = await runQuery(tableNames.posts, (tableName) =>
                supabase.from(tableName).upsert(payload, { onConflict: 'id' }).select()
            );
            if (error) console.warn('[Mundos Sombrios] savePost falhou:', error);
            return data && data[0] ? data[0] : null;
        },

        async deletePost(id) {
            if (!id) return false;
            const { error } = await runQuery(tableNames.posts, (tableName) =>
                supabase.from(tableName).delete().eq('id', String(id))
            );
            if (error) { console.warn('[Mundos Sombrios] deletePost falhou:', error); return false; }
            return true;
        },

        async fetchPosts() {
            const { data, error } = await runQuery(tableNames.posts, (tableName) =>
                supabase.from(tableName).select('*').order('created_at', { ascending: false })
            );
            if (error) return [];
            return Array.isArray(data) ? data : [];
        },

        async fetchMapPoints() {
            const rows = await this.fetchSiteSettings();
            const row = rows.find(x => x.key === 'master_shield_map_points');
            return Array.isArray(row?.value?.points) ? row.value.points : null;
        },

        async saveMapPoints(points) {
            if (!Array.isArray(points)) return null;
            return this.saveSiteSetting('master_shield_map_points', {
                version: 2,
                points,
                updatedBy: String(window.currentUser?.id || ''),
                updatedAt: new Date().toISOString()
            });
        },

        async fetchGlobalEconomy() {
            const rows = await this.fetchSiteSettings();
            const row = rows.find(x => x.key === 'master_shield_global_economy');
            return row?.value && typeof row.value === 'object' ? row.value : null;
        },

        async saveGlobalEconomy(state) {
            if (!state || typeof state !== 'object') return null;
            return this.saveSiteSetting('master_shield_global_economy', {
                ...state,
                updatedBy: String(window.currentUser?.id || ''),
                updatedAt: new Date().toISOString()
            });
        },

        async saveSiteSetting(key, value) {
            const payload = {
                key: String(key),
                value: value ?? {},
                updated_at: new Date().toISOString()
            };
            const { data, error } = await runQuery(tableNames.site_settings, (tableName) =>
                supabase.from(tableName).upsert(payload, { onConflict: 'key' }).select()
            );
            if (error) console.warn('[Mundos Sombrios] saveSiteSetting falhou:', error);
            return data && data[0] ? data[0] : null;
        },

        async fetchSiteSettings() {
            const { data, error } = await runQuery(tableNames.site_settings, (tableName) =>
                supabase.from(tableName).select('*').order('updated_at', { ascending: false })
            );
            if (error) return [];
            return Array.isArray(data) ? data : [];
        },

        async uploadPortalMedia(file) {
            if (!file || typeof file === 'undefined') return null;
            const type = String(file.type || '').toLowerCase();
            const kind = type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : null;
            if (!kind) throw new Error('Selecione uma imagem ou vídeo válido.');
            const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            const safeName = String(file.name || `${kind}-${suffix}`).replace(/\s+/g, '-');
            const path = `portal-media/${suffix}-${safeName}`;
            const { data, error } = await supabase.storage.from('portal-media').upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'application/octet-stream'
            });
            if (error) {
                console.warn('[Mundos Sombrios] uploadPortalMedia falhou:', error);
                return null;
            }
            const publicUrl = supabase.storage.from('portal-media').getPublicUrl(path).data?.publicUrl || '';
            return {
                id: path,
                path,
                name: safeName,
                kind,
                type,
                url: publicUrl,
                createdAt: new Date().toISOString()
            };
        },

        async removePortalMedia(path) {
            if (!path) return true;
            try {
                const { error } = await supabase.storage.from('portal-media').remove([String(path)]);
                if (error) {
                    console.warn('[Mundos Sombrios] removePortalMedia falhou:', error);
                    return false;
                }
                return true;
            } catch (error) {
                console.warn('[Mundos Sombrios] removePortalMedia falhou:', error);
                return false;
            }
        },

        async getPortalMediaUrl(path) {
            if (!path) return '';
            try {
                const { data } = supabase.storage.from('portal-media').getPublicUrl(String(path));
                return data?.publicUrl || '';
            } catch (error) {
                console.warn('[Mundos Sombrios] getPortalMediaUrl falhou:', error);
                return '';
            }
        },

        async rpc(name, args = {}) {
            const { data, error } = await supabase.rpc(String(name || ''), args || {});
            return { data: data ?? null, error: error || null };
        },

        async syncUserState(snapshot) {
            // V2.8.1: login/hidratação é estritamente leitura. Perfil e fichas só são
            // persistidos quando o usuário executa uma ação explícita de edição.
            return snapshot ? { synced: false, reason: 'read-only-login' } : null;
        }
    };

    window.MS_DB = api;
})();
