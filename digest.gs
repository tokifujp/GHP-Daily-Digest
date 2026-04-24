/**
 * digest.gs
 * 1. Google Doc (GHP / Slack キャッシュ) を読み込む
 * 2. 前日スナップショット Doc と差分計算
 * 3. Claude API でダイジェスト生成
 * 4. Slack DM に送信
 * 5. 当日スナップショットを Doc に上書き保存
 * 6. 蓄積 Doc に追記（NotebookLM 連携用）
 *
 * トリガー: 毎日 9:00〜10:00 JST（ghp-cache / slack-cache の完了後）
 *
 * 必要なスクリプトプロパティ:
 *   ANTHROPIC_API_KEY    ... Anthropic API キー
 *   SLACK_BOT_TOKEN      ... Slack Bot Token (chat:write, im:write スコープ)
 *   SLACK_USER_ID        ... 送信先ユーザーID
 *   GHP_DOC_ID           ... GHP キャッシュ Google Doc ID
 *   SLACK_DOC_ID         ... Slack キャッシュ Google Doc ID
 *   SNAPSHOT_DOC_ID      ... 前日スナップショット保存用 Google Doc ID
 *   DIGEST_DOC_ID        ... 蓄積用 Google Doc ID（NotebookLM 連携用、省略可）
 *   PROJECT_NAME         ... ダイジェスト内に表示するプロジェクト名（例: MyProject）
 *   SLACK_CHANNEL_LABEL  ... ダイジェスト内に表示するチャンネル名（例: #dev-general）
 */

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

function runDigest() {
  const props           = PropertiesService.getScriptProperties();
  const anthropicKey    = props.getProperty("ANTHROPIC_API_KEY");
  const slackToken      = props.getProperty("SLACK_BOT_TOKEN");
  const slackUserId     = props.getProperty("SLACK_USER_ID");
  const ghpDocId        = props.getProperty("GHP_DOC_ID");
  const slackDocId      = props.getProperty("SLACK_DOC_ID");
  const snapshotDocId   = props.getProperty("SNAPSHOT_DOC_ID");
  const digestDocId     = props.getProperty("DIGEST_DOC_ID");   // 省略可
  const projectName     = props.getProperty("PROJECT_NAME")     || "Project";
  const channelLabel    = props.getProperty("SLACK_CHANNEL_LABEL") || "#channel";

  if (!anthropicKey)  { console.error("ANTHROPIC_API_KEY が未設定"); return; }
  if (!slackToken)    { console.error("SLACK_BOT_TOKEN が未設定");   return; }
  if (!slackUserId)   { console.error("SLACK_USER_ID が未設定");     return; }
  if (!ghpDocId)      { console.error("GHP_DOC_ID が未設定");        return; }
  if (!slackDocId)    { console.error("SLACK_DOC_ID が未設定");      return; }
  if (!snapshotDocId) { console.error("SNAPSHOT_DOC_ID が未設定");   return; }

  // 1. キャッシュ読み込み
  // ユーザー名解決は slack-cache.gs 側で実施済み
  const ghpJson   = readDocJson(ghpDocId,   "GHP");
  const slackJson = readDocJson(slackDocId, "Slack");

  // 2. 前日スナップショット読み込み & 差分計算
  const { diff } = calcDiff(snapshotDocId, ghpJson);

  // 3. Claude API でダイジェスト生成
  const ghpJsonTrimmed = trimGhpData(ghpJson);
  const digest = generateDigest(anthropicKey, ghpJsonTrimmed, slackJson, diff, projectName, channelLabel);

  // 4. Slack DM 送信
  sendSlackDm(slackToken, slackUserId, digest);

  // 5. 当日スナップショットを上書き保存
  if (ghpJson) saveSnapshot(snapshotDocId, ghpJson);

  // 6. 蓄積 Doc に追記（省略可）
  if (digestDocId) {
    const now    = new Date();
    const jst    = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const dateStr = formatDate(jst);
    saveDigestDoc(digestDocId, digest, dateStr, slackToken, slackUserId);
  }

  console.log("ダイジェスト送信完了");
}

// ─────────────────────────────────────────
// Google Doc → JSON
// ─────────────────────────────────────────

function readDocJson(docId, label) {
  try {
    const doc = DocumentApp.openById(docId);
    const raw = doc.getBody().getText();
    const once = JSON.parse(raw);
    return typeof once === "string" ? JSON.parse(once) : once;
  } catch (e) {
    console.error(`${label} Doc 読み込みエラー: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────
// GHP data[] を直近24時間に絞る（トークン節約）
// ─────────────────────────────────────────

function trimGhpData(ghpJson) {
  if (!ghpJson) return null;
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const recent = (ghpJson.data || []).filter(item =>
    item.updatedAt && new Date(item.updatedAt) >= cutoff
  );
  return {
    ...ghpJson,
    item_count_recent: recent.length,
    data: recent.map(item => ({
      ...item,
      lastComment: item.lastComment
        ? { ...item.lastComment, body: (item.lastComment.body || "").slice(0, 200) }
        : null
    }))
  };
}

// ─────────────────────────────────────────
// 差分計算
// ─────────────────────────────────────────

function calcDiff(snapshotDocId, todayJson) {
  let prevSnapshot = null;
  try {
    const doc = DocumentApp.openById(snapshotDocId);
    const raw = doc.getBody().getText().trim();
    if (raw) {
      const once = JSON.parse(raw);
      prevSnapshot = typeof once === "string" ? JSON.parse(once) : once;
    }
  } catch (e) {
    console.warn("前日スナップショット読み込み失敗:", e.message);
  }

  if (!prevSnapshot || !todayJson) {
    return {
      diff: { available: false, reason: prevSnapshot ? "当日データなし" : "初回ベースライン（前日データなし）" },
      prevSnapshot
    };
  }

  const prevMap  = Object.fromEntries((prevSnapshot.data || []).map(i => [i.number, i]));
  const todayMap = Object.fromEntries((todayJson.data   || []).map(i => [i.number, i]));

  const added   = [];
  const removed = [];
  const changed = [];

  for (const [num, item] of Object.entries(todayMap)) {
    if (!prevMap[num]) added.push({ number: item.number, title: item.title });
  }
  for (const [num, item] of Object.entries(prevMap)) {
    if (!todayMap[num]) removed.push({ number: item.number, title: item.title });
  }
  for (const [num, today] of Object.entries(todayMap)) {
    const prev = prevMap[num];
    if (!prev) continue;
    const changes = {};
    for (const field of ["state", "status"]) {
      if (prev[field] !== today[field]) changes[field] = { from: prev[field], to: today[field] };
    }
    const prevA  = (prev.assignees  || []).slice().sort().join(",");
    const todayA = (today.assignees || []).slice().sort().join(",");
    if (prevA !== todayA) changes.assignees = { from: prev.assignees, to: today.assignees };
    const prevL  = (prev.labels  || []).slice().sort().join(",");
    const todayL = (today.labels || []).slice().sort().join(",");
    if (prevL !== todayL) changes.labels = { from: prev.labels, to: today.labels };
    if (Object.keys(changes).length > 0) changed.push({ number: today.number, title: today.title, changes });
  }

  return {
    diff: {
      available:        true,
      item_count_prev:  prevSnapshot.item_count,
      item_count_today: todayJson.item_count,
      added, removed, changed
    },
    prevSnapshot
  };
}

// ─────────────────────────────────────────
// スナップショット保存
// ─────────────────────────────────────────

function saveSnapshot(docId, data) {
  try {
    const doc  = DocumentApp.openById(docId);
    const body = doc.getBody();
    body.clear();
    body.editAsText().setFontSize(10);
    body.appendParagraph(JSON.stringify(data, null, 2));
    doc.saveAndClose();
    console.log("スナップショット保存完了");
  } catch (e) {
    console.error("スナップショット保存失敗:", e.message);
  }
}

// ─────────────────────────────────────────
// Claude API でダイジェスト生成
// ─────────────────────────────────────────

function generateDigest(apiKey, ghpData, slackData, diff, projectName, channelLabel) {
  const now     = new Date();
  const jst     = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const dateStr = formatDate(jst);
  const weekday = ["日","月","火","水","木","金","土"][jst.getDay()];

  const warnings = [];
  if (!ghpData) {
    warnings.push("⚠️ GHP キャッシュ取得失敗");
  } else {
    const age = (now - new Date(ghpData.generated_at)) / 3600000;
    if (age > 24) warnings.push(`⚠️ GHP キャッシュが古い可能性 (generated_at: ${ghpData.generated_at})`);
  }
  if (!slackData) {
    warnings.push("⚠️ Slack キャッシュ取得失敗");
  } else {
    const age = (now - new Date(slackData.generated_at)) / 3600000;
    if (age > 8) warnings.push(`⚠️ Slack キャッシュが古い可能性 (generated_at: ${slackData.generated_at})`);
  }

  const systemPrompt = `あなたは ${projectName} プロジェクトの朝次ダイジェストを生成するアシスタントです。
以下のルールで Slack mrkdwn 形式のダイジェストを生成してください。

## 出力フォーマット
- 1行目: *📋 ${projectName} Daily Digest — ${dateStr} (${weekday})*
- *GitHub Project* セクション:
  - generated_at / item_count の推移（前日比）
  - 差分サマリ: 追加N件 / 削除N件 / 変更N件
  - 変更内容を箇条書き（state/status/assignees/labelsの変化）
  - 初回の場合はその旨を明記
- *Slack ${channelLabel}* セクション:
  - 主要トピックを箇条書き（発言者・時刻JST・要旨・PRリンク）
  - 要アクションがあれば担当者と対象を明記
- 全体 30 行以内
- mrkdwn 記法: *bold*, _italic_, <URL|text>
- 日本語で出力`;

  const userContent = [
    warnings.length > 0 ? warnings.join("\n") : "",
    "## GHP データ（直近24時間更新分）",
    ghpData ? JSON.stringify(ghpData, null, 2) : "取得失敗",
    "## 前日比較",
    JSON.stringify(diff, null, 2),
    "## Slack データ（ユーザー名解決済み）",
    slackData ? JSON.stringify(slackData, null, 2) : "取得失敗"
  ].filter(Boolean).join("\n\n");

  const res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    headers: {
      "x-api-key":          apiKey,
      "anthropic-version":  "2023-06-01",
      "content-type":       "application/json"
    },
    payload: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userContent }]
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    console.error("Claude API エラー:", res.getContentText());
    return `Claude API エラーのため生成失敗\n${warnings.join("\n")}`;
  }

  return JSON.parse(res.getContentText()).content[0].text;
}

// ─────────────────────────────────────────
// 蓄積 Doc に追記（NotebookLM 連携用）
// ─────────────────────────────────────────

function saveDigestDoc(docId, content, dateStr, slackToken, slackUserId) {
  try {
    const doc  = DocumentApp.openById(docId);
    const body = doc.getBody();

    // 90万文字超えたら警告DM（Google Doc の上限対策）
    const currentLength = body.getText().length;
    if (currentLength > 900000) {
      sendSlackDm(
        slackToken, slackUserId,
        `⚠️ Digest Doc が90万文字を超えました（${currentLength}文字）。新しい Doc を作成して DIGEST_DOC_ID を更新してください。`
      );
      return;
    }

    body.appendParagraph(`\n--- ${dateStr} ---`);
    body.appendParagraph(content);
    doc.saveAndClose();
    console.log(`Doc 保存完了: ${dateStr}`);
  } catch (e) {
    console.error("Doc 保存失敗:", e.message);
  }
}

// ─────────────────────────────────────────
// Slack DM 送信
// ─────────────────────────────────────────

function sendSlackDm(token, userId, text) {
  const openRes = slackPost("conversations.open", token, { users: userId });
  if (!openRes.ok) throw new Error(`conversations.open エラー: ${openRes.error}`);
  const postRes = slackPost("chat.postMessage", token, {
    channel: openRes.channel.id,
    text,
    mrkdwn: true
  });
  if (!postRes.ok) throw new Error(`chat.postMessage エラー: ${postRes.error}`);
}

function slackPost(method, token, payload) {
  const res = UrlFetchApp.fetch(`https://slack.com/api/${method}`, {
    method: "post",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
