// -------------------------------------
// (1) 静的記事一覧（posts フォルダ内の Markdown ファイル）  
// ※今回は例として、投稿日時とタグを追加
// -------------------------------------
const staticPosts = [
    {
      title: "Memo 1",
      file: "posts/memo1.md",
      date: "2023-10-25T10:00:00Z",
      tags: ["JavaScript", "Markdown"]
    },
    {
      title: "Memo 2",
      file: "posts/memo2.md",
      date: "2023-10-26T09:00:00Z",
      tags: ["CSS", "Design"]
    }
  ];
  
  // -------------------------------------
  // (2) 動的記事は localStorage に保存
  // -------------------------------------
  const DYNAMIC_POSTS_KEY = "dynamicPosts";
  function getDynamicPosts() {
    const stored = localStorage.getItem(DYNAMIC_POSTS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  // -------------------------------------
  // (3) グローバル変数：編集中記事のID（新規の場合は null）。
  //     ※静的記事編集時は "staticEdited:" + ファイルパス を用いる
  // -------------------------------------
  let currentEditingId = null;
  
  // -------------------------------------
  // (4) 日付を整形して表示するユーティリティ
  // -------------------------------------
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${('0' + (date.getMonth()+1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`;
  }
  
  // -------------------------------------
  // (5) 記事一覧をレンダリング（編集済みの静的記事は除外）
  // -------------------------------------
  function renderPostsList() {
    const contentDiv = document.getElementById("content");
    const dynamicPosts = getDynamicPosts();
    // 編集済みの静的記事（dynamic に取り込まれたもの）は除外
    const staticPostsToShow = staticPosts.filter(sp =>
      !dynamicPosts.some(dp => dp.originalFile === sp.file)
    );
    const allPosts = staticPostsToShow.concat(dynamicPosts);
    allPosts.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });
    let html = `<h1>備忘録一覧</h1>
                <button onclick="showNewPostForm()">記事を追加</button>
                <ul class="article-list">`;
    allPosts.forEach(post => {
      let postUrl = "";
      if (post.file) {
        postUrl = `?post=${encodeURIComponent(post.file)}`;
      } else {
        postUrl = `?postId=${encodeURIComponent(post.id)}`;
      }
      // タグ表示：タグがあれば span.article-tag を出力
      let tagHtml = "";
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach(tag => {
          tagHtml += `<span class="article-tag">${tag.trim()}</span>`;
        });
      }
      html += `<li>
        <a href="${postUrl}">${post.title}</a>
        <div class="article-meta">
          投稿日: ${post.date ? formatDate(post.date) : "―"} &nbsp;|&nbsp; 
          ${tagHtml ? `タグ: ${tagHtml}` : ""}
        </div>
      </li>`;
    });
    html += `</ul>`;
    contentDiv.innerHTML = html;
  }
  
  // -------------------------------------
  // (6) 静的記事の読み込み（編集版があればそちらを優先）
  // -------------------------------------
  function loadPost(postFile) {
    const dynamicPosts = getDynamicPosts();
    const edited = dynamicPosts.find(dp => dp.originalFile === postFile);
    if (edited) {
      loadDynamicPost(edited.id);
      return;
    }
    fetch(postFile)
      .then(response => {
        if (!response.ok) throw new Error("記事が見つかりません");
        return response.text();
      })
      .then(text => {
        const contentDiv = document.getElementById("content");
        const html = marked.parse(text);
        contentDiv.innerHTML = `<div class="post">
                                  <a href="index.html">&larr; 一覧に戻る</a><hr>
                                  ${html}
                                </div>`;
        // 編集ボタン
        contentDiv.innerHTML += `<div style="text-align:right;">
                                    <button class="edit-btn" onclick="editStaticPost('${postFile}')">編集</button>
                                  </div>`;
        document.querySelectorAll("pre code").forEach(block => {
          hljs.highlightElement(block);
        });
      })
      .catch(error => {
        console.error("Error loading post:", error);
        document.getElementById("content").innerHTML = `<p>記事の読み込みに失敗しました。</p>`;
      });
  }
  
  // -------------------------------------
  // (7) 動的記事の読み込み（localStorage から）
  // -------------------------------------
  function loadDynamicPost(postId) {
    const dynamicPosts = getDynamicPosts();
    const post = dynamicPosts.find(p => p.id === postId);
    if (post) {
      const contentDiv = document.getElementById("content");
      const html = marked.parse(post.content);
      contentDiv.innerHTML = `<div class="post">
                                  <a href="index.html">&larr; 一覧に戻る</a><hr>
                                  <h1>${post.title}</h1>
                                  ${html}
                                </div>`;
      contentDiv.innerHTML += `<div style="text-align:right;">
                                  <button class="edit-btn" onclick="editDynamicPost('${post.id}')">編集</button>
                                </div>`;
    } else {
      document.getElementById("content").innerHTML = `<p>記事が見つかりません</p>`;
    }
  }
  
  // -------------------------------------
  // (8) EasyMDE を用いた投稿／編集フォームの初期化とカスタムボタン設定
  // -------------------------------------
  let easyMDE = null;
  function showNewPostForm() {
    document.getElementById("new-post-form").style.display = "block";
    document.getElementById("form-title").innerText = currentEditingId ? "記事を編集" : "記事を追加";
    if (!easyMDE) {
      easyMDE = new EasyMDE({
        element: document.getElementById("new-post-content"),
        spellChecker: false,
        autosave: { enabled: false },
        forceSync: true,
        toolbar: [
          "bold", "italic", "heading", "|",
          "quote", "unordered-list", "ordered-list", "|",
          {
            name: "image",
            action: imageUploadAction,
            className: "fa fa-image",
            title: "画像挿入"
          },
          {
            name: "video",
            action: videoUploadAction,
            className: "fa fa-video-camera",
            title: "動画挿入"
          },
          "|", "preview", "guide"
        ]
      });
    }
  }
  function hideNewPostForm() {
    document.getElementById("new-post-form").style.display = "none";
  }
  
  // -------------------------------------
  // (9) カスタムアクション：画像アップロード・挿入
  // -------------------------------------
  function imageUploadAction(editor) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const imageMarkdown = `![${file.name}](${e.target.result})`;
        const cm = editor.codemirror;
        const doc = cm.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(imageMarkdown, cursor);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  
  // -------------------------------------
  // (10) カスタムアクション：動画アップロード・挿入
  // -------------------------------------
  function videoUploadAction(editor) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const videoHTML = `<video controls src="${e.target.result}" style="max-width:100%;"></video>`;
        const cm = editor.codemirror;
        const doc = cm.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(videoHTML, cursor);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  
  // -------------------------------------
  // (11) 動的記事編集機能
  // -------------------------------------
  function editDynamicPost(postId) {
    const dynamicPosts = getDynamicPosts();
    const post = dynamicPosts.find(p => p.id === postId);
    if (!post) {
      alert("編集対象の記事が見つかりません");
      return;
    }
    currentEditingId = postId;
    document.getElementById("new-post-title").value = post.title;
    // タグ欄に配列をカンマ区切りにしてセット
    document.getElementById("new-post-tags").value = post.tags ? post.tags.join(", ") : "";
    showNewPostForm();
    easyMDE.value(post.content);
  }
  
  // -------------------------------------
  // (12) 静的記事編集機能（編集版として localStorage に保存）
  // -------------------------------------
  function editStaticPost(postFile) {
    const staticPost = staticPosts.find(p => p.file === postFile);
    if (!staticPost) {
      alert("編集対象の記事が見つかりません");
      return;
    }
    fetch(postFile)
      .then(response => {
        if (!response.ok) throw new Error("記事が見つかりません");
        return response.text();
      })
      .then(text => {
        currentEditingId = "staticEdited:" + postFile;
        document.getElementById("new-post-title").value = staticPost.title;
        // タグもセット（静的記事にも tags プロパティをあらかじめ設定しておく想定）
        document.getElementById("new-post-tags").value = staticPost.tags ? staticPost.tags.join(", ") : "";
        showNewPostForm();
        easyMDE.value(text);
      })
      .catch(error => {
        console.error("Error editing static post:", error);
        alert("記事の読み込みに失敗しました。");
      });
  }
  
  // -------------------------------------
  // (13) 新規投稿／編集記事の保存処理
  // -------------------------------------
  function saveNewPost() {
    const title = document.getElementById("new-post-title").value.trim();
    const content = easyMDE.value().trim();
    const tagsStr = document.getElementById("new-post-tags").value.trim();
    if (!title || !content) {
      alert("タイトルとコンテンツを入力してください。");
      return;
    }
    // タグはカンマ区切りの文字列から配列へ（空文字列の場合は空配列）
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(t => t) : [];
    let dynamicPosts = getDynamicPosts();
    if (currentEditingId) {
      const index = dynamicPosts.findIndex(p => p.id === currentEditingId);
      if (index !== -1) {
        // 動的記事更新
        dynamicPosts[index].title = title;
        dynamicPosts[index].content = content;
        dynamicPosts[index].date = new Date().toISOString();
        dynamicPosts[index].tags = tags;
      } else {
        // 静的記事編集の場合は、新規として保存＆ originalFile を記録
        dynamicPosts.push({
          id: currentEditingId,
          title: title,
          content: content,
          date: new Date().toISOString(),
          tags: tags,
          originalFile: currentEditingId.startsWith("staticEdited:")
                        ? currentEditingId.replace("staticEdited:", "")
                        : undefined
        });
      }
    } else {
      // 新規投稿の場合
      dynamicPosts.push({
        id: "dynamic:" + Date.now(),
        title: title,
        content: content,
        date: new Date().toISOString(),
        tags: tags
      });
    }
    localStorage.setItem(DYNAMIC_POSTS_KEY, JSON.stringify(dynamicPosts));
    alert("記事を保存しました！");
    // フォーム初期化
    currentEditingId = null;
    document.getElementById("new-post-title").value = "";
    document.getElementById("new-post-tags").value = "";
    easyMDE.value("");
    hideNewPostForm();
    renderPostsList();
  }
  
  // -------------------------------------
  // (14) 編集キャンセル
  // -------------------------------------
  function cancelEditing() {
    currentEditingId = null;
    document.getElementById("new-post-title").value = "";
    document.getElementById("new-post-tags").value = "";
    if (easyMDE) easyMDE.value("");
    hideNewPostForm();
  }
  
  // -------------------------------------
  // (15) ページ読み込み時：URL のクエリパラメータにより表示を切替
  // -------------------------------------
  (function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get("post");
    const postId   = urlParams.get("postId");
    if (postFile) {
      loadPost(postFile);
    } else if (postId) {
      loadDynamicPost(postId);
    } else {
      renderPostsList();
    }
    document.getElementById("save-post").addEventListener("click", saveNewPost);
  })();
  