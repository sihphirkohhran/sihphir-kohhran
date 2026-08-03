/**
 * Decap CMS document helpers
 * Compatible with Decap CMS v3.x
 */
(function () {
  function sanitizeFilename(filename) {
    var raw = String(filename || "")
      .replace(/^.*[/\\]/, "")
      .trim();

    if (!raw) return "document.pdf";

    var extMatch = raw.match(/(\.[a-z0-9]{2,8})$/i);
    var ext = extMatch ? extMatch[1].toLowerCase() : ".pdf";
    var base = extMatch ? raw.slice(0, -ext.length) : raw;

    var slug = base
      .toLowerCase()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return (slug || "document") + ext;
  }

  function normalizePdfUrl(url) {
    if (!url) return "";

    var value = String(url).trim().replace(/\\/g, "/");

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    value = value.replace(/^\/?public\/documents\//, "/documents/");
    value = value.replace(/^documents\//, "/documents/");

    if (value.startsWith("/documents/")) {
      var parts = value.split("/");
      parts[parts.length - 1] = sanitizeFilename(parts[parts.length - 1]);
      return parts.join("/");
    }

    return "/documents/" + sanitizeFilename(value);
  }

  function resolveDocumentUrl(fileUrl, externalUrl) {
    var file = normalizePdfUrl(fileUrl);
    if (file) return file;

    if (/^https?:\/\//i.test(externalUrl || "")) {
      return externalUrl;
    }

    return "";
  }

  function register() {
    if (!window.CMS || window.__sihphirDocumentCmsRegistered) return;

    window.__sihphirDocumentCmsRegistered = true;

    window.CMS.registerEventListener({
      name: "preSave",
      handler: function ({ entry }) {
        var data = entry.get("data");
        if (!data) return;

        var next = Object.assign({}, data);

        next.pdf_url = resolveDocumentUrl(
          next.pdf_url,
          next.pdf_external
        );

        // Decap CMS 3.x preSave handlers must return the updated entry data,
        // not the Immutable entry itself. Decap applies that data to the entry.
        return next;
      }
    });

    window.CMS.registerEventListener({
      name: "postSave",
      handler: function () {
        console.log("Entry saved.");
      }
    });
  }

  register();
})();
