# GHP Daily Digest — GAS セットアップ手順

GitHub Project の動きと Slack チャンネルの会話を毎朝 Claude API でまとめ、
Slack DM に Push 配信しつつ Google Doc に蓄積して NotebookLM で検索できるようにするパイプラインです。

```
7:00〜8:00 JST
  ghp-cache.gs    ──► Google Doc（GHP キャッシュ）
  slack-cache.gs  ──► Google Doc（Slack キャッシュ）

9:00〜10:00 JST
  digest.gs ──► 両 Doc を読む
            ──► スナップショット Doc から前日データ読み込み → 差分計算
            ──► Claude API → Slack DM 送信
            ──► スナップショット Doc に当日データ上書き保存
            ──► 蓄積 Doc に追記（NotebookLM 連携用）
```

<svg width="100%" viewBox="0 0 680 860" role="img" style="" xmlns="http://www.w3.org/2000/svg">
  <title style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">GHP Daily Digest フロー</title>
  <desc style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">GASパイプライン：GitHub/SlackキャッシュからClaudeで差分ダイジェストを生成しSlack DMとNotebookLMに配信</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  <mask id="imagine-text-gaps-0da79b" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="680" height="860" fill="white"/><rect x="249.515625" y="21" width="180.977294921875" height="22" fill="black" rx="2"/><rect x="4.1171875" y="78" width="27.765625" height="17" fill="black" rx="2"/><rect x="3.9765625" y="92" width="28.046875" height="17" fill="black" rx="2"/><rect x="116.8828125" y="69" width="146.234375" height="22" fill="black" rx="2"/><rect x="117.671875" y="88.5" width="144.65625" height="19" fill="black" rx="2"/><rect x="438.7265625" y="69" width="102.546875" height="22" fill="black" rx="2"/><rect x="418.0859375" y="88.5" width="143.828125" height="19" fill="black" rx="2"/><rect x="132.03125" y="155" width="115.9375" height="22" fill="black" rx="2"/><rect x="93.5078125" y="174.5" width="192.984375" height="19" fill="black" rx="2"/><rect x="422.15625" y="155" width="135.6875" height="22" fill="black" rx="2"/><rect x="408.1171875" y="174.5" width="163.765625" height="19" fill="black" rx="2"/><rect x="147.59375" y="239" width="84.96372985839844" height="22" fill="black" rx="2"/><rect x="116.1015625" y="258.5" width="147.796875" height="19" fill="black" rx="2"/><rect x="447.59375" y="239" width="84.9637451171875" height="22" fill="black" rx="2"/><rect x="407.171875" y="258.5" width="165.65625" height="19" fill="black" rx="2"/><rect x="3.9296875" y="358" width="28.140625" height="17" fill="black" rx="2"/><rect x="1.8984375" y="372" width="32.203125" height="17" fill="black" rx="2"/><rect x="147.59375" y="315" width="84.96372985839844" height="22" fill="black" rx="2"/><rect x="125.9921875" y="334.5" width="128.015625" height="19" fill="black" rx="2"/><rect x="320" y="356" width="48" height="17" fill="black" rx="2"/><rect x="290.96875" y="371" width="98.0625" height="22" fill="black" rx="2"/><rect x="179.3515625" y="390.5" width="321.296875" height="19" fill="black" rx="2"/><rect x="122.5859375" y="408.5" width="434.828125" height="19" fill="black" rx="2"/><rect x="8.1640625" y="356" width="71.671875" height="17" fill="black" rx="2"/><rect x="291.90625" y="457" width="96.1875" height="22" fill="black" rx="2"/><rect x="242.078125" y="476.5" width="195.84375" height="19" fill="black" rx="2"/><rect x="99.2421875" y="593" width="121.515625" height="22" fill="black" rx="2"/><rect x="71" y="612.5" width="178" height="19" fill="black" rx="2"/><rect x="462.1328125" y="593" width="115.734375" height="22" fill="black" rx="2"/><rect x="433.3984375" y="612.5" width="173.203125" height="19" fill="black" rx="2"/><rect x="4" y="684" width="28" height="17" fill="black" rx="2"/><rect x="75.796875" y="693" width="168.40625" height="22" fill="black" rx="2"/><rect x="107.5859375" y="712.5" width="104.828125" height="19" fill="black" rx="2"/><rect x="472.1640625" y="693" width="95.671875" height="22" fill="black" rx="2"/><rect x="456.484375" y="712.5" width="127.03125" height="19" fill="black" rx="2"/></mask></defs>

  <!-- header -->
  <g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="140" y="12" width="400" height="32" rx="8" stroke-width="0.5" style="fill:rgb(113, 43, 19);stroke:rgb(240, 153, 123);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="340" y="32" text-anchor="middle" dominant-baseline="central" style="fill:rgb(245, 196, 179);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">GHP Daily Digest</text>
  </g>

  <!-- phase 7:00-8:00 label -->
  <text x="18" y="90" text-anchor="middle" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">7:00</text>
  <text x="18" y="104" text-anchor="middle" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">8:00</text>
  <line x1="30" y1="62" x2="30" y2="310" stroke="var(--color-border-tertiary)" stroke-width="1" stroke-dasharray="3 3" mask="url(#imagine-text-gaps-0da79b)" style="fill:rgb(0, 0, 0);stroke:rgba(222, 220, 209, 0.15);color:rgb(255, 255, 255);stroke-width:1px;stroke-dasharray:3px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- sources -->
  <g onclick="sendPrompt('ghp-cache.gsのGraphQLクエリを詳しく教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="100" y="62" width="180" height="52" rx="8" stroke-width="0.5" style="fill:rgb(60, 52, 137);stroke:rgb(175, 169, 236);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="190" y="80" text-anchor="middle" dominant-baseline="central" style="fill:rgb(206, 203, 246);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">GitHub GraphQL API</text>
    <text x="190" y="98" text-anchor="middle" dominant-baseline="central" style="fill:rgb(175, 169, 236);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">your-org / Project #N</text>
  </g>

  <g onclick="sendPrompt('slack-cache.gsのスレッド展開処理を教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="400" y="62" width="180" height="52" rx="8" stroke-width="0.5" style="fill:rgb(60, 52, 137);stroke:rgb(175, 169, 236);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="490" y="80" text-anchor="middle" dominant-baseline="central" style="fill:rgb(206, 203, 246);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Slack Web API</text>
    <text x="490" y="98" text-anchor="middle" dominant-baseline="central" style="fill:rgb(175, 169, 236);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">対象チャンネル 直近24h</text>
  </g>

  <line x1="190" y1="114" x2="190" y2="148" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="490" y1="114" x2="490" y2="148" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- cache scripts -->
  <g onclick="sendPrompt('ghp-cache.gsの全体処理を教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="100" y="148" width="180" height="52" rx="8" stroke-width="0.5" style="fill:rgb(113, 43, 19);stroke:rgb(240, 153, 123);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="190" y="166" text-anchor="middle" dominant-baseline="central" style="fill:rgb(245, 196, 179);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">ghp-cache.gs</text>
    <text x="190" y="184" text-anchor="middle" dominant-baseline="central" style="fill:rgb(240, 153, 123);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">整形・OPEN or 直近90日フィルタ</text>
  </g>

  <g onclick="sendPrompt('slack-cache.gsのユーザー名解決処理を教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="400" y="148" width="180" height="52" rx="8" stroke-width="0.5" style="fill:rgb(113, 43, 19);stroke:rgb(240, 153, 123);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="490" y="166" text-anchor="middle" dominant-baseline="central" style="fill:rgb(245, 196, 179);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">slack-cache.gs</text>
    <text x="490" y="184" text-anchor="middle" dominant-baseline="central" style="fill:rgb(240, 153, 123);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">スレッド展開・ユーザー解決</text>
  </g>

  <line x1="190" y1="200" x2="190" y2="234" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="490" y1="200" x2="490" y2="234" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- cache docs -->
  <g onclick="sendPrompt('Google DocをJSONキャッシュとして使う設計の意図は？')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="100" y="234" width="180" height="44" rx="8" stroke-width="0.5" style="fill:rgb(12, 68, 124);stroke:rgb(133, 183, 235);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="190" y="250" text-anchor="middle" dominant-baseline="central" style="fill:rgb(181, 212, 244);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Google Doc</text>
    <text x="190" y="268" text-anchor="middle" dominant-baseline="central" style="fill:rgb(133, 183, 235);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">GHP JSON キャッシュ</text>
  </g>

  <g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="400" y="234" width="180" height="44" rx="8" stroke-width="0.5" style="fill:rgb(12, 68, 124);stroke:rgb(133, 183, 235);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="490" y="250" text-anchor="middle" dominant-baseline="central" style="fill:rgb(181, 212, 244);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Google Doc</text>
    <text x="490" y="268" text-anchor="middle" dominant-baseline="central" style="fill:rgb(133, 183, 235);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Slack JSON キャッシュ</text>
  </g>

  <!-- phase divider -->
  <line x1="40" y1="302" x2="640" y2="302" stroke="var(--color-border-tertiary)" stroke-width="0.5" stroke-dasharray="4 4" style="fill:rgb(0, 0, 0);stroke:rgba(222, 220, 209, 0.15);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-dasharray:4px, 4px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="18" y="370" text-anchor="middle" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">9:00</text>
  <text x="18" y="384" text-anchor="middle" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">10:00</text>
  <line x1="30" y1="310" x2="30" y2="640" stroke="var(--color-border-tertiary)" stroke-width="1" stroke-dasharray="3 3" mask="url(#imagine-text-gaps-0da79b)" style="fill:rgb(0, 0, 0);stroke:rgba(222, 220, 209, 0.15);color:rgb(255, 255, 255);stroke-width:1px;stroke-dasharray:3px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- arrows into digest -->
  <line x1="190" y1="278" x2="190" y2="360" marker-end="url(#arrow)" mask="url(#imagine-text-gaps-0da79b)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="490" y1="278" x2="490" y2="360" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- snapshot doc (left side) -->
  <g onclick="sendPrompt('digest.gsの差分計算calcDiffの実装を詳しく教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="100" y="310" width="180" height="44" rx="8" stroke-width="0.5" style="fill:rgb(99, 56, 6);stroke:rgb(239, 159, 39);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="190" y="326" text-anchor="middle" dominant-baseline="central" style="fill:rgb(250, 199, 117);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Google Doc</text>
    <text x="190" y="344" text-anchor="middle" dominant-baseline="central" style="fill:rgb(239, 159, 39);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">前日スナップショット</text>
  </g>

  <!-- snapshot → diff arrow -->
  <path d="M 280 332 L 320 332 L 320 400 L 280 400" fill="none" stroke="var(--color-text-secondary)" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#arrow)" mask="url(#imagine-text-gaps-0da79b)" style="fill:none;stroke:rgb(194, 192, 182);color:rgb(255, 255, 255);stroke-width:1px;stroke-dasharray:4px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="324" y="368" style="font-size:10px;opacity:0.6;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.6;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:start;dominant-baseline:auto">差分計算</text>

  <!-- digest -->
  <g onclick="sendPrompt('digest.gsの全体処理フローを詳しく教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="100" y="360" width="480" height="68" rx="8" stroke-width="0.5" style="fill:rgb(113, 43, 19);stroke:rgb(240, 153, 123);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="340" y="382" text-anchor="middle" dominant-baseline="central" style="fill:rgb(245, 196, 179);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">digest.gs</text>
    <text x="340" y="400" text-anchor="middle" dominant-baseline="central" style="fill:rgb(240, 153, 123);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">readDocJson → calcDiff（前日比） → resolveSlackUsers</text>
    <text x="340" y="418" text-anchor="middle" dominant-baseline="central" style="fill:rgb(240, 153, 123);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">→ Claude Haiku（max_tokens: 2048）→ Slack DM + Doc追記 + snapshot更新</text>
  </g>

  <!-- snapshot update loop -->
  <path d="M 100 394 L 60 394 L 60 332 L 98 332" fill="none" stroke="var(--color-border-secondary)" stroke-width="0.5" stroke-dasharray="3 3" marker-end="url(#arrow)" mask="url(#imagine-text-gaps-0da79b)" style="fill:none;stroke:rgba(222, 220, 209, 0.3);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-dasharray:3px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="44" y="368" text-anchor="middle" transform="rotate(-90,44,368)" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">snapshot更新</text>

  <!-- Claude highlight -->
  <g onclick="sendPrompt('digest.gsのsystem promptを解説して')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="240" y="450" width="200" height="52" rx="8" stroke-width="0.5" style="fill:rgb(113, 43, 19);stroke:rgb(240, 153, 123);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="340" y="468" text-anchor="middle" dominant-baseline="central" style="fill:rgb(245, 196, 179);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Claude Haiku</text>
    <text x="340" y="486" text-anchor="middle" dominant-baseline="central" style="fill:rgb(240, 153, 123);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">差分サマリ + Slack要約 → mrkdwn</text>
  </g>

  <line x1="340" y1="428" x2="340" y2="450" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="340" y1="502" x2="340" y2="534" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- fork -->
  <line x1="160" y1="554" x2="520" y2="554" stroke="var(--color-text-secondary)" stroke-width="1" style="fill:rgb(0, 0, 0);stroke:rgb(194, 192, 182);color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="340" y1="534" x2="340" y2="556" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="160" y1="554" x2="160" y2="586" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="520" y1="554" x2="520" y2="586" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- outputs -->
  <g onclick="sendPrompt('Slackダイジェストはどんな内容が含まれる？')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="60" y="586" width="200" height="52" rx="8" stroke-width="0.5" style="fill:rgb(39, 80, 10);stroke:rgb(151, 196, 89);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="160" y="604" text-anchor="middle" dominant-baseline="central" style="fill:rgb(192, 221, 151);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">📱 Slack DM 送信</text>
    <text x="160" y="622" text-anchor="middle" dominant-baseline="central" style="fill:rgb(151, 196, 89);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">SLACK_USER_ID 宛・毎朝配信</text>
  </g>

  <g onclick="sendPrompt('saveDigestDocの90万文字チェックの意図は？')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="420" y="586" width="200" height="52" rx="8" stroke-width="0.5" style="fill:rgb(12, 68, 124);stroke:rgb(133, 183, 235);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="520" y="604" text-anchor="middle" dominant-baseline="central" style="fill:rgb(181, 212, 244);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Google Doc 追記</text>
    <text x="520" y="622" text-anchor="middle" dominant-baseline="central" style="fill:rgb(133, 183, 235);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">DIGEST_DOC_ID に蓄積</text>
  </g>

  <!-- phase divider 2 -->
  <line x1="40" y1="654" x2="640" y2="654" stroke="var(--color-border-tertiary)" stroke-width="0.5" stroke-dasharray="4 4" style="fill:rgb(0, 0, 0);stroke:rgba(222, 220, 209, 0.15);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-dasharray:4px, 4px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="18" y="696" text-anchor="middle" style="font-size:10px;opacity:0.45;fill:rgb(194, 192, 182);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:0.45;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:10px;font-weight:400;text-anchor:middle;dominant-baseline:auto">随時</text>

  <line x1="160" y1="638" x2="160" y2="688" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <line x1="520" y1="638" x2="520" y2="688" marker-end="url(#arrow)" style="fill:none;stroke:rgb(156, 154, 146);color:rgb(255, 255, 255);stroke-width:1.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

  <!-- final -->
  <g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="60" y="688" width="200" height="44" rx="8" stroke-width="0.5" style="fill:rgb(39, 80, 10);stroke:rgb(151, 196, 89);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="160" y="704" text-anchor="middle" dominant-baseline="central" style="fill:rgb(192, 221, 151);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">📋 朝次ダイジェスト受信</text>
    <text x="160" y="722" text-anchor="middle" dominant-baseline="central" style="fill:rgb(151, 196, 89);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Push 型・9〜10時</text>
  </g>

  <g onclick="sendPrompt('NotebookLMで蓄積ダイジェストを活用する方法を教えて')" style="fill:rgb(0, 0, 0);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
    <rect x="420" y="688" width="200" height="44" rx="8" stroke-width="0.5" style="fill:rgb(99, 56, 6);stroke:rgb(239, 159, 39);color:rgb(255, 255, 255);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
    <text x="520" y="704" text-anchor="middle" dominant-baseline="central" style="fill:rgb(250, 199, 117);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">NotebookLM</text>
    <text x="520" y="722" text-anchor="middle" dominant-baseline="central" style="fill:rgb(239, 159, 39);stroke:none;color:rgb(255, 255, 255);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Pull 型・ナレッジ検索</text>
  </g>

</svg>

---

## ① GAS プロジェクトの作成

| プロジェクト名     | ファイル          |
|--------------------|-------------------|
| `ghp-digest-cache` | `ghp-cache.gs`    |
| `slack-digest-cache` | `slack-cache.gs` |
| `digest`           | `digest.gs`       |

---

## ② 事前に作成する Google Doc（4つ）

| 用途               | 命名例             | 対応プロパティ  |
|--------------------|--------------------|-----------------|
| GHP キャッシュ     | `ghp-cache`        | `GHP_DOC_ID`    |
| Slack キャッシュ   | `slack-cache`      | `SLACK_DOC_ID`  |
| スナップショット   | `digest-snapshot`  | `SNAPSHOT_DOC_ID` |
| 蓄積（任意）       | `digest-archive`   | `DIGEST_DOC_ID` |

各 Doc の ID は URL の `/d/` と `/edit` の間の文字列です。
GAS を実行する Google アカウントに編集権限を付与してください。

---

## ③ スクリプトプロパティの設定

### ghp-digest-cache

| キー                | 値                                        |
|---------------------|-------------------------------------------|
| `GITHUB_TOKEN`      | GitHub PAT（`read:org`, `read:project`）  |
| `GHP_DOC_ID`        | GHP キャッシュ Doc の ID                  |
| `GH_ORG_LOGIN`      | GitHub Organization 名（例: your-org）    |
| `GH_PROJECT_NUMBER` | GitHub Project の番号（例: 42）           |

### slack-digest-cache

| キー                    | 値                                                                          |
|-------------------------|-----------------------------------------------------------------------------|
| `SLACK_BOT_TOKEN`       | Slack Bot Token（`channels:history`, `users:read` スコープ必須）            |
| `SLACK_DOC_ID`          | Slack キャッシュ Doc の ID                                                  |
| `SLACK_CHANNEL_IDS`     | カンマ区切りチャンネル ID（例: `C012AB3CD,C098ZY7WX`）                      |
| `SLACK_CHANNEL_LABELS`  | カンマ区切りラベル（例: `dev-general,dev-backend`）                         |
| `SLACK_WORKSPACE_DOMAIN`| Slack ワークスペースのドメイン（例: `your-org`）                            |

> `users:read` スコープを付与することで、メッセージの `user` フィールドが Slack ユーザー ID から `real_name` に自動解決されます。スコープがない場合はユーザー ID がそのまま出力されます。

### digest

| キー                  | 値                                                        |
|-----------------------|-----------------------------------------------------------|
| `ANTHROPIC_API_KEY`   | Anthropic API キー                                        |
| `SLACK_BOT_TOKEN`     | Slack Bot Token（`chat:write`, `im:write` スコープ必要）  |
| `SLACK_USER_ID`       | 送信先 Slack ユーザー ID（例: `U0123456789`）             |
| `GHP_DOC_ID`          | GHP キャッシュ Doc の ID                                  |
| `SLACK_DOC_ID`        | Slack キャッシュ Doc の ID                                |
| `SNAPSHOT_DOC_ID`     | スナップショット Doc の ID                                |
| `DIGEST_DOC_ID`       | 蓄積 Doc の ID（省略可）                                  |
| `PROJECT_NAME`        | ダイジェストに表示するプロジェクト名（例: `MyProject`）   |
| `SLACK_CHANNEL_LABEL` | ダイジェストに表示するチャンネル名（例: `#dev-general`）  |

> ユーザー名解決は `slack-cache.gs` 側で完結します。`digest.gs` 側での追加設定は不要です。

---

## ④ トリガーの設定

| プロジェクト          | 実行する関数         | 時刻              |
|-----------------------|----------------------|-------------------|
| `ghp-digest-cache`    | `runIfWeekday`       | 午前 7 時〜8 時   |
| `slack-digest-cache`  | `runIfWeekday`       | 午前 7 時〜8 時   |
| `digest`              | `runDigest`          | 午前 9 時〜10 時  |

`runIfWeekday` は土日を自動スキップします。
`runDigest` は毎日実行でも問題ありません（土日は差分なしのダイジェストが届きます）。

---

## ⑤ 初回実行について

スナップショット Doc が空の状態で初回実行すると「初回ベースライン（前日データなし）」と出力され、
差分なしでダイジェストが生成されます。翌日から前日比較が有効になります。

---

## ⑥ NotebookLM との連携

`DIGEST_DOC_ID` を設定しておくと、毎日のダイジェストが Google Doc に蓄積されます。
この Doc を NotebookLM のソースに追加すると、過去のプロジェクト状況を自然言語で検索できます。

> ⚠️ Google Doc は約 100 万文字が上限です。90 万文字を超えると Slack DM で警告が届きます。
> 警告が来たら新しい Doc を作成し `DIGEST_DOC_ID` を更新してください。
