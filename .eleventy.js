module.exports = function (eleventyConfig) {
  // Static passthrough: images uploaded via the admin panel, the stylesheet,
  // and the admin panel itself (Decap CMS) go straight to the output folder.
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("admin");

  eleventyConfig.addFilter("pad2", (num) => String(num).padStart(2, "0"));

  eleventyConfig.addFilter("dataAno", (dateObj) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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
