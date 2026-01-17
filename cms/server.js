const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const matter = require("gray-matter");
const { simpleGit } = require("simple-git");

const app = express();
const port = process.env.PORT || 3000;
const repoRoot = process.env.BLOG_REPO_ROOT;
const defaultAuthor = process.env.DEFAULT_AUTHOR || "";
const gitEnabled = process.env.GIT_ENABLED !== "false";
const gitUserName = process.env.GIT_USER_NAME || "";
const gitUserEmail = process.env.GIT_USER_EMAIL || "";

if (!repoRoot) {
  console.error("BLOG_REPO_ROOT is required.");
  process.exit(1);
}

const postsDir = path.join(repoRoot, "_posts");
const draftsDir = path.join(repoRoot, "_drafts");
const git = gitEnabled ? simpleGit({ baseDir: repoRoot }) : null;

const ensureGitIdentity = async () => {
  if (!gitEnabled || !git) {
    return { status: "disabled" };
  }
  if (!gitUserName || !gitUserEmail) {
    return { status: "missing_identity" };
  }

  await git.addConfig("user.name", gitUserName, false, "local");
  await git.addConfig("user.email", gitUserEmail, false, "local");

  return { status: "configured" };
};

const commitChanges = async (action, title, messageOverride = "") => {
  if (!gitEnabled || !git) {
    return { status: "disabled" };
  }

  const identityResult = await ensureGitIdentity();
  if (identityResult.status === "missing_identity") {
    return identityResult;
  }

  const status = await git.status();
  const relevantFiles = status.files.filter((file) =>
    ["_posts/", "_drafts/"].some((prefix) => file.path.startsWith(prefix))
  );

  if (!relevantFiles.length) {
    return { status: "skipped" };
  }

  const safeTitle = title || "Untitled";
  const message = messageOverride || `${action}: ${safeTitle}`;

  await git.add(["-A", "_posts", "_drafts"]);
  await git.commit(message);

  return { status: "committed", message };
};

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));

const pad = (value) => String(value).padStart(2, "0");

const formatDateForFrontMatter = (date) => {
  const safeDate = date || new Date();
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(
    safeDate.getDate()
  )} ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}:${pad(
    safeDate.getSeconds()
  )}`;
};

const formatDateForFilename = (date) => {
  const safeDate = date || new Date();
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(
    safeDate.getDate()
  )}`;
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.match(
      /(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (match) {
      const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseInputDate = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0
  );
};

const normalizeTags = (tags) => {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const slugify = (value) => {
  const base = String(value || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  return base || "untitled";
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const uniqueFilename = async (dir, baseName) => {
  let candidate = `${baseName}.md`;
  let counter = 1;
  while (await fileExists(path.join(dir, candidate))) {
    candidate = `${baseName}-${counter}.md`;
    counter += 1;
  }
  return candidate;
};

const createExcerpt = (content) => {
  if (!content) {
    return "";
  }
  const cleaned = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length) {
    return sentences.slice(0, 2).join(" ").trim();
  }

  return cleaned.slice(0, 200).trim();
};

const ensureDirectories = async () => {
  if (!existsSync(postsDir)) {
    console.error(`Missing _posts directory at ${postsDir}`);
    process.exit(1);
  }
  await fs.mkdir(draftsDir, { recursive: true });
};

const ensureValidId = (rawId) => {
  const decoded = decodeURIComponent(rawId || "");
  const parts = decoded.split("/");
  if (parts.length !== 2) {
    throw new Error("Invalid post id.");
  }
  const [collection, filename] = parts;
  if (!collection || !filename) {
    throw new Error("Invalid post id.");
  }
  if (!filename.endsWith(".md")) {
    throw new Error("Only markdown posts are supported.");
  }
  if (path.basename(filename) !== filename) {
    throw new Error("Invalid filename.");
  }
  if (collection === "posts") {
    return { collection, filename, fullPath: path.join(postsDir, filename) };
  }
  if (collection === "drafts") {
    return { collection, filename, fullPath: path.join(draftsDir, filename) };
  }
  throw new Error("Invalid collection.");
};

const readPost = async (fullPath) => {
  const raw = await fs.readFile(fullPath, "utf8");
  return matter(raw, { excerpt: false });
};

const buildPostSummary = async (fullPath, collection, filename) => {
  const { data, content } = await readPost(fullPath);
  const stats = await fs.stat(fullPath);
  const dateValue = parseDateValue(data.date) || stats.mtime;
  return {
    id: `${collection}/${filename}`,
    status: collection === "posts" ? "published" : "draft",
    title: data.title || filename.replace(/\.md$/, ""),
    date: dateValue ? dateValue.toISOString() : null,
    tags: normalizeTags(data.tags),
    excerpt: createExcerpt(content)
  };
};

const listCollection = async (dir, collection) => {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = await fs.readdir(dir);
  const items = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) {
      continue;
    }
    const fullPath = path.join(dir, entry);
    items.push(await buildPostSummary(fullPath, collection, entry));
  }
  return items;
};

const loadAllPosts = async () => {
  const [posts, drafts] = await Promise.all([
    listCollection(postsDir, "posts"),
    listCollection(draftsDir, "drafts")
  ]);
  return [...posts, ...drafts].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
};

const assembleFrontMatter = ({
  existingData,
  title,
  dateValue,
  tags,
  collection,
  publish
}) => {
  const updated = { ...existingData };
  const safeTitle = title || updated.title || "Untitled";

  updated.title = safeTitle;
  updated.date = formatDateForFrontMatter(dateValue || parseDateValue(updated.date));

  if (tags.length) {
    updated.tags = tags;
  } else {
    delete updated.tags;
  }

  if (!updated.author && defaultAuthor) {
    updated.author = defaultAuthor;
  }

  if (collection === "drafts") {
    if (Object.prototype.hasOwnProperty.call(existingData, "published") || publish) {
      updated.published = Boolean(publish);
    }
  } else if (collection === "posts") {
    if (Object.prototype.hasOwnProperty.call(existingData, "published")) {
      updated.published = true;
    }
  }

  return updated;
};

app.get("/api/config", (req, res) => {
  res.json({ gitEnabled });
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await loadAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/posts/*", async (req, res) => {
  try {
    const { collection, fullPath, filename } = ensureValidId(req.params[0]);
    const { data, content } = await readPost(fullPath);
    const stats = await fs.stat(fullPath);
    const dateValue = parseDateValue(data.date) || stats.mtime;
    res.json({
      id: `${collection}/${filename}`,
      status: collection === "posts" ? "published" : "draft",
      title: data.title || "",
      date: dateValue ? dateValue.toISOString() : null,
      tags: normalizeTags(data.tags),
      body: content,
      author: data.author || defaultAuthor
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title) || "Untitled";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const dateValue =
      parseInputDate(req.body?.date) || parseDateValue(req.body?.date) || new Date();
    const tags = normalizeTags(req.body?.tags);
    const publish = Boolean(req.body?.publish);

    const frontMatter = assembleFrontMatter({
      existingData: {},
      title,
      dateValue,
      tags,
      collection: publish ? "posts" : "drafts",
      publish
    });

    const markdown = matter.stringify(body, frontMatter, { lineWidth: 0 });
    const slug = slugify(title);
    const baseName = publish
      ? `${formatDateForFilename(dateValue)}-${slug}`
      : slug;
    const targetDir = publish ? postsDir : draftsDir;
    const filename = await uniqueFilename(targetDir, baseName);

    await fs.writeFile(path.join(targetDir, filename), markdown, "utf8");
    const commitResult = await commitChanges(
      publish ? "Publish" : "Save draft",
      title
    );

    res.status(201).json({
      id: `${publish ? "posts" : "drafts"}/${filename}`,
      status: publish ? "published" : "draft",
      commitStatus: commitResult.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/posts/*", async (req, res) => {
  try {
    const { collection, fullPath, filename } = ensureValidId(req.params[0]);
    const { data, content } = await readPost(fullPath);

    const hasTagsField = Object.prototype.hasOwnProperty.call(req.body || {}, "tags");
    const hasDateField = Object.prototype.hasOwnProperty.call(req.body || {}, "date");
    const hasTitleField = Object.prototype.hasOwnProperty.call(req.body || {}, "title");

    const title =
      (hasTitleField ? sanitizeText(req.body?.title) : data.title) || "Untitled";
    const body = typeof req.body?.body === "string" ? req.body.body : content;
    const dateValue = hasDateField
      ? parseInputDate(req.body?.date) || parseDateValue(req.body?.date)
      : parseDateValue(data.date);
    const tags = hasTagsField ? normalizeTags(req.body?.tags) : normalizeTags(data.tags);
    const publish = Boolean(req.body?.publish);

    const frontMatter = assembleFrontMatter({
      existingData: data,
      title,
      dateValue: dateValue || new Date(),
      tags,
      collection,
      publish
    });

    const markdown = matter.stringify(body, frontMatter, { lineWidth: 0 });

    if (collection === "drafts" && publish) {
      const slug = slugify(title);
      const baseName = `${formatDateForFilename(dateValue || new Date())}-${slug}`;
      const newFilename = await uniqueFilename(postsDir, baseName);
      await fs.writeFile(path.join(postsDir, newFilename), markdown, "utf8");
      await fs.unlink(fullPath);
      const commitResult = await commitChanges("Publish", title);
      return res.json({
        id: `posts/${newFilename}`,
        status: "published",
        commitStatus: commitResult.status
      });
    }

    await fs.writeFile(fullPath, markdown, "utf8");
    const commitResult = await commitChanges("Save draft", title);
    res.json({
      id: `${collection}/${filename}`,
      status: collection === "posts" ? "published" : "draft",
      commitStatus: commitResult.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/posts/*", async (req, res) => {
  try {
    const { fullPath, filename } = ensureValidId(req.params[0]);
    const commit = req.query.commit !== "false";

    let title = filename.replace(/\.md$/, "");
    if (commit) {
      const { data } = await readPost(fullPath);
      title = data.title || title;
    }

    await fs.unlink(fullPath);

    if (!commit) {
      return res.json({
        status: "deleted",
        commitStatus: "skipped"
      });
    }

    const commitResult = await commitChanges("Delete", title, `deleted ${title}`);

    res.json({
      status: "deleted",
      commitStatus: commitResult.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/git/status", async (req, res) => {
  if (!gitEnabled || !git) {
    return res.status(404).json({ error: "Git support disabled." });
  }
  try {
    const status = await git.status();
    const files = status.files.filter((file) =>
      ["_posts/", "_drafts/"].some((prefix) => file.path.startsWith(prefix))
    );
    res.json({
      ahead: status.ahead,
      behind: status.behind,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/git/commit", async (req, res) => {
  if (!gitEnabled || !git) {
    return res.status(404).json({ error: "Git support disabled." });
  }
  try {
    const message = sanitizeText(req.body?.message);
    if (!message) {
      return res.status(400).json({ error: "Commit message is required." });
    }
    await git.add(["-A", "_posts", "_drafts"]);
    await git.commit(message);
    res.json({ status: "committed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found." });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDirectories()
  .then(() => {
    app.listen(port, () => {
      console.log(`CMS running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
