/**
 * slack-cache.gs
 * Slack の対象チャンネルから直近N時間のメッセージを取得し、
 * Google Doc に JSON で上書き保存する。
 *
 * トリガー: 平日 7:00〜8:00 JST（digest.gs の実行前に完了させること）
 *
 * 必要なスクリプトプロパティ:
 *   SLACK_BOT_TOKEN    ... Slack Bot Token (channels:history, users:read スコープ)
 *   SLACK_DOC_ID       ... 書き出し先 Google Doc ID
 *   SLACK_CHANNEL_IDS  ... カンマ区切りチャンネルID（例: C012AB3CD,C098ZY7WX）
 *   SLACK_CHANNEL_LABELS ... カンマ区切りのラベル（チャンネルIDと同順）
 *                            例: "dev-general,dev-backend"
 *   SLACK_WORKSPACE_DOMAIN ... Slack ワークスペースのドメイン（例: your-org）
 *                              permalink 生成に使用
 */

// 取得する直近時間数
const FETCH_HOURS = 24;

function fetchSlackMessages() {
  const props            = PropertiesService.getScriptProperties();
  const botToken         = props.getProperty("SLACK_BOT_TOKEN");
  const docId            = props.getProperty("SLACK_DOC_ID");
  const channelIdsRaw    = props.getProperty("SLACK_CHANNEL_IDS")    || "";
  const channelLabelsRaw = props.getProperty("SLACK_CHANNEL_LABELS") || "";
  const workspaceDomain  = props.getProperty("SLACK_WORKSPACE_DOMAIN") || "your-workspace";

  if (!botToken)      { console.error("SLACK_BOT_TOKEN が未設定");   return; }
  if (!docId)         { console.error("SLACK_DOC_ID が未設定");      return; }
  if (!channelIdsRaw) { console.error("SLACK_CHANNEL_IDS が未設定"); return; }

  const channelIds    = channelIdsRaw.split(",").map(s => s.trim()).filter(Boolean);
  const channelLabels = channelLabelsRaw.split(",").map(s => s.trim());

  const now    = new Date();
  const oldest = String((now.getTime() / 1000) - FETCH_HOURS * 3600);

  const userCache = {};
  const channels  = [];

  for (let i = 0; i < channelIds.length; i++) {
    const channelId = channelIds[i];
    const label     = channelLabels[i] || channelId;

    try {
      const messages = fetchChannelHistory(botToken, channelId, oldest, userCache, workspaceDomain);
      channels.push({ channel_id: channelId, label, message_count: messages.length, messages });
      console.log(`${label} (${channelId}): ${messages.length} messages`);
    } catch (e) {
      console.error(`チャンネル ${channelId} 取得エラー:`, e.message);
      channels.push({ channel_id: channelId, label, message_count: 0, messages: [], error: e.message });
    }
  }

  const payload = {
    generated_at: now.toISOString(),
    fetch_hours:  FETCH_HOURS,
    channels
  };

  writeToDoc(docId, JSON.stringify(payload, null, 2));
  console.log("Slack キャッシュ更新完了");
}

/**
 * チャンネルの過去メッセージを取得（ページネーション・スレッド展開対応）
 */
function fetchChannelHistory(token, channelId, oldest, userCache, workspaceDomain) {
  const messages = [];
  let cursor = null;

  do {
    const params = { channel: channelId, oldest, limit: 200, inclusive: true };
    if (cursor) params.cursor = cursor;

    const res = slackGet("conversations.history", token, params);
    if (!res.ok) throw new Error(`conversations.history エラー: ${res.error}`);

    for (const msg of res.messages || []) {
      if (msg.subtype === "channel_join" || msg.subtype === "channel_leave") continue;

      const formatted = formatMessage(msg, token, channelId, userCache, workspaceDomain);

      if (msg.reply_count > 0 && msg.thread_ts === msg.ts) {
        formatted.replies = fetchThreadReplies(token, channelId, msg.thread_ts, userCache, workspaceDomain);
      }

      messages.push(formatted);
    }

    cursor = res.response_metadata?.next_cursor || null;
  } while (cursor);

  messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  return messages;
}

/**
 * スレッド返信を取得
 */
function fetchThreadReplies(token, channelId, threadTs, userCache, workspaceDomain) {
  const replies = [];
  const res = slackGet("conversations.replies", token, { channel: channelId, ts: threadTs, limit: 100 });
  if (!res.ok) return replies;

  for (const msg of res.messages || []) {
    if (msg.ts === threadTs) continue;
    replies.push(formatMessage(msg, token, channelId, userCache, workspaceDomain));
  }
  return replies;
}

/**
 * メッセージを整形する
 */
function formatMessage(msg, token, channelId, userCache, workspaceDomain) {
  const username = resolveUser(msg.user || msg.bot_id, token, userCache);
  const datetime = new Date(parseFloat(msg.ts) * 1000).toISOString();
  const url      = buildMessageUrl(workspaceDomain, channelId, msg.ts);

  return {
    ts: msg.ts,
    datetime,
    user: username,
    text: msg.text || "",
    url,
    ...(msg.subtype ? { subtype: msg.subtype } : {})
  };
}

/**
 * ユーザーIDを real_name / display_name に解決（キャッシュ付き）
 * real_name を優先し、未設定の場合は display_name にフォールバック
 */
function resolveUser(userId, token, cache) {
  if (!userId)       return "unknown";
  if (cache[userId]) return cache[userId];

  try {
    const res = slackGet("users.info", token, { user: userId });
    if (res.ok) {
      const name = res.user?.profile?.real_name || res.user?.profile?.display_name || userId;
      cache[userId] = name;
      return name;
    }
  } catch (_) { /* 解決できなければ ID をそのまま使う */ }

  cache[userId] = userId;
  return userId;
}

/**
 * Slack メッセージの permalink URL を組み立てる
 */
function buildMessageUrl(workspaceDomain, channelId, ts) {
  const tsSafe = ts.replace(".", "");
  return `https://${workspaceDomain}.slack.com/archives/${channelId}/p${tsSafe}`;
}

/** Slack Web API GET ラッパー */
function slackGet(method, token, params) {
  const qs  = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const res = UrlFetchApp.fetch(`https://slack.com/api/${method}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

/** Google Doc の本文を JSON テキストで上書きする */
function writeToDoc(docId, content) {
  const doc  = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.clear();
  body.editAsText().setFontSize(10);
  body.appendParagraph(content);
  doc.saveAndClose();
}

/** 平日判定（JST） */
function isWeekday() {
  const jst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const day = jst.getDay();
  return day !== 0 && day !== 6;
}

/** トリガー用エントリポイント（平日ガード付き） */
function runIfWeekday() {
  if (!isWeekday()) { console.log("土日のため実行スキップ"); return; }
  fetchSlackMessages();
}
