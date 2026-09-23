module.exports = function (eleventyConfig) {
  // Static passthrough: images uploaded via the admin panel, the stylesheet,
  // and the admin panel itself (Decap CMS) go straight to the output folder.
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("robots.txt");

  eleventyConfig.addFilter("pad2", (num) => String(num).padStart(2, "0"));

  eleventyConfig.addFilter("dataAno", (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  });

  // ISO 8601 date (YYYY-MM-DD), used for structured data and the RSS/sitemap feeds.
  eleventyConfig.addFilter("isoDate", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toISOString();
  });

  // RFC 822 date, required by the RSS <pubDate> spec.
  eleventyConfig.addFilter("rfc822Date", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toUTCString();
  });

  // Used to safely drop free-text place names into a Google Maps embed URL.
  eleventyConfig.addFilter("encodeURI", (str) => encodeURIComponent(str || ""));

  // Safe string escaping for values dropped inside JSON-LD / RSS XML.
  eleventyConfig.addFilter("escapeJson", (str) => JSON.stringify(str || "").slice(1, -1));
  eleventyConfig.addFilter("escapeXml", (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );

  // Used on post pages to build the "related posts" list, excluding the current one.
  eleventyConfig.addFilter("excludeUrl", (posts, url) =>
    (posts || []).filter((p) => p.url !== url)
  );

  // Rough reading-time estimate from the rendered post HTML (~200 wpm, pt-BR).
  eleventyConfig.addFilter("readingTime", (html) => {
    const text = String(html || "").replace(/<[^>]+>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("content/posts/*.md")
      .sort((a, b) => new Date(b.data.data) - new Date(a.data.data));
  });

  // Whichever post is marked "destaque: true" in the front matter (falls
  // back to the newest post when none is marked) — used on the homepage.
  eleventyConfig.addCollection("postoDestaque", (collectionApi) => {
    const posts = collectionApi.getFilteredByGlob("content/posts/*.md")
      .sort((a, b) => new Date(b.data.data) - new Date(a.data.data));
    return posts.find((p) => p.data.destaque) || posts[0];
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"]
  };
};
