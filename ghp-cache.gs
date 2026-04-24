/**
 * ghp-cache.gs
 * GitHub Project のアイテムを取得し、Google Doc に JSON で上書き保存する。
 *
 * トリガー: 平日 7:00〜8:00 JST（digest.gs の実行前に完了させること）
 *
 * 必要なスクリプトプロパティ:
 *   GITHUB_TOKEN   ... GitHub PAT (read:project, read:org スコープ)
 *   GHP_DOC_ID     ... 書き出し先 Google Doc ID
 *   GH_ORG_LOGIN   ... GitHub Organization のログイン名（例: your-org）
 *   GH_PROJECT_NUMBER ... GitHub Project の番号（例: 42）
 */

// 取得対象: OPEN または直近N日以内に更新されたもの
const FILTER_DAYS = 90;
const FILTER_DESCRIPTION = `state=OPEN OR updatedAt within ${FILTER_DAYS} days`;

function fetchGHPItems() {
  const props          = PropertiesService.getScriptProperties();
  const token          = props.getProperty("GITHUB_TOKEN");
  const docId          = props.getProperty("GHP_DOC_ID");
  const orgLogin       = props.getProperty("GH_ORG_LOGIN");
  const projectNumber  = Number(props.getProperty("GH_PROJECT_NUMBER"));

  if (!token)         { console.error("GITHUB_TOKEN が未設定");        return; }
  if (!docId)         { console.error("GHP_DOC_ID が未設定");          return; }
  if (!orgLogin)      { console.error("GH_ORG_LOGIN が未設定");        return; }
  if (!projectNumber) { console.error("GH_PROJECT_NUMBER が未設定");   return; }

  try {
    const items = fetchProjectItems(token, orgLogin, projectNumber);
    const now = new Date();
    const cutoff = new Date(now.getTime() - FILTER_DAYS * 24 * 60 * 60 * 1000);

    const filtered = items.filter(item => {
      if (item.state === "OPEN") return true;
      if (item.updatedAt && new Date(item.updatedAt) >= cutoff) return true;
      return false;
    });

    const payload = {
      generated_at:      now.toISOString(),
      org:               orgLogin,
      project_number:    projectNumber,
      slot:              "morning",
      item_count_total:  items.length,
      item_count:        filtered.length,
      filter:            FILTER_DESCRIPTION,
      data:              filtered
    };

    writeToDoc(docId, JSON.stringify(payload, null, 2));
    console.log(`GHP キャッシュ更新完了: ${filtered.length}/${items.length} items`);
  } catch (e) {
    console.error("fetchGHPItems エラー:", e.message);
    throw e;
  }
}

/**
 * GitHub GraphQL API でプロジェクトアイテムを全件取得（ページネーション対応）
 */
function fetchProjectItems(token, orgLogin, projectNumber) {
  const items = [];
  let cursor = null;

  do {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `
      query {
        organization(login: "${orgLogin}") {
          projectV2(number: ${projectNumber}) {
            items(first: 100${afterClause}) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                updatedAt
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field { ... on ProjectV2SingleSelectField { name } }
                    }
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field { ... on ProjectV2Field { name } }
                    }
                    ... on ProjectV2ItemFieldUserValue {
                      users(first: 5) { nodes { login } }
                      field { ... on ProjectV2Field { name } }
                    }
                  }
                }
                content {
                  ... on Issue {
                    number title state url updatedAt
                    assignees(first: 5) { nodes { login } }
                    labels(first: 10)   { nodes { name } }
                    comments(last: 1) {
                      nodes { body author { login } createdAt url }
                    }
                    repository { name }
                  }
                  ... on PullRequest {
                    number title state url updatedAt
                    assignees(first: 5) { nodes { login } }
                    labels(first: 10)   { nodes { name } }
                    reviews(last: 1) {
                      nodes { body author { login } createdAt }
                    }
                    repository { name }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = UrlFetchApp.fetch("https://api.github.com/graphql", {
      method: "post",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({ query }),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      throw new Error(`GitHub API エラー: ${res.getResponseCode()} ${res.getContentText()}`);
    }

    const json = JSON.parse(res.getContentText());
    if (json.errors) {
      throw new Error(`GraphQL エラー: ${JSON.stringify(json.errors)}`);
    }

    const projectItems = json.data.organization.projectV2.items;
    const pageInfo     = projectItems.pageInfo;

    for (const node of projectItems.nodes) {
      const content = node.content;
      if (!content) continue; // Draft issue はスキップ

      let status = null;
      for (const fv of node.fieldValues.nodes) {
        if (fv.field && fv.field.name === "Status" && fv.name) {
          status = fv.name;
          break;
        }
      }

      let lastComment = null;
      if (content.comments?.nodes.length > 0) {
        const c = content.comments.nodes[0];
        lastComment = { body: c.body, author: c.author?.login, createdAt: c.createdAt, url: c.url };
      } else if (content.reviews?.nodes.length > 0) {
        const r = content.reviews.nodes[0];
        lastComment = { body: r.body, author: r.author?.login, createdAt: r.createdAt };
      }

      items.push({
        number:      content.number,
        title:       content.title,
        state:       content.state,
        url:         content.url,
        status:      status,
        assignees:   (content.assignees?.nodes || []).map(a => a.login),
        labels:      (content.labels?.nodes   || []).map(l => l.name),
        lastComment: lastComment,
        updatedAt:   content.updatedAt || node.updatedAt,
        repository:  content.repository?.name || null
      });
    }

    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return items;
}

/**
 * Google Doc の本文を JSON テキストで上書きする
 */
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
  fetchGHPItems();
}
