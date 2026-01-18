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
const linkDialog = document.getElementById("link-dialog");
const linkForm = document.getElementById("link-form");
const linkUrlInput = document.getElementById("link-url");
const linkTextInput = document.getElementById("link-text");
const linkCancelButton = document.getElementById("link-cancel");

const saveDraftButton = document.getElementById("save-draft");
const publishButton = document.getElementById("publish-post");
const discardButton = document.getElementById("discard-post");
const deletePostButton = document.getElementById("delete-post");

const toast = document.getElementById("toast");

const toolbarButtons = document.querySelectorAll(".toolbar button[data-format]");

const state = {
  currentPostId: null,
  currentStatus: null,
  isNew: false,
  createdFromNew: false, // Tracks posts created via the "New Post" button in this session before an explicit save
  original: null,
  isDirty: false,
  isSourceMode: false,
  suppressDirty: false,
  toastTimeout: null,
  linkContext: null,
  openedExisting: false
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

const sanitizeHtml = (html) => {
  if (typeof DOMPurify !== "undefined") {
    return DOMPurify.sanitize(html);
  }
  return html;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  let data = {};
  let rawText = "";

  try {
    // Use a cloned response so we can still read the original body if JSON parsing fails.
    const clonedResponse = response.clone();
    data = await clonedResponse.json();
  } catch (e) {
    // If JSON parsing fails, fall back to the raw response text.
    try {
      rawText = await response.text();
    } catch (innerError) {
      rawText = "";
    }
  }

  if (!response.ok) {
    const errorMessage =
      (data && data.error) || rawText || "Request failed.";
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
  state.openedExisting = false;
  if (deletePostButton) {
    deletePostButton.classList.add("hidden");
  }
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
    .replace(/&nbsp;/gi, " ")
    .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/\s+/g, " ")
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

const ensureVisualEditorHasCaret = () => {
  if (postBodyEditor.textContent.trim()) {
    postBodyEditor.classList.remove("is-empty");
    return;
  }
  postBodyEditor.classList.add("is-empty");
  if (!postBodyEditor.innerHTML.trim()) {
    postBodyEditor.innerHTML = "<p><br></p>";
  }
};

const setEditorContent = (markdown) => {
  const safeMarkdown = markdown || "";
  withSuppressedDirty(() => {
    postBodySource.value = safeMarkdown;
    const html = markdownToHtml(safeMarkdown);
    postBodyEditor.innerHTML = sanitizeHtml(html) || "";
    ensureVisualEditorHasCaret();
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
  postBodyEditor.innerHTML = sanitizeHtml(markdownToHtml(postBodySource.value));
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
  // Clear any existing timeout so its ID is not reused
  if (state.toastTimeout) {
    clearTimeout(state.toastTimeout);
    state.toastTimeout = null;
  }

  // Increment a counter to track the "generation" of this toast
  state._toastCounter = (state._toastCounter || 0) + 1;
  const toastId = state._toastCounter;

  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  state.toastTimeout = setTimeout(() => {
    // If a newer toast has been shown, ignore this timeout
    if (state._toastCounter !== toastId) {
      return;
    }
    toast.classList.remove("show");
    toast.classList.add("hidden");
    toast.textContent = "";
    state.toastTimeout = null;
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

const withEditorSelection = (callback) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (!postBodyEditor.contains(range.commonAncestorContainer)) {
    return;
  }
  callback(selection, range);
};

const wrapSelectionWithTag = (tagName) => {
  withEditorSelection((_selection, range) => {
    if (range.collapsed) {
      return;
    }
    const wrapper = document.createElement(tagName);
    try {
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
      range.selectNodeContents(wrapper);
    } catch (_e) {
      // Fallback: do nothing on invalid ranges (e.g., partial table selection)
    }
  });
};

const applyLink = (href) => {
  if (!href) {
    return;
  }
  withEditorSelection((_selection, range) => {
    if (range.collapsed) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.rel = "noopener noreferrer";
    try {
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
      range.selectNodeContents(anchor);
    } catch (_e) {
      // Ignore malformed ranges
    }
  });
};



const wrapSelectionInList = (listTag) => {
  withEditorSelection((_selection, range) => {
    if (range.collapsed) {
      return;
    }
    const list = document.createElement(listTag);
    const li = document.createElement("li");
    try {
      li.appendChild(range.extractContents());
      list.appendChild(li);
      range.insertNode(list);
      range.selectNodeContents(list);
    } catch (_e) {
      // Ignore malformed ranges
    }
  });
};

const applyVisualCommand = (command, value = null) => {
  postBodyEditor.focus();
  switch (command) {
    case "bold":
      wrapSelectionWithTag("strong");
      break;
    case "italic":
      wrapSelectionWithTag("em");
      break;
    case "underline":
      wrapSelectionWithTag("u");
      break;
    case "strikeThrough":
      wrapSelectionWithTag("s");
      break;
    case "insertOrderedList":
      wrapSelectionInList("ol");
      break;
    case "insertUnorderedList":
      wrapSelectionInList("ul");
      break;
    case "createLink":
      applyLink(value);
      break;
    case "unlink":
      removeLink();
      break;
    default:
      // Unsupported command: no-op to avoid using deprecated execCommand
      break;
  }
};

const hasSourceSelection = () =>
  postBodySource.selectionStart !== postBodySource.selectionEnd;

const hasVisualSelection = () => {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed);
};

const expandSelectionToWord = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!postBodyEditor.contains(range.commonAncestorContainer)) {
    return false;
  }

  if (!range.collapsed) {
    return true;
  }

  let node = range.startContainer;
  let offset = range.startOffset;

  if (node.nodeType !== Node.TEXT_NODE) {
    const child = node.childNodes[offset] || node.childNodes[offset - 1];
    if (!child || child.nodeType !== Node.TEXT_NODE) {
      return false;
    }
    node = child;
    offset = Math.min(offset, node.textContent.length);
  }

  const text = node.textContent;
  if (!text.trim()) {
    return false;
  }

  const left = text.slice(0, offset);
  const right = text.slice(offset);

  const leftIndex = left.search(/\S+$/);
  const rightIndex = right.search(/\s/);

  const wordStart = leftIndex === -1 ? offset : leftIndex;
  const wordEnd = rightIndex === -1 ? text.length : offset + rightIndex;

  if (wordStart === wordEnd) {
    return false;
  }

  const wordRange = document.createRange();
  wordRange.setStart(node, wordStart);
  wordRange.setEnd(node, wordEnd);

  selection.removeAllRanges();
  selection.addRange(wordRange);
  return true;
};

const getFormatTagNames = (command) => {
  if (command === "bold") {
    return ["B", "STRONG"];
  }
  if (command === "italic") {
    return ["I", "EM"];
  }
  if (command === "underline") {
    return ["U"];
  }
  if (command === "link") {
    return ["A"];
  }
  return [];
};

const rangeHasFormatting = (range, tagNames) => {
  if (!range || !tagNames.length) {
    return false;
  }
  const fragment = range.cloneContents();
  if (!fragment || !fragment.querySelector) {
    return false;
  }
  const selector = tagNames.map((tag) => tag.toLowerCase()).join(",");
  return Boolean(fragment.querySelector(selector));
};

const closestFormattingAncestor = (node, tagNames) => {
  let current = node.parentNode;
  while (current && current !== postBodyEditor) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      tagNames.includes(current.tagName)
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const splitFormattingElementAroundNode = (formatElement, targetNode) => {
  const parent = formatElement.parentNode;
  if (!parent) {
    return;
  }

  const before = formatElement.cloneNode(false);
  const after = formatElement.cloneNode(false);

  while (formatElement.firstChild && formatElement.firstChild !== targetNode) {
    before.appendChild(formatElement.firstChild);
  }

  if (before.firstChild) {
    parent.insertBefore(before, formatElement);
  }

  if (formatElement.firstChild === targetNode) {
    formatElement.removeChild(targetNode);
    parent.insertBefore(targetNode, formatElement);
  }

  while (formatElement.firstChild) {
    after.appendChild(formatElement.firstChild);
  }

  if (after.firstChild) {
    parent.insertBefore(after, formatElement.nextSibling);
  }

  parent.removeChild(formatElement);
};

const removeFormattingFromNode = (node, tagNames) => {
  let formatElement = closestFormattingAncestor(node, tagNames);
  while (formatElement) {
    splitFormattingElementAroundNode(formatElement, node);
    formatElement = closestFormattingAncestor(node, tagNames);
  }
};

const withSelectionMarkers = (range, callback) => {
  const startMarker = document.createElement("span");
  const endMarker = document.createElement("span");
  startMarker.dataset.marker = "start";
  endMarker.dataset.marker = "end";
  startMarker.style.display = "none";
  endMarker.style.display = "none";

  const endRange = range.cloneRange();
  endRange.collapse(false);
  endRange.insertNode(endMarker);

  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(startMarker);

  let callbackError;
  try {
    callback();
  } catch (err) {
    // Preserve the error to rethrow after cleanup.
    callbackError = err;
  } finally {
    const selection = window.getSelection();
    // Only attempt to restore the selection if both markers are still in the document.
    if (
      selection &&
      startMarker.isConnected &&
      endMarker.isConnected
    ) {
      try {
        const newRange = document.createRange();
        newRange.setStartAfter(startMarker);
        newRange.setEndBefore(endMarker);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch {
        // If the DOM has changed in a way that makes selection restoration invalid,
        // skip adjusting the selection but still clean up markers below.
      }
    }

    if (startMarker.parentNode) {
      startMarker.parentNode.removeChild(startMarker);
    }
    if (endMarker.parentNode) {
      endMarker.parentNode.removeChild(endMarker);
    }
  }

  if (callbackError) {
    throw callbackError;
  }
};

const removeTagsFromSelection = (tagNames) => {
  if (!tagNames.length) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed || !postBodyEditor.contains(range.commonAncestorContainer)) {
    return;
  }

  withSelectionMarkers(range.cloneRange(), () => {
    const workRange = selection.getRangeAt(0);
    const container = workRange.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? workRange.commonAncestorContainer
      : workRange.commonAncestorContainer.parentNode;

    if (!container || container.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          try {
            return workRange.intersectsNode(node)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          } catch {
            return NodeFilter.FILTER_REJECT;
          }
        }
      }
    );

    const nodes = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }

    nodes.forEach((textNode) => {
      let node = textNode;

      const startOffset = node === workRange.startContainer ? workRange.startOffset : 0;
      const endOffset = node === workRange.endContainer ? workRange.endOffset : node.length;

      if (startOffset >= endOffset) {
        return;
      }

      if (endOffset < node.length) {
        node.splitText(endOffset);
      }

      if (startOffset > 0) {
        node = node.splitText(startOffset);
      }

      removeFormattingFromNode(node, tagNames);
    });
  });
};

const removeFormattingFromSelection = (command) => {
  const tagNames = getFormatTagNames(command);
  removeTagsFromSelection(tagNames);
};

const clearFormattingSelection = () => {
  removeTagsFromSelection(["A", "B", "STRONG", "I", "EM", "U"]);
};

const applyInlineFormat = (command, wrapper) => {
  if (state.isSourceMode) {
    if (!hasSourceSelection()) {
      return;
    }

    wrapSourceSelection(wrapper.before, wrapper.after);
    markDirty();
    return;
  }

  if (!hasVisualSelection()) {
    if (!expandSelectionToWord()) {
      return;
    }
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const tagNames = getFormatTagNames(command);

  if (rangeHasFormatting(range, tagNames)) {
    removeFormattingFromSelection(command);
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

const sanitizeUrl = (url) => {
  if (typeof url !== "string") {
    return "";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  // Normalize the URL to detect obfuscated javascript: schemes
  // 1. Remove control characters and whitespace that can be used to hide the protocol
  let normalized = trimmed.replace(/[\u0000-\u001F\s]+/g, "");

  // 2. Decode percent-encoded sequences a few times to surface encoded "javascript:"
  let lastValue;
  let iterations = 0;
  while (normalized !== lastValue && iterations < 5) {
    lastValue = normalized;
    try {
      normalized = decodeURIComponent(normalized);
    } catch (e) {
      // Stop decoding on malformed escape sequences
      break;
    }
    iterations++;
  }

  if (/^javascript:/i.test(normalized)) {
    return "";
  }
  return trimmed;
};

const getSelectionRange = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!postBodyEditor.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range.cloneRange();
};

const getClosestLink = (range = null) => {
  const anchorNode = range
    ? range.commonAncestorContainer
    : window.getSelection()?.anchorNode;
  if (!anchorNode) {
    return null;
  }
  const elementNode = anchorNode.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement
    : anchorNode;
  return elementNode ? elementNode.closest("a") : null;
};

const findMarkdownLink = (value, start, end) => {
  const regex = /\[([^\]]+)\]\(([^)]+)\)(\{:[^}]+\})?/g;
  let match = regex.exec(value);
  while (match) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (start >= matchStart && end <= matchEnd) {
      return {
        start: matchStart,
        end: matchEnd,
        text: match[1],
        url: match[2],
        attributes: match[3] || ""
      };
    }
    match = regex.exec(value);
  }
  return null;
};

const openLinkDialog = () => {
  if (!linkDialog || !linkUrlInput || !linkTextInput) {
    return;
  }

  let context = { mode: state.isSourceMode ? "source" : "visual" };

  if (state.isSourceMode) {
    const value = postBodySource.value;
    const start = postBodySource.selectionStart;
    const end = postBodySource.selectionEnd;
    const selectionText = value.slice(start, end);
    const existing = findMarkdownLink(value, start, end);

    context = {
      ...context,
      selectionStart: start,
      selectionEnd: end,
      selectionText,
      existing
    };

    linkUrlInput.value = existing ? existing.url : "";
    linkTextInput.value = existing ? existing.text : selectionText;
  } else {
    const range = getSelectionRange();
    const selectionText = range ? range.toString() : "";
    const anchor = getClosestLink(range);

    context = {
      ...context,
      range,
      selectionText,
      anchor
    };

    linkUrlInput.value = anchor ? anchor.getAttribute("href") || "" : "";
    linkTextInput.value = anchor ? anchor.textContent || "" : selectionText;
  }

  state.linkContext = context;
  linkDialog.showModal();
  linkUrlInput.focus();
};

const closeLinkDialog = () => {
  if (!linkDialog) {
    return;
  }
  linkDialog.close();
  linkUrlInput.value = "";
  linkTextInput.value = "";
  state.linkContext = null;
};

const closeDialogOnEscape = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeLinkDialog();
  }
};

const applyLinkFromDialog = () => {
  if (!state.linkContext) {
    closeLinkDialog();
    return;
  }

  const url = sanitizeUrl(linkUrlInput.value || "");
  if (!url) {
    showToast("Please enter a valid URL.");
    return;
  }

  const linkText = linkTextInput.value.trim();

  if (state.linkContext.mode === "source") {
    const value = postBodySource.value;
    const { existing, selectionStart, selectionEnd, selectionText } = state.linkContext;

    const attributeSuffix =
      "{:target=\"_blank\" rel=\"noopener noreferrer\"}";

    if (existing) {
      const replacementText = linkText || existing.text;
      const replacement = `[${replacementText}](${url})${attributeSuffix}`;
      postBodySource.value =
        value.slice(0, existing.start) + replacement + value.slice(existing.end);
    } else {
      const resolvedText = linkText || selectionText || url;
      const replacement = `[${resolvedText}](${url})${attributeSuffix}`;
      postBodySource.value =
        value.slice(0, selectionStart) + replacement + value.slice(selectionEnd);
    }

    markDirty();
    closeLinkDialog();
    return;
  }

  const { anchor, range, selectionText } = state.linkContext;
  const resolvedText = linkText || selectionText || url;

  postBodyEditor.focus();

  if (anchor) {
    anchor.setAttribute("href", url);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
    if (linkText) {
      anchor.textContent = linkText;
    }
    markDirty();
    closeLinkDialog();
    postBodyEditor.focus();
    return;
  }

  if (!range) {
    showToast("Select text or place the cursor first.");
    return;
  }

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const newAnchor = document.createElement("a");
  newAnchor.href = url;
  newAnchor.target = "_blank";
  newAnchor.rel = "noopener noreferrer";

  if (range.collapsed) {
    newAnchor.textContent = resolvedText;
    range.insertNode(newAnchor);
    range.setStartAfter(newAnchor);
    range.collapse(true);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    const extracted = range.extractContents();
    if (linkText) {
      newAnchor.textContent = linkText;
    } else {
      newAnchor.appendChild(extracted);
    }
    range.insertNode(newAnchor);
    range.setStartAfter(newAnchor);
    range.collapse(true);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  markDirty();
  closeLinkDialog();
  postBodyEditor.focus();
};

const removeLink = () => {
  if (state.isSourceMode) {
    const value = postBodySource.value;
    const start = postBodySource.selectionStart;
    const end = postBodySource.selectionEnd;
    const existing = findMarkdownLink(value, start, end);
    if (!existing) {
      showToast("No link to remove.");
      return;
    }
    postBodySource.value =
      value.slice(0, existing.start) + existing.text + value.slice(existing.end);
    markDirty();
    return;
  }

  const anchor = getClosestLink();
  if (anchor) {
    const parent = anchor.parentNode;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
    markDirty();
    return;
  }

  if (hasVisualSelection()) {
    document.execCommand("unlink", false, null);
  }
};

const handleEditorShortcut = (event) => {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "k") {
    event.preventDefault();
    openLinkDialog();
    return;
  }

  if (key === "b") {
    event.preventDefault();
    applyInlineFormat("bold", { before: "**", after: "**" });
    return;
  }

  if (key === "i") {
    event.preventDefault();
    applyInlineFormat("italic", { before: "*", after: "*" });
    return;
  }

  if (key === "u") {
    event.preventDefault();
    applyInlineFormat("underline", { before: "<u>", after: "</u>" });
  }
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

    const statusBadge = document.createElement("span");
    statusBadge.className = `status-badge ${post.status === "draft" ? "draft" : "published"}`;
    statusBadge.textContent = status;

    const dateText = document.createElement("span");
    dateText.textContent = formatDisplayDate(post.date);

    meta.appendChild(statusBadge);
    meta.appendChild(document.createTextNode(" • "));
    meta.appendChild(dateText);

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
  state.openedExisting = false;
  if (deletePostButton) {
    deletePostButton.classList.add("hidden");
  }
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
    state.openedExisting = true;
    if (deletePostButton) {
      deletePostButton.classList.remove("hidden");
    }
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
    state.openedExisting = true;
    if (deletePostButton) {
      deletePostButton.classList.remove("hidden");
    }
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
      await fetchJson(
        `/api/posts/${encodeURIComponent(state.currentPostId)}?commit=false`,
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

if (linkDialog) {
  linkDialog.addEventListener("close", () => {
    state.linkContext = null;
  });
  linkDialog.addEventListener("keydown", closeDialogOnEscape);
}

if (linkForm) {
  linkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyLinkFromDialog();
  });
}

if (linkCancelButton) {
  linkCancelButton.addEventListener("click", () => {
    closeLinkDialog();
  });
}

saveDraftButton.addEventListener("click", () => savePost(false));
publishButton.addEventListener("click", () => savePost(true));
discardButton.addEventListener("click", discardChanges);

if (deletePostButton) {
  deletePostButton.addEventListener("click", async () => {
    if (!state.currentPostId || !state.openedExisting) {
      return;
    }

    const confirmDelete = window.confirm(
      "Delete this post? This will remove the file and create a git commit."
    );
    if (!confirmDelete) {
      return;
    }

    setEditorFeedback("Deleting post...");

    try {
      const response = await fetchJson(
        `/api/posts/${encodeURIComponent(state.currentPostId)}`,
        { method: "DELETE" }
      );

      if (response.commitStatus === "committed") {
        showToast("Post deleted and committed. Remember to push your branch.");
      } else if (response.commitStatus === "missing_identity") {
        showToast("Delete committed skipped. Set GIT_USER_NAME and GIT_USER_EMAIL.");
      }

      location.hash = "#/";
    } catch (error) {
      setEditorFeedback(`Error: ${error.message}`, true);
    }
  });
}

toolbarButtons.forEach((button) => {
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    const format = button.dataset.format;
    if (format === "bold") {
      applyInlineFormat("bold", { before: "**", after: "**" });
    } else if (format === "italic") {
      applyInlineFormat("italic", { before: "*", after: "*" });
    } else if (format === "underline") {
      applyInlineFormat("underline", { before: "<u>", after: "</u>" });
    } else if (format === "clear") {
      if (state.isSourceMode) {
        const start = postBodySource.selectionStart;
        const end = postBodySource.selectionEnd;
        if (start === end) {
          return;
        }
        const selected = postBodySource.value.slice(start, end);
        const cleared = selected
          .replace(/\[([^\]]+)\]\(([^)]+)\)(\{:[^}]+\})?/g, "$1")
          .replace(/<\/?u>/gi, "")
          .replace(/\*\*([^\n*]+)\*\*/g, "$1")
          .replace(/\*([^\n*]+)\*/g, "$1");
        postBodySource.value =
          postBodySource.value.slice(0, start) +
          cleared +
          postBodySource.value.slice(end);
        postBodySource.setSelectionRange(start, start + cleared.length);
        markDirty();
      } else {
        clearFormattingSelection();
        markDirty();
      }
    } else if (format === "link") {
      openLinkDialog();
    } else if (format === "unlink") {
      removeLink();
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

postBodyEditor.addEventListener("input", () => {
  markDirty();
  ensureVisualEditorHasCaret();
});

postBodyEditor.addEventListener("focus", () => {
  postBodyEditor.classList.add("is-focused");
  ensureVisualEditorHasCaret();
});

postBodyEditor.addEventListener("blur", () => {
  postBodyEditor.classList.remove("is-focused");
  ensureVisualEditorHasCaret();
});

postBodySource.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    adjustIndentation(event.shiftKey);
    markDirty();
    return;
  }
  handleEditorShortcut(event);
});

postBodyEditor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    applyVisualCommand(event.shiftKey ? "outdent" : "indent");
    markDirty();
    return;
  }
  handleEditorShortcut(event);
});

window.addEventListener("hashchange", handleRoute);

loadTheme();
setEditorMode(false);
handleRoute();
