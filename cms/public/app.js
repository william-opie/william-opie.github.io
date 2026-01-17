const listView = document.getElementById("list-view");
const editorView = document.getElementById("editor-view");
const postsList = document.getElementById("posts-list");
const listStatus = document.getElementById("list-status");
const refreshPostsButton = document.getElementById("refresh-posts");
const newPostButton = document.getElementById("new-post-button");
const homeTitleButton = document.getElementById("home-title");
const themeToggleButton = document.getElementById("theme-toggle");
const backButton = document.getElementById("back-button");
const editorStatus = document.getElementById("editor-status");

const postTitleInput = document.getElementById("post-title");
const postDateInput = document.getElementById("post-date");
const postTagsInput = document.getElementById("post-tags");
const postBodyEditor = document.getElementById("post-body-editor");
const postBodySource = document.getElementById("post-body-source");
const toggleSourceButton = document.getElementById("toggle-source");

const saveDraftButton = document.getElementById("save-draft");
const publishButton = document.getElementById("publish-post");
const discardButton = document.getElementById("discard-post");

const toast = document.getElementById("toast");

const toolbarButtons = document.querySelectorAll(".toolbar button[data-format]");

const state = {
  currentPostId: null,
  currentStatus: null,
  isNew: false,
  createdFromNew: false,
  original: null,
  isDirty: false,
  isSourceMode: false,
  suppressDirty: false,
  toastTimeout: null
};

const themeStorageKey = "cmsTheme";

const turndownService =
  typeof TurndownService === "undefined"
    ? null
    : new TurndownService({
        codeBlockStyle: "fenced",
        emDelimiter: "*",
        strongDelimiter: "**"
      });

if (turndownService) {
  turndownService.keep(["u", "a"]);
}

if (typeof marked !== "undefined") {
  marked.setOptions({ breaks: true, gfm: true });
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data.error || "Request failed.";
    throw new Error(errorMessage);
  }
  return data;
};

const applyTheme = (theme) => {
  const useDark = theme === "dark";
  document.body.classList.toggle("theme-dark", useDark);
  if (themeToggleButton) {
    themeToggleButton.textContent = useDark ? "🌞" : "🌙";
    themeToggleButton.setAttribute(
      "aria-label",
      useDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }
  localStorage.setItem(themeStorageKey, useDark ? "dark" : "light");
};

const loadTheme = () => {
  const savedTheme = localStorage.getItem(themeStorageKey);
  applyTheme(savedTheme === "dark" ? "dark" : "light");
};

const toInputValue = (date) => {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "No date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const showListView = () => {
  listView.classList.remove("hidden");
  editorView.classList.add("hidden");
  editorStatus.textContent = "";
  state.currentPostId = null;
  state.currentStatus = null;
  state.isNew = false;
  state.createdFromNew = false;
  state.original = null;
  resetDirtyState();
  loadPosts();
};

const showEditorView = () => {
  listView.classList.add("hidden");
  editorView.classList.remove("hidden");
};

const setEditorFeedback = (message, isError = false) => {
  editorStatus.textContent = message;
  editorStatus.style.color = isError ? "#e03131" : "";
};

const setListFeedback = (message) => {
  listStatus.textContent = message;
};

const withSuppressedDirty = (callback) => {
  state.suppressDirty = true;
  callback();
  state.suppressDirty = false;
};

const markDirty = () => {
  if (!state.suppressDirty) {
    state.isDirty = true;
  }
};

const resetDirtyState = () => {
  state.isDirty = false;
};

const normalizeEditorHtml = (html) => {
  if (!html) {
    return "";
  }
  const cleaned = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return cleaned ? html : "";
};

const markdownToHtml = (markdown) => {
  if (!markdown) {
    return "";
  }
  if (typeof marked === "undefined") {
    return markdown;
  }
  return marked.parse(markdown);
};

const htmlToMarkdown = (html) => {
  const normalized = normalizeEditorHtml(html);
  if (!normalized) {
    return "";
  }
  if (!turndownService) {
    return normalized;
  }
  return turndownService.turndown(normalized);
};

const setEditorContent = (markdown) => {
  const safeMarkdown = markdown || "";
  withSuppressedDirty(() => {
    postBodySource.value = safeMarkdown;
    postBodyEditor.innerHTML = markdownToHtml(safeMarkdown);
  });
};

const getBodyMarkdown = () => {
  if (state.isSourceMode) {
    return postBodySource.value;
  }
  return htmlToMarkdown(postBodyEditor.innerHTML);
};

const syncEditorToSource = () => {
  postBodySource.value = htmlToMarkdown(postBodyEditor.innerHTML);
};

const syncSourceToEditor = () => {
  postBodyEditor.innerHTML = markdownToHtml(postBodySource.value);
};

const setEditorMode = (useSource, options = {}) => {
  state.isSourceMode = useSource;
  if (useSource) {
    postBodySource.classList.remove("hidden");
    postBodyEditor.classList.add("hidden");
    toggleSourceButton.textContent = "Visual";
  } else {
    postBodySource.classList.add("hidden");
    postBodyEditor.classList.remove("hidden");
    toggleSourceButton.textContent = "Source";
  }
  if (options.focus) {
    if (useSource) {
      postBodySource.focus();
    } else {
      postBodyEditor.focus();
    }
  }
};

const confirmAbandonChanges = () => {
  if (editorView.classList.contains("hidden") || !state.isDirty) {
    return true;
  }
  return window.confirm("Abandon your in-progress changes?");
};

const showToast = (message) => {
  if (!toast) {
    return;
  }
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  if (state.toastTimeout) {
    clearTimeout(state.toastTimeout);
  }
  state.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
    toast.textContent = "";
  }, 4000);
};

const collectFormData = () => ({
  title: postTitleInput.value.trim(),
  date: postDateInput.value,
  tags: postTagsInput.value,
  body: getBodyMarkdown()
});

const fillForm = (data) => {
  postTitleInput.value = data.title || "";
  setEditorContent(data.body || "");
  postTagsInput.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  const dateValue = data.date ? new Date(data.date) : new Date();
  postDateInput.value = toInputValue(dateValue);
};

const wrapSourceSelection = (before, after) => {
  const start = postBodySource.selectionStart;
  const end = postBodySource.selectionEnd;
  const value = postBodySource.value;
  const selected = value.slice(start, end);
  const wrapped = `${before}${selected}${after}`;

  postBodySource.value = value.slice(0, start) + wrapped + value.slice(end);

  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  postBodySource.setSelectionRange(cursorStart, cursorEnd);
  postBodySource.focus();
};

const adjustIndentation = (outdent = false) => {
  const value = postBodySource.value;
  const start = postBodySource.selectionStart;
  const end = postBodySource.selectionEnd;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  let startOffset = 0;
  let endOffset = 0;

  const updatedLines = lines.map((line, index) => {
    if (outdent) {
      const match = line.match(/^ {1,2}/);
      const removeCount = match ? match[0].length : 0;
      if (index === 0) {
        startOffset -= removeCount;
      }
      endOffset -= removeCount;
      return line.slice(removeCount);
    }

    if (index === 0) {
      startOffset += 2;
    }
    endOffset += 2;
    return `  ${line}`;
  });

  postBodySource.value =
    value.slice(0, lineStart) + updatedLines.join("\n") + value.slice(lineEnd);

  const newStart = Math.max(lineStart, start + startOffset);
  const newEnd = Math.max(lineStart, end + endOffset);
  postBodySource.setSelectionRange(newStart, newEnd);
  postBodySource.focus();
};

const applyVisualCommand = (command, value = null) => {
  postBodyEditor.focus();
  document.execCommand(command, false, value);
};

const applyInlineFormat = (command, wrapper) => {
  if (state.isSourceMode) {
    wrapSourceSelection(wrapper.before, wrapper.after);
  } else {
    applyVisualCommand(command);
  }
  markDirty();
};

const handleIndent = (outdent = false) => {
  if (state.isSourceMode) {
    adjustIndentation(outdent);
  } else {
    applyVisualCommand(outdent ? "outdent" : "indent");
  }
  markDirty();
};

const insertLink = () => {
  const url = window.prompt("Enter link URL");
  if (!url) {
    return;
  }

  if (state.isSourceMode) {
    const value = postBodySource.value;
    const start = postBodySource.selectionStart;
    const end = postBodySource.selectionEnd;
    const selectedText = value.slice(start, end);
    const linkText = selectedText || window.prompt("Link text");
    if (!linkText) {
      return;
    }
    const markdownLink = `[${linkText}](${url})`;
    postBodySource.value = value.slice(0, start) + markdownLink + value.slice(end);
    postBodySource.setSelectionRange(start, start + markdownLink.length);
    postBodySource.focus();
    markDirty();
    return;
  }

  postBodyEditor.focus();
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    document.execCommand("createLink", false, url);
    markDirty();
    return;
  }

  const linkText = window.prompt("Link text");
  if (!linkText) {
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.textContent = linkText;
  document.execCommand("insertHTML", false, anchor.outerHTML);
  markDirty();
};

const toggleSourceMode = () => {
  if (state.isSourceMode) {
    withSuppressedDirty(() => {
      syncSourceToEditor();
    });
    setEditorMode(false, { focus: true });
    return;
  }

  withSuppressedDirty(() => {
    syncEditorToSource();
  });
  setEditorMode(true, { focus: true });
};

const loadPosts = async () => {
  setListFeedback("Loading posts...");
  try {
    const posts = await fetchJson("/api/posts");
    renderPosts(posts);
    setListFeedback(`${posts.length} post${posts.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setListFeedback(`Error: ${error.message}`);
  }
};

const renderPosts = (posts) => {
  postsList.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("p");
    empty.textContent = "No posts found.";
    postsList.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    const title = document.createElement("h3");
    const titleButton = document.createElement("button");
    titleButton.textContent = post.title || "Untitled";
    titleButton.addEventListener("click", () => {
      location.hash = `#/edit/${encodeURIComponent(post.id)}`;
    });
    title.appendChild(titleButton);

    const meta = document.createElement("div");
    meta.className = "post-meta";
    const status = post.status === "draft" ? "Draft" : "Published";
    meta.textContent = `${status} • ${formatDisplayDate(post.date)}`;


    const excerpt = document.createElement("p");
    excerpt.className = "post-excerpt";
    excerpt.textContent = post.excerpt || "(No preview available)";

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(excerpt);
    postsList.appendChild(card);
  });
};


const openNewPost = () => {
  state.isNew = true;
  state.createdFromNew = false;
  state.currentPostId = null;
  state.currentStatus = "draft";
  state.original = null;
  fillForm({ title: "", body: "", tags: [], date: new Date().toISOString() });
  setEditorMode(state.isSourceMode);
  resetDirtyState();
  setEditorFeedback("New draft ready.");
  showEditorView();
};

const openExistingPost = async (id) => {
  setEditorFeedback("Loading post...");
  showEditorView();
  try {
    const post = await fetchJson(`/api/posts/${encodeURIComponent(id)}`);
    state.currentPostId = post.id;
    state.currentStatus = post.status;
    state.isNew = false;
    state.createdFromNew = false;
    state.original = post;
    fillForm(post);
    setEditorMode(state.isSourceMode);
    resetDirtyState();
    setEditorFeedback(post.status === "draft" ? "Draft loaded." : "Post loaded.");
  } catch (error) {
    setEditorFeedback(`Error: ${error.message}`, true);
  }
};

const savePost = async (publish) => {
  const payload = collectFormData();
  if (!payload.title) {
    payload.title = "Untitled";
    postTitleInput.value = payload.title;
  }
  payload.publish = publish;

  setEditorFeedback(publish ? "Publishing..." : "Saving draft...");

  try {
    let response;
    if (state.currentPostId) {
      response = await fetchJson(`/api/posts/${encodeURIComponent(state.currentPostId)}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );
    } else {
      response = await fetchJson("/api/posts", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.createdFromNew = true;
    }

    state.currentPostId = response.id;
    state.currentStatus = response.status;
    state.isNew = false;
    state.original = { ...payload, status: response.status };

    if (response.id && location.hash !== `#/edit/${encodeURIComponent(response.id)}`) {
      location.hash = `#/edit/${encodeURIComponent(response.id)}`;
    }

    setEditorFeedback(
      response.status === "draft" ? "Draft saved." : "Post published."
    );
    if (response.commitStatus === "committed") {
      showToast("Changes committed. Remember to push your branch.");
    } else if (response.commitStatus === "missing_identity") {
      showToast("Auto-commit skipped. Set GIT_USER_NAME and GIT_USER_EMAIL.");
    }
    resetDirtyState();
  } catch (error) {
    setEditorFeedback(`Error: ${error.message}`, true);
  }
};

const discardChanges = async () => {
  if (state.isNew && !state.currentPostId) {
    location.hash = "#/";
    return;
  }

  if (state.createdFromNew && state.currentPostId && state.currentStatus === "draft") {
    const confirmDelete = window.confirm("Discard this draft?");
    if (!confirmDelete) {
      return;
    }
    try {
      await fetchJson(`/api/posts/${encodeURIComponent(state.currentPostId)}`,
        { method: "DELETE" }
      );
      location.hash = "#/";
      return;
    } catch (error) {
      setEditorFeedback(`Error: ${error.message}`, true);
      return;
    }
  }

  if (state.original) {
    fillForm(state.original);
    resetDirtyState();
    setEditorFeedback("Changes discarded.");
  }
};

const handleRoute = () => {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/new")) {
    openNewPost();
    return;
  }
  if (hash.startsWith("#/edit/")) {
    const id = decodeURIComponent(hash.replace("#/edit/", ""));
    openExistingPost(id);
    return;
  }
  showListView();
};

newPostButton.addEventListener("click", () => {
  if (!confirmAbandonChanges()) {
    return;
  }
  location.hash = "#/new";
});

homeTitleButton.addEventListener("click", () => {
  if (!confirmAbandonChanges()) {
    return;
  }
  location.hash = "#/";
});

refreshPostsButton.addEventListener("click", loadPosts);
backButton.addEventListener("click", () => {
  if (!confirmAbandonChanges()) {
    return;
  }
  location.hash = "#/";
});

themeToggleButton.addEventListener("click", () => {
  const isDark = document.body.classList.contains("theme-dark");
  applyTheme(isDark ? "light" : "dark");
});

saveDraftButton.addEventListener("click", () => savePost(false));
publishButton.addEventListener("click", () => savePost(true));
discardButton.addEventListener("click", discardChanges);

toolbarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const format = button.dataset.format;
    if (format === "bold") {
      applyInlineFormat("bold", { before: "**", after: "**" });
    } else if (format === "italic") {
      applyInlineFormat("italic", { before: "*", after: "*" });
    } else if (format === "underline") {
      applyInlineFormat("underline", { before: "<u>", after: "</u>" });
    } else if (format === "link") {
      insertLink();
    } else if (format === "indent") {
      handleIndent(false);
    } else if (format === "outdent") {
      handleIndent(true);
    } else if (format === "source") {
      toggleSourceMode();
    }
  });
});

[postTitleInput, postDateInput, postTagsInput, postBodySource].forEach((input) => {
  input.addEventListener("input", markDirty);
});

postBodyEditor.addEventListener("input", markDirty);

postBodySource.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    adjustIndentation(event.shiftKey);
    markDirty();
  }
});

postBodyEditor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    applyVisualCommand(event.shiftKey ? "outdent" : "indent");
    markDirty();
  }
});

window.addEventListener("hashchange", handleRoute);

loadTheme();
setEditorMode(false);
handleRoute();
